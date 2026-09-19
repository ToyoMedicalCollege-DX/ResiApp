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

const MOODS = new Set<MoodKey>(["great", "good", "okay", "bad", "rough"]);

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

function saveConditionLogsLocal(logs: ConditionLog[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
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
    bodyTags: input.bodyTags ?? [],
    note: input.note ?? "",
    pressureAlert: input.pressureAlert ?? null,
    updatedAt: new Date().toISOString(),
  };
  const idx = logs.findIndex((l) => l.date === next.date);
  if (idx >= 0) logs[idx] = next;
  else logs.push(next);
  logs.sort((a, b) => a.date.localeCompare(b.date));
  saveConditionLogsLocal(logs);
  return next;
}

function rowToLog(row: {
  date: string;
  mood: string;
  mood_score: number;
  note?: string | null;
  body_tags?: string[] | null;
  pressure_alert?: string | null;
  updated_at?: string | null;
}): ConditionLog | null {
  if (!MOODS.has(row.mood as MoodKey)) return null;
  return {
    date: row.date,
    mood: row.mood as MoodKey,
    moodScore: row.mood_score,
    bodyTags: Array.isArray(row.body_tags)
      ? (row.body_tags as BodyTag[])
      : [],
    note: row.note ?? "",
    pressureAlert: (row.pressure_alert as PressureAlert | null) ?? null,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
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
    if (!user) {
      return { ok: false, error: "ログインが必要です（端末には保存済み）" };
    }

    const payload = {
      user_id: user.id,
      date: log.date,
      mood: log.mood,
      mood_score: log.moodScore,
      pressure_alert: log.pressureAlert ?? null,
      note: log.note ?? "",
      body_tags: log.bodyTags ?? [],
      updated_at: log.updatedAt,
    };

    let { error } = await supabase
      .from("condition_logs")
      .upsert(payload, { onConflict: "user_id,date" });

    if (
      error &&
      (error.message.includes("note") || error.message.includes("body_tags"))
    ) {
      const { note: _n, body_tags: _b, ...basic } = payload;
      const retry = await supabase
        .from("condition_logs")
        .upsert(basic, { onConflict: "user_id,date" });
      error = retry.error;
    }

    if (error) {
      console.warn("condition_logs upsert:", error.message, error);
      return { ok: false, error: error.message };
    }

    try {
      const { awardBadge } = await import("@/lib/badges");
      const { trackAppEvent } = await import("@/lib/app-events");
      await awardBadge("first_condition", { mood: log.mood });
      await trackAppEvent("condition_save", {
        date: log.date,
        mood: log.mood,
        moodScore: log.moodScore,
      });
    } catch (sideErr) {
      console.warn("condition post-save hooks:", sideErr);
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "同期に失敗しました";
    console.warn("condition_logs sync failed:", msg);
    return { ok: false, error: msg };
  }
}

/** ローカル保存＋Supabase 同期 */
export async function saveConditionLog(
  input: Omit<ConditionLog, "updatedAt" | "moodScore"> & { moodScore?: number }
): Promise<{ log: ConditionLog; sync: { ok: boolean; error?: string } }> {
  const log = upsertConditionLog(input);
  const sync = await syncConditionLogToSupabase(log);
  return { log, sync };
}

/** DB から読み込み、ローカルとマージ。端末のみの日は DB へ送る */
export async function loadConditionLogsMerged(): Promise<ConditionLog[]> {
  const local = loadConditionLogs();
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return local;

    const { data, error } = await supabase
      .from("condition_logs")
      .select(
        "date, mood, mood_score, note, body_tags, pressure_alert, updated_at"
      )
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (error) {
      console.warn("condition_logs select:", error.message);
      return local;
    }

    const fromDb: ConditionLog[] = [];
    for (const row of data ?? []) {
      const log = rowToLog(row);
      if (log) fromDb.push(log);
    }

    const byDate = new Map<string, ConditionLog>();
    for (const log of fromDb) byDate.set(log.date, log);
    for (const log of local) {
      const existing = byDate.get(log.date);
      if (!existing) {
        byDate.set(log.date, log);
        await syncConditionLogToSupabase(log);
      } else if (log.updatedAt > existing.updatedAt) {
        byDate.set(log.date, log);
        await syncConditionLogToSupabase(log);
      }
    }

    const merged = Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    saveConditionLogsLocal(merged);
    return merged;
  } catch (e) {
    console.warn("loadConditionLogsMerged failed", e);
    return local;
  }
}

/** 直近 N 日分（古い→新しい）。未記録日は null */
export function recentConditionSeries(
  days = 14,
  logsSource?: ConditionLog[]
): {
  date: string;
  log: ConditionLog | null;
}[] {
  const logs = logsSource ?? loadConditionLogs();
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
