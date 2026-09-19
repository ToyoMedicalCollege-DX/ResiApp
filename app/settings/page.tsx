"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  LogOut,
  Info,
  BookOpen,
  MapPin,
  LocateFixed,
  Bell,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  departmentFromUser,
  displayNameFromUser,
  initialFromUser,
  studentIdFromUser,
} from "@/lib/auth-display";
import {
  WEATHER_REGIONS,
  loadWeatherPrefs,
  nearestWeatherRegion,
  saveWeatherPrefs,
  type WeatherPrefs,
} from "@/lib/weather";
import { DEPARTMENTS, isDepartment } from "@/lib/departments";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from "@/lib/notification-settings";

const PROFILE_KEY = "resiapp.settings.profile";

type ProfileDraft = {
  name: string;
  department: string;
};

const DEFAULT_PROFILE: ProfileDraft = {
  name: "",
  department: "",
};

const CONSULTATION = [
  {
    name: "スチューデントサービスセンター",
    items: [
      {
        label: "スマホで予約",
        value: "www.jtsc-ssc.com/yoyaku/so.php",
        href: "https://www.jtsc-ssc.com/yoyaku/so.php",
        note: "24時間受付（受信後返信）",
      },
      {
        label: "電話で予約",
        value: "06-6152-5638",
        href: "tel:0661525638",
        note: "受付時間：月〜金 10:00〜17:00",
      },
      {
        label: "HPで予約",
        value: "www.jtsc-ssc.com",
        href: "https://www.jtsc-ssc.com",
        note: "24時間受付（受信後返信）",
      },
    ],
  },
  {
    name: "慶生会クリニック",
    items: [
      {
        label: "電話",
        value: "06-6533-8118",
        href: "tel:0665338118",
        note: "健康や病気に関すること",
      },
    ],
  },
  {
    name: "寮生活に関すること",
    items: [
      {
        label: "電話",
        value: "06-6245-6781",
        href: "tel:0662456781",
      },
    ],
  },
  {
    name: "教務部 / 事務局",
    items: [
      {
        label: "電話",
        value: "06-6398-2255",
        href: "tel:0663982255",
      },
    ],
  },
];

function stripSan(name: string): string {
  return name.replace(/さん$/, "").trim();
}

function loadProfile(): ProfileDraft {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<ProfileDraft> & {
      school?: string;
    };
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      department:
        typeof parsed.department === "string" ? parsed.department : "",
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [nameInput, setNameInput] = useState("");
  const [department, setDepartment] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [weatherPrefs, setWeatherPrefs] = useState<WeatherPrefs>({
    regionKey: "osaka",
  });
  const [weatherSaved, setWeatherSaved] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [initial, setInitial] = useState("？");
  const [studentIdLabel, setStudentIdLabel] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [notif, setNotif] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifHint, setNotifHint] = useState("");
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const profile = loadProfile();
    setDepartment(profile.department);
    setWeatherPrefs(loadWeatherPrefs());

    void loadNotificationSettings().then(setNotif);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        if (profile.name) {
          const shown = profile.name.endsWith("さん")
            ? profile.name
            : `${stripSan(profile.name)}さん`;
          setDisplayName(shown);
          setInitial(stripSan(shown).slice(0, 1) || "？");
          setNameInput(stripSan(profile.name));
        }
        setProfileReady(true);
        return;
      }
      const shown = displayNameFromUser(data.user);
      setDisplayName(shown);
      setInitial(initialFromUser(data.user));
      setStudentIdLabel(studentIdFromUser(data.user));
      setNameInput(stripSan(shown));
      const dept = departmentFromUser(data.user);
      if (dept) setDepartment(dept);
      else if (profile.department) setDepartment(profile.department);
      setProfileReady(true);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#support") return;
    const el = document.getElementById("support");
    if (!el) return;
    window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const handleSaveProfile = async () => {
    const trimmedName = nameInput.trim();
    const trimmedDept = department.trim();
    if (!trimmedName) {
      setSaveError("名前を入力してください");
      return;
    }
    if (!isDepartment(trimmedDept)) {
      setSaveError("所属学科を選択してください");
      return;
    }

    setSaving(true);
    setSaveError("");
    const next: ProfileDraft = {
      name: trimmedName,
      department: trimmedDept,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));

    try {
      const supabase = createClient();
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData.user;
      if (user) {
        const { error: metaError } = await supabase.auth.updateUser({
          data: { name: trimmedName, department: trimmedDept },
        });
        if (metaError) throw metaError;

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ name: trimmedName, department: trimmedDept })
          .eq("id", user.id);
        // profiles 未作成環境でもメタデータ更新は成功させる
        if (profileError && profileError.code !== "PGRST116") {
          console.warn("profiles update:", profileError.message);
        }

        const { data: refreshed } = await supabase.auth.getUser();
        if (refreshed.user) {
          setDisplayName(displayNameFromUser(refreshed.user));
          setInitial(initialFromUser(refreshed.user));
        } else {
          setDisplayName(
            trimmedName.endsWith("さん") ? trimmedName : `${trimmedName}さん`
          );
          setInitial(trimmedName.slice(0, 1) || "？");
        }
      } else {
        setDisplayName(
          trimmedName.endsWith("さん") ? trimmedName : `${trimmedName}さん`
        );
        setInitial(trimmedName.slice(0, 1) || "？");
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "保存に失敗しました。もう一度お試しください"
      );
    } finally {
      setSaving(false);
    }
  };

  const persistWeather = (next: WeatherPrefs) => {
    setWeatherPrefs(next);
    saveWeatherPrefs(next);
    setWeatherSaved(true);
    window.setTimeout(() => setWeatherSaved(false), 1600);
  };

  const persistNotif = async (next: NotificationSettings) => {
    setNotif(next);
    const result = await saveNotificationSettings(next);
    setNotifSaved(true);
    setNotifHint(
      result.error
        ? "端末に保存しました（クラウド同期は後で再試行されます）"
        : ""
    );
    window.setTimeout(() => {
      setNotifSaved(false);
      setNotifHint("");
    }, 1800);
  };

  const toggleNotif = (key: "pushEnabled") => {
    void persistNotif({ ...notif, [key]: !notif[key] });
  };

  const Switch = ({
    on,
    disabled,
    onClick,
  }: {
    on: boolean;
    disabled?: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className="w-12 h-7 rounded-full transition-colors flex-shrink-0 relative disabled:opacity-40"
      style={{ backgroundColor: on ? "#E8895B" : "#F0E4D8" }}
    >
      <span
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
        style={{ left: on ? 22 : 2 }}
      />
    </button>
  );

  const handleUseGps = () => {
    if (gpsLoading) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsMessage("この端末では位置情報が使えません");
      return;
    }
    setGpsLoading(true);
    setGpsMessage("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = nearestWeatherRegion(
          pos.coords.latitude,
          pos.coords.longitude
        );
        persistWeather({ regionKey: nearest.key });
        setGpsMessage(`現在地に近い「${nearest.label}」を選びました`);
        setGpsLoading(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsMessage("位置情報の許可が必要です。端末の設定を確認してください");
        } else {
          setGpsMessage("現在地を取得できませんでした");
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 }
    );
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4 bg-card shadow-sm">
        <Link href="/home" aria-label="戻る" className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-t1" />
        </Link>
        <h1 className="text-[18px] font-bold text-t1">設定</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-4 py-5 pb-8">
          <section className="flex flex-col gap-2">
            <h2 className="text-[12px] font-bold text-t3 px-1">アカウント</h2>
            <div className="bg-card rounded-3xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-accent-lt flex items-center justify-center flex-shrink-0">
                <span className="text-[22px] font-bold text-accent">
                  {profileReady ? initial : ""}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-t1 truncate">
                  {profileReady ? displayName || "ゲスト" : " "}
                </p>
                <p className="text-[12px] text-t3 mt-0.5 truncate">
                  {[studentIdLabel && `学籍番号 ${studentIdLabel}`, department]
                    .filter(Boolean)
                    .join(" · ") || "プロフィール未登録"}
                </p>
              </div>
              <User size={18} className="text-t3 flex-shrink-0" />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[12px] font-bold text-t3 px-1">プロフィール</h2>
            <div className="bg-card rounded-3xl p-4 shadow-sm flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-t2 flex items-center gap-1.5">
                  <User size={14} className="text-accent" />
                  名前
                </span>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="例：山田 太郎"
                  maxLength={40}
                  className="h-12 rounded-2xl border-2 border-stroke bg-bg px-4 text-[15px] font-medium text-t1 placeholder:text-t3 focus:outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-t2 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-accent" />
                  所属学科
                </span>
                <select
                  value={isDepartment(department) ? department : ""}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-12 rounded-2xl border-2 border-stroke bg-bg px-4 text-[15px] font-medium text-t1 focus:outline-none focus:border-accent"
                >
                  <option value="" disabled>
                    選択してください
                  </option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              {saveError && (
                <p className="text-[12px] font-semibold text-red-600">
                  {saveError}
                </p>
              )}
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="h-12 rounded-[24px] bg-accent text-white text-[15px] font-bold disabled:opacity-50"
              >
                {saved ? "保存しました" : saving ? "保存中…" : "プロフィールを保存"}
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[12px] font-bold text-t3 px-1">体調天気予報</h2>
            <div className="bg-card rounded-3xl p-4 shadow-sm flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-t2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-accent" />
                  地域を選ぶ
                </span>
                <select
                  value={weatherPrefs.regionKey}
                  onChange={(e) =>
                    persistWeather({
                      regionKey: e.target.value,
                    })
                  }
                  className="h-12 rounded-2xl border-2 border-stroke bg-bg px-4 text-[15px] font-medium text-t1 focus:outline-none focus:border-accent"
                >
                  {WEATHER_REGIONS.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleUseGps}
                disabled={gpsLoading}
                className="h-11 rounded-2xl border-2 border-stroke bg-bg text-[13px] font-bold text-t1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LocateFixed size={16} className="text-accent" />
                {gpsLoading ? "現在地を取得中…" : "GPSで近い地域を選ぶ"}
              </button>

              {(gpsMessage || weatherSaved) && (
                <p className="text-[12px] font-semibold text-accent">
                  {gpsMessage || "天気設定を保存しました"}
                </p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[12px] font-bold text-t3 px-1">通知設定</h2>
            <div className="bg-card rounded-3xl p-4 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-accent-lt flex items-center justify-center flex-shrink-0">
                  <Bell size={18} className="text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-t1">通知を受け取る</p>
                </div>
                <Switch
                  on={notif.pushEnabled}
                  onClick={() => toggleNotif("pushEnabled")}
                />
              </div>

              <div
                className={`flex flex-col gap-2 ${
                  notif.pushEnabled ? "" : "opacity-45 pointer-events-none"
                }`}
              >
                <p className="text-[14px] font-semibold text-t1">
                  毎日の通知時間
                </p>
                <input
                  type="time"
                  value={notif.dailyReminderTime}
                  disabled={!notif.pushEnabled}
                  onChange={(e) =>
                    void persistNotif({
                      ...notif,
                      dailyReminderTime: e.target.value || "20:00",
                    })
                  }
                  className="h-12 rounded-2xl border-2 border-stroke bg-bg px-4 text-[15px] font-medium text-t1 focus:outline-none focus:border-accent"
                  aria-label="毎日の通知時間"
                />
              </div>

              {notifSaved && (
                <p className="text-[12px] font-semibold text-accent">
                  {notifHint || "通知設定を保存しました"}
                </p>
              )}
            </div>
          </section>

          <section id="support" className="flex flex-col gap-2 scroll-mt-4">
            <h2 className="text-[12px] font-bold text-t3 px-1">サポート</h2>
            <div className="bg-card rounded-3xl overflow-hidden shadow-sm">
              <div className="px-4 py-3.5 flex items-center gap-3 border-b border-stroke">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                  <Phone size={20} color="#D97706" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-t1">相談窓口</p>
                  <p className="text-[12px] text-t3">
                    つらいときはひとりで抱えなくて大丈夫です
                  </p>
                </div>
              </div>

              <div className="divide-y divide-stroke">
                {CONSULTATION.map((group) => (
                  <div key={group.name} className="px-4 py-4 flex flex-col gap-3">
                    <p className="text-[14px] font-bold text-t1">{group.name}</p>
                    <div className="flex flex-col gap-2.5">
                      {group.items.map((item) => {
                        const content = (
                          <>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-t3">
                                {item.label}
                              </p>
                              <p className="text-[14px] font-bold text-accent break-all mt-0.5">
                                {item.value}
                              </p>
                              {"note" in item && item.note ? (
                                <p className="text-[11px] text-t3 mt-0.5">
                                  {item.note}
                                </p>
                              ) : null}
                            </div>
                            {"href" in item && item.href ? (
                              <ChevronRight
                                size={16}
                                className="text-t3 flex-shrink-0 mt-1"
                              />
                            ) : null}
                          </>
                        );

                        if ("href" in item && item.href) {
                          const external = item.href.startsWith("http");
                          return (
                            <a
                              key={`${group.name}-${item.label}`}
                              href={item.href}
                              {...(external
                                ? {
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                  }
                                : {})}
                              className="rounded-2xl bg-bg px-3 py-2.5 flex items-start justify-between gap-2"
                            >
                              {content}
                            </a>
                          );
                        }

                        return (
                          <div
                            key={`${group.name}-${item.label}`}
                            className="rounded-2xl bg-bg px-3 py-2.5"
                          >
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[12px] font-bold text-t3 px-1">その他</h2>
            <div className="bg-card rounded-3xl overflow-hidden shadow-sm">
              <Link
                href="/settings/about"
                className="w-full flex items-center gap-3 px-4 py-4 active:bg-bg/60"
              >
                <div className="w-10 h-10 rounded-xl bg-accent-lt flex items-center justify-center flex-shrink-0">
                  <Info size={20} className="text-accent" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[14px] font-semibold text-t1">
                    アプリについて
                  </p>
                  <p className="text-[12px] text-t3 mt-0.5">
                    セルフチェックは医療診断ではありません
                  </p>
                </div>
                <ChevronRight size={18} className="text-t3 flex-shrink-0" />
              </Link>
            </div>
          </section>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 bg-card rounded-2xl px-4 py-4 shadow-sm disabled:opacity-50"
          >
            <LogOut size={18} color="#E8895B" />
            <span className="text-[14px] font-semibold text-accent">
              {loggingOut ? "ログアウト中…" : "ログアウト"}
            </span>
          </button>

          <p className="text-center text-[11px] text-t3">
            ResiApp v0.1.0 — Demo
          </p>
        </div>
      </div>
    </div>
  );
}
