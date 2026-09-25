"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import {
  CONSULT_WELCOME_TEXT,
  fetchConsultHistory,
  fetchConsultQuota,
  sendBriefConsult,
  type BriefConsultMessage,
} from "@/lib/brief-consult";
import { jstDateKey } from "@/lib/consult-constants";

type Props = {
  moodKey?: string | null;
};

function formatDayLabel(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

export default function BriefConsultCard({ moodKey }: Props) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<BriefConsultMessage[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottom = useRef(true);

  useEffect(() => {
    void (async () => {
      const [q, historyResult] = await Promise.all([
        fetchConsultQuota(),
        fetchConsultHistory(),
      ]);
      if (q) {
        setRemaining(q.remaining);
        setDailyLimit(q.dailyLimit);
      }
      if (historyResult.error) {
        setHistoryError(historyResult.error);
      }
      if (historyResult.messages.length > 0) {
        setMessages(historyResult.messages);
      } else {
        // 未ログイン等でサーバー挿入できない場合のフォールバック
        setMessages([
          {
            id: "welcome-local",
            role: "assistant",
            content: CONSULT_WELCOME_TEXT,
            createdAt: new Date().toISOString(),
            isWelcome: true,
          },
        ]);
      }
      setHistoryReady(true);
      shouldStickToBottom.current = true;
    })();
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !historyReady) return;
    if (!shouldStickToBottom.current) return;
    // レイアウト確定後に末尾へ
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, sending, historyReady]);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottom.current = distanceFromBottom < 80;
  };

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
    shouldStickToBottom.current = true;
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

  let lastDayKey = "";

  return (
    <div className="bg-card rounded-3xl shadow-sm overflow-hidden flex flex-col h-[380px]">
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
        onScroll={onListScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-2.5"
        style={{ backgroundColor: "#FFF8EE" }}
      >
        {!historyReady ? (
          <p className="text-[12px] text-t3 text-center py-4">
            履歴を読み込み中…
          </p>
        ) : null}
        {historyError ? (
          <p className="text-[11px] text-[#C45C2A] text-center px-2">
            {historyError}
          </p>
        ) : null}
        {messages.map((m) => {
          const isUser = m.role === "user";
          const suggestion = m.suggestion;
          const dayKey = m.createdAt ? jstDateKey(m.createdAt) : "";
          const showDay = Boolean(dayKey && dayKey !== lastDayKey);
          if (dayKey) lastDayKey = dayKey;

          return (
            <div key={m.id} className="flex flex-col gap-2">
              {showDay ? (
                <p className="text-[10px] font-semibold text-t3 text-center py-1">
                  {formatDayLabel(m.createdAt)}
                </p>
              ) : null}
              <div
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
                <div className="max-w-[78%] flex flex-col gap-1.5">
                  <div
                    className={`px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                      isUser
                        ? "rounded-2xl rounded-br-md bg-accent text-white"
                        : m.isWelcome
                          ? "rounded-2xl rounded-bl-md bg-accent-lt text-t1"
                          : "rounded-2xl rounded-bl-md bg-white text-t1"
                    }`}
                  >
                    {m.content}
                  </div>
                  {!isUser && suggestion ? (
                    <Link
                      href={suggestion.href}
                      className="inline-flex items-center gap-1 self-start rounded-full bg-accent-lt px-3 py-1.5 text-[12px] font-bold text-accent"
                    >
                      {suggestion.label}
                      <ArrowRight size={13} />
                    </Link>
                  ) : null}
                </div>
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
