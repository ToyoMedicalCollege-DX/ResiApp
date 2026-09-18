import type { Department } from "@/lib/departments";

/** 所属学科 → キャラ画像プレフィックス */
export const DEPT_CHAR_PREFIX: Record<Department, string> = {
  歯科技工士学科: "dt",
  救急救命士学科: "elt",
  鍼灸師学科: "amt",
  柔道整復師学科: "jt",
};

export type TotalScoreBand = "good" | "okay" | "caution";

/** 総合スコア帯 → ファイル番号（良好=03 / 普通=02 / 注意=01） */
export const SCORE_BAND_FILE: Record<TotalScoreBand, "01" | "02" | "03"> = {
  good: "03",
  okay: "02",
  caution: "01",
};

export function totalScoreBand(score: number): TotalScoreBand {
  if (score >= 75) return "good";
  if (score >= 50) return "okay";
  return "caution";
}

export function deptCharImagePath(
  department: string | null | undefined,
  score: number
): string | null {
  if (!department || !(department in DEPT_CHAR_PREFIX)) return null;
  const prefix = DEPT_CHAR_PREFIX[department as Department];
  const band = totalScoreBand(score);
  const num = SCORE_BAND_FILE[band];
  return `/characters/dept/${prefix}${num}.png`;
}

/** 帯用ファイルが無いときのフォールバック（同学科の 02） */
export function deptCharFallbackPath(
  department: string | null | undefined
): string | null {
  if (!department || !(department in DEPT_CHAR_PREFIX)) return null;
  const prefix = DEPT_CHAR_PREFIX[department as Department];
  return `/characters/dept/${prefix}02.png`;
}
