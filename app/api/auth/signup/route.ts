import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptProfileName } from "@/lib/crypto/profile-name";
import {
  isValidStudentId,
  normalizeStudentId,
  studentIdToEmail,
} from "@/lib/student-auth";
import { isDepartment } from "@/lib/departments";

function mapSignUpError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "この学籍番号はすでに登録されています";
  if (m.includes("password")) return "パスワードは6文字以上にしてください";
  if (
    m.includes("rate limit") ||
    m.includes("security purposes") ||
    (m.includes("after") && m.includes("second")) ||
    (m.includes("email") && m.includes("rate"))
  ) {
    return "登録の試行が多すぎます。数分待ってから再度お試しください。";
  }
  return message || "登録に失敗しました";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      department?: string;
      studentId?: string;
      password?: string;
    };

    const trimmedName = String(body.name ?? "").trim();
    const trimmedDept = String(body.department ?? "").trim();
    const studentIdRaw = String(body.studentId ?? "").trim();
    const password = String(body.password ?? "");

    if (!trimmedName) {
      return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
    }
    if (!isDepartment(trimmedDept)) {
      return NextResponse.json(
        { error: "所属学科を選択してください" },
        { status: 400 }
      );
    }
    if (!isValidStudentId(studentIdRaw)) {
      return NextResponse.json(
        { error: "学籍番号の形式が正しくありません" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上にしてください" },
        { status: 400 }
      );
    }

    const studentId = normalizeStudentId(studentIdRaw);
    const email = studentIdToEmail(studentId);
    const nameCipher = encryptProfileName(trimmedName);

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        // 平文は保存しない（AES-GCM 暗号文のみ）
        name: nameCipher,
        nickname: nameCipher,
        name_encrypted: true,
        department: trimmedDept,
        student_id: studentId,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: mapSignUpError(error.message) },
        { status: 400 }
      );
    }

    // トリガー漏れ時の保険：profiles を暗号化名で upsert
    if (data.user?.id) {
      const { error: profileError } = await admin.from("profiles").upsert(
        {
          id: data.user.id,
          student_id: studentId,
          name: nameCipher,
          department: trimmedDept,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (profileError) {
        console.warn("profiles upsert after signup:", profileError.message);
        // Auth ユーザーは作成済みなのでクライアントへは成功扱いにしつつ、詳細を返す
        return NextResponse.json({
          ok: true,
          email,
          displayName: trimmedName,
          department: trimmedDept,
          studentId,
          warning: `プロフィール保存に問題: ${profileError.message}`,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      email,
      displayName: trimmedName,
      department: trimmedDept,
      studentId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "登録に失敗しました";
    console.error("signup api:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
