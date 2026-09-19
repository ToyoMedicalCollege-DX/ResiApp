import type { CheckTypeId } from "@/lib/check";
import { CHECK_TYPES } from "@/lib/check";

const LATEST_KEY = "resiapp.check.latestScores.v2";
const HISTORY_KEY = "resiapp.check.scoreHistory.v1";

export type LatestCheckScores = {
  phq?: number;
  gad?: number;
  psqi?: number;
  updatedAt?: string;
};

export type CheckScoreSnapshot = {
  at: string; // ISO
  phq?: number;
  gad?: number;
  psqi?: number;
  total?: number;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadLatestCheckScores(): LatestCheckScores {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(LATEST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LatestCheckScores;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function loadCheckScoreHistory(): CheckScoreSnapshot[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CheckScoreSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 尺度生点 → 総合（0〜100）。高いほど調子が良い。未実施尺度は除外して平均。 */
export function computeTotalScore(scores: LatestCheckScores): number | null {
  const parts: number[] = [];
  (["phq", "gad", "psqi"] as CheckTypeId[]).forEach((id) => {
    const raw = scores[id];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return;
    const max = CHECK_TYPES[id].maxScore;
    const clamped = Math.min(max, Math.max(0, raw));
    parts.push((1 - clamped / max) * 100);
  });
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export function saveLatestCheckScore(typeId: CheckTypeId, score: number): void {
  if (!canUseStorage()) return;
  const prev = loadLatestCheckScores();
  const next: LatestCheckScores = {
    ...prev,
    [typeId]: score,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(LATEST_KEY, JSON.stringify(next));

  const total = computeTotalScore(next);
  const history = loadCheckScoreHistory();
  history.push({
    at: next.updatedAt!,
    phq: next.phq,
    gad: next.gad,
    psqi: next.psqi,
    total: total ?? undefined,
  });
  // 直近 52 件まで
  const trimmed = history.slice(-52);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}
