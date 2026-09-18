export type CheckTypeId = "phq" | "gad" | "psqi";

export type ChoiceOption = { label: string; value: number };

export type CheckQuestion =
  | {
      id: string;
      text: string;
      kind: "choice";
      options: ChoiceOption[];
      preface?: string;
      image?: string;
    }
  | {
      id: string;
      text: string;
      kind: "time";
      preface?: string;
      placeholder?: string;
      image?: string;
    };

export interface CheckType {
  id: CheckTypeId;
  name: string;
  shortName: string;
  description: string;
  duration: string;
  color: string;
  bg: string;
  maxScore: number;
  questions: CheckQuestion[];
}

export const FREQUENCY_OPTIONS: ChoiceOption[] = [
  { label: "全くない", value: 0 },
  { label: "数日", value: 1 },
  { label: "半分以上", value: 2 },
  { label: "ほぼ毎日", value: 3 },
];

export const CHECK_TYPES: Record<CheckTypeId, CheckType> = {
  phq: {
    id: "phq",
    name: "こころの状態チェック",
    shortName: "こころ",
    description: "こころの調子や意欲の変化を確認します",
    duration: "約3分・9問",
    color: "#818CF8",
    bg: "#EEF2FF",
    maxScore: 27,
    questions: [
      {
        id: "phq1",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "物事に対してほとんど興味がない、または楽しめない",
        options: FREQUENCY_OPTIONS,
        image: "/check/phq/check-phq-q1.png",
      },
      {
        id: "phq2",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "気分が落ち込んでいる、憂うつ、または絶望的な気持ち",
        options: FREQUENCY_OPTIONS,
        image: "/check/phq/check-phq-q2.png",
      },
      {
        id: "phq3",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "眠れない、眠りすぎる",
        options: FREQUENCY_OPTIONS,
        image: "/check/phq/check-phq-q3.png",
      },
      {
        id: "phq4",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "疲れた感じがする、気力がない",
        options: FREQUENCY_OPTIONS,
        image: "/check/phq/check-phq-q4.png",
      },
      {
        id: "phq5",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "食欲がない、または食べすぎる",
        options: FREQUENCY_OPTIONS,
        image: "/check/phq/check-phq-q5.png",
      },
      {
        id: "phq6",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "自分が悪い人間だと感じる、または自分を責める",
        options: FREQUENCY_OPTIONS,
        image: "/check/phq/check-phq-q6.png",
      },
      {
        id: "phq7",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "物事に集中するのが難しい（新聞を読んだり、テレビを見たりするとき）",
        options: FREQUENCY_OPTIONS,
        image: "/check/phq/check-phq-q7.png",
      },
      {
        id: "phq8",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "動いたり、しゃべったりするのが普段よりも遅い。または反対にそわそわして、じっとしていられない",
        options: FREQUENCY_OPTIONS,
        image: "/check/phq/check-phq-q8.png",
      },
      {
        id: "phq9",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "死んだほうがましだ、または自分を何らかの形で傷つけたいと思う",
        options: FREQUENCY_OPTIONS,
        image: "/check/phq/check-phq-q9.png",
      },
    ],
  },
  gad: {
    id: "gad",
    name: "やすらぎの状態チェック",
    shortName: "やすらぎ",
    description: "心のやすらぎや心配の強さを確認します",
    duration: "約3分・7問",
    color: "#38BDF8",
    bg: "#E0F2FE",
    maxScore: 21,
    questions: [
      {
        id: "gad1",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "緊張感や不安を感じる、または神経が高ぶっている",
        options: FREQUENCY_OPTIONS,
        image: "/check/gad/check-gad-q1.png",
      },
      {
        id: "gad2",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "心配するのをやめることができない、または心配をコントロールできない",
        options: FREQUENCY_OPTIONS,
        image: "/check/gad/check-gad-q2.png",
      },
      {
        id: "gad3",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "いろいろなことについて心配しすぎる",
        options: FREQUENCY_OPTIONS,
        image: "/check/gad/check-gad-q3.png",
      },
      {
        id: "gad4",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "くつろぐのが難しい",
        options: FREQUENCY_OPTIONS,
        image: "/check/gad/check-gad-q4.png",
      },
      {
        id: "gad5",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "じっとしていられないほどそわそわする",
        options: FREQUENCY_OPTIONS,
        image: "/check/gad/check-gad-q5.png",
      },
      {
        id: "gad6",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "イライラしたり、すぐ腹を立てたりする",
        options: FREQUENCY_OPTIONS,
        image: "/check/gad/check-gad-q6.png",
      },
      {
        id: "gad7",
        kind: "choice",
        preface: "過去2週間のあいだ、どのくらいの頻度でありましたか？",
        text: "何か恐ろしいことが起きそうな気がする",
        options: FREQUENCY_OPTIONS,
        image: "/check/gad/check-gad-q7.png",
      },
    ],
  },
  psqi: {
    id: "psqi",
    name: "ねむりの状態チェック",
    shortName: "ねむり",
    description: "眠りのリズムと質を確認します",
    duration: "約3分・5問",
    color: "#FB923C",
    bg: "#FFF7ED",
    maxScore: 21,
    questions: [
      {
        id: "psqi1",
        kind: "time",
        preface: "過去1ヶ月の平均的な様子で答えてください",
        text: "普段の就寝時刻は何時ですか？",
        placeholder: "23:00",
        image: "/check/psqi/check-psqi-q1.png",
      },
      {
        id: "psqi2",
        kind: "choice",
        preface: "過去1ヶ月の平均的な様子で答えてください",
        text: "寝るまでに通常どのくらいかかりますか？",
        options: [
          { label: "15分未満", value: 0 },
          { label: "15〜30分", value: 1 },
          { label: "31〜60分", value: 2 },
          { label: "60分以上", value: 3 },
        ],
        image: "/check/psqi/check-psqi-q2.png",
      },
      {
        id: "psqi3",
        kind: "time",
        preface: "過去1ヶ月の平均的な様子で答えてください",
        text: "普段の起床時刻は何時ですか？",
        placeholder: "7:00",
        image: "/check/psqi/check-psqi-q3.png",
      },
      {
        id: "psqi4",
        kind: "choice",
        preface: "過去1ヶ月の平均的な様子で答えてください",
        text: "実際に眠れている時間は1日どのくらいですか？",
        options: [
          { label: "7時間以上", value: 0 },
          { label: "6〜7時間", value: 1 },
          { label: "5〜6時間", value: 2 },
          { label: "5時間未満", value: 3 },
        ],
        image: "/check/psqi/check-psqi-q4.png",
      },
      {
        id: "psqi5",
        kind: "choice",
        preface: "過去1ヶ月の平均的な様子で答えてください",
        text: "過去1ヶ月の睡眠の質を全体的に評価してください",
        options: [
          { label: "とても良い", value: 0 },
          { label: "まあ良い", value: 1 },
          { label: "悪い", value: 2 },
          { label: "とても悪い", value: 3 },
        ],
        image: "/check/psqi/check-psqi-q5.png",
      },
    ],
  },
};

export const CHECK_TYPE_LIST: CheckType[] = [
  CHECK_TYPES.phq,
  CHECK_TYPES.gad,
  CHECK_TYPES.psqi,
];

export function isCheckTypeId(value: string | null | undefined): value is CheckTypeId {
  return value === "phq" || value === "gad" || value === "psqi";
}

/** HH:MM → minutes from midnight (0–1439). Invalid → null */
export function parseTimeToMinutes(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function bedtimeScore(minutes: number | null): number {
  if (minutes === null) return 2;
  // 22:00前=0 / 22–23時=1 / 23–24時=2 / 0時以降〜朝=3
  if (minutes >= 5 * 60 && minutes < 22 * 60) return 0;
  if (minutes >= 22 * 60 && minutes < 23 * 60) return 1;
  if (minutes >= 23 * 60) return 2;
  return 3; // 0:00–4:59
}

function wakeScore(minutes: number | null): number {
  if (minutes === null) return 2;
  // 6–8時=0 / 8–9時=1 / 5–6時 or 9–10時=2 / それ以外=3
  if (minutes >= 6 * 60 && minutes < 8 * 60) return 0;
  if (minutes >= 8 * 60 && minutes < 9 * 60) return 1;
  if (
    (minutes >= 5 * 60 && minutes < 6 * 60) ||
    (minutes >= 9 * 60 && minutes < 10 * 60)
  ) {
    return 2;
  }
  return 3;
}

export interface CheckResultLevel {
  label: string;
  color: string;
  message: string;
}

export function evaluateCheck(
  typeId: CheckTypeId,
  answers: (number | string)[],
): { score: number; level: CheckResultLevel; crisis?: boolean } {
  if (typeId === "phq") {
    const nums = answers.map((a) => Number(a));
    const score = nums.reduce((a, b) => a + b, 0);
    const crisis = (nums[8] ?? 0) >= 1;
    let level: CheckResultLevel;
    if (score <= 4) {
      level = {
        label: "良好",
        color: "#27AE76",
        message: "現在の状態は良好です。この調子でトレーニングを続けましょう！",
      };
    } else if (score <= 9) {
      level = {
        label: "軽度",
        color: "#FBBF24",
        message: "少し心に負担がかかっているかもしれません。無理せず過ごしてください。",
      };
    } else if (score <= 14) {
      level = {
        label: "要注意",
        color: "#FB923C",
        message: "心が疲れているサインかもしれません。学生相談室への相談も考えてみてください。",
      };
    } else {
      level = {
        label: "要注意",
        color: "#EF4444",
        message: "強い負担がかかっている可能性があります。専門家や相談窓口への相談を検討してください。",
      };
    }
    return { score, level, crisis };
  }

  if (typeId === "gad") {
    const score = answers.map((a) => Number(a)).reduce((a, b) => a + b, 0);
    let level: CheckResultLevel;
    if (score <= 4) {
      level = {
        label: "良好",
        color: "#27AE76",
        message: "不安は比較的落ち着いているようです。よい状態をキープしましょう。",
      };
    } else if (score <= 9) {
      level = {
        label: "軽度",
        color: "#FBBF24",
        message: "少し不安が強めかもしれません。呼吸や小さな休憩を取り入れてみてください。",
      };
    } else if (score <= 14) {
      level = {
        label: "要注意",
        color: "#FB923C",
        message: "不安が日常に影響しているかもしれません。トレーニングや相談も選択肢です。",
      };
    } else {
      level = {
        label: "要注意",
        color: "#EF4444",
        message: "不安が強い状態かもしれません。専門家への相談を検討してください。",
      };
    }
    return { score, level };
  }

  // PSQI 簡易：5成分(0–3)を合計し 0–21 に換算
  const bed = bedtimeScore(parseTimeToMinutes(String(answers[0] ?? "")));
  const latency = Number(answers[1] ?? 2);
  const wake = wakeScore(parseTimeToMinutes(String(answers[2] ?? "")));
  const duration = Number(answers[3] ?? 2);
  const quality = Number(answers[4] ?? 2);
  const raw = bed + latency + wake + duration + quality; // 0–15
  const score = Math.min(21, Math.round((raw / 15) * 21));
  let level: CheckResultLevel;
  if (score <= 4) {
    level = {
      label: "良好",
      color: "#27AE76",
      message: "睡眠の質は比較的よさそうです。リズムを大切に続けましょう。",
    };
  } else if (score <= 10) {
    level = {
      label: "注意",
      color: "#FBBF24",
      message: "睡眠に少し乱れがあるかもしれません。睡眠のレッスンも役立ちます。",
    };
  } else {
    level = {
      label: "要注意",
      color: "#FB923C",
      message: "睡眠の質に負担がありそうです。無理のない改善から始めてみましょう。",
    };
  }
  return { score, level };
}
