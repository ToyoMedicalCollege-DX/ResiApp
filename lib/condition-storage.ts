import { createClient } from "@/lib/supabase/client";
import type { PressureAlert } from "@/lib/weather";

export type MoodKey = "great" | "good" | "okay" | "bad" | "rough";

export type BodyTag =
  | "headache"
  | "fatigue"
  | "sleepy"
  | "stiff_shoulder"
  | "stomach"
  | "other";

export const BODY_TAG_OPTIONS: { key: BodyTag; label: string }[] = [
  { key: "headache", label: "頭痛" },
  { key: "fatigue", label: "だるさ" },
  { key: "sleepy", label: "眠気" },
  { key: "stiff_shoulder", label: "肩こり" },
  { key: "stomach", label: "胃の不調" },
  { key: "other", label: "その他" },
];

export const MOOD_SCORE: Record<MoodKey, number> = {
  great: 5,
  good: 4,
  okay: 3,
  bad: 2,
  rough: 1,
};

export type ConditionLog = {
  date: string; // YYYY-MM-DD
  mood: MoodKey;
  moodScore: number;
  bodyTags: BodyTag[];
  note: string;
  pressureAlert?: PressureAlert | null;
  updatedAt: string;
};

const STORAGE_KEY = "resiapp.condition.logs.v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function loadConditionLogs(): ConditionLog[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConditionLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getConditionLog(date: string): ConditionLog | null {
  return loadConditionLogs().find((l) => l.date === date) ?? null;
}

export function upsertConditionLog(
  input: Omit<ConditionLog, "updatedAt" | "moodScore"> & { moodScore?: number }
): ConditionLog {
  const logs = loadConditionLogs();
  const next: ConditionLog = {
    date: input.date,
    mood: input.mood,
    moodScore: input.moodScore ?? MOOD_SCORE[input.mood],
    bodyTags: input.bodyTags,
    note: input.note ?? "",
    pressureAlert: input.pressureAlert ?? null,
    updatedAt: new Date().toISOString(),
  };
  const idx = logs.findIndex((l) => l.date === next.date);
  if (idx >= 0) logs[idx] = next;
  else logs.push(next);
  logs.sort((a, b) => a.date.localeCompare(b.date));
  if (canUseStorage()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }
  void syncConditionLogToSupabase(next);
  return next;
}

/** ログイン中なら condition_logs に upsert */
export async function syncConditionLogToSupabase(
  log: ConditionLog
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) return { ok: true };

    const { error } = await supabase.from("condition_logs").upsert(
      {
        user_id: user.id,
        date: log.date,
        mood: log.mood,
        mood_score: log.moodScore,
        pressure_alert: log.pressureAlert ?? null,
        note: log.note ?? "",
        body_tags: log.bodyTags ?? [],
        updated_at: log.updatedAt,
      },
      { onConflict: "user_id,date" }
    );

    if (error) {
      console.warn("condition_logs upsert:", error.message);
      return { ok: false, error: error.message };
    }

    const { awardBadge } = await import("@/lib/badges");
    const { trackAppEvent } = await import("@/lib/app-events");
    void awardBadge("first_condition", { mood: log.mood });
    void trackAppEvent("condition_save", {
      date: log.date,
      mood: log.mood,
      moodScore: log.moodScore,
    });

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "同期に失敗しました";
    console.warn("condition_logs sync failed:", msg);
    return { ok: false, error: msg };
  }
}

/** 直近 N 日分（古い→新しい）。未記録日は null */
export function recentConditionSeries(days = 14): {
  date: string;
  log: ConditionLog | null;
}[] {
  const logs = loadConditionLogs();
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const out: { date: string; log: ConditionLog | null }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = todayKey(d);
    out.push({ date: key, log: byDate.get(key) ?? null });
  }
  return out;
}
