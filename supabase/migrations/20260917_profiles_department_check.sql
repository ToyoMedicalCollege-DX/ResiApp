-- 既存の profiles がある場合用（未作成なら 20260917_profiles.sql を実行）
-- 所属学科を4学科に限定

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_department_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_check
  CHECK (department IN (
    '歯科技工士学科',
    '救急救命士学科',
    '鍼灸師学科',
    '柔道整復師学科'
  ));
