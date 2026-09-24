"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sun,
  Smile,
  Meh,
  Frown,
  CloudRain,
  ArrowRight,
  CloudSun,
  CloudFog,
  Cloud,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  Droplets,
  Gauge,
  Sparkles,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import TabBar from "@/components/TabBar";
import AppHeader from "@/components/AppHeader";
import BriefConsultCard from "@/components/BriefConsultCard";
import {
  getConditionLog,
  todayKey,
  saveConditionLog,
  loadConditionLogsMerged,
  type MoodKey,
} from "@/lib/condition-storage";
import {
  fetchWeatherSnapshot,
  loadWeatherPrefs,
  saveWeatherPrefs,
  nearestWeatherRegion,
  environmentTipsFromWeather,
  weatherVisualKindFromCode,
  TIP_LEVEL_META,
  type TipLevel,
  type WeatherSnapshot,
  type WeatherVisualKind,
} from "@/lib/weather";

const MOOD_OPTIONS: {
  icon: typeof Sun;
  label: string;
  color: string;
  key: MoodKey;
}[] = [
  { icon: Sun, label: "最高", color: "#FBBF24", key: "great" },
  { icon: Smile, label: "良い", color: "#10B981", key: "good" },
  { icon: Meh, label: "普通", color: "#E8895B", key: "okay" },
  { icon: Frown, label: "つらい", color: "#FB923C", key: "bad" },
  { icon: CloudRain, label: "最低", color: "#C45C2A", key: "rough" },
];

const WEATHER_VISUAL: Record<
  WeatherVisualKind,
  { icon: LucideIcon; color: string; bg: string }
> = {
  clear: { icon: Sun, color: "#F59E0B", bg: "#FEF3C7" },
  mainly_clear: { icon: Sun, color: "#FBBF24", bg: "#FFFBEB" },
  partly_cloudy: { icon: CloudSun, color: "#E8895B", bg: "#FFE8D6" },
  cloudy: { icon: Cloud, color: "#64748B", bg: "#F1F5F9" },
  fog: { icon: CloudFog, color: "#94A3B8", bg: "#F8FAFC" },
  drizzle: { icon: CloudDrizzle, color: "#38BDF8", bg: "#E0F2FE" },
  rain: { icon: CloudRain, color: "#0EA5E9", bg: "#E0F2FE" },
  snow: { icon: CloudSnow, color: "#60A5FA", bg: "#EFF6FF" },
  showers: { icon: CloudRain, color: "#0284C7", bg: "#E0F2FE" },
  thunder: { icon: CloudLightning, color: "#7C3AED", bg: "#F5F3FF" },
  unknown: { icon: CloudSun, color: "#E8895B", bg: "#FFE8D6" },
};

const TIP_ICONS = {
  temperature: Thermometer,
  pressure: Gauge,
  humidity: Droplets,
} as const;

const TIP_LEVELS: TipLevel[] = [1, 2, 3, 4, 5];

function WeatherCard({
  weather,
  loading,
  failed,
}: {
  weather: WeatherSnapshot | null;
  loading: boolean;
  failed: boolean;
}) {
  if (loading && !weather) {
    return (
      <div className="bg-card rounded-3xl px-4 py-4 shadow-sm">
        <p className="text-[13px] text-t3">天気・気圧を取得中…</p>
      </div>
    );
  }
  if (failed && !weather) {
    return (
      <div className="bg-card rounded-3xl px-4 py-4 shadow-sm">
        <p className="text-[13px] text-t3">
          天気情報を取得できませんでした。あとでまた試してみてください。
        </p>
      </div>
    );
  }
  if (!weather) return null;

  const deltaText =
    weather.pressureDeltaHpa > 0
      ? `+${weather.pressureDeltaHpa}`
      : `${weather.pressureDeltaHpa}`;
  const visual =
    WEATHER_VISUAL[weatherVisualKindFromCode(weather.weatherCode)] ??
    WEATHER_VISUAL.unknown;
  const WeatherIcon = visual.icon;
  const tips = environmentTipsFromWeather({
    temperatureC: weather.temperatureC,
    humidityPct: weather.humidityPct,
    pressureHpa: weather.pressureHpa,
    pressureDeltaHpa: weather.pressureDeltaHpa,
    pressureAlert: weather.pressureAlert,
  });
  const showCareLink = tips.some((t) => t.level >= 4);

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-card rounded-3xl px-4 py-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: visual.bg }}
            aria-hidden
          >
            <WeatherIcon size={40} color={visual.color} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-t3">
              {weather.regionLabel}
            </p>
            <p className="text-[18px] font-bold text-t1 leading-tight mt-0.5">
              {weather.weatherLabel}
            </p>
            <p
              className="text-[28px] font-bold leading-none mt-1"
              style={{ color: visual.color }}
            >
              {Math.round(weather.temperatureC)}
              <span className="text-[16px] font-bold ml-0.5">℃</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-bg px-3 py-2.5 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-t3 flex items-center gap-1">
              <Gauge size={11} /> 気圧
            </span>
            <span className="text-[14px] font-bold text-t1">
              {weather.pressureHpa}
              <span className="text-[10px] font-semibold text-t3 ml-0.5">
                hPa
              </span>
            </span>
          </div>
          <div className="rounded-2xl bg-bg px-3 py-2.5 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-t3">
              気圧の24h変化
            </span>
            <span className="text-[14px] font-bold text-t1">
              {deltaText}
              <span className="text-[10px] font-semibold text-t3 ml-0.5">
                hPa
              </span>
            </span>
          </div>
          <div className="rounded-2xl bg-bg px-3 py-2.5 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-t3 flex items-center gap-1">
              <Droplets size={11} /> 湿度
            </span>
            <span className="text-[14px] font-bold text-t1">
              {weather.humidityPct}%
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-3xl px-4 py-4 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-bold text-t1">今日の気をつけること</p>
          <div
            className="flex flex-nowrap items-center justify-between gap-1"
            aria-label="注意度の色の目安"
          >
            {TIP_LEVELS.map((level) => {
              const meta = TIP_LEVEL_META[level];
              return (
                <span
                  key={level}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-t3 whitespace-nowrap"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: meta.badge }}
                    aria-hidden
                  />
                  {meta.short}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {tips.map((tip) => {
            const style = TIP_LEVEL_META[tip.level];
            const TipIcon = TIP_ICONS[tip.key];
            return (
              <div
                key={tip.key}
                className="rounded-2xl px-3 py-3 flex gap-2.5"
                style={{ backgroundColor: style.bg }}
              >
                <div
                  className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0"
                  aria-hidden
                >
                  <TipIcon size={18} color={style.badge} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-[12px] font-bold"
                      style={{ color: style.badge }}
                    >
                      {tip.label}
                    </p>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: style.badge }}
                    >
                      {style.short}
                    </span>
                  </div>
                  <p
                    className="text-[13px] leading-snug mt-0.5"
                    style={{ color: style.tone }}
                  >
                    {tip.advice}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {showCareLink && (
          <Link
            href="/training/sk5"
            className="inline-flex items-center gap-1 text-[12px] font-bold text-accent"
          >
            ねむりレッスンを見てみる
            <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [homeTab, setHomeTab] = useState<"condition" | "weather">("condition");
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [syncHint, setSyncHint] = useState("");
  const [hasTodayLog, setHasTodayLog] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherFailed, setWeatherFailed] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsHint, setGpsHint] = useState("");

  const loadWeatherForRegion = async (regionKey: string) => {
    setWeatherLoading(true);
    const snap = await fetchWeatherSnapshot(regionKey);
    if (snap) {
      setWeather(snap);
      setWeatherFailed(false);
    } else {
      setWeatherFailed(true);
    }
    setWeatherLoading(false);
  };

  useEffect(() => {
    const today = getConditionLog(todayKey());
    if (today) {
      setSelectedMood(today.mood);
      setHasTodayLog(true);
    }
    void loadConditionLogsMerged().then((logs) => {
      const t = logs.find((l) => l.date === todayKey());
      if (t) {
        setSelectedMood(t.mood);
        setHasTodayLog(true);
      }
    });
  }, []);

  useEffect(() => {
    const prefs = loadWeatherPrefs();
    let cancelled = false;
    (async () => {
      setWeatherLoading(true);
      const snap = await fetchWeatherSnapshot(prefs.regionKey);
      if (cancelled) return;
      if (snap) {
        setWeather(snap);
        setWeatherFailed(false);
      } else {
        setWeatherFailed(true);
      }
      setWeatherLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirmLocation = () => {
    if (gpsLoading) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsHint("この端末では位置情報が使えません");
      return;
    }
    setGpsLoading(true);
    setGpsHint("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = nearestWeatherRegion(
          pos.coords.latitude,
          pos.coords.longitude
        );
        saveWeatherPrefs({ regionKey: nearest.key });
        setGpsHint(`「${nearest.label}」の天気を表示しています`);
        setGpsLoading(false);
        void loadWeatherForRegion(nearest.key);
        window.setTimeout(() => setGpsHint(""), 2800);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsHint("位置情報の許可が必要です");
        } else {
          setGpsHint("現在地を取得できませんでした");
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 }
    );
  };

  const handleSaveCondition = () => {
    if (!selectedMood) return;
    setSyncHint("");
    void saveConditionLog({
      date: todayKey(),
      mood: selectedMood,
      bodyTags: [],
      note: "",
      pressureAlert: null,
    }).then(({ sync }) => {
      setHasTodayLog(true);
      setSavedFlash(true);
      if (!sync.ok) {
        setSyncHint(sync.error ?? "クラウド同期に失敗しました");
      }
      window.setTimeout(() => {
        setSavedFlash(false);
        setSyncHint("");
      }, 2200);
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <AppHeader />

      <div className="flex-shrink-0 px-4 pt-1 pb-2 bg-bg">
        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-card shadow-sm"
          role="tablist"
          aria-label="ホームの表示切替"
        >
          {(
            [
              { key: "condition", label: "体調入力" },
              { key: "weather", label: "体調天気予報" },
            ] as const
          ).map(({ key, label }) => {
            const active = homeTab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setHomeTab(key)}
                className="h-10 rounded-xl text-[13px] font-bold transition-colors"
                style={{
                  backgroundColor: active ? "#E8895B" : "transparent",
                  color: active ? "#FFFFFF" : "#6B5344",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {homeTab === "weather" && (
          <div className="mt-1.5 flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={handleConfirmLocation}
              disabled={gpsLoading}
              className="text-[11px] text-t3 underline underline-offset-2 decoration-stroke disabled:opacity-50"
            >
              {gpsLoading ? "現在地を取得中…" : "現在地を確認する"}
            </button>
            {gpsHint ? (
              <p className="text-[10px] font-semibold text-accent">{gpsHint}</p>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 pt-2 pb-6">
          {homeTab === "condition" && (
            <>
              <div className="bg-card rounded-3xl px-4 py-4 flex flex-col gap-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-bold text-t1">今日の体調</p>
                  {savedFlash && (
                    <span className="text-[11px] font-bold text-accent flex items-center gap-1 flex-shrink-0">
                      <Sparkles size={12} />
                      {syncHint ? "端末に保存" : "保存したよ"}
                    </span>
                  )}
                </div>
                {syncHint ? (
                  <p className="text-[11px] font-semibold text-[#DC2626] -mt-2">
                    {syncHint}
                  </p>
                ) : null}

                <div className="flex justify-between">
                  {MOOD_OPTIONS.map(({ icon: Icon, label, color, key }) => {
                    const isSelected = selectedMood === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedMood(key)}
                        className="flex flex-col items-center gap-[7px] flex-1"
                      >
                        <div
                          className="w-[46px] h-[46px] rounded-full flex items-center justify-center transition-all border-2"
                          style={{
                            backgroundColor: isSelected
                              ? `${color}20`
                              : "transparent",
                            borderColor: isSelected ? color : "transparent",
                          }}
                        >
                          <Icon
                            size={22}
                            color={color}
                            strokeWidth={isSelected ? 2.5 : 1.8}
                          />
                        </div>
                        <span
                          className="text-[10px] leading-none"
                          style={{
                            color: isSelected ? "#4A3321" : "#A89080",
                            fontWeight: isSelected ? 700 : 400,
                          }}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={!selectedMood}
                  onClick={handleSaveCondition}
                  className="h-12 rounded-[24px] bg-accent text-white text-[15px] font-bold disabled:opacity-40"
                >
                  {hasTodayLog ? "体調を更新する" : "体調を記録する"}
                </button>
              </div>

              <BriefConsultCard moodKey={selectedMood} />
            </>
          )}

          {homeTab === "weather" && (
            <WeatherCard
              weather={weather}
              loading={weatherLoading}
              failed={weatherFailed}
            />
          )}
        </div>
      </div>

      <TabBar />
    </div>
  );
}
