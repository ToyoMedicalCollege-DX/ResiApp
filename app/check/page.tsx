"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Music2,
  ChevronRight,
} from "lucide-react";
import TabBar from "@/components/TabBar";
import AppHeader from "@/components/AppHeader";
import { CHECK_HISTORY } from "@/lib/mock-data";
import { CHECK_TYPE_LIST, type CheckTypeId } from "@/lib/check";
import { createClient } from "@/lib/supabase/client";
import { departmentFromUser } from "@/lib/auth-display";
import {
  deptCharFallbackPath,
  deptCharImagePath,
} from "@/lib/dept-character";
import { isDepartment } from "@/lib/departments";

const LATEST = CHECK_HISTORY[CHECK_HISTORY.length - 1];
const PREV = CHECK_HISTORY[CHECK_HISTORY.length - 2];
const DELTA = LATEST.total - PREV.total;

const PROFILE_KEY = "resiapp.settings.profile";

const STATE_META: Record<
  CheckTypeId,
  { label: string; hint: string; icon: "heart" | "music" | "sleep" }
> = {
  phq: {
    label: "こころの状態",
    hint: "気分や意欲の調子",
    icon: "heart",
  },
  gad: {
    label: "やすらぎの状態",
    hint: "安心・くつろぎの調子",
    icon: "music",
  },
  psqi: {
    label: "ねむりの状態",
    hint: "眠りのリズムと質",
    icon: "sleep",
  },
};

const scoreLevel = (score: number) => {
  if (score >= 75) return { label: "良好", color: "#27AE76", bg: "#27AE7622" };
  if (score >= 50) return { label: "普通", color: "#FBBF24", bg: "#FBBF2422" };
  return { label: "注意", color: "#FB923C", bg: "#FB923C22" };
};

const level = scoreLevel(LATEST.total);

function StateIcon({
  kind,
  color,
}: {
  kind: "heart" | "music" | "sleep";
  color: string;
}) {
  if (kind === "sleep") {
    return (
      <span
        className="text-[15px] font-black leading-none tracking-tighter"
        style={{ color }}
        aria-hidden
      >
        zzz
      </span>
    );
  }
  if (kind === "music") {
    return <Music2 size={22} color={color} strokeWidth={2.4} />;
  }
  return (
    <Heart
      size={22}
      color={color}
      strokeWidth={2.4}
      fill={color}
      fillOpacity={0.15}
    />
  );
}

function loadLocalDepartment(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { department?: string };
    return typeof parsed.department === "string" ? parsed.department : "";
  } catch {
    return "";
  }
}

export default function CheckPage() {
  const [department, setDepartment] = useState("");
  const [charSrc, setCharSrc] = useState<string | null>(null);

  const TrendIcon = DELTA > 0 ? TrendingUp : DELTA < 0 ? TrendingDown : Minus;
  const trendColor = DELTA > 0 ? "#27AE76" : DELTA < 0 ? "#EF4444" : "#94A3B8";
  const trendText =
    DELTA > 0
      ? `先月より +${DELTA} ポイント`
      : DELTA < 0
        ? `先月より ${DELTA} ポイント`
        : "先月と同じスコア";

  useEffect(() => {
    const localDept = loadLocalDepartment();
    if (isDepartment(localDept)) setDepartment(localDept);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const fromAuth = departmentFromUser(data.user);
      if (isDepartment(fromAuth)) setDepartment(fromAuth);
      else if (isDepartment(localDept)) setDepartment(localDept);
    });
  }, []);

  useEffect(() => {
    setCharSrc(deptCharImagePath(department, LATEST.total));
  }, [department]);

  const fallbackSrc = deptCharFallbackPath(department);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-5 pt-2 pb-6">
          <h1 className="text-2xl font-bold text-t1">セルフチェック ✓</h1>

          {/* 今月の総合スコア */}
          <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-accent px-4 py-2">
              <span className="text-[12px] font-semibold text-white/90">
                今月の総合スコア
              </span>
            </div>
            <div className="px-4 py-3.5 flex gap-3 items-stretch">
              <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                <div className="flex items-end justify-between gap-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[36px] font-bold text-accent leading-none tracking-tight">
                      {LATEST.total}
                    </span>
                    <span className="text-[13px] font-semibold text-t3 pb-0.5">
                      / 100
                    </span>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-full mb-0.5"
                    style={{ backgroundColor: level.bg }}
                  >
                    <span
                      className="text-[12px] font-bold"
                      style={{ color: level.color }}
                    >
                      {level.label}
                    </span>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-stroke overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${LATEST.total}%` }}
                  />
                </div>

                <div
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
                  style={{ backgroundColor: `${trendColor}14` }}
                >
                  <TrendIcon size={14} color={trendColor} />
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: trendColor }}
                  >
                    {trendText}
                  </span>
                </div>
              </div>

              <div
                className="w-[96px] flex-shrink-0 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: level.bg }}
                aria-hidden={!charSrc}
              >
                {charSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={charSrc}
                    alt=""
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
                        e.currentTarget.src = fallbackSrc;
                      }
                    }}
                  />
                ) : (
                  <span className="text-[11px] font-semibold text-t3 px-2 text-center leading-snug">
                    学科未設定
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3つの状態（縦並び・わかりやすく） */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[14px] font-bold text-t2">あなたの状態</h2>
            {CHECK_TYPE_LIST.map((check) => {
              const meta = STATE_META[check.id];
              const value =
                check.id === "phq"
                  ? LATEST.phq
                  : check.id === "gad"
                    ? LATEST.gad
                    : LATEST.psqi;
              return (
                <div
                  key={check.id}
                  className="bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: check.bg }}
                  >
                    <StateIcon kind={meta.icon} color={check.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-t1">
                      {meta.label}
                    </p>
                    <p className="text-[12px] text-t3 mt-0.5">{meta.hint}</p>
                    <p
                      className="text-[20px] font-bold leading-none mt-2"
                      style={{ color: check.color }}
                    >
                      {value}
                      <span className="text-[12px] font-semibold text-t3 ml-1">
                        点
                      </span>
                    </p>
                  </div>
                  <Link
                    href={`/check/question?type=${check.id}`}
                    className="flex-shrink-0 h-10 px-3.5 rounded-full text-white text-[13px] font-bold flex items-center gap-1 shadow-sm active:opacity-80"
                    style={{ backgroundColor: check.color }}
                  >
                    チェック
                    <ChevronRight size={16} color="white" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  );
}
