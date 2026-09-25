"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Heart,
  BookOpen,
  ClipboardCheck,
  AlertCircle,
  Phone,
  ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "セルフチェック",
    body: "こころ・やすらぎ・ねむりの調子を、定期的に振り返れます。",
  },
  {
    icon: BookOpen,
    title: "トレーニング",
    body: "レジリエンスを高めるレッスンを、自分のペースで学べます。",
  },
  {
    icon: Heart,
    title: "相棒キャラクター",
    body: "チェック結果に合わせて姿が変わり、いまの状態をやさしく伝えます。",
  },
];

export default function AboutPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4 bg-card shadow-sm">
        <Link href="/settings" aria-label="戻る" className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-t1" />
        </Link>
        <h1 className="text-[18px] font-bold text-t1">アプリについて</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 px-4 py-5 pb-8">
          {/* ブランド */}
          <div className="bg-card rounded-3xl p-6 shadow-sm flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-accent-lt flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192.png?v=2"
                alt="ResiApp"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-[22px] font-bold text-accent tracking-tight">
                ResiApp
              </p>
              <p className="text-[13px] text-t2 mt-1 leading-relaxed">
                学生向けレジリエンス・セルフケアアプリ
              </p>
            </div>
            <p className="text-[13px] text-t2 leading-relaxed max-w-sm">
              日々の調子を知り、小さなトレーニングを積み重ねて、心の回復力を育てることを目指しています。
            </p>
          </div>

          {/* できること */}
          <section className="flex flex-col gap-2">
            <h2 className="text-[12px] font-bold text-t3 px-1">できること</h2>
            <div className="bg-card rounded-3xl overflow-hidden shadow-sm divide-y divide-stroke">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3 px-4 py-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-lt flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-t1">{title}</p>
                    <p className="text-[12px] text-t3 mt-0.5 leading-relaxed">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ご利用上の注意 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-[12px] font-bold text-t3 px-1">ご利用上の注意</h2>
            <div className="rounded-3xl border-2 border-[#FCD34D] bg-[#FFFBEB] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#B45309]">
                <AlertCircle size={18} />
                <span className="text-[13px] font-bold">重要なご案内</span>
              </div>
              <ul className="flex flex-col gap-2 text-[12px] text-t2 leading-relaxed list-disc pl-4">
                <li>
                  セルフチェックは国際的な質問票を参考にした
                  <span className="font-semibold text-t1">参考情報</span>
                  であり、
                  <span className="font-semibold text-t1">医療診断ではありません</span>
                  。
                </li>
                <li>
                  結果だけで病気の有無を判断したり、治療の代わりにしたりしないでください。
                </li>
                <li>
                  つらい気持ちが続く・強まるときは、学校の相談窓口や専門家につながってください。
                </li>
              </ul>
            </div>
          </section>

          {/* サポートへの導線 */}
          <Link
            href="/support"
            className="bg-card rounded-3xl p-4 shadow-sm flex items-center gap-3 active:opacity-80"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
              <Phone size={20} color="#D97706" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-t1">サポートの連絡先</p>
              <p className="text-[12px] text-t3 mt-0.5">
                相談窓口一覧へ移動します
              </p>
            </div>
            <ChevronRight size={18} className="text-t3 flex-shrink-0" />
          </Link>

          <p className="text-center text-[11px] text-t3 leading-relaxed pt-1">
            ResiApp v0.1.0 — Demo
            <br />
            デモ版のため、一部機能は仮の挙動です
          </p>
        </div>
      </div>
    </div>
  );
}
