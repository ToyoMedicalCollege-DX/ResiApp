import type { User } from "@supabase/supabase-js";
import { emailToStudentId } from "@/lib/student-auth";
import { isEncryptedProfileName } from "@/lib/crypto/profile-name-format";

function rawMetaName(user: User): string {
  const meta = user.user_metadata ?? {};
  return (
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.nickname === "string" && meta.nickname.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    ""
  );
}

/** metadata 上の名前が暗号文なら表示に使わない（API 復号結果を使う） */
export function displayNameFromUser(user: User | null | undefined): string {
  if (!user) return "ゲスト";
  const meta = user.user_metadata ?? {};
  const name = rawMetaName(user);
  const encryptedFlag = meta.name_encrypted === true;
  if (name && !encryptedFlag && !isEncryptedProfileName(name)) {
    return name.endsWith("さん") ? name : `${name}さん`;
  }
  const studentId =
    (typeof meta.student_id === "string" && meta.student_id) ||
    emailToStudentId(user.email) ||
    "";
  if (studentId) return `${studentId}さん`;
  return "ユーザーさん";
}

export function studentIdFromUser(user: User | null | undefined): string {
  if (!user) return "";
  const meta = user.user_metadata ?? {};
  if (typeof meta.student_id === "string" && meta.student_id.trim()) {
    return meta.student_id.trim().toUpperCase();
  }
  return emailToStudentId(user.email) ?? "";
}

export function departmentFromUser(user: User | null | undefined): string {
  if (!user) return "";
  const meta = user.user_metadata ?? {};
  return typeof meta.department === "string" ? meta.department.trim() : "";
}

export function initialFromUser(user: User | null | undefined): string {
  const name = displayNameFromUser(user).replace(/さん$/, "");
  return name.slice(0, 1) || "？";
}

/** 「山田太郎さん」形式に整形 */
export function withSan(name: string): string {
  const t = name.trim();
  if (!t) return "ユーザーさん";
  return t.endsWith("さん") ? t : `${t}さん`;
}
