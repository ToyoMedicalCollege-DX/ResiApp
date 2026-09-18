/**
 * 体調相談（ChatGPT 連携予定）の下地。
 * 本番接続時は API Route（例: /api/brief-consult）から OpenAI を呼ぶ想定。
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
};

/** 将来の API 接続口。現状は未接続のプレースホルダ。 */
export async function sendBriefConsult(
  _text: string,
  _context?: { moodKey?: string | null }
): Promise<BriefConsultReply> {
  await Promise.resolve();
  return {
    ok: false,
    error: "体調相談は準備中です。まもなく ChatGPT と連携予定です。",
  };
}
