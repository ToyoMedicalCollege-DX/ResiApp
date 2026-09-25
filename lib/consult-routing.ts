/**
 * 体調相談の誘導先（3トレーニング＋サポートセンター）
 * システムプロンプトと UI の共通定義。
 */

export type ConsultSuggestKind = "sk1" | "sk2" | "sk5" | "support" | "none";

export type ConsultSuggestion = {
  kind: ConsultSuggestKind;
  label: string;
  href: string;
  reason?: string;
};

export const CONSULT_ROUTES: Record<
  Exclude<ConsultSuggestKind, "none">,
  { label: string; href: string; when: string }
> = {
  sk1: {
    label: "行動活性化トレーニングへ",
    href: "/training/sk1",
    when: "やる気が出ない・動けない・気分が沈む・何もしたくない",
  },
  sk2: {
    label: "認知再構成トレーニングへ",
    href: "/training/sk2",
    when: "考えすぎ・不安・自分を責める・ネガティブな思考が続く",
  },
  sk5: {
    label: "睡眠トレーニングへ",
    href: "/training/sk5",
    when: "眠れない・寝つきが悪い・朝起きられない・睡眠リズムの乱れ",
  },
  support: {
    label: "相談窓口（サポートセンター）へ",
    href: "/support",
    when: "一人では抱えきれない・危険・限界・誰かに相談したい・深刻なつらさ",
  },
};

export function suggestionFromKind(
  kind: string | null | undefined,
  reason?: string
): ConsultSuggestion | null {
  if (!kind || kind === "none") return null;
  if (kind !== "sk1" && kind !== "sk2" && kind !== "sk5" && kind !== "support") {
    return null;
  }
  const route = CONSULT_ROUTES[kind];
  return {
    kind,
    label: route.label,
    href: route.href,
    reason: reason?.trim() || undefined,
  };
}

/** OpenAI 用：誘導ルールをシステムプロンプトに埋め込む */
export function buildConsultSystemPrompt(): string {
  return `あなたは専門学校向けセルフケアアプリ「ResiApp」の体調相談アシスタントです。

【返信ルール】
- 日本語で、短く・やさしく・具体的に（2〜4文）
- 医療診断・薬の指示・疾患名の断定はしない
- 共感したうえで、今日できる小さなセルフケアを1つ触れる
- 絵文字は0〜1個まで

【誘導（suggest）の選び方】必ず1つ選ぶ。迷ったら none。
- sk1 … ${CONSULT_ROUTES.sk1.when} → 行動活性化（ポジティブ・レジリエンス）
- sk2 … ${CONSULT_ROUTES.sk2.when} → 認知再構成（メタ・レジリエンス）
- sk5 … ${CONSULT_ROUTES.sk5.when} → 睡眠行動療法（睡眠・レジリエンス）
- support … ${CONSULT_ROUTES.support.when} → スチューデントサービス等の相談窓口
- none … 軽い雑談・特に誘導不要

優先順位: 危険・限界・死にたい等 → 必ず support。それ以外は内容に最も合うトレーニング1つ。

【出力形式】必ず次の JSON だけを返す（説明文やコードフェンス禁止）:
{"reply":"ユーザーへの返信文","suggest":"sk1|sk2|sk5|support|none","reason":"誘導理由を短く"}`;
}
