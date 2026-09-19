import type { CheckTypeId } from "@/lib/check";
import { CHECK_TYPES, isCheckTypeId } from "@/lib/check";
import { createClient } from "@/lib/supabase/client";

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
  const trimmed = history.slice(-52);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

/** Supabase の最新セッションから尺度スコアを取得しローカルにも反映 */
export async function loadLatestCheckScoresFromSupabase(): Promise<LatestCheckScores> {
  const local = loadLatestCheckScores();
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return local;

    const { data, error } = await supabase
      .from("check_sessions")
      .select("scale, raw_score, completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(60);

    if (error || !data?.length) return local;

    const next: LatestCheckScores = { ...local };
    const seen = new Set<string>();
    for (const row of data) {
      const scale = row.scale as string;
      if (!isCheckTypeId(scale) || seen.has(scale)) continue;
      if (typeof row.raw_score !== "number") continue;
      seen.add(scale);
      next[scale] = row.raw_score;
      if (!next.updatedAt && row.completed_at) {
        next.updatedAt = String(row.completed_at);
      }
    }
    if (canUseStorage()) {
      localStorage.setItem(LATEST_KEY, JSON.stringify(next));
    }
    return next;
  } catch {
    return local;
  }
}

function safeAnswerValue(raw: number | string | undefined): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** チェック完了を check_sessions / check_answers に保存 */
export async function saveCheckSessionToSupabase(input: {
  typeId: CheckTypeId;
  answers: (number | string)[];
  score: number;
  band: string;
  crisis?: boolean;
  startedAt?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) {
      return { ok: false, error: "ログインが必要です（端末には保存済み）" };
    }

    const check = CHECK_TYPES[input.typeId];
    if (input.answers.length !== check.questions.length) {
      return {
        ok: false,
        error: `回答数不一致 (${input.answers.length}/${check.questions.length})`,
      };
    }

    const completedAt = new Date();
    const startedAt = input.startedAt
      ? new Date(input.startedAt)
      : completedAt;
    const periodYm = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, "0")}`;

    const { data: session, error: sessionError } = await supabase
      .from("check_sessions")
      .insert({
        user_id: user.id,
        scale: input.typeId,
        period_ym: periodYm,
        raw_score: input.score,
        max_score: check.maxScore,
        band: input.band,
        crisis: Boolean(input.crisis),
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
        duration_ms: Math.max(0, completedAt.getTime() - startedAt.getTime()),
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      const msg = sessionError?.message ?? "session insert failed";
      console.warn("check_sessions insert:", msg, sessionError);
      return { ok: false, error: msg };
    }

    const rows = check.questions.map((q, i) => {
      const raw = input.answers[i];
      return {
        session_id: session.id,
        user_id: user.id,
        scale: input.typeId,
        question_id: q.id,
        question_no: i + 1,
        answer_value: q.kind === "choice" ? safeAnswerValue(raw) : null,
        answer_text: q.kind === "time" ? String(raw ?? "") : null,
        answered_at: completedAt.toISOString(),
      };
    });

    const { error: answersError } = await supabase
      .from("check_answers")
      .insert(rows);

    if (answersError) {
      console.warn("check_answers insert:", answersError.message, answersError);
      return { ok: false, error: answersError.message };
    }

    try {
      const { awardBadge } = await import("@/lib/badges");
      const { upsertMonthlyScoreSnapshot } = await import("@/lib/monthly-score");
      const { trackAppEvent } = await import("@/lib/app-events");
      await awardBadge("first_check", { scale: input.typeId });
      const latest = loadLatestCheckScores();
      if (
        typeof latest.phq === "number" &&
        typeof latest.gad === "number" &&
        typeof latest.psqi === "number"
      ) {
        await awardBadge("checks_all_scales");
      }
      await upsertMonthlyScoreSnapshot(latest);
      await trackAppEvent("check_complete", {
        scale: input.typeId,
        score: input.score,
        crisis: Boolean(input.crisis),
      });
    } catch (sideErr) {
      // 本体のセッション保存は成功済み
      console.warn("check post-save hooks:", sideErr);
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "同期に失敗しました";
    console.warn("check session sync failed:", msg);
    return { ok: false, error: msg };
  }
}
