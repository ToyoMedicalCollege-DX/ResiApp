import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "resiapp.settings.notifications.v2";

export type NotificationSettings = {
  pushEnabled: boolean;
  dailyReminderTime: string; // "HH:MM"
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  dailyReminderTime: "20:00",
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function normalizeTime(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return DEFAULT_NOTIFICATION_SETTINGS.dailyReminderTime;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function loadNotificationSettingsLocal(): NotificationSettings {
  if (!canUseStorage()) return { ...DEFAULT_NOTIFICATION_SETTINGS };
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("resiapp.settings.notifications.v1");
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      pushEnabled:
        typeof parsed.pushEnabled === "boolean"
          ? parsed.pushEnabled
          : DEFAULT_NOTIFICATION_SETTINGS.pushEnabled,
      dailyReminderTime: normalizeTime(
        typeof parsed.dailyReminderTime === "string"
          ? parsed.dailyReminderTime
          : DEFAULT_NOTIFICATION_SETTINGS.dailyReminderTime
      ),
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export function saveNotificationSettingsLocal(
  settings: NotificationSettings
): void {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

type DbRow = {
  push_enabled: boolean;
  daily_reminder_time: string;
};

function fromDb(row: DbRow): NotificationSettings {
  return {
    pushEnabled: row.push_enabled,
    dailyReminderTime: normalizeTime(String(row.daily_reminder_time)),
  };
}

function toDb(settings: NotificationSettings) {
  return {
    push_enabled: settings.pushEnabled,
    daily_reminder_time: `${settings.dailyReminderTime}:00`,
    updated_at: new Date().toISOString(),
  };
}

/** ローカル優先で読み、ログイン中なら Supabase も試す */
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  const local = loadNotificationSettingsLocal();
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return local;

    const { data, error } = await supabase
      .from("notification_settings")
      .select("push_enabled, daily_reminder_time")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) return local;
    const next = fromDb(data as DbRow);
    saveNotificationSettingsLocal(next);
    return next;
  } catch {
    return local;
  }
}

/** ローカル保存＋可能なら Supabase upsert */
export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<{ ok: boolean; error?: string }> {
  const normalized: NotificationSettings = {
    ...settings,
    dailyReminderTime: normalizeTime(settings.dailyReminderTime),
  };
  saveNotificationSettingsLocal(normalized);

  try {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) return { ok: true };

    const { error } = await supabase.from("notification_settings").upsert(
      {
        user_id: user.id,
        ...toDb(normalized),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.warn("notification_settings upsert:", error.message);
      return { ok: true, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: true,
      error: e instanceof Error ? e.message : "クラウド同期に失敗しました",
    };
  }
}
