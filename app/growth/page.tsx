"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Music2 } from "lucide-react";
import TabBar from "@/components/TabBar";
import AppHeader from "@/components/AppHeader";
import { SKILLS, LESSONS_BY_SKILL } from "@/lib/mock-data";
import {
  BODY_TAG_OPTIONS,
  recentConditionSeries,
  type ConditionLog,
} from "@/lib/condition-storage";
import { pressureAlertCopy, type PressureAlert } from "@/lib/weather";
import {
  loadCheckScoreHistory,
  loadLatestCheckScores,
  type CheckScoreSnapshot,
  type LatestCheckScores,
} from "@/lib/check-storage";
import {
  countCompletedForSkill,
  loadLessonCompletions,
  type LessonCompletionMap,
} from "@/lib/lesson-completions";

type MetricKey = "phq" | "gad" | "psqi";

const METRICS: {
  key: MetricKey;
  short: string;
  label: string;
  color: string;
  bg: string;
  max: number;
  icon: "heart" | "music" | "sleep";
}[] = [
  {
    key: "phq",
    short: "こころ",
    label: "こころの状態",
    color: "#818CF8",
    bg: "#EEF2FF",
    max: 27,
    icon: "heart",
  },
  {
    key: "gad",
    short: "やすらぎ",
    label: "やすらぎの状態",
    color: "#38BDF8",
    bg: "#E0F2FE",
    max: 21,
    icon: "music",
  },
  {
    key: "psqi",
    short: "ねむり",
    label: "ねむりの状態",
    color: "#FB923C",
    bg: "#FFF7ED",
    max: 21,
    icon: "sleep",
  },
];

const MOOD_DOT: Record<number, string> = {
  5: "#FBBF24",
  4: "#10B981",
  3: "#E8895B",
  2: "#FB923C",
  1: "#C45C2A",
};

function MetricIcon({
  kind,
  color,
  size = 18,
}: {
  kind: "heart" | "music" | "sleep";
  color: string;
  size?: number;
}) {
  if (kind === "sleep") {
    return (
      <span
        className="font-black leading-none tracking-tighter"
        style={{ color, fontSize: size * 0.72 }}
        aria-hidden
      >
        zzz
      </span>
    );
  }
  if (kind === "music") {
    return <Music2 size={size} color={color} strokeWidth={2.4} />;
  }
  return (
    <Heart
      size={size}
      color={color}
      strokeWidth={2.4}
      fill={color}
      fillOpacity={0.15}
    />
  );
}

function formatShortDate(isoDate: string) {
  const [, m, d] = isoDate.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function formatChartLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function tagLabels(log: ConditionLog) {
  return log.bodyTags
    .map((t) => BODY_TAG_OPTIONS.find((o) => o.key === t)?.label)
    .filter(Boolean)
    .join("・");
}

/** 尺度ごとの直近最大4点（新しい順に積んで古い→新しいで返す） */
function seriesForMetric(
  history: CheckScoreSnapshot[],
  key: MetricKey
): { at: string; value: number }[] {
  const points: { at: string; value: number }[] = [];
  for (let i = history.length - 1; i >= 0 && points.length < 4; i--) {
    const v = history[i][key];
    if (typeof v === "number") {
      points.push({ at: history[i].at, value: v });
    }
  }
  return points.reverse();
}

export default function GrowthPage() {
  const [activeKey, setActiveKey] = useState<MetricKey>("phq");
  const [conditionSeries, setConditionSeries] = useState<
    { date: string; log: ConditionLog | null }[]
  >([]);
  const [latestScores, setLatestScores] = useState<LatestCheckScores>({});
  const [history, setHistory] = useState<CheckScoreSnapshot[]>([]);
  const [completions, setCompletions] = useState<LessonCompletionMap>({});
  const [ready, setReady] = useState(false);

  const active = METRICS.find((m) => m.key === activeKey) ?? METRICS[0];
  const chartPoints = useMemo(
    () => seriesForMetric(history, activeKey),
    [history, activeKey]
  );
  const first = chartPoints[0]?.value;
  const latest =
    typeof latestScores[activeKey] === "number"
      ? latestScores[activeKey]
      : chartPoints[chartPoints.length - 1]?.value;
  const improvedBy =
    typeof first === "number" && typeof latest === "number"
      ? first - latest
      : null;

  useEffect(() => {
    setConditionSeries(recentConditionSeries(14));
    setLatestScores(loadLatestCheckScores());
    setHistory(loadCheckScoreHistory());
    void loadLessonCompletions().then((map) => {
      setCompletions(map);
      setReady(true);
    });
  }, []);

  const logged = conditionSeries.filter((s) => s.log);
  const cautionOverlap = logged.filter(
    (s) =>
      s.log &&
      (s.log.pressureAlert === "caution" || s.log.pressureAlert === "mild") &&
      (s.log.bodyTags.includes("headache") ||
        s.log.bodyTags.includes("fatigue"))
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 px-5 pt-2 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-t1">成長記録</h1>
            <p className="text-[13px] text-t3 mt-1 leading-snug">
              点数が下がると、調子がよくなっているサインです
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {METRICS.map((metric) => {
              const latestVal = latestScores[metric.key];
              const series = seriesForMetric(history, metric.key);
              const startVal = series[0]?.value;
              const better =
                typeof startVal === "number" && typeof latestVal === "number"
                  ? startVal - latestVal
                  : null;
              const selected = metric.key === activeKey;
              return (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => setActiveKey(metric.key)}
                  className="rounded-2xl px-2 py-3 flex flex-col items-center gap-1.5 transition-all border-2"
                  style={{
                    backgroundColor: selected ? metric.bg : "#FFFFFF",
                    borderColor: selected ? metric.color : "transparent",
                    boxShadow: selected
                      ? "none"
                      : "0 1px 2px rgba(74,51,33,0.06)",
                  }}
                >
                  <MetricIcon kind={metric.icon} color={metric.color} />
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: metric.color }}
                  >
                    {metric.short}
                  </span>
                  <span
                    className="text-[22px] font-bold leading-none"
                    style={{ color: metric.color }}
                  >
                    {ready && typeof latestVal === "number" ? latestVal : "—"}
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{
                      color:
                        better == null
                          ? "#A89080"
                          : better > 0
                            ? "#27AE76"
                            : better < 0
                              ? "#EF4444"
                              : "#A89080",
                    }}
                  >
                    {better == null
                      ? "未記録"
                      : better > 0
                        ? `↓${better}`
                        : better < 0
                          ? `↑${Math.abs(better)}`
                          : "→0"}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="rounded-3xl p-5 flex flex-col gap-5 shadow-sm"
            style={{ backgroundColor: active.bg }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/80 flex items-center justify-center flex-shrink-0">
                <MetricIcon kind={active.icon} color={active.color} size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold text-t1">{active.label}</p>
                <p className="text-[12px] text-t2 mt-0.5">
                  {improvedBy == null
                    ? "チェックを続けると推移が見られます"
                    : improvedBy > 0
                      ? `記録のあいだに ${improvedBy} 点よくなりました`
                      : improvedBy < 0
                        ? `記録のあいだに ${Math.abs(improvedBy)} 点増えました`
                        : "記録のあいだに変化はありません"}
                </p>
              </div>
            </div>

            <div className="bg-white/80 rounded-2xl px-4 py-5">
              {chartPoints.length === 0 ? (
                <p className="text-[13px] text-t2 text-center py-10">
                  まだこのチェックの記録がありません
                </p>
              ) : (
                <div className="flex items-end justify-between gap-2 h-44">
                  {chartPoints.map((point, i) => {
                    const isLatest = i === chartPoints.length - 1;
                    const barH = Math.max(16, (point.value / active.max) * 132);
                    return (
                      <div
                        key={`${active.key}-${point.at}-${i}`}
                        className="flex flex-col items-center gap-2 flex-1 min-w-0"
                      >
                        <span
                          className="text-[16px] font-bold leading-none"
                          style={{
                            color: isLatest ? active.color : "#6B5344",
                          }}
                        >
                          {point.value}
                        </span>
                        <div className="w-full flex items-end justify-center h-[132px]">
                          <div
                            className="w-[78%] max-w-[52px] rounded-t-2xl transition-all"
                            style={{
                              height: barH,
                              backgroundColor: active.color,
                              opacity: isLatest ? 1 : 0.28,
                            }}
                          />
                        </div>
                        <span
                          className="text-[12px] font-semibold"
                          style={{
                            color: isLatest ? active.color : "#A89080",
                          }}
                        >
                          {formatChartLabel(point.at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {typeof first === "number" && typeof latest === "number" && (
              <div className="flex items-center justify-between text-[12px] font-semibold px-1">
                <span className="text-t2">
                  はじめ{" "}
                  <span style={{ color: active.color }}>{first}点</span>
                </span>
                <span className="text-t3">→</span>
                <span className="text-t2">
                  いま <span style={{ color: active.color }}>{latest}点</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-t1">最近の体調</h2>
              <p className="text-[12px] text-t3 mt-0.5">
                ホームで記録した気分の推移（直近14日）
              </p>
            </div>

            <div className="bg-card rounded-3xl p-4 shadow-sm flex flex-col gap-4">
              <div className="flex items-end justify-between gap-1 h-28 px-1">
                {conditionSeries.map(({ date, log }) => {
                  const score = log?.moodScore ?? 0;
                  const h = score > 0 ? 12 + score * 14 : 8;
                  const alert = log?.pressureAlert as
                    | PressureAlert
                    | null
                    | undefined;
                  const alertMark =
                    alert === "caution" || alert === "mild";
                  return (
                    <div
                      key={date}
                      className="flex flex-col items-center gap-1 flex-1 min-w-0"
                      title={date}
                    >
                      <div className="h-[90px] w-full flex items-end justify-center">
                        <div
                          className="w-[70%] max-w-[18px] rounded-t-md"
                          style={{
                            height: h,
                            backgroundColor: score
                              ? MOOD_DOT[score] ?? "#E8895B"
                              : "#F0E4D8",
                            opacity: score ? 1 : 0.55,
                          }}
                        />
                      </div>
                      <span
                        className="text-[9px] font-semibold leading-none"
                        style={{ color: alertMark ? "#C45C2A" : "#A89080" }}
                      >
                        {formatShortDate(date).split("/")[1]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-t3 leading-snug">
                棒の高さ＝気分（高いほど良い）。日付がオレンジの日は気圧注意日です。
              </p>

              {logged.length === 0 ? (
                <p className="text-[13px] text-t2 text-center py-2">
                  まだ体調記録がありません。ホームから残してみよう。
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {[...logged]
                    .reverse()
                    .slice(0, 7)
                    .map(({ date, log }) => {
                      if (!log) return null;
                      const tags = tagLabels(log);
                      const alert = log.pressureAlert;
                      const alertLabel =
                        alert && alert !== "normal"
                          ? pressureAlertCopy(alert).title
                          : null;
                      return (
                        <div
                          key={date}
                          className="rounded-2xl bg-bg px-3 py-2.5 flex flex-col gap-0.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-bold text-t1">
                              {formatShortDate(date)}
                            </span>
                            <span
                              className="text-[12px] font-bold"
                              style={{
                                color: MOOD_DOT[log.moodScore] ?? "#E8895B",
                              }}
                            >
                              気分 {log.moodScore}/5
                            </span>
                          </div>
                          {tags ? (
                            <p className="text-[11px] text-t2">{tags}</p>
                          ) : null}
                          {log.note ? (
                            <p className="text-[11px] text-t3">{log.note}</p>
                          ) : null}
                          {alertLabel ? (
                            <p className="text-[11px] font-semibold text-accent">
                              {alertLabel}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              )}

              {cautionOverlap.length > 0 && (
                <div className="rounded-2xl bg-accent-lt px-3 py-2.5">
                  <p className="text-[12px] font-bold text-accent">
                    振り返りヒント
                  </p>
                  <p className="text-[12px] text-t2 mt-0.5 leading-snug">
                    気圧注意の日に頭痛・だるさを付けた記録が{" "}
                    {cautionOverlap.length}{" "}
                    日あります。無理のサインかも。
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold text-t1">スキルの進み具合</h2>
            <div className="bg-card rounded-3xl p-4 shadow-sm flex flex-col gap-4">
              {SKILLS.map((skill) => {
                const lessonIds = (LESSONS_BY_SKILL[skill.id] ?? []).map(
                  (l) => l.id
                );
                const completedCount = countCompletedForSkill(
                  completions,
                  skill.id,
                  lessonIds
                );
                const ratio =
                  skill.totalLessons > 0
                    ? completedCount / skill.totalLessons
                    : 0;
                const pct = Math.round(ratio * 100);
                return (
                  <div key={skill.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-t1 truncate">
                        {skill.name}
                      </span>
                      <span
                        className="text-[12px] font-bold flex-shrink-0"
                        style={{ color: skill.color }}
                      >
                        {completedCount}/{skill.totalLessons}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden bg-stroke">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          minWidth: pct > 0 ? 6 : 0,
                          backgroundColor: skill.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  );
}
