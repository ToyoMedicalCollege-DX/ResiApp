"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { SKILLS, LESSONS_BY_SKILL, TODAY_LESSON } from "@/lib/mock-data";
import { SK1_SLIDES } from "@/lib/slides-sk1";
import { SK2_SLIDES } from "@/lib/slides-sk2";
import { SK3_SLIDES } from "@/lib/slides-sk3";
import { SK4_SLIDES } from "@/lib/slides-sk4";
import { SK5_SLIDES } from "@/lib/slides-sk5";
import LessonSlidePlayer from "@/components/LessonSlidePlayer";
import {
  isLessonCompleted,
  loadLessonCompletions,
  markLessonCompleted,
} from "@/lib/lesson-completions";
import type { SkillId } from "@/lib/types";

const SLIDES_MAP: Record<
  string,
  Record<string, import("@/lib/types").Slide[]>
> = {
  sk1: SK1_SLIDES,
  sk2: SK2_SLIDES,
  sk3: SK3_SLIDES,
  sk4: SK4_SLIDES,
  sk5: SK5_SLIDES,
};

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ skillId: string; lessonId: string }>;
}) {
  const { skillId, lessonId } = use(params);
  const router = useRouter();
  /** 今回の受講セッションが終わったか（完了画面表示用）。過去クリアではブロックしない */
  const [sessionDone, setSessionDone] = useState(false);
  /** 以前にクリア済みか（再受講時も進捗は維持） */
  const [wasCleared, setWasCleared] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">(
    "idle"
  );
  const [saveError, setSaveError] = useState("");

  const skill = SKILLS.find((s) => s.id === skillId);
  const lessons = LESSONS_BY_SKILL[skillId] ?? [];
  const lesson = lessons.find((l) => l.id === lessonId) ?? TODAY_LESSON;
  const slides = SLIDES_MAP[skillId]?.[lessonId];

  useEffect(() => {
    setSessionDone(false);
    setReady(false);
    void loadLessonCompletions().then((map) => {
      if (isLessonCompleted(map, lessonId)) {
        setWasCleared(true);
        setSaveStatus("ok");
      } else {
        setWasCleared(false);
      }
      setReady(true);
    });
  }, [lessonId]);

  const handleComplete = () => {
    setSessionDone(true);
    setWasCleared(true);
    setSaveStatus("saving");
    setSaveError("");
    void markLessonCompleted(skillId as SkillId, lessonId).then((result) => {
      if (result.ok) setSaveStatus("ok");
      else {
        setSaveStatus("error");
        setSaveError(result.error ?? "クラウド保存に失敗しました");
      }
    });
  };

  const handleReplay = () => {
    setSessionDone(false);
    setPlayerKey((k) => k + 1);
  };

  if (!skill)
    return (
      <div className="h-full flex items-center justify-center text-t2">
        スキルが見つかりません
      </div>
    );

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center text-t3 text-[13px] bg-bg">
        読み込み中…
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 gap-6 bg-bg">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${skill.color}20` }}
        >
          <CheckCircle size={48} color={skill.color} />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <p
            className="text-[12px] font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: `${skill.color}18`, color: skill.color }}
          >
            クリア済み
          </p>
          <h2 className="text-[24px] font-bold text-t1">よく頑張ったね！</h2>
          <p className="text-[14px] text-t2 leading-relaxed">
            レッスンを完了しました。
            <br />
            いつでももう一度開けます。
          </p>
          {saveStatus === "saving" && (
            <p className="text-[12px] font-semibold text-t3">進捗を保存しています…</p>
          )}
          {saveStatus === "ok" && (
            <p className="text-[12px] font-semibold text-accent">進捗を保存しました</p>
          )}
          {saveStatus === "error" && (
            <p className="text-[12px] font-semibold text-[#DC2626]">
              端末には保存しました（{saveError}）
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 w-full">
          <button
            type="button"
            onClick={handleReplay}
            className="flex items-center justify-center h-[54px] rounded-[27px] text-white font-bold text-[15px]"
            style={{ backgroundColor: skill.color }}
          >
            もう一度やる
          </button>
          <Link
            href={`/training/${skillId}`}
            className="flex items-center justify-center h-[54px] rounded-[27px] border-2 font-bold text-[15px]"
            style={{ borderColor: skill.color, color: skill.color }}
          >
            レッスン一覧に戻る
          </Link>
          <Link
            href="/home"
            className="flex items-center justify-center h-11 text-[13px] font-semibold text-t2"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (slides && slides.length > 0) {
    return (
      <div className="h-full flex flex-col bg-bg">
        {wasCleared ? (
          <div
            className="flex-shrink-0 flex items-center justify-center gap-1.5 py-2 text-[12px] font-bold"
            style={{ backgroundColor: `${skill.color}14`, color: skill.color }}
          >
            <CheckCircle size={14} />
            クリア済み・もう一度受講できます
          </div>
        ) : null}
        <div className="flex-1 min-h-0">
          <LessonSlidePlayer
            key={playerKey}
            slides={slides}
            skill={skill}
            lessonId={lessonId}
            lessonTitle={lesson.title}
            onComplete={handleComplete}
            onBack={() => router.push(`/training/${skillId}`)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 gap-4 bg-bg text-center">
      <p className="text-[16px] font-bold text-t1">スライドが見つかりません</p>
      <Link
        href={`/training/${skillId}`}
        className="text-[14px] font-semibold"
        style={{ color: skill.color }}
      >
        スキル一覧に戻る
      </Link>
    </div>
  );
}
