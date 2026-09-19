-- ResiApp DB設計書 v2.3 実装（P0 / P0' / P1 + 設計済み関連）
--
-- 前提:
--   - 20260917_profiles.sql 適用済み
--     （profiles / user_preferences / set_updated_at / handle_new_user）
--   - Supabase SQL Editor でまとめて実行可、または supabase db push
--
-- このファイルで作成するテーブル:
--   weather_snapshots, condition_logs,
--   check_sessions, check_answers,
--   notification_settings,
--   consult_threads, consult_messages,
--   lesson_completions, support_link_clicks,
--   monthly_score_snapshots,
--   work_answers, user_badges
--
-- 冪等: IF NOT EXISTS / DROP POLICY IF EXISTS を使用

-- ---------------------------------------------------------------------------
-- 0. 共通: updated_at（未作成時のみ）
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

-- ---------------------------------------------------------------------------
-- 1. weather_snapshots（任意・condition_logs から参照）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weather_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_key      TEXT NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  pressure_hpa    NUMERIC(7, 2),
  weather_code    INTEGER,
  summary         TEXT,
  pressure_alert  TEXT
                    CHECK (pressure_alert IS NULL
                      OR pressure_alert IN ('normal', 'mild', 'caution')),
  raw             JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.weather_snapshots IS '天気・気圧の要約キャッシュ（体調ログの根拠用）';

CREATE INDEX IF NOT EXISTS idx_weather_snapshots_region_time
  ON public.weather_snapshots (region_key, fetched_at DESC);

ALTER TABLE public.weather_snapshots ENABLE ROW LEVEL SECURITY;

-- 読み取りは認証ユーザー、書き込みは service_role / サーバ想定
DROP POLICY IF EXISTS "weather_snapshots_select_auth" ON public.weather_snapshots;
CREATE POLICY "weather_snapshots_select_auth"
  ON public.weather_snapshots FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- 2. condition_logs — 今日の体調
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.condition_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date                DATE NOT NULL DEFAULT (CURRENT_DATE),
  mood                TEXT NOT NULL
                        CHECK (mood IN ('great', 'good', 'okay', 'bad', 'rough')),
  mood_score          SMALLINT NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  pressure_alert      TEXT
                        CHECK (pressure_alert IS NULL
                          OR pressure_alert IN ('normal', 'mild', 'caution')),
  weather_snapshot_id UUID REFERENCES public.weather_snapshots(id) ON DELETE SET NULL,
  note                TEXT NOT NULL DEFAULT '',
  body_tags           TEXT[] NOT NULL DEFAULT '{}',
  logged_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

COMMENT ON TABLE public.condition_logs IS '日次の体調（気分5段階）';

CREATE INDEX IF NOT EXISTS idx_condition_logs_user_date
  ON public.condition_logs (user_id, date DESC);

ALTER TABLE public.condition_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "condition_logs_select_own" ON public.condition_logs;
CREATE POLICY "condition_logs_select_own"
  ON public.condition_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "condition_logs_insert_own" ON public.condition_logs;
CREATE POLICY "condition_logs_insert_own"
  ON public.condition_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "condition_logs_update_own" ON public.condition_logs;
CREATE POLICY "condition_logs_update_own"
  ON public.condition_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_condition_logs_updated_at ON public.condition_logs;
CREATE TRIGGER trg_condition_logs_updated_at
  BEFORE UPDATE ON public.condition_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. check_sessions / check_answers — セルフチェック
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
-- 4. notification_settings — 通知設定（プッシュ接続は後続）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id               UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_enabled          BOOLEAN NOT NULL DEFAULT true,
  daily_reminder_time   TIME NOT NULL DEFAULT '20:00:00',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 旧スキーマから簡素化（未適用でも安全）
ALTER TABLE public.notification_settings
  DROP COLUMN IF EXISTS inactivity_alert,
  DROP COLUMN IF EXISTS crisis_followup,
  DROP COLUMN IF EXISTS score_alert,
  DROP COLUMN IF EXISTS weekly_check_enabled,
  DROP COLUMN IF EXISTS weekly_check_day,
  DROP COLUMN IF EXISTS daily_reminder;

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

INSERT INTO public.notification_settings (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. consult_threads / consult_messages — 体調相談
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consult_threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'closed', 'escalated')),
  mood_at_start TEXT
                  CHECK (mood_at_start IS NULL
                    OR mood_at_start IN ('great', 'good', 'okay', 'bad', 'rough')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.consult_threads IS '体調相談スレッド';

CREATE INDEX IF NOT EXISTS idx_consult_threads_user_updated
  ON public.consult_threads (user_id, updated_at DESC);

ALTER TABLE public.consult_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consult_threads_select_own" ON public.consult_threads;
CREATE POLICY "consult_threads_select_own"
  ON public.consult_threads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "consult_threads_insert_own" ON public.consult_threads;
CREATE POLICY "consult_threads_insert_own"
  ON public.consult_threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "consult_threads_update_own" ON public.consult_threads;
CREATE POLICY "consult_threads_update_own"
  ON public.consult_threads FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_consult_threads_updated_at ON public.consult_threads;
CREATE TRIGGER trg_consult_threads_updated_at
  BEFORE UPDATE ON public.consult_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.consult_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES public.consult_threads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  model       TEXT,
  token_in    INTEGER,
  token_out   INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.consult_messages IS '体調相談の各メッセージ（要厳格RLS）';

CREATE INDEX IF NOT EXISTS idx_consult_messages_thread_time
  ON public.consult_messages (thread_id, created_at);

ALTER TABLE public.consult_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consult_messages_select_own" ON public.consult_messages;
CREATE POLICY "consult_messages_select_own"
  ON public.consult_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "consult_messages_insert_own" ON public.consult_messages;
CREATE POLICY "consult_messages_insert_own"
  ON public.consult_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. lesson_completions — トレーニング完了
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id        TEXT NOT NULL CHECK (skill_id IN ('sk1', 'sk2', 'sk3', 'sk4', 'sk5')),
  lesson_id       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed')),
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_spent_sec  INTEGER,
  UNIQUE (user_id, lesson_id)
);

COMMENT ON TABLE public.lesson_completions IS 'レッスン完了（未実施は行なし）';

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user_skill
  ON public.lesson_completions (user_id, skill_id);

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_completions_select_own" ON public.lesson_completions;
CREATE POLICY "lesson_completions_select_own"
  ON public.lesson_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lesson_completions_insert_own" ON public.lesson_completions;
CREATE POLICY "lesson_completions_insert_own"
  ON public.lesson_completions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lesson_completions_update_own" ON public.lesson_completions;
CREATE POLICY "lesson_completions_update_own"
  ON public.lesson_completions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. support_link_clicks — 相談窓口クリック
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_link_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  link_key      TEXT NOT NULL,
  link_label    TEXT,
  href          TEXT NOT NULL,
  group_name    TEXT,
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent    TEXT,
  path          TEXT
);

COMMENT ON TABLE public.support_link_clicks IS '相談窓口リンクのクリックログ';

CREATE INDEX IF NOT EXISTS idx_support_clicks_link_time
  ON public.support_link_clicks (link_key, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_clicks_user_time
  ON public.support_link_clicks (user_id, clicked_at DESC);

ALTER TABLE public.support_link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_link_clicks_select_own" ON public.support_link_clicks;
CREATE POLICY "support_link_clicks_select_own"
  ON public.support_link_clicks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_link_clicks_insert_own" ON public.support_link_clicks;
CREATE POLICY "support_link_clicks_insert_own"
  ON public.support_link_clicks FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 8. monthly_score_snapshots — 月次総合スコア（任意・確定保存用）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_score_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year_month    TEXT NOT NULL,
  total_score   SMALLINT NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  band          TEXT NOT NULL CHECK (band IN ('good', 'okay', 'caution')),
  phq_score     SMALLINT,
  gad_score     SMALLINT,
  psqi_score    SMALLINT,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year_month)
);

COMMENT ON TABLE public.monthly_score_snapshots IS '月次総合スコアの確定スナップショット';

CREATE INDEX IF NOT EXISTS idx_monthly_score_snapshots_user
  ON public.monthly_score_snapshots (user_id, year_month DESC);

ALTER TABLE public.monthly_score_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_score_snapshots_select_own" ON public.monthly_score_snapshots;
CREATE POLICY "monthly_score_snapshots_select_own"
  ON public.monthly_score_snapshots FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "monthly_score_snapshots_insert_own" ON public.monthly_score_snapshots;
CREATE POLICY "monthly_score_snapshots_insert_own"
  ON public.monthly_score_snapshots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "monthly_score_snapshots_update_own" ON public.monthly_score_snapshots;
CREATE POLICY "monthly_score_snapshots_update_own"
  ON public.monthly_score_snapshots FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 9. work_answers — トレーニング内ワーク（推奨）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id      TEXT NOT NULL CHECK (skill_id IN ('sk1', 'sk2', 'sk3', 'sk4', 'sk5')),
  lesson_id     TEXT NOT NULL,
  prompt_key    TEXT NOT NULL DEFAULT 'default',
  answer_text   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id, prompt_key)
);

COMMENT ON TABLE public.work_answers IS 'トレーニング内ワークのテキスト回答';

CREATE INDEX IF NOT EXISTS idx_work_answers_user_lesson
  ON public.work_answers (user_id, lesson_id);

ALTER TABLE public.work_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_answers_select_own" ON public.work_answers;
CREATE POLICY "work_answers_select_own"
  ON public.work_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "work_answers_insert_own" ON public.work_answers;
CREATE POLICY "work_answers_insert_own"
  ON public.work_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "work_answers_update_own" ON public.work_answers;
CREATE POLICY "work_answers_update_own"
  ON public.work_answers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_work_answers_updated_at ON public.work_answers;
CREATE TRIGGER trg_work_answers_updated_at
  BEFORE UPDATE ON public.work_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. user_badges — 成長バッジ（推奨）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_key   TEXT NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta        JSONB,
  UNIQUE (user_id, badge_key)
);

COMMENT ON TABLE public.user_badges IS '成長・達成バッジ';

CREATE INDEX IF NOT EXISTS idx_user_badges_user_time
  ON public.user_badges (user_id, earned_at DESC);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_badges_select_own" ON public.user_badges;
CREATE POLICY "user_badges_select_own"
  ON public.user_badges FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_badges_insert_own" ON public.user_badges;
CREATE POLICY "user_badges_insert_own"
  ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
