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
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already exists")
  ) {
    return "この学籍番号はすでに登録されています";
  }
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

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const normalized = email.toLowerCase();
  // ページングで検索（デモ規模なら十分）
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => (u.email || "").toLowerCase() === normalized
    );
    if (found) return found;
    if (data.users.length < 100) break;
  }
  return null;
}

async function ensureEncryptedProfile(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    userId: string;
    studentId: string;
    nameCipher: string;
    department: string;
  }
) {
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: input.userId,
      student_id: input.studentId,
      name: input.nameCipher,
      department: input.department,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (profileError) {
    throw new Error(
      `プロフィール保存に失敗しました: ${profileError.message}`
    );
  }

  const { data: verify } = await admin
    .from("profiles")
    .select("name")
    .eq("id", input.userId)
    .maybeSingle();
  if (!verify?.name || !isEncryptedProfileName(verify.name)) {
    throw new Error(
      "名前の暗号化保存を確認できませんでした。管理者に連絡してください。"
    );
  }
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
    const meta = {
      name: nameCipher,
      nickname: nameCipher,
      name_encrypted: true,
      department: trimmedDept,
      student_id: studentId,
    };

    let { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: meta,
    });

    // profiles だけ消して auth.users が残っていると「すでに登録」になる。
    // その場合は Auth を削除して作り直す（パスワードの一致は無関係）。
    if (error) {
      const msg = error.message.toLowerCase();
      const already =
        msg.includes("already registered") ||
        msg.includes("already been registered") ||
        msg.includes("user already exists");

      if (!already) {
        return NextResponse.json(
          { error: mapSignUpError(error.message) },
          { status: 400 }
        );
      }

      const existing = await findAuthUserByEmail(admin, email);
      if (!existing) {
        return NextResponse.json(
          {
            error:
              "この学籍番号はすでに登録されています（Auth）。Supabase Authentication → Users から削除してから再登録してください。",
          },
          { status: 400 }
        );
      }

      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("id", existing.id)
        .maybeSingle();

      if (existingProfile) {
        return NextResponse.json(
          {
            error:
              "この学籍番号はすでに登録されています。再登録する場合は Supabase の Authentication → Users でユーザーを削除してください（profiles テーブルだけの削除では足りません）。",
          },
          { status: 400 }
        );
      }

      // orphan: auth のみ残存 → 削除して再作成
      const { error: delError } = await admin.auth.admin.deleteUser(existing.id);
      if (delError) {
        return NextResponse.json(
          {
            error: `残存アカウントの削除に失敗しました: ${delError.message}`,
          },
          { status: 500 }
        );
      }

      ({ data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: meta,
      }));
      if (error) {
        return NextResponse.json(
          { error: mapSignUpError(error.message) },
          { status: 400 }
        );
      }
    }

    const userId = data.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "ユーザー作成に失敗しました" },
        { status: 500 }
      );
    }

    try {
      await ensureEncryptedProfile(admin, {
        userId,
        studentId,
        nameCipher,
        department: trimmedDept,
      });
    } catch (profileErr) {
      const msg =
        profileErr instanceof Error
          ? profileErr.message
          : "プロフィール保存に失敗しました";
      console.error("profiles after signup:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
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
