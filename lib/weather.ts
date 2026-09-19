import { createClient } from "@/lib/supabase/client";

export type PressureAlert = "normal" | "mild" | "caution";

export type WeatherRegion = {
  key: string;
  label: string;
  lat: number;
  lon: number;
};

export const WEATHER_REGIONS: WeatherRegion[] = [
  { key: "osaka", label: "大阪", lat: 34.6937, lon: 135.5023 },
  { key: "tokyo", label: "東京", lat: 35.6762, lon: 139.6503 },
  { key: "kyoto", label: "京都", lat: 35.0116, lon: 135.7681 },
  { key: "nagoya", label: "名古屋", lat: 35.1815, lon: 136.9066 },
  { key: "fukuoka", label: "福岡", lat: 33.5904, lon: 130.4017 },
  { key: "sapporo", label: "札幌", lat: 43.0618, lon: 141.3545 },
];

export type WeatherSnapshot = {
  regionKey: string;
  regionLabel: string;
  fetchedAt: string;
  expiresAt: string;
  weatherCode: number;
  weatherLabel: string;
  temperatureC: number;
  humidityPct: number;
  pressureHpa: number;
  pressureDeltaHpa: number;
  pressureAlert: PressureAlert;
  source: "open-meteo";
};

const CACHE_MS = 45 * 60 * 1000;
const PREFS_KEY = "resiapp.weather.prefs.v1";
const CACHE_KEY = "resiapp.weather.cache.v2";

export type WeatherPrefs = {
  regionKey: string;
};

const DEFAULT_PREFS: WeatherPrefs = {
  regionKey: "osaka",
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadWeatherPrefs(): WeatherPrefs {
  if (!canUseStorage()) return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<WeatherPrefs> & {
      enabled?: boolean;
    };
    const regionOk = WEATHER_REGIONS.some((r) => r.key === parsed.regionKey);
    return {
      regionKey: regionOk ? (parsed.regionKey as string) : DEFAULT_PREFS.regionKey,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveWeatherPrefs(prefs: WeatherPrefs): void {
  if (!canUseStorage()) return;
  localStorage.setItem(PREFS_KEY, JSON.stringify({ regionKey: prefs.regionKey }));
  void syncWeatherPrefsToSupabase(prefs);
}

/** ログイン中なら user_preferences に upsert */
export async function syncWeatherPrefsToSupabase(
  prefs: WeatherPrefs
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) return { ok: true };

    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
        weather_region_key: prefs.regionKey,
        weather_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.warn("user_preferences upsert:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "同期に失敗しました";
    console.warn("user_preferences sync failed:", msg);
    return { ok: false, error: msg };
  }
}

export function getRegion(key: string): WeatherRegion {
  return WEATHER_REGIONS.find((r) => r.key === key) ?? WEATHER_REGIONS[0];
}

/** 緯度経度から最も近いプリセット地域を返す */
export function nearestWeatherRegion(
  lat: number,
  lon: number
): WeatherRegion {
  let best = WEATHER_REGIONS[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const region of WEATHER_REGIONS) {
    const d = haversineKm(lat, lon, region.lat, region.lon);
    if (d < bestDist) {
      bestDist = d;
      best = region;
    }
  }
  return best;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function weatherLabelFromCode(code: number): string {
  if (code === 0) return "晴れ";
  if (code === 1) return "おおむね晴れ";
  if (code === 2) return "晴れ時々くもり";
  if (code === 3) return "くもり";
  if (code === 45 || code === 48) return "霧";
  if (code >= 51 && code <= 57) return "霧雨";
  if (code === 61 || code === 63 || code === 65) return "雨";
  if (code === 66 || code === 67) return "凍雨";
  if (code >= 71 && code <= 77) return "雪";
  if (code === 80) return "くもり時々雨";
  if (code === 81 || code === 82) return "にわか雨";
  if (code === 85 || code === 86) return "にわか雪";
  if (code >= 95 && code <= 99) return "雷雨";
  if (code <= 3) return "くもり";
  if (code <= 67) return "雨";
  return "天気不明";
}

export type WeatherVisualKind =
  | "clear"
  | "mainly_clear"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "showers"
  | "thunder"
  | "unknown";

export function weatherVisualKindFromCode(code: number): WeatherVisualKind {
  if (code === 0) return "clear";
  if (code === 1) return "mainly_clear";
  if (code === 2) return "partly_cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 71 && code <= 77) return "snow";
  if (code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "thunder";
  if (code === 80 || code === 81 || code === 82) return "showers";
  if (code >= 61 && code <= 67) return "rain";
  return "unknown";
}

export function classifyPressureAlert(deltaHpa: number): PressureAlert {
  const abs = Math.abs(deltaHpa);
  // 下降をより重視：下降側は閾値を少し下げる
  if (deltaHpa <= -5 || abs >= 6) return "caution";
  if (deltaHpa <= -3 || abs >= 3) return "mild";
  return "normal";
}

export function pressureAlertCopy(alert: PressureAlert): {
  title: string;
  body: string;
  tone: string;
  bg: string;
} {
  switch (alert) {
    case "caution":
      return {
        title: "気圧に注意のヒント",
        body: "不調が出やすい条件かも。水分・休憩・睡眠を意識してみよう",
        tone: "#C45C2A",
        bg: "#FFE0CC",
      };
    case "mild":
      return {
        title: "気圧が変わりやすい日かも",
        body: "ペースを落として、無理しない一日にしよう",
        tone: "#D97706",
        bg: "#FEF3C7",
      };
    default:
      return {
        title: "気圧は安定気味",
        body: "特に気圧の大きな変化はなさそうです",
        tone: "#6B5344",
        bg: "#FFF1E6",
      };
  }
}

export type TipLevel = 1 | 2 | 3 | 4 | 5;

export type EnvironmentTip = {
  key: "temperature" | "pressure" | "humidity";
  label: string;
  level: TipLevel;
  advice: string;
};

/** 5段階：色をはっきり分ける（緑→青→灰→黄→赤） */
export const TIP_LEVEL_META: Record<
  TipLevel,
  { label: string; short: string; tone: string; bg: string; badge: string }
> = {
  1: {
    label: "とても良い",
    short: "良+",
    tone: "#0F766E",
    bg: "#CCFBF1",
    badge: "#0D9488",
  },
  2: {
    label: "良い",
    short: "良い",
    tone: "#1D4ED8",
    bg: "#DBEAFE",
    badge: "#2563EB",
  },
  3: {
    label: "ふつう",
    short: "ふつう",
    tone: "#475569",
    bg: "#F1F5F9",
    badge: "#64748B",
  },
  4: {
    label: "やや注意",
    short: "やや注",
    tone: "#A16207",
    bg: "#FEF08A",
    badge: "#CA8A04",
  },
  5: {
    label: "注意",
    short: "注意",
    tone: "#BE123C",
    bg: "#FECDD3",
    badge: "#E11D48",
  },
};

/** 気温・気圧・湿度それぞれに一言アドバイス（医療診断ではない環境の目安） */
export function environmentTipsFromWeather(input: {
  temperatureC: number;
  humidityPct: number;
  pressureHpa: number;
  pressureDeltaHpa: number;
  pressureAlert: PressureAlert;
}): EnvironmentTip[] {
  const tips: EnvironmentTip[] = [];
  const t = input.temperatureC;
  const h = input.humidityPct;
  const delta = input.pressureDeltaHpa;
  const absDelta = Math.abs(delta);

  // 気温（快適帯を中心に5段階）
  if (t >= 18 && t <= 23) {
    tips.push({
      key: "temperature",
      label: "気温",
      level: 1,
      advice: "過ごしやすい気温。無理のない範囲で体を動かしてみよう",
    });
  } else if ((t >= 15 && t <= 17) || (t >= 24 && t <= 26)) {
    tips.push({
      key: "temperature",
      label: "気温",
      level: 2,
      advice:
        t >= 24
          ? "やや暖かめ。のどが渇く前に水分を意識してみよう"
          : "やや涼しめ。羽織れる一枚があると安心",
    });
  } else if ((t >= 12 && t <= 14) || (t >= 27 && t <= 29)) {
    tips.push({
      key: "temperature",
      label: "気温",
      level: 3,
      advice:
        t >= 27
          ? "暑さを感じやすい。日陰と水分補給を意識してみよう"
          : "肌寒い日。首元を冷やさないよう気をつけて",
    });
  } else if ((t >= 6 && t <= 11) || (t >= 30 && t <= 32)) {
    tips.push({
      key: "temperature",
      label: "気温",
      level: 4,
      advice:
        t >= 30
          ? "暑さが強め。直射日光を避けて、こまめに休憩をとろう"
          : "冷え込みあり。足元をあたためて、急な外出は控えめに",
    });
  } else {
    // <=5 or >=33
    tips.push({
      key: "temperature",
      label: "気温",
      level: 5,
      advice:
        t >= 33
          ? "猛暑級の暑さ。無理な外出は避け、水分・塩分と休憩を優先しよう"
          : "強い冷え込み。あたため対策をしっかりして、ペースを落としてみよう",
    });
  }

  // 気圧
  if (input.pressureAlert === "caution" || absDelta >= 6 || delta <= -5) {
    tips.push({
      key: "pressure",
      label: "気圧",
      level: 5,
      advice:
        delta < 0
          ? "気圧が大きく下がっている日。頭痛やだるさが出やすいこともあるので、休憩と睡眠を意識しよう"
          : "気圧の変化が大きめ。予定は詰め込みすぎず、ペースを落としてみよう",
    });
  } else if (absDelta >= 4 || delta <= -3.5) {
    tips.push({
      key: "pressure",
      label: "気圧",
      level: 4,
      advice: "気圧が変わりやすい日。無理せず、こまめに水分と休憩をとろう",
    });
  } else if (
    input.pressureAlert === "mild" ||
    absDelta >= 2.5 ||
    input.pressureHpa <= 1005
  ) {
    tips.push({
      key: "pressure",
      label: "気圧",
      level: 3,
      advice: "気圧はやや揺れ気味。体調が揺らぎやすい人はゆったりめに過ごしてみよう",
    });
  } else if (absDelta >= 1 || input.pressureHpa <= 1012) {
    tips.push({
      key: "pressure",
      label: "気圧",
      level: 2,
      advice: "気圧はおおむね安定。調子を見ながら普段どおり過ごしてOK",
    });
  } else {
    tips.push({
      key: "pressure",
      label: "気圧",
      level: 1,
      advice: "気圧は安定気味。調子がよければ短い散歩やストレッチもおすすめ",
    });
  }

  // 湿度
  if (h >= 45 && h <= 55) {
    tips.push({
      key: "humidity",
      label: "湿度",
      level: 1,
      advice: "湿度はちょうどよさそう。のどが渇く前に、いつものペースで水分をとろう",
    });
  } else if ((h >= 40 && h <= 44) || (h >= 56 && h <= 64)) {
    tips.push({
      key: "humidity",
      label: "湿度",
      level: 2,
      advice:
        h >= 56
          ? "やや湿っぽい。室内の換気を少し意識してみよう"
          : "やや乾燥気味。水を飲むタイミングを意識してみよう",
    });
  } else if ((h >= 35 && h <= 39) || (h >= 65 && h <= 74)) {
    tips.push({
      key: "humidity",
      label: "湿度",
      level: 3,
      advice:
        h >= 65
          ? "湿気を感じやすい。通気をよくして、汗冷えに注意しよう"
          : "乾燥を感じやすい。こまめな水分補給を心がけよう",
    });
  } else if ((h >= 31 && h <= 34) || (h >= 75 && h <= 84)) {
    tips.push({
      key: "humidity",
      label: "湿度",
      level: 4,
      advice:
        h >= 75
          ? "湿気が多い。着替えや休憩を意識して、室内も風通しをよくしよう"
          : "空気が乾いている。のど・肌のケアと水分補給を意識しよう",
    });
  } else {
    tips.push({
      key: "humidity",
      label: "湿度",
      level: 5,
      advice:
        h >= 85
          ? "高湿度。無理な活動は控え、通気・水分・休憩を優先しよう"
          : "強い乾燥。のど・肌のケアと、こまめな水分補給を優先しよう",
    });
  }

  return tips;
}

function loadCache(): WeatherSnapshot | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeatherSnapshot;
  } catch {
    return null;
  }
}

function saveCache(snapshot: WeatherSnapshot): void {
  if (!canUseStorage()) return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
}

type OpenMeteoResponse = {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    surface_pressure: number;
  };
  hourly?: {
    time: string[];
    surface_pressure: (number | null)[];
  };
};

function pressureDeltaFromHourly(
  hourly: OpenMeteoResponse["hourly"],
  currentPressure: number,
  currentTimeIso: string
): number {
  if (!hourly?.time?.length || !hourly.surface_pressure?.length) return 0;
  const currentMs = Date.parse(currentTimeIso);
  let bestIdx = -1;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let i = 0; i < hourly.time.length; i++) {
    const t = Date.parse(hourly.time[i]);
    const age = currentMs - t;
    // 約24時間前（20〜28時間の窓）を探す
    if (age < 20 * 3600_000 || age > 28 * 3600_000) continue;
    const pressure = hourly.surface_pressure[i];
    if (pressure == null) continue;
    const diff = Math.abs(age - 24 * 3600_000);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) {
    // フォールバック：最も古い有効値との差
    for (let i = 0; i < hourly.surface_pressure.length; i++) {
      const p = hourly.surface_pressure[i];
      if (p != null) return Math.round((currentPressure - p) * 10) / 10;
    }
    return 0;
  }
  const past = hourly.surface_pressure[bestIdx] as number;
  return Math.round((currentPressure - past) * 10) / 10;
}

export async function fetchWeatherSnapshot(
  regionKey: string,
  opts?: { force?: boolean }
): Promise<WeatherSnapshot | null> {
  const region = getRegion(regionKey);
  const cached = loadCache();
  const now = Date.now();
  if (
    !opts?.force &&
    cached &&
    cached.regionKey === region.key &&
    Date.parse(cached.expiresAt) > now
  ) {
    return cached;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${region.lat}&longitude=${region.lon}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,surface_pressure` +
    `&hourly=surface_pressure&timezone=Asia%2FTokyo&forecast_days=2` +
    `&past_days=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return cached;
    const data = (await res.json()) as OpenMeteoResponse;
    const current = data.current;
    if (!current) return cached;

    const pressure = current.surface_pressure;
    const delta = pressureDeltaFromHourly(
      data.hourly,
      pressure,
      current.time
    );
    const alert = classifyPressureAlert(delta);
    const snapshot: WeatherSnapshot = {
      regionKey: region.key,
      regionLabel: region.label,
      fetchedAt: new Date().toISOString(),
      expiresAt: new Date(now + CACHE_MS).toISOString(),
      weatherCode: current.weather_code,
      weatherLabel: weatherLabelFromCode(current.weather_code),
      temperatureC: Math.round(current.temperature_2m * 10) / 10,
      humidityPct: Math.round(current.relative_humidity_2m),
      pressureHpa: Math.round(pressure * 10) / 10,
      pressureDeltaHpa: delta,
      pressureAlert: alert,
      source: "open-meteo",
    };
    saveCache(snapshot);
    return snapshot;
  } catch {
    return cached;
  }
}
