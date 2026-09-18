/** Supabase Auth は email 必須のため、学籍番号を内部メールに写像する。
 *  `.local` / example.com 等は Supabase が拒否するため、通常のドメイン形式を使う。
 */
export const STUDENT_AUTH_DOMAIN = "students.resiapp.jp";

export function normalizeStudentId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidStudentId(raw: string): boolean {
  const id = normalizeStudentId(raw);
  // 英数字とハイフン（学校によって形式が違うため緩く）
  return /^[A-Z0-9][A-Z0-9_-]{2,31}$/i.test(id);
}

export function studentIdToEmail(studentId: string): string {
  const id = normalizeStudentId(studentId).toLowerCase();
  return `${id}@${STUDENT_AUTH_DOMAIN}`;
}

export function emailToStudentId(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.toLowerCase();
  const suffix = `@${STUDENT_AUTH_DOMAIN}`;
  if (!at.endsWith(suffix)) return null;
  return at.slice(0, -suffix.length).toUpperCase();
}
