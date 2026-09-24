/**
 * 体調相談クライアント。返信生成は /api/consult/chat（gpt-4o-mini）側。
 */

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

    return {
      ok: true,
      message: body.message,
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
