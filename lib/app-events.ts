import { createClient } from "@/lib/supabase/client";

/** 簡易イベントを app_events に記録 */
export async function trackAppEvent(
  eventName: string,
  props: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    const { error } = await supabase.from("app_events").insert({
      user_id: user?.id ?? null,
      event_name: eventName,
      props,
    });
    if (error) console.warn("app_events insert:", error.message);
  } catch (e) {
    console.warn("app_events sync failed", e);
  }
}
