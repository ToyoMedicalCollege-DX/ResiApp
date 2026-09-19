-- 体調ログのタグ・メモ、app_events、weather_snapshots 書き込み許可

ALTER TABLE public.condition_logs
  ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_tags TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.condition_logs.note IS '体調メモ（任意）';
COMMENT ON COLUMN public.condition_logs.body_tags IS '体の不調タグ（headache 等）';

-- weather_snapshots への INSERT（認証ユーザー）
DROP POLICY IF EXISTS "weather_snapshots_insert_auth" ON public.weather_snapshots;
CREATE POLICY "weather_snapshots_insert_auth"
  ON public.weather_snapshots FOR INSERT TO authenticated
  WITH CHECK (true);

-- app_events（簡易分析）
CREATE TABLE IF NOT EXISTS public.app_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_name  TEXT NOT NULL,
  props       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_events IS '画面操作などの簡易イベントログ';

CREATE INDEX IF NOT EXISTS idx_app_events_name_time
  ON public.app_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_user_time
  ON public.app_events (user_id, created_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_events_insert_own" ON public.app_events;
CREATE POLICY "app_events_insert_own"
  ON public.app_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "app_events_select_own" ON public.app_events;
CREATE POLICY "app_events_select_own"
  ON public.app_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
