import { createClient } from "@/lib/supabase/client";
import type { SkillId } from "@/lib/types";

const STORAGE_KEY = "resiapp.training.completions.v1";

export type LessonCompletionMap = Record<string, string>; // lessonId → ISO completed_at

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function skillIdFromLessonId(lessonId: string): string {
  const m = lessonId.match(/^(sk[1-5])/);
  return m?.[1] ?? "sk1";
}

export function loadLessonCompletionsLocal(): LessonCompletionMap {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LessonCompletionMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLessonCompletionsLocal(map: LessonCompletionMap): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function isLessonCompleted(
  map: LessonCompletionMap,
  lessonId: string
): boolean {
  return Boolean(map[lessonId]);
}

export function countCompletedForSkill(
  map: LessonCompletionMap,
  skillId: string,
  lessonIds: string[]
): number {
  return lessonIds.filter((id) => map[id]).length;
}

async function upsertCompletionRow(input: {
  userId: string;
  skillId: string;
  lessonId: string;
  completedAt: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("lesson_completions").upsert(
    {
      user_id: input.userId,
      skill_id: input.skillId,
      lesson_id: input.lessonId,
      status: "completed",
      completed_at: input.completedAt,
    },
    { onConflict: "user_id,lesson_id" }
  );
  if (error) {
    console.warn("lesson_completions upsert:", error.message, error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** 端末にあって DB に無い完了をまとめて送る */
async function pushLocalCompletionsToSupabase(
  userId: string,
  local: LessonCompletionMap,
  dbKeys: Set<string>
): Promise<void> {
  const pending = Object.entries(local).filter(([id]) => !dbKeys.has(id));
  for (const [lessonId, completedAt] of pending) {
    await upsertCompletionRow({
      userId,
      skillId: skillIdFromLessonId(lessonId),
      lessonId,
      completedAt,
    });
  }
}

/** ローカル＋Supabase をマージ（双方向） */
export async function loadLessonCompletions(): Promise<LessonCompletionMap> {
  const local = loadLessonCompletionsLocal();
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return local;

    const { data, error } = await supabase
      .from("lesson_completions")
      .select("lesson_id, completed_at, skill_id")
      .eq("user_id", user.id);

    if (error) {
      console.warn("lesson_completions select:", error.message);
      return local;
    }

    const fromDb: LessonCompletionMap = {};
    for (const row of data ?? []) {
      if (row.lesson_id) {
        fromDb[row.lesson_id] = row.completed_at ?? new Date().toISOString();
      }
    }

    await pushLocalCompletionsToSupabase(
      user.id,
      local,
      new Set(Object.keys(fromDb))
    );

    const merged = { ...local, ...fromDb };
    // ローカル側の完了も残す（上で push 済み）
    for (const [id, at] of Object.entries(local)) {
      if (!merged[id]) merged[id] = at;
    }
    saveLessonCompletionsLocal(merged);
    return merged;
  } catch (e) {
    console.warn("loadLessonCompletions failed", e);
    return local;
  }
}

/** レッスン完了をローカル＋Supabase に保存 */
export async function markLessonCompleted(
  skillId: SkillId | string,
  lessonId: string
): Promise<{ ok: boolean; error?: string }> {
  const map = loadLessonCompletionsLocal();
  const at = new Date().toISOString();
  map[lessonId] = at;
  saveLessonCompletionsLocal(map);

  try {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) {
      return { ok: false, error: "ログインが必要です（端末には保存済み）" };
    }

    const result = await upsertCompletionRow({
      userId: user.id,
      skillId: String(skillId),
      lessonId,
      completedAt: at,
    });

    if (!result.ok) return result;

    try {
      const { awardBadge } = await import("@/lib/badges");
      const { trackAppEvent } = await import("@/lib/app-events");
      await awardBadge("first_lesson", { skillId, lessonId });
      const count = Object.keys(map).length;
      if (count >= 5) await awardBadge("lessons_5", { count });
      await trackAppEvent("lesson_complete", { skillId, lessonId });
    } catch (sideErr) {
      console.warn("lesson post-save hooks:", sideErr);
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "同期に失敗しました";
    console.warn("lesson_completions sync failed", msg);
    return { ok: false, error: msg };
  }
}
