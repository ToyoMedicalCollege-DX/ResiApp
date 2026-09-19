"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, CheckCircle, AlertTriangle } from "lucide-react";
import {
  CHECK_TYPES,
  evaluateCheck,
  isCheckTypeId,
  parseTimeToMinutes,
  type CheckTypeId,
} from "@/lib/check";
import { saveLatestCheckScore, saveCheckSessionToSupabase } from "@/lib/check-storage";

function CheckQuestionContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const typeId: CheckTypeId = isCheckTypeId(typeParam) ? typeParam : "phq";
  const check = CHECK_TYPES[typeId];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeValue, setTimeValue] = useState("");
  const [done, setDone] = useState(false);
  const [startedAt] = useState(() => new Date().toISOString());
  const [finalAnswers, setFinalAnswers] = useState<(number | string)[] | null>(
    null
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">(
    "idle"
  );
  const [saveError, setSaveError] = useState("");

  const question = check.questions[current];
  const total = check.questions.length;
  const progress = (current / total) * 100;

  const timeValid = useMemo(() => {
    if (question.kind !== "time") return true;
    return parseTimeToMinutes(timeValue) !== null;
  }, [question, timeValue]);

  const canProceed =
    question.kind === "choice" ? selected !== null : timeValid;

  const handleNext = () => {
    if (!canProceed) return;
    const value =
      question.kind === "choice" ? (selected as number) : timeValue.trim();
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);
    setSelected(null);
    setTimeValue("");
    if (current + 1 >= total) {
      const { score, level, crisis } = evaluateCheck(typeId, newAnswers);
      setFinalAnswers(newAnswers);
      saveLatestCheckScore(typeId, score);
      setSaveStatus("saving");
      setSaveError("");
      setDone(true);
      void saveCheckSessionToSupabase({
        typeId,
        answers: newAnswers,
        score,
        band: level.label,
        crisis,
        startedAt,
      }).then((result) => {
        if (result.ok) {
          setSaveStatus("ok");
        } else {
          setSaveStatus("error");
          setSaveError(result.error ?? "クラウド保存に失敗しました");
        }
      });
    } else {
      setCurrent(current + 1);
    }
  };

  if (done) {
    const scoredAnswers = finalAnswers ?? answers;
    const { score, level, crisis } = evaluateCheck(typeId, scoredAnswers);

    return (
      <div className="h-full flex flex-col items-center justify-center px-8 gap-5 bg-bg overflow-y-auto py-8">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ backgroundColor: check.bg }}
        >
          <CheckCircle size={48} color={check.color} />
        </div>
        <h2 className="text-[24px] font-bold text-t1">チェック完了！</h2>
        <div className="bg-card rounded-3xl p-6 w-full flex flex-col items-center gap-3 shadow-sm">
          <span className="text-[13px] text-t3">スコア</span>
          <span
            className="text-[48px] font-bold leading-none"
            style={{ color: level.color }}
          >
            {score}
          </span>
          <span className="text-[12px] text-t3">
            （満点 {check.maxScore}）
          </span>
          <div
            className="px-4 py-1 rounded-full text-[13px] font-semibold"
            style={{ backgroundColor: `${level.color}22`, color: level.color }}
          >
            {level.label}
          </div>
          <p className="text-[13px] text-t2 text-center leading-relaxed mt-1">
            {level.message}
          </p>
        </div>

        {crisis && (
          <div className="w-full rounded-2xl border-2 border-[#FCA5A5] bg-[#FEF2F2] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#DC2626]">
              <AlertTriangle size={18} />
              <span className="text-[13px] font-bold">つらい気持ちがあるとき</span>
            </div>
            <p className="text-[12px] text-t2 leading-relaxed">
              ひとりで抱えなくて大丈夫です。必要ならサポートの連絡先を確認してください。
            </p>
            <Link
              href="/settings#support"
              className="w-full flex items-center justify-center h-[44px] rounded-[22px] border-2 border-[#DC2626] bg-white text-[#111827] text-[13px] font-bold"
            >
              サポートの連絡先を見る
            </Link>
          </div>
        )}

        <p className="text-[11px] text-t3 text-center leading-relaxed">
          本チェックは医療診断ではありません。参考としてご利用ください。
        </p>

        {saveStatus === "saving" && (
          <p className="text-[12px] font-semibold text-t3 text-center">
            結果を保存しています…
          </p>
        )}
        {saveStatus === "ok" && (
          <p className="text-[12px] font-semibold text-accent text-center">
            結果を保存しました
          </p>
        )}
        {saveStatus === "error" && (
          <p className="text-[12px] font-semibold text-[#DC2626] text-center px-2">
            端末には保存しました（クラウド: {saveError}）
          </p>
        )}

        <div className="w-full flex flex-col gap-3">
          <Link
            href="/check"
            className="w-full flex items-center justify-center h-[54px] rounded-[27px] bg-accent text-white font-bold text-[15px]"
          >
            スコアと相棒を見る
          </Link>
          <Link
            href={`/check/question?type=${typeId === "phq" ? "gad" : typeId === "gad" ? "psqi" : "phq"}`}
            className="w-full flex items-center justify-center h-[48px] rounded-[24px] border-2 border-stroke text-t1 font-bold text-[14px]"
          >
            別のチェックも受ける
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 bg-card">
        <Link href="/check" className="flex-shrink-0 p-1">
          <ChevronLeft size={24} className="text-t1" />
        </Link>
        <span className="text-[13px] sm:text-[14px] font-semibold text-t1 truncate">
          {check.name}
        </span>
        <span className="ml-auto text-[11px] sm:text-[12px] text-t3 flex-shrink-0">
          {current + 1} / {total}
        </span>
      </div>

      <div className="flex-shrink-0 h-1.5 bg-stroke">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: check.color }}
        />
      </div>

      {/* 画像＋回答：残り高さいっぱいで、画像は縮小・選択肢は常に見える */}
      <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-5 pt-3 pb-2 gap-3 max-w-lg mx-auto w-full">
        {question.image ? (
          <div className="flex-1 min-h-0 relative w-full">
            <div
              className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: check.bg }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.image}
                alt={question.text}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 py-2">
            {question.preface && (
              <p className="text-[12px] text-t3 font-semibold">{question.preface}</p>
            )}
            <p className="text-[16px] sm:text-[18px] font-bold text-t1 leading-snug">
              {question.text}
            </p>
          </div>
        )}

        {question.kind === "choice" ? (
          <div className="flex-shrink-0 grid grid-cols-2 gap-2 sm:gap-3">
            {question.options.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelected(value)}
                className={`min-h-[48px] sm:min-h-[56px] px-2 sm:px-3 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-center text-[13px] sm:text-[15px] font-semibold transition-all border-2 leading-snug ${
                  selected === value
                    ? "bg-accent-lt border-accent text-accent"
                    : "bg-card border-stroke text-t1"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-shrink-0 flex flex-col gap-2">
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="w-full h-[52px] sm:h-[56px] rounded-2xl border-2 border-stroke bg-card px-4 text-[16px] sm:text-[18px] font-bold text-t1 focus:outline-none focus:border-accent"
            />
            <p className="text-[12px] text-t3">
              例：{question.placeholder ?? "23:00"}（24時間表記）
            </p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-3 sm:px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:pt-3 bg-bg border-t border-stroke max-w-lg mx-auto w-full">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full h-[48px] sm:h-[54px] rounded-[27px] text-[14px] sm:text-[15px] font-bold transition-all ${
            canProceed
              ? "bg-accent text-white"
              : "bg-stroke text-t3 cursor-not-allowed"
          }`}
        >
          {current + 1 === total ? "完了する" : "次へ"}
        </button>
      </div>
    </div>
  );
}

export default function CheckQuestionPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center bg-bg text-t3 text-sm">
          読み込み中…
        </div>
      }
    >
      <CheckQuestionInner />
    </Suspense>
  );
}

/** Remount when type changes so state resets after「別のチェックも受ける」 */
function CheckQuestionInner() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") ?? "phq";
  return <CheckQuestionContent key={typeParam} />;
}
