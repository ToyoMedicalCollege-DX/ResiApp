import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  decryptProfileName,
  encryptProfileName,
  isEncryptedProfileName,
} from "@/lib/crypto/profile-name";
import { isDepartment } from "@/lib/departments";
import { studentIdFromUser } from "@/lib/auth-display";

export const runtime = "nodejs";

/** ログイン中ユーザー自身のプロフィール（名前は復号して返す） */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, department, student_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("profiles select:", profileError.message);
    }

    const storedName =
      (typeof profile?.name === "string" && profile.name) ||
      (typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "") ||
      "";

    let plainName = "";
    try {
      plainName = storedName ? decryptProfileName(storedName) : "";
    } catch (e) {
      console.warn("name decrypt failed:", e);
      plainName = "";
    }

    const department =
      (typeof profile?.department === "string" && profile.department) ||
      (typeof user.user_metadata?.department === "string"
        ? user.user_metadata.department
        : "") ||
      "";

    const studentId =
      (typeof profile?.student_id === "string" && profile.student_id) ||
      studentIdFromUser(user);

    return NextResponse.json({
      name: plainName,
      department,
      studentId,
      nameEncrypted: isEncryptedProfileName(storedName),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "取得に失敗しました";
    console.error("profile GET:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** 名前・学科の更新（名前は暗号化して profiles / metadata へ） */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      department?: string;
    };
    const trimmedName = String(body.name ?? "").trim();
    const trimmedDept = String(body.department ?? "").trim();

    if (!trimmedName) {
      return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
    }
    if (!isDepartment(trimmedDept)) {
      return NextResponse.json(
        { error: "所属学科を選択してください" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const nameCipher = encryptProfileName(trimmedName);

    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        name: nameCipher,
        nickname: nameCipher,
        name_encrypted: true,
        department: trimmedDept,
      },
    });
    if (metaError) throw metaError;

    const { data: updated, error: profileError } = await supabase
      .from("profiles")
      .update({
        name: nameCipher,
        department: trimmedDept,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: `プロフィール保存に失敗: ${profileError.message}` },
        { status: 400 }
      );
    }

    if (!updated) {
      const sid = studentIdFromUser(user);
      if (!sid) {
        return NextResponse.json(
          {
            error:
              "プロフィール行がありません。一度ログアウトして再ログインするか、新規登録し直してください。",
          },
          { status: 400 }
        );
      }
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        name: nameCipher,
        department: trimmedDept,
        student_id: sid,
      });
      if (insertError) {
        return NextResponse.json(
          { error: `プロフィール作成に失敗: ${insertError.message}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      name: trimmedName,
      department: trimmedDept,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存に失敗しました";
    console.error("profile PATCH:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
