/**
 * 既存 profiles.name の平文を AES-256-GCM で一括暗号化し、
 * Auth user_metadata も同じ暗号文に揃える。
 *
 * 実行:
 *   node --env-file=.env.local scripts/encrypt-profile-names.mjs
 *
 * 必要 env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PROFILE_NAME_ENCRYPTION_KEY  (openssl rand -base64 32)
 */
const { createClient } = require("@supabase/supabase-js");
const { createCipheriv, randomBytes } = require("crypto");

const PREFIX = "enc:v1:";

function b64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function getKey() {
  const raw = process.env.PROFILE_NAME_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("PROFILE_NAME_ENCRYPTION_KEY が未設定です");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `PROFILE_NAME_ENCRYPTION_KEY は 32 バイト必要です（現在 ${key.length}）`
    );
  }
  return key;
}

function encrypt(plain, key) {
  const trimmed = String(plain).trim();
  if (!trimmed) throw new Error("空の名前は暗号化できません");
  if (trimmed.startsWith(PREFIX)) return trimmed;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${b64url(iv)}:${b64url(tag)}:${b64url(enc)}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase URL / SERVICE_ROLE_KEY が未設定です");
  }

  const key = getKey();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error } = await admin
    .from("profiles")
    .select("id, student_id, name")
    .order("created_at", { ascending: true });

  if (error) throw error;

  let skipped = 0;
  let updated = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const name = row.name ?? "";
    if (name.startsWith(PREFIX)) {
      skipped += 1;
      continue;
    }
    if (!name.trim()) {
      console.warn("skip empty", row.student_id);
      skipped += 1;
      continue;
    }

    try {
      const cipher = encrypt(name, key);
      const { error: upErr } = await admin
        .from("profiles")
        .update({ name: cipher, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (upErr) throw upErr;

      const { error: metaErr } = await admin.auth.admin.updateUserById(row.id, {
        user_metadata: {
          name: cipher,
          nickname: cipher,
          name_encrypted: true,
        },
      });
      if (metaErr) {
        console.warn("metadata warn", row.student_id, metaErr.message);
      }

      console.log("encrypted", row.student_id, name, "->", cipher.slice(0, 24) + "…");
      updated += 1;
    } catch (e) {
      failed += 1;
      console.error("fail", row.student_id, e instanceof Error ? e.message : e);
    }
  }

  console.log(
    JSON.stringify({ total: rows?.length ?? 0, updated, skipped, failed }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
