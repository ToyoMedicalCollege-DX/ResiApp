"use client";

import Link from "next/link";
import { Zap, Brain, Target, MessageCircle, Moon } from "lucide-react";
import TabBar from "@/components/TabBar";
import AppHeader from "@/components/AppHeader";
import { SKILLS } from "@/lib/mock-data";
import type { Skill } from "@/lib/types";

const SKILL_ICONS: Record<string, React.ElementType> = {
  Zap, Brain, Target, MessageCircle, Moon,
};

function SkillCard({ skill }: { skill: Skill }) {
  const Icon = SKILL_ICONS[skill.icon] ?? Zap;
  const progressRatio = skill.totalLessons > 0 ? skill.completedLessons / skill.totalLessons : 0;

  return (
    <Link href={`/training/${skill.id}`} className="block">
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${skill.color}22` }}
          >
            <Icon size={20} color={skill.color} />
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="text-[14px] font-bold text-t1 leading-tight">
              {skill.name}
            </span>
            <span className="text-[11px] text-t3 truncate">{skill.description}</span>
          </div>
          <span
            className="text-[11px] font-semibold flex-shrink-0"
            style={{ color: skill.color }}
          >
            {skill.completedLessons}/{skill.totalLessons}
          </span>
        </div>

        <div className="px-3.5 pb-2.5">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: `${skill.color}22` }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressRatio * 100}%`,
                minWidth: skill.completedLessons > 0 ? 3 : 0,
                backgroundColor: skill.color,
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function TrainingPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <AppHeader />

      <div className="flex-shrink-0 px-5 pt-2 pb-4">
        <h1 className="text-2xl font-bold text-t1">トレーニング</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2 px-4 py-3">
          {SKILLS.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      </div>

      <TabBar />
    </div>
  );
}
