"use client";

import { use, useState } from "react";
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
import { markLessonCompleted } from "@/lib/lesson-completions";
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
  const [completed, setCompleted] = useState(false);

  const skill = SKILLS.find((s) => s.id === skillId);
  const lessons = LESSONS_BY_SKILL[skillId] ?? [];
  const lesson = lessons.find((l) => l.id === lessonId) ?? TODAY_LESSON;
  const slides = SLIDES_MAP[skillId]?.[lessonId];

  const handleComplete = () => {
    void markLessonCompleted(skillId as SkillId, lessonId);
    setCompleted(true);
  };

  if (!skill)
    return (
      <div className="h-full flex items-center justify-center text-t2">
        スキルが見つかりません
      </div>
    );

  if (completed) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 gap-6 bg-bg">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${skill.color}20` }}
        >
          <CheckCircle size={48} color={skill.color} />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-[24px] font-bold text-t1">よく頑張ったね！</h2>
          <p className="text-[14px] text-t2 leading-relaxed">
            今日もレッスンを完了しました。
            <br />
            この調子で続けていこう！
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/home"
            className="flex items-center justify-center h-[54px] rounded-[27px] text-white font-bold text-[15px]"
            style={{ backgroundColor: skill.color }}
          >
            ホームに戻る
          </Link>
          <Link
            href={`/training/${skillId}`}
            className="flex items-center justify-center h-[54px] rounded-[27px] border-2 font-bold text-[15px]"
            style={{ borderColor: skill.color, color: skill.color }}
          >
            次のレッスンを見る
          </Link>
        </div>
      </div>
    );
  }

  if (slides && slides.length > 0) {
    return (
      <LessonSlidePlayer
        slides={slides}
        skill={skill}
        lessonTitle={lesson.title}
        onComplete={handleComplete}
        onBack={() => router.push(`/training/${skillId}`)}
      />
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
