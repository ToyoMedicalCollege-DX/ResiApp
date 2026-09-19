import { createClient } from "@/lib/supabase/client";

export type SupportClickInput = {
  linkKey: string;
  linkLabel: string;
  href: string;
  groupName: string;
};

/** 相談窓口リンクのクリックを support_link_clicks に記録 */
export async function logSupportLinkClick(
  input: SupportClickInput
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    const { error } = await supabase.from("support_link_clicks").insert({
      user_id: user?.id ?? null,
      link_key: input.linkKey,
      link_label: input.linkLabel,
      href: input.href,
      group_name: input.groupName,
      path:
        typeof window !== "undefined" ? window.location.pathname : "/settings",
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) console.warn("support_link_clicks insert:", error.message);
    else {
      const { trackAppEvent } = await import("@/lib/app-events");
      void trackAppEvent("support_link_click", {
        linkKey: input.linkKey,
        groupName: input.groupName,
      });
    }
  } catch (e) {
    console.warn("support_link_clicks sync failed", e);
  }
}
