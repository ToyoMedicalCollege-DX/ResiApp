/**
 * 体調相談。ChatGPT 接続前でもメッセージを consult_* に保存する。
 */

import { createClient } from "@/lib/supabase/client";
import type { MoodKey } from "@/lib/condition-storage";

export type BriefConsultMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type BriefConsultReply = {
  ok: boolean;
  message?: BriefConsultMessage;
  error?: string;
};

const PLACEHOLDER_REPLY =
  "体調相談は準備中です。まもなく ChatGPT と連携予定です。つらいときは設定の相談窓口も利用できます。";

async function ensureOpenThread(
  userId: string,
  moodKey?: string | null
): Promise<string | null> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("consult_threads")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const mood =
    moodKey === "great" ||
    moodKey === "good" ||
    moodKey === "okay" ||
    moodKey === "bad" ||
    moodKey === "rough"
      ? (moodKey as MoodKey)
      : null;

  const { data: created, error } = await supabase
    .from("consult_threads")
    .insert({
      user_id: userId,
      status: "open",
      mood_at_start: mood,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.warn("consult_threads insert:", error?.message);
    return null;
  }
  return created.id as string;
}

async function insertMessage(input: {
  threadId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
}): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("consult_messages")
    .insert({
      thread_id: input.threadId,
      user_id: input.userId,
      role: input.role,
      content: input.content,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("consult_messages insert:", error.message);
    return null;
  }

  await supabase
    .from("consult_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.threadId);

  return data?.id ?? null;
}

/** ユーザー発言を保存し、プレースホルダ返信を返す（将来 OpenAI に差し替え） */
export async function sendBriefConsult(
  text: string,
  context?: { moodKey?: string | null }
): Promise<BriefConsultReply> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "メッセージが空です" };
  }

  try {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;

    if (user) {
      const threadId = await ensureOpenThread(user.id, context?.moodKey);
      if (threadId) {
        await insertMessage({
          threadId,
          userId: user.id,
          role: "user",
          content: trimmed,
        });
        await insertMessage({
          threadId,
          userId: user.id,
          role: "assistant",
          content: PLACEHOLDER_REPLY,
        });
      }
    }

    return {
      ok: true,
      message: {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: PLACEHOLDER_REPLY,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    console.warn("sendBriefConsult failed", e);
    return {
      ok: true,
      message: {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: PLACEHOLDER_REPLY,
        createdAt: new Date().toISOString(),
      },
      error: e instanceof Error ? e.message : undefined,
    };
  }
}
