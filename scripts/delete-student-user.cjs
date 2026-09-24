/**
 * 学籍番号で Auth ユーザー（と CASCADE される profiles）を削除する。
 *
 *   node --env-file=.env.local scripts/delete-student-user.cjs A1234567
 *   node --env-file=.env.local scripts/delete-student-user.cjs --orphans
 *
 * ※ Table Editor で profiles だけ消しても auth.users は残る。
 *   再登録できない主因はこれ。必ず Authentication 側（または本スクリプト）で消す。
 */
const { createClient } = require("@supabase/supabase-js");

const DOMAIN = "students.resiapp.jp";

function studentIdToEmail(studentId) {
  return `${String(studentId).trim().toUpperCase().toLowerCase()}@${DOMAIN}`;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      "使い方: node --env-file=.env.local scripts/delete-student-user.cjs <学籍番号>\n" +
        "     or: node --env-file=.env.local scripts/delete-student-user.cjs --orphans"
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env 未設定");

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (arg === "--orphans") {
    const { data: list, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw error;
    const { data: profiles } = await admin.from("profiles").select("id");
    const ids = new Set((profiles || []).map((p) => p.id));
    const orphans = list.users.filter((u) => !ids.has(u.id));
    console.log("orphans", orphans.length);
    for (const u of orphans) {
      const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
      console.log(
        delErr ? `FAIL ${u.email} ${delErr.message}` : `deleted ${u.email}`
      );
    }
    return;
  }

  const studentId = String(arg).trim().toUpperCase();
  const email = studentIdToEmail(studentId);

  // profiles 側（student_id）からも探す
  const { data: profile } = await admin
    .from("profiles")
    .select("id, student_id")
    .eq("student_id", studentId)
    .maybeSingle();

  let userId = profile?.id || null;
  if (!userId) {
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 100,
      });
      if (error) throw error;
      const found = data.users.find(
        (u) => (u.email || "").toLowerCase() === email
      );
      if (found) {
        userId = found.id;
        break;
      }
      if (data.users.length < 100) break;
    }
  }

  if (!userId) {
    console.log("not found", studentId, email);
    process.exit(0);
  }

  const { error: delError } = await admin.auth.admin.deleteUser(userId);
  if (delError) {
    console.error("delete failed", delError.message);
    process.exit(1);
  }
  console.log("deleted auth user", studentId, email, userId);
  console.log(
    "profiles は auth.users への FK CASCADE で消える想定です。残っていれば Table Editor で確認してください。"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
