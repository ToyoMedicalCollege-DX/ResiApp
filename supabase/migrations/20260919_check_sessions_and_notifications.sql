-- ResiApp: セルフチェック（crisis 含む）＋通知設定（将来用スキーマ）
-- 前提: 20260917_profiles.sql 適用済み（profiles / set_updated_at）

-- ---------------------------------------------------------------------------
-- 1. check_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.check_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scale           TEXT NOT NULL CHECK (scale IN ('phq', 'gad', 'psqi')),
  period_ym       TEXT,
  raw_score       SMALLINT NOT NULL,
  max_score       SMALLINT NOT NULL,
  band            TEXT,
  crisis          BOOLEAN NOT NULL DEFAULT false,
  started_at      TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.check_sessions IS 'セルフチェック1回分（こころ/やすらぎ/ねむり）';
COMMENT ON COLUMN public.check_sessions.crisis IS 'PHQ危機項目などで true。サポート誘導・将来の通知に使用';

CREATE INDEX IF NOT EXISTS idx_check_sessions_user_scale_time
  ON public.check_sessions (user_id, scale, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_check_sessions_crisis
  ON public.check_sessions (user_id, completed_at DESC)
  WHERE crisis = true;

ALTER TABLE public.check_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "check_sessions_select_own" ON public.check_sessions;
CREATE POLICY "check_sessions_select_own"
  ON public.check_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "check_sessions_insert_own" ON public.check_sessions;
CREATE POLICY "check_sessions_insert_own"
  ON public.check_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "check_sessions_update_own" ON public.check_sessions;
CREATE POLICY "check_sessions_update_own"
  ON public.check_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. check_answers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.check_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.check_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scale           TEXT NOT NULL CHECK (scale IN ('phq', 'gad', 'psqi')),
  question_id     TEXT NOT NULL,
  question_no     SMALLINT NOT NULL,
  answer_value    SMALLINT,
  answer_text     TEXT,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  latency_ms      INTEGER,
  UNIQUE (session_id, question_id)
);

COMMENT ON COLUMN public.check_answers.answered_at IS '各設問の回答時刻';

CREATE INDEX IF NOT EXISTS idx_check_answers_session
  ON public.check_answers (session_id, question_no);

ALTER TABLE public.check_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "check_answers_select_own" ON public.check_answers;
CREATE POLICY "check_answers_select_own"
  ON public.check_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "check_answers_insert_own" ON public.check_answers;
CREATE POLICY "check_answers_insert_own"
  ON public.check_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "check_answers_update_own" ON public.check_answers;
CREATE POLICY "check_answers_update_own"
  ON public.check_answers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. notification_settings（将来のプッシュ用・スキーマ先行）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id               UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_enabled          BOOLEAN NOT NULL DEFAULT true,
  daily_reminder_time   TIME NOT NULL DEFAULT '20:00:00',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_settings IS '通知設定（全体ON・毎日の通知時間）';

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_settings_select_own" ON public.notification_settings;
CREATE POLICY "notification_settings_select_own"
  ON public.notification_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_settings_insert_own" ON public.notification_settings;
CREATE POLICY "notification_settings_insert_own"
  ON public.notification_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_settings_update_own" ON public.notification_settings;
CREATE POLICY "notification_settings_update_own"
  ON public.notification_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER trg_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 新規プロフィール作成時に通知デフォルト行を用意
CREATE OR REPLACE FUNCTION public.handle_new_profile_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_notification_defaults ON public.profiles;
CREATE TRIGGER trg_profiles_notification_defaults
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_notifications();

-- 既存プロフィールへデフォルト行を埋める
INSERT INTO public.notification_settings (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
