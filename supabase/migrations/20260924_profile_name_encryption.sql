-- ResiApp: 表示名（profiles.name）のアプリ層暗号化について
-- スキーマ変更なし。運用メモ用マイグレーション。
--
-- 方針:
--   - 平文の氏名は DB / Auth user_metadata に保存しない
--   - AES-256-GCM でサーバー暗号化し、profiles.name に
--     enc:v1:<iv>:<tag>:<ciphertext> 形式で格納
--   - 鍵はアプリ env PROFILE_NAME_ENCRYPTION_KEY（Base64 32 bytes）
--   - 登録: POST /api/auth/signup
--   - 表示・更新: GET|PATCH /api/profile
--
-- 既存の平文 name は復号時にそのまま返す（後方互換）。
-- 再保存（設定画面で保存）すると暗号文に置き換わる。
--
-- 鍵生成:
--   openssl rand -base64 32
--
-- 本番では Vercel 等の Environment Variables にも同名で設定すること。

COMMENT ON COLUMN public.profiles.name IS
  '表示名。アプリ層で AES-256-GCM 暗号文（enc:v1:…）を格納。レガシー平文も可';
