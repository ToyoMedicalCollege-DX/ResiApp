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

    const { error } = await supabase.from("user_badges").upsert(
      {
        user_id: user.id,
        badge_key: badgeKey,
        earned_at: new Date().toISOString(),
        meta,
      },
      { onConflict: "user_id,badge_key", ignoreDuplicates: true }
    );
    if (error) console.warn("user_badges upsert:", error.message);
  } catch (e) {
    console.warn("user_badges sync failed", e);
  }
}
