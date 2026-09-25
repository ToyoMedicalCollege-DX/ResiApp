/**
 * 体調相談クライアント。返信生成は /api/consult/chat（gpt-4o-mini）側。
 */

import type { ConsultSuggestion } from "@/lib/consult-routing";
import {
  CONSULT_DAILY_LIMIT,
  CONSULT_WELCOME_TEXT,
} from "@/lib/consult-constants";

export type { ConsultSuggestion };
export { CONSULT_WELCOME_TEXT };

export type BriefConsultMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  suggestion?: ConsultSuggestion | null;
  isWelcome?: boolean;
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
      dailyLimit: body.dailyLimit ?? CONSULT_DAILY_LIMIT,
      remaining: body.remaining ?? 0,
    };
  } catch {
    return null;
  }
}

export type ConsultHistoryResult = {
  messages: BriefConsultMessage[];
  error?: string;
};

/** 過去の相談メッセージ（古い→新しい）。日次ウェルカムもサーバー側で挿入済み */
export async function fetchConsultHistory(): Promise<ConsultHistoryResult> {
  try {
    const res = await fetch("/api/consult/history", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const body = (await res.json()) as {
      messages?: BriefConsultMessage[];
      error?: string;
    };
    if (!res.ok) {
      return { messages: [], error: body.error || `履歴取得失敗 (${res.status})` };
    }
    return {
      messages: Array.isArray(body.messages) ? body.messages : [],
    };
  } catch (e) {
    return {
      messages: [],
      error: e instanceof Error ? e.message : "履歴の取得に失敗しました",
    };
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
