"use client";

import { useState, useCallback } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Slide, Skill } from "@/lib/types";
import { saveWorkAnswer } from "@/lib/work-answers";

interface LessonSlidePlayerProps {
  slides: Slide[];
  skill: Skill;
  lessonId: string;
  lessonTitle: string;
  onComplete: () => void;
  onBack: () => void;
}

// ─── Individual slide renderers ───────────────────────────────

function IntroSlide({ slide, skill }: { slide: Slide; skill: Skill }) {
  // 画像あり：縦長画像をスクロール表示
  if (slide.image) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-5 py-6">
        <div className="w-full rounded-3xl bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt={slide.title ?? "レッスン開始"}
            className="w-full h-auto block rounded-3xl"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col items-center justify-center px-8 gap-6 text-white"
      style={{ background: `linear-gradient(160deg, ${skill.color} 0%, ${skill.color}CC 100%)` }}
    >
      {slide.emoji && (
        <div className="text-[72px] leading-none animate-bounce-slow">{slide.emoji}</div>
      )}
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-[26px] font-bold leading-tight">{slide.title}</h2>
        {slide.body && (
          <p className="text-[16px] text-white/85 leading-relaxed">{slide.body}</p>
        )}
      </div>
    </div>
  );
}

function LearnSlide({ slide, skill }: { slide: Slide; skill: Skill }) {
  const accent = slide.accentColor ?? skill.color;
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-5 py-6">
      <div className="flex flex-col gap-4 pb-2">
        {slide.image ? (
          <div className="w-full rounded-3xl bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image}
              alt={slide.title ?? "レッスン画像"}
              className="w-full h-auto block rounded-3xl"
            />
          </div>
        ) : (
          slide.emoji && (
            <div
              className="w-full rounded-3xl flex items-center justify-center py-8 text-[64px]"
              style={{ backgroundColor: `${accent}18` }}
            >
              {slide.emoji}
            </div>
          )
        )}
        {/* 画像に文言がある場合は title/body を出さない（重複防止） */}
        {!slide.image && slide.title && (
          <h3 className="text-[20px] font-bold text-t1 leading-snug">{slide.title}</h3>
        )}
        {slide.body && (
          <p className="text-[15px] text-t1 leading-[1.8] whitespace-pre-wrap">{slide.body}</p>
        )}
      </div>
    </div>
  );
}

function TipSlide({ slide, skill }: { slide: Slide; skill: Skill }) {
  const accent = slide.accentColor ?? skill.color;

  // 画像あり：画像のみ表示（文言は画像内）
  if (slide.image) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-5 py-6">
        <div className="w-full rounded-3xl bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt={slide.title ?? "ポイント"}
            className="w-full h-auto block rounded-3xl"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-5 py-6 flex flex-col gap-4">
      <div
        className="rounded-3xl p-5 flex flex-col gap-3"
        style={{ backgroundColor: `${accent}15`, borderLeft: `4px solid ${accent}` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[24px]">{slide.emoji ?? "💡"}</span>
          <span className="text-[13px] font-bold" style={{ color: accent }}>
            ポイント
          </span>
        </div>
        {slide.title && (
          <p className="text-[18px] font-bold text-t1 leading-snug">{slide.title}</p>
        )}
        {slide.body && (
          <p className="text-[14px] text-t1 leading-[1.8] whitespace-pre-wrap">{slide.body}</p>
        )}
      </div>
    </div>
  );
}

function QuizSlide({
  slide,
  skill,
  onAnswer,
  answered,
  selectedIdx,
}: {
  slide: Slide;
  skill: Skill;
  onAnswer: (idx: number) => void;
  answered: boolean;
  selectedIdx: number | null;
}) {
  const accent = slide.accentColor ?? skill.color;
  const quiz = slide.quiz!;
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-5 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-bold px-3 py-1 rounded-full text-white"
          style={{ backgroundColor: accent }}
        >
          クイズ
        </span>
      </div>
      <p className="text-[18px] font-bold text-t1 leading-snug">{quiz.question}</p>
      <div className="flex flex-col gap-3">
        {quiz.options.map((opt, i) => {
          let bg = "bg-card border-stroke";
          let textColor = "text-t1";
          if (answered) {
            if (opt.correct) {
              bg = "border-green-400";
              textColor = "text-green-700";
            } else if (i === selectedIdx && !opt.correct) {
              bg = "border-red-400";
              textColor = "text-red-500";
            }
          } else if (i === selectedIdx) {
            bg = `border-[${accent}]`;
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => onAnswer(i)}
              className={`w-full rounded-2xl border-2 px-4 py-4 text-left text-[14px] font-medium transition-all ${bg} ${textColor}`}
              style={
                !answered && i === selectedIdx
                  ? { borderColor: accent, backgroundColor: `${accent}10` }
                  : {}
              }
            >
              <span className="mr-2 font-bold" style={{ color: accent }}>
                {String.fromCharCode(65 + i)}.
              </span>
              {opt.label}
              {answered && opt.correct && <span className="ml-2">✓</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className="rounded-2xl p-4 text-[13px] leading-relaxed text-t1"
          style={{ backgroundColor: `${accent}12` }}
        >
          <span className="font-bold" style={{ color: accent }}>
            解説：
          </span>
          {quiz.explanation}
        </div>
      )}
    </div>
  );
}

function WorkSlide({
  slide,
  skill,
  value,
  onChange,
}: {
  slide: Slide;
  skill: Skill;
  value: string;
  onChange: (v: string) => void;
}) {
  const accent = slide.accentColor ?? skill.color;
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-5 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-bold px-3 py-1 rounded-full text-white"
          style={{ backgroundColor: accent }}
        >
          ワーク
        </span>
      </div>
      {slide.emoji && <div className="text-[48px] text-center">{slide.emoji}</div>}
      {slide.title && (
        <h3 className="text-[20px] font-bold text-t1 leading-snug">{slide.title}</h3>
      )}
      {slide.body && (
        <p className="text-[14px] text-t2 leading-[1.8] whitespace-pre-wrap">{slide.body}</p>
      )}
      {slide.work && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-t1">{slide.work.prompt}</p>
          <textarea
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={slide.work.hint ?? "ここに書いてみよう…"}
            className="w-full rounded-2xl border-2 border-stroke bg-bg px-4 py-3 text-[14px] text-t1 placeholder:text-t3 focus:outline-none focus:border-accent resize-none"
          />
        </div>
      )}
    </div>
  );
}

function SummarySlide({ slide, skill }: { slide: Slide; skill: Skill }) {
  const accent = slide.accentColor ?? skill.color;

  if (slide.image) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-5 py-6">
        <div className="w-full rounded-3xl bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt={slide.title ?? "まとめ"}
            className="w-full h-auto block rounded-3xl"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col items-center justify-center px-8 gap-6"
      style={{ background: `linear-gradient(160deg, ${accent}18 0%, ${accent}08 100%)` }}
    >
      <div className="text-[64px]">{slide.emoji ?? "🎉"}</div>
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-[22px] font-bold text-t1">{slide.title ?? "よく頑張ったね！"}</h2>
        {slide.body && (
          <p className="text-[14px] text-t2 leading-[1.8] whitespace-pre-wrap">{slide.body}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main player ─────────────────────────────────────────────

export default function LessonSlidePlayer({
  slides,
  skill,
  lessonId,
  lessonTitle,
  onComplete,
  onBack,
}: LessonSlidePlayerProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [quizAnswered, setQuizAnswered] = useState<boolean[]>(
    new Array(slides.length).fill(false)
  );
  const [quizSelected, setQuizSelected] = useState<(number | null)[]>(
    new Array(slides.length).fill(null)
  );
  const [workAnswers, setWorkAnswers] = useState<string[]>(
    () => new Array(slides.length).fill("")
  );

  const slide = slides[current];
  const total = slides.length;
  const progress = ((current + 1) / total) * 100;

  const canAdvance =
    slide.type !== "quiz" ||
    quizAnswered[current];

  const handleAnswer = useCallback(
    (idx: number) => {
      if (quizAnswered[current]) return;
      const next = [...quizSelected];
      next[current] = idx;
      setQuizSelected(next);
      const ans = [...quizAnswered];
      ans[current] = true;
      setQuizAnswered(ans);
    },
    [current, quizAnswered, quizSelected]
  );

  const persistWorkAnswers = () => {
    slides.forEach((s, i) => {
      if (s.type !== "work" || !s.work) return;
      const text = workAnswers[i]?.trim();
      if (!text) return;
      void saveWorkAnswer({
        skillId: skill.id,
        lessonId,
        promptKey: s.id || `work-${i}`,
        answerText: text,
      });
    });
  };

  const goNext = () => {
    if (!canAdvance) return;
    if (current === total - 1) {
      persistWorkAnswers();
      onComplete();
    } else {
      setDirection("forward");
      setCurrent((c) => c + 1);
    }
  };

  const goPrev = () => {
    if (current === 0) {
      onBack();
    } else {
      setDirection("back");
      setCurrent((c) => c - 1);
    }
  };

  const isLast = current === total - 1;
  const accent = skill.color;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-2 bg-card shadow-sm">
        <button onClick={goPrev}>
          {current === 0 ? (
            <X size={24} className="text-t2" />
          ) : (
            <ChevronLeft size={24} className="text-t1" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-t3">{skill.name}</p>
          <p className="text-[14px] font-bold text-t1 truncate">{lessonTitle}</p>
        </div>
        <span className="text-[12px] text-t3 flex-shrink-0">
          {current + 1} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 h-[6px] bg-stroke">
        <div
          className="h-full transition-all duration-300 ease-out rounded-r-full"
          style={{ width: `${progress}%`, backgroundColor: accent }}
        />
      </div>

      {/* Slide content — min-h-0 で flex 内スクロールを有効化 */}
      <div
        key={`${current}-${direction}`}
        className="flex-1 min-h-0 overflow-hidden flex flex-col animate-slide-in"
      >
        {slide.type === "intro" && <IntroSlide slide={slide} skill={skill} />}
        {slide.type === "learn" && <LearnSlide slide={slide} skill={skill} />}
        {slide.type === "tip" && <TipSlide slide={slide} skill={skill} />}
        {slide.type === "quiz" && (
          <QuizSlide
            slide={slide}
            skill={skill}
            onAnswer={handleAnswer}
            answered={quizAnswered[current]}
            selectedIdx={quizSelected[current]}
          />
        )}
        {slide.type === "work" && (
          <WorkSlide
            slide={slide}
            skill={skill}
            value={workAnswers[current] ?? ""}
            onChange={(v) => {
              setWorkAnswers((prev) => {
                const next = [...prev];
                next[current] = v;
                return next;
              });
            }}
          />
        )}
        {slide.type === "summary" && <SummarySlide slide={slide} skill={skill} />}
      </div>

      {/* Footer navigation */}
      <div className="flex-shrink-0 px-4 py-4 bg-bg border-t border-stroke">
        {slide.type === "quiz" && !quizAnswered[current] ? (
          <p className="text-center text-[13px] text-t3 py-2">
            選択肢をタップして答えよう
          </p>
        ) : (
          <button
            onClick={goNext}
            className="w-full flex items-center justify-center gap-2 h-[54px] rounded-[27px] font-bold text-[15px] text-white transition-opacity"
            style={{ backgroundColor: accent }}
          >
            {isLast ? (
              <>
                <CheckCircle size={18} />
                レッスン完了！
              </>
            ) : (
              <>
                次へ
                <ChevronRight size={18} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
