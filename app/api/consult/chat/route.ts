import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildConsultSystemPrompt,
  suggestionFromKind,
  type ConsultSuggestion,
} from "@/lib/consult-routing";
import {
  CONSULT_DAILY_LIMIT,
  CONSULT_WELCOME_MODEL,
  startOfTodayJstIso,
} from "@/lib/consult-constants";

export const runtime = "nodejs";

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 350;
const DAILY_LIMIT = CONSULT_DAILY_LIMIT;
const HISTORY_LIMIT = 8;
type MoodKey = "great" | "good" | "okay" | "bad" | "rough";

function normalizeMood(raw: unknown): MoodKey | null {
  if (
    raw === "great" ||
    raw === "good" ||
    raw === "okay" ||
    raw === "bad" ||
    raw === "rough"
  ) {
    return raw;
  }
  return null;
}

async function countUserMessagesToday(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  const since = startOfTodayJstIso();
  const { count, error } = await supabase
    .from("consult_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", since);
  if (error) {
    console.warn("consult daily count:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function ensureOpenThread(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  mood: MoodKey | null
): Promise<string> {
  const { data: existing } = await supabase
    .from("consult_threads")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("consult_threads")
    .insert({
      user_id: userId,
      status: "open",
      mood_at_start: mood,
    })
    .select("id")
    .single();
  if (error || !created?.id) {
    throw new Error(error?.message || "相談スレッドを作成できませんでした");
  }
  return created.id as string;
}

async function callOpenAI(input: {
  mood: MoodKey | null;
  history: { role: "user" | "assistant"; content: string }[];
  userText: string;
}): Promise<{
  content: string;
  suggestion: ConsultSuggestion | null;
  tokenIn?: number;
  tokenOut?: number;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY が未設定です。.env.local / Vercel に設定してください。"
    );
  }

  const moodLine =
    input.mood != null
      ? `（参考：いまの気分キーは ${input.mood}）`
      : "";

  // history の assistant 側は reply 本文だけ（過去の JSON は送らない）
  const messages = [
    { role: "system" as const, content: buildConsultSystemPrompt() },
    ...input.history,
    {
      role: "user" as const,
      content: `${input.userText}${moodLine ? `\n${moodLine}` : ""}`,
    },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.6,
      response_format: { type: "json_object" },
    }),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI エラー (${res.status})`);
  }

  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("AIからの返信が空でした");
  }

  let reply = raw;
  let suggestion: ConsultSuggestion | null = null;
  try {
    const parsed = JSON.parse(raw) as {
      reply?: string;
      suggest?: string;
      reason?: string;
    };
    reply = String(parsed.reply ?? "").trim() || raw;
    suggestion = suggestionFromKind(parsed.suggest, parsed.reason);
  } catch {
    // JSON でなくても本文はそのまま使う
    suggestion = null;
  }

  // 危機ワードはモデル任せにしつつ、サーバー側でも support を優先
  if (looksLikeCrisis(input.userText)) {
    suggestion = suggestionFromKind(
      "support",
      "つらい内容のため相談窓口を案内"
    );
  }

  return {
    content: reply,
    suggestion,
    tokenIn: data.usage?.prompt_tokens,
    tokenOut: data.usage?.completion_tokens,
  };
}

function looksLikeCrisis(text: string): boolean {
  const t = text.toLowerCase();
  const keys = [
    "死にたい",
    "消えたい",
    "自殺",
    "自傷",
    "生きていけない",
    "殺して",
    "終わりにしたい",
    "いなくなりたい",
  ];
  return keys.some((k) => t.includes(k));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      moodKey?: string | null;
    };
    const text = String(body.text ?? "").trim();
    const mood = normalizeMood(body.moodKey);

    if (!text) {
      return NextResponse.json({ error: "メッセージが空です" }, { status: 400 });
    }
    if (text.length > 500) {
      return NextResponse.json(
        { error: "メッセージが長すぎます（500文字まで）" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const usedToday = await countUserMessagesToday(supabase, user.id);
    if (usedToday >= DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: `本日の相談上限（${DAILY_LIMIT}回）に達しました。また明日お話ししましょう。つらいときはサポートの相談窓口も利用できます。`,
          limitReached: true,
          usedToday,
          dailyLimit: DAILY_LIMIT,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const threadId = await ensureOpenThread(supabase, user.id, mood);

    const { data: recentRows } = await supabase
      .from("consult_messages")
      .select("role, content, model")
      .eq("thread_id", threadId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT + 4);

    const history = [...(recentRows ?? [])]
      .reverse()
      .filter((row) => row.model !== CONSULT_WELCOME_MODEL)
      .map((row) => ({
        role: row.role as "user" | "assistant",
        content: String(row.content ?? ""),
      }))
      .filter((m) => m.content)
      .slice(-HISTORY_LIMIT);

    const { error: userInsertError } = await supabase
      .from("consult_messages")
      .insert({
        thread_id: threadId,
        user_id: user.id,
        role: "user",
        content: text,
      });
    if (userInsertError) {
      throw new Error(`メッセージ保存に失敗: ${userInsertError.message}`);
    }

    const ai = await callOpenAI({
      mood,
      history,
      userText: text,
    });

    const { data: assistantRow, error: assistantInsertError } = await supabase
      .from("consult_messages")
      .insert({
        thread_id: threadId,
        user_id: user.id,
        role: "assistant",
        content: ai.content,
        model: MODEL,
        token_in: ai.tokenIn ?? null,
        token_out: ai.tokenOut ?? null,
      })
      .select("id, created_at")
      .single();

    if (assistantInsertError) {
      console.warn("assistant insert:", assistantInsertError.message);
    }

    await supabase
      .from("consult_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);

    const usedAfter = usedToday + 1;
    const remaining = Math.max(0, DAILY_LIMIT - usedAfter);

    try {
      const { trackAppEvent } = await import("@/lib/app-events");
      void trackAppEvent("consult_send", {
        moodKey: mood,
        remaining,
        suggest: ai.suggestion?.kind ?? "none",
      });
    } catch {
      // ignore
    }

    return NextResponse.json({
      ok: true,
      message: {
        id: assistantRow?.id ?? `a-${Date.now()}`,
        role: "assistant" as const,
        content: ai.content,
        createdAt: assistantRow?.created_at ?? new Date().toISOString(),
        suggestion: ai.suggestion,
      },
      suggestion: ai.suggestion,
      usedToday: usedAfter,
      dailyLimit: DAILY_LIMIT,
      remaining,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "相談に失敗しました";
    console.error("consult chat:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** 本日の残り回数 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }
    const usedToday = await countUserMessagesToday(supabase, userData.user.id);
    return NextResponse.json({
      usedToday,
      dailyLimit: DAILY_LIMIT,
      remaining: Math.max(0, DAILY_LIMIT - usedToday),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
