import type { User } from "@supabase/supabase-js";
import { emailToStudentId } from "@/lib/student-auth";

export function displayNameFromUser(user: User | null | undefined): string {
  if (!user) return "ゲスト";
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.nickname === "string" && meta.nickname.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    "";
  if (name) return name.endsWith("さん") ? name : `${name}さん`;
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
