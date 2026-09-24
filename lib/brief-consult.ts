/**
 * 体調相談クライアント。返信生成は /api/consult/chat（gpt-4o-mini）側。
 */

import type { ConsultSuggestion } from "@/lib/consult-routing";

export type { ConsultSuggestion };

export type BriefConsultMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  suggestion?: ConsultSuggestion | null;
};

export type BriefConsultReply = {
  ok: boolean;
  message?: BriefConsultMessage;
  suggestion?: ConsultSuggestion | null;
  error?: string;
  limitReached?: boolean;
  usedToday?: number;
  dailyLimit?: number;
  remaining?: number;
};

export type ConsultQuota = {
  usedToday: number;
  dailyLimit: number;
  remaining: number;
};

export async function fetchConsultQuota(): Promise<ConsultQuota | null> {
  try {
    const res = await fetch("/api/consult/chat", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ConsultQuota;
    return {
      usedToday: body.usedToday ?? 0,
      dailyLimit: body.dailyLimit ?? 5,
      remaining: body.remaining ?? 0,
    };
  } catch {
    return null;
  }
}

/** ユーザー発言を送り、AI返信を返す */
export async function sendBriefConsult(
  text: string,
  context?: { moodKey?: string | null }
): Promise<BriefConsultReply> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "メッセージが空です" };
  }

  try {
    const res = await fetch("/api/consult/chat", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: trimmed,
        moodKey: context?.moodKey ?? null,
      }),
    });
    const body = (await res.json()) as BriefConsultReply & { error?: string };

    if (!res.ok) {
      return {
        ok: false,
        error: body.error || "相談に失敗しました",
        limitReached: body.limitReached || res.status === 429,
        usedToday: body.usedToday,
        dailyLimit: body.dailyLimit,
        remaining: body.remaining ?? 0,
      };
    }

    const message = body.message
      ? {
          ...body.message,
          suggestion: body.message.suggestion ?? body.suggestion ?? null,
        }
      : undefined;

    return {
      ok: true,
      message,
      suggestion: body.suggestion ?? message?.suggestion ?? null,
      usedToday: body.usedToday,
      dailyLimit: body.dailyLimit,
      remaining: body.remaining,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "通信エラーが発生しました",
    };
  }
}
