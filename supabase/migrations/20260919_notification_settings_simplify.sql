-- notification_settings を簡素化（未使用カラム削除）
-- 既に 20260919_check_sessions_and_notifications.sql を適用済みの場合用

ALTER TABLE public.notification_settings
  DROP COLUMN IF EXISTS inactivity_alert,
  DROP COLUMN IF EXISTS crisis_followup,
  DROP COLUMN IF EXISTS score_alert,
  DROP COLUMN IF EXISTS weekly_check_enabled,
  DROP COLUMN IF EXISTS weekly_check_day,
  DROP COLUMN IF EXISTS daily_reminder;

COMMENT ON TABLE public.notification_settings IS '通知設定（全体ON・毎日の通知時間）';
