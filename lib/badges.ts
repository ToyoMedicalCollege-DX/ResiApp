import { createClient } from "@/lib/supabase/client";

/** バッジを付与（既存なら何もしない） */
export async function awardBadge(
  badgeKey: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { error } = await supabase.from("user_badges").insert({
      user_id: user.id,
      badge_key: badgeKey,
      earned_at: new Date().toISOString(),
      meta,
    });
    // 23505 = unique_violation（既に持っている）
    if (error && error.code !== "23505") {
      console.warn("user_badges insert:", error.message);
    }
  } catch (e) {
    console.warn("user_badges sync failed", e);
  }
}
