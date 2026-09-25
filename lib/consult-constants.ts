/** 体調相談の共通定数（クライアント／サーバー共用） */

export const CONSULT_WELCOME_TEXT =
  "体調のこと、なんでも話しかけてください。内容に合わせてトレーニングや相談窓口もご案内します。";

export const CONSULT_WELCOME_MODEL = "welcome";

export const CONSULT_DAILY_LIMIT = 5;

/** 今日 0:00 JST の ISO 文字列 */
export function startOfTodayJstIso(now = new Date()): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${day}T00:00:00+09:00`).toISOString();
}

/** JST の YYYY-MM-DD */
export function jstDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
