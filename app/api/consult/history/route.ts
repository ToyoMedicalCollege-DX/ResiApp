import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CONSULT_WELCOME_MODEL,
  CONSULT_WELCOME_TEXT,
  startOfTodayJstIso,
} from "@/lib/consult-constants";

export const runtime = "nodejs";

const HISTORY_MAX = 200;

async function ensureOpenThread(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("consult_threads")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("consult_threads")
    .insert({
      user_id: userId,
      status: "open",
      mood_at_start: null,
    })
    .select("id")
    .single();
  if (error || !created?.id) {
    throw new Error(error?.message || "相談スレッドを作成できませんでした");
  }
  return created.id as string;
}

/**
 * JST 日次リセット後、まだ本日のウェルカムが無ければ assistant メッセージとして挿入。
 * （毎日の回数リセットと同じ 0:00 JST）
 */
async function ensureTodayWelcome(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<void> {
  const since = startOfTodayJstIso();
  const { data: existingWelcome } = await supabase
    .from("consult_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "assistant")
    .eq("model", CONSULT_WELCOME_MODEL)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  if (existingWelcome?.id) return;

  const threadId = await ensureOpenThread(supabase, userId);
  const { error } = await supabase.from("consult_messages").insert({
    thread_id: threadId,
    user_id: userId,
    role: "assistant",
    content: CONSULT_WELCOME_TEXT,
    model: CONSULT_WELCOME_MODEL,
  });
  if (error) {
    console.warn("consult welcome insert:", error.message);
  } else {
    await supabase
      .from("consult_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);
  }
}

/** ログイン中ユーザーの相談履歴（全スレッド・古い→新しい）＋本日ウェルカム保証 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    await ensureTodayWelcome(supabase, user.id);

    // スレッドをまたいでユーザーの全履歴を取得（過去チャットをスクロール可能に）
    const { data: rows, error } = await supabase
      .from("consult_messages")
      .select("id, role, content, created_at, model")
      .eq("user_id", user.id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(HISTORY_MAX);

    if (error) {
      console.error("consult history select:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const messages = (rows ?? []).map((row) => ({
      id: row.id as string,
      role: row.role as "user" | "assistant",
      content: String(row.content ?? ""),
      createdAt: (row.created_at as string) ?? "",
      isWelcome: row.model === CONSULT_WELCOME_MODEL,
    }));

    return NextResponse.json({
      messages,
      welcomeText: CONSULT_WELCOME_TEXT,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "履歴の取得に失敗しました";
    console.error("consult history:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
