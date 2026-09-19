import { createClient } from "@/lib/supabase/client";
import type { SkillId } from "@/lib/types";

const STORAGE_KEY = "resiapp.training.completions.v1";

export type LessonCompletionMap = Record<string, string>; // lessonId → ISO completed_at

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
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
  return lessonIds.filter((id) => id.startsWith(skillId) && map[id]).length;
}

/** ローカル＋ログイン中なら Supabase から完了一覧を取得 */
export async function loadLessonCompletions(): Promise<LessonCompletionMap> {
  const local = loadLessonCompletionsLocal();
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return local;

    const { data, error } = await supabase
      .from("lesson_completions")
      .select("lesson_id, completed_at")
      .eq("user_id", user.id);

    if (error || !data) return local;

    const fromDb: LessonCompletionMap = {};
    for (const row of data) {
      if (row.lesson_id) {
        fromDb[row.lesson_id] = row.completed_at ?? new Date().toISOString();
      }
    }
    const merged = { ...local, ...fromDb };
    saveLessonCompletionsLocal(merged);
    return merged;
  } catch {
    return local;
  }
}

/** レッスン完了をローカル＋Supabase に保存 */
export async function markLessonCompleted(
  skillId: SkillId | string,
  lessonId: string
): Promise<void> {
  const map = loadLessonCompletionsLocal();
  const at = new Date().toISOString();
  map[lessonId] = at;
  saveLessonCompletionsLocal(map);

  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { error } = await supabase.from("lesson_completions").upsert(
      {
        user_id: user.id,
        skill_id: skillId,
        lesson_id: lessonId,
        status: "completed",
        completed_at: at,
      },
      { onConflict: "user_id,lesson_id" }
    );
    if (error) console.warn("lesson_completions upsert:", error.message);
  } catch (e) {
    console.warn("lesson_completions sync failed", e);
  }
}
