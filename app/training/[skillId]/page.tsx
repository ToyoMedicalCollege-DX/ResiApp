"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, BookOpen, PenLine, RotateCcw, Lock } from "lucide-react";
import { CheckCircle } from "lucide-react";
import { SKILLS, LESSONS_BY_SKILL } from "@/lib/mock-data";
import type { Lesson } from "@/lib/types";

const TYPE_CONFIG = {
  learn:  { icon: BookOpen,  label: "学習" },
  work:   { icon: PenLine,   label: "ワーク" },
  review: { icon: RotateCcw, label: "振り返り" },
};

function LessonRow({
  lesson,
  index,
  isUnlocked,
  themeColor,
  themeBg,
}: {
  lesson: Lesson;
  index: number;
  isUnlocked: boolean;
  themeColor: string;
  themeBg: string;
}) {
  const config = TYPE_CONFIG[lesson.type];
  const TypeIcon = config.icon;

  const inner = (
    <div
      className={`flex items-center gap-3 px-4 py-4 bg-card rounded-2xl transition-opacity ${
        isUnlocked ? "opacity-100" : "opacity-40"
      }`}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[13px]"
        style={{
          backgroundColor: lesson.completed
            ? themeColor
            : isUnlocked
              ? themeBg
              : "#F5EDE4",
          color: lesson.completed
            ? "#FFF"
            : isUnlocked
              ? themeColor
              : "#A89080",
        }}
      >
        {lesson.completed ? (
          <CheckCircle size={16} color="#FFF" />
        ) : (
          index + 1
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-[14px] font-semibold leading-snug ${
            isUnlocked ? "text-t1" : "text-t3"
          }`}
        >
          {lesson.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <TypeIcon size={11} color={isUnlocked ? themeColor : "#A89080"} />
          <span
            className="text-[11px]"
            style={{ color: isUnlocked ? themeColor : "#A89080" }}
          >
            {config.label}
          </span>
          <span className="text-[11px] text-t3 ml-1">{lesson.duration}分</span>
        </div>
      </div>

      {!isUnlocked && <Lock size={16} className="text-t3 flex-shrink-0" />}
    </div>
  );

  return isUnlocked ? (
    <Link href={`/training/${lesson.skillId}/${lesson.id}`}>{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}

export default function SkillPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = use(params);
  const skill = SKILLS.find((s) => s.id === skillId);
  const lessons = LESSONS_BY_SKILL[skillId] ?? [];

  if (!skill)
    return (
      <div className="h-full flex items-center justify-center text-t2">
        スキルが見つかりません
      </div>
    );

  const progressRatio = skill.completedLessons / skill.totalLessons;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      {/* Header */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{ backgroundColor: skill.color }}
      >
        <div className="flex items-end gap-3 px-4 pt-4 pb-3">
          <Link
            href="/training"
            className="flex items-center justify-center w-8 h-8 -ml-1 mb-0.5"
            aria-label="戻る"
          >
            <ChevronLeft size={24} color="#FFF" />
          </Link>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[11px] text-white/70">{skill.shortName}</span>
            <span className="text-[20px] font-bold text-white truncate leading-tight">
              {skill.name}
            </span>
          </div>
          <span className="text-[12px] text-white/80 flex-shrink-0 pb-0.5">
            {skill.completedLessons}/{skill.totalLessons}
          </span>
        </div>
        {/* 下端は全幅で揃え、進捗は白のオーバーレイで表現 */}
        <div className="h-1.5 w-full bg-black/15">
          <div
            className="h-full bg-white/70"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Lesson List — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 px-4 py-4">
          {lessons.length > 0 ? (
            lessons.map((lesson, i) => {
              // 完了済み、または次のレッスン、またはスライド実装済みスキルは閲覧可
              const slidesReady = ["sk1", "sk2", "sk3", "sk4", "sk5"].includes(skillId);
              const isUnlocked =
                slidesReady || lesson.completed || i <= skill.completedLessons;
              return (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  index={i}
                  isUnlocked={isUnlocked}
                  themeColor={skill.color}
                  themeBg={skill.bgColor}
                />
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: skill.bgColor }}
              >
                <BookOpen size={32} color={skill.color} />
              </div>
              <p className="text-[16px] font-bold text-t1">コンテンツ準備中</p>
              <p className="text-[13px] text-t2">このスキルのレッスンは近日公開予定です。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
