import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  encryptProfileName,
  isEncryptedProfileName,
} from "@/lib/crypto/profile-name";
import {
  isValidStudentId,
  normalizeStudentId,
  studentIdToEmail,
} from "@/lib/student-auth";
import { isDepartment } from "@/lib/departments";

export const runtime = "nodejs";

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
    if (!isEncryptedProfileName(nameCipher)) {
      return NextResponse.json(
        { error: "名前の暗号化に失敗しました" },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
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

    const userId = data.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "ユーザー作成に失敗しました" },
        { status: 500 }
      );
    }

    // トリガーより後に必ず暗号文で上書き（平文が残らないようにする）
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        student_id: studentId,
        name: nameCipher,
        department: trimmedDept,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (profileError) {
      console.error("profiles upsert after signup:", profileError.message);
      return NextResponse.json(
        {
          error: `アカウントは作れましたがプロフィール保存に失敗しました: ${profileError.message}`,
        },
        { status: 500 }
      );
    }

    const { data: verify } = await admin
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();
    if (!verify?.name || !isEncryptedProfileName(verify.name)) {
      console.error("profile name not encrypted after signup", verify?.name);
      return NextResponse.json(
        {
          error:
            "名前の暗号化保存を確認できませんでした。管理者に連絡してください。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      email,
      displayName: trimmedName,
      department: trimmedDept,
      studentId,
      nameEncrypted: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "登録に失敗しました";
    console.error("signup api:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
