import { createClient } from "@/lib/supabase/client";
import type { SkillId } from "@/lib/types";

/** トレーニング・ワーク回答を work_answers に保存 */
export async function saveWorkAnswer(input: {
  skillId: SkillId | string;
  lessonId: string;
  promptKey: string;
  answerText: string;
}): Promise<void> {
  const text = input.answerText.trim();
  if (!text) return;

  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { error } = await supabase.from("work_answers").upsert(
      {
        user_id: user.id,
        skill_id: input.skillId,
        lesson_id: input.lessonId,
        prompt_key: input.promptKey,
        answer_text: text,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id,prompt_key" }
    );
    if (error) console.warn("work_answers upsert:", error.message);
  } catch (e) {
    console.warn("work_answers sync failed", e);
  }
}
