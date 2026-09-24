"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import {
  fetchConsultQuota,
  sendBriefConsult,
  type BriefConsultMessage,
} from "@/lib/brief-consult";

type Props = {
  moodKey?: string | null;
};

const WELCOME: BriefConsultMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "体調のこと、なんでも話しかけてください。短くお返事します。つらいときは設定の相談窓口も見てね。",
  createdAt: "",
};

export default function BriefConsultCard({ moodKey }: Props) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<BriefConsultMessage[]>([WELCOME]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState(5);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchConsultQuota().then((q) => {
      if (!q) return;
      setRemaining(q.remaining);
      setDailyLimit(q.dailyLimit);
    });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const limitReached = remaining !== null && remaining <= 0;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || limitReached) return;

    const userMsg: BriefConsultMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setSending(true);

    const result = await sendBriefConsult(text, { moodKey });
    if (typeof result.remaining === "number") {
      setRemaining(result.remaining);
    }
    if (typeof result.dailyLimit === "number") {
      setDailyLimit(result.dailyLimit);
    }

    if (result.ok && result.message) {
      setMessages((prev) => [...prev, result.message!]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            result.error ??
            "うまくお返事できませんでした。少し時間をおいて再度お試しください。",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setSending(false);
  };

  return (
    <div className="bg-card rounded-3xl shadow-sm overflow-hidden flex flex-col h-[340px]">
      <div className="flex-shrink-0 px-4 py-3 border-b border-stroke bg-card flex items-center justify-between gap-2">
        <p className="text-[15px] font-bold text-t1">体調相談</p>
        {remaining !== null ? (
          <p className="text-[11px] font-semibold text-t3 whitespace-nowrap">
            本日あと {remaining}/{dailyLimit} 回
          </p>
        ) : null}
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-2.5"
        style={{ backgroundColor: "#FFF8EE" }}
      >
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-accent-lt overflow-hidden flex-shrink-0 mr-2 mt-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon-192.png?v=2"
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div
                className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                  isUser
                    ? "rounded-2xl rounded-br-md bg-accent text-white"
                    : "rounded-2xl rounded-bl-md bg-white text-t1"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent-lt overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192.png?v=2"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-t3 animate-pulse" />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-t3 animate-pulse"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-t3 animate-pulse"
                  style={{ animationDelay: "0.3s" }}
                />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-stroke bg-card px-3 py-2.5 flex flex-col gap-1.5">
        {limitReached ? (
          <p className="text-[11px] font-semibold text-accent px-1">
            本日の上限に達しました。また明日お話ししましょう。
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void handleSend();
              }
            }}
            maxLength={200}
            placeholder={
              limitReached ? "本日の相談は終了です" : "メッセージを入力"
            }
            disabled={limitReached}
            className="flex-1 h-10 rounded-full border-2 border-stroke bg-bg px-4 text-[14px] text-t1 placeholder:text-t3 focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending || limitReached}
            className="h-10 w-10 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            aria-label="送信"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
