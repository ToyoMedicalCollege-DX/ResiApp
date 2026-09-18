-- ResiApp: 学籍番号ログイン用プロフィール
-- Supabase SQL Editor で実行、または supabase db push 用
--
-- 前提:
--   - Authentication の Confirm email はデモ時 OFF 推奨
--   - アプリは学籍番号を {id}@students.resiapp.jp に写像して Auth 登録
--     （.local は Supabase が invalid 扱いするため不可）

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id      TEXT NOT NULL,
  name            TEXT NOT NULL,
  department      TEXT NOT NULL
                    CHECK (department IN (
                      '歯科技工士学科',
                      '救急救命士学科',
                      '鍼灸師学科',
                      '柔道整復師学科'
                    )),
  school          TEXT,
  grade           SMALLINT CHECK (grade IS NULL OR grade BETWEEN 1 AND 6),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_student_id_unique UNIQUE (student_id),
  CONSTRAINT profiles_student_id_format CHECK (
    student_id ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'
  )
);

COMMENT ON TABLE public.profiles IS 'アプリ利用者プロフィール（auth.users と 1:1）';
COMMENT ON COLUMN public.profiles.student_id IS '学籍番号（大文字正規化）';
COMMENT ON COLUMN public.profiles.name IS '表示名（名前）';
COMMENT ON COLUMN public.profiles.department IS '所属学科';

CREATE INDEX IF NOT EXISTS idx_profiles_department
  ON public.profiles (department);

CREATE INDEX IF NOT EXISTS idx_profiles_student_id
  ON public.profiles (student_id);

-- ---------------------------------------------------------------------------
-- 2. updated_at 自動更新
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. 新規 Auth ユーザー作成時に profiles を自動挿入
--    signup の user_metadata: name / department / student_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id  TEXT;
  v_name        TEXT;
  v_department  TEXT;
BEGIN
  v_student_id := upper(trim(COALESCE(NEW.raw_user_meta_data->>'student_id', '')));
  v_name := trim(COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'nickname',
    ''
  ));
  v_department := trim(COALESCE(NEW.raw_user_meta_data->>'department', ''));

  -- metadata 欠落時のフォールバック（メールローカル部）
  IF v_student_id = '' AND NEW.email IS NOT NULL THEN
    v_student_id := upper(split_part(NEW.email, '@', 1));
  END IF;
  IF v_name = '' THEN
    v_name := v_student_id;
  END IF;
  IF v_department = '' THEN
    RAISE EXCEPTION 'department is required';
  END IF;
  IF v_department NOT IN (
    '歯科技工士学科',
    '救急救命士学科',
    '鍼灸師学科',
    '柔道整復師学科'
  ) THEN
    RAISE EXCEPTION 'invalid department: %', v_department;
  END IF;

  INSERT INTO public.profiles (id, student_id, name, department)
  VALUES (NEW.id, v_student_id, v_name, v_department)
  ON CONFLICT (id) DO UPDATE
    SET
      student_id = EXCLUDED.student_id,
      name = EXCLUDED.name,
      department = EXCLUDED.department,
      updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT は trigger (SECURITY DEFINER) 経由のみ。クライアントからの直接 INSERT は禁止
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 5. （任意）天気設定 — 要件 F07 / user_preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id            UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  weather_region_key TEXT NOT NULL DEFAULT 'osaka',
  weather_enabled    BOOLEAN NOT NULL DEFAULT true,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_preferences_select_own" ON public.user_preferences;
CREATE POLICY "user_preferences_select_own"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_upsert_own" ON public.user_preferences;
CREATE POLICY "user_preferences_insert_own"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
