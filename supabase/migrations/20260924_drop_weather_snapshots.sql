-- ResiApp: 天気は「現在表示のみ」。振り返り用スナップショットを廃止する。
--
-- 変更内容:
--   1. condition_logs.weather_snapshot_id を削除
--   2. weather_snapshots テーブルを削除
--
-- 方針:
--   - ホームの体調天気予報は Open-Meteo の現在値＋端末キャッシュのみ
--   - DB に天気履歴は残さない
--   - condition_logs.pressure_alert は互換のため残置（アプリからは書かない）

-- 1. FK カラムを先に外す
ALTER TABLE public.condition_logs
  DROP COLUMN IF EXISTS weather_snapshot_id;

-- 2. ポリシー削除（テーブル DROP 前）
DROP POLICY IF EXISTS "weather_snapshots_select_auth" ON public.weather_snapshots;
DROP POLICY IF EXISTS "weather_snapshots_insert_auth" ON public.weather_snapshots;

-- 3. インデックス・テーブル削除
DROP INDEX IF EXISTS public.idx_weather_snapshots_region_time;
DROP TABLE IF EXISTS public.weather_snapshots;
