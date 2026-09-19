import type { Skill, Lesson, CheckScore, Badge, UserProfile } from "./types";

export const USER: UserProfile = {
  nickname: "",
  level: 4,
  streak: 7,
  totalLessons: 20,
  growthPoints: 28,
};

export const SKILLS: Skill[] = [
  {
    id: "sk1",
    name: "行動活性化",
    shortName: "ポジティブ・レジリエンス",
    description: "気分を上げる行動を見つけよう",
    color: "#10B981",
    bgColor: "#D1FAE5",
    icon: "Zap",
    totalLessons: 10,
    completedLessons: 0,
  },
  {
    id: "sk2",
    name: "認知再構成",
    shortName: "メタ・レジリエンス",
    description: "考え方のクセをほぐしていこう",
    color: "#818CF8",
    bgColor: "#EEF2FF",
    icon: "Brain",
    totalLessons: 12,
    completedLessons: 0,
  },
  {
    id: "sk3",
    name: "問題解決",
    shortName: "問題解決・レジリエンス",
    description: "悩みを整理して解決策を見つける",
    color: "#FB923C",
    bgColor: "#FFF7ED",
    icon: "Target",
    totalLessons: 8,
    completedLessons: 0,
  },
  {
    id: "sk4",
    name: "アサーション",
    shortName: "コミュ・レジリエンス",
    description: "自分らしく伝える力をつける",
    color: "#F472B6",
    bgColor: "#FDF2F8",
    icon: "MessageCircle",
    totalLessons: 10,
    completedLessons: 0,
  },
  {
    id: "sk5",
    name: "睡眠行動療法",
    shortName: "睡眠・レジリエンス",
    description: "ぐっすり眠るための習慣づくり",
    color: "#38BDF8",
    bgColor: "#F0F9FF",
    icon: "Moon",
    totalLessons: 10,
    completedLessons: 0,
  },
];

export const TODAY_LESSON: Lesson = {
  id: "sk1-l9",
  skillId: "sk1",
  title: "「小さな一歩」で気分を変える",
  duration: 5,
  type: "learn",
  content: `
## 今日のレッスン：「小さな一歩」で気分を変える

気分が沈んでいるとき、「何もやる気がしない」と感じるのは自然なことです。
でも、行動活性化では「気分が変わるまで待つ」のではなく、「まず小さく動く」ことを大切にします。

### 小さな一歩の例
- 5分だけ外を歩く
- 好きな飲み物を作る
- 友達にひとことLINEを送る
- 窓を開けて新鮮な空気を吸う

### ポイント
気分と行動は互いに影響し合っています。行動することで気分が変わり、気分が変わると次の行動がしやすくなる、という好循環が生まれます。

### 今日の課題
あなたが「小さくても気分が上がること」を3つ思い浮かべてみましょう。
  `,
  completed: false,
};

export const LESSONS_BY_SKILL: Record<string, Lesson[]> = {
  sk1: [
    {
      id: "sk1-l1", skillId: "sk1", title: "行動活性化とは？",
      duration: 5, type: "learn", completed: false,
      content: `## 行動活性化とは？

「最近、何もやる気が出ない」「楽しいと思えることが減った気がする」
そんな気持ちになることはありませんか？

行動活性化（Behavioral Activation）は、そんな気持ちを科学的に解消するための方法です。うつや落ち込みを専門家が治療するときにも使われる、効果が証明されたテクニックです。

### うつの「悪循環」って何？

気分が落ちると、こんなことが起きがちです。

  落ち込む → 何もしたくなくなる → 活動が減る → もっと落ち込む

これが「うつの悪循環」です。放っておくとどんどんしんどくなっていきます。

### 行動活性化の考え方

「気分が戻ったら動こう」ではなく、「まず少し動いてみると、気分が変わってくる」という考え方です。

気分が行動を決めるのではなく、行動が気分を変えるんです！

### ポイント

- やる気が出てから行動するのではなく、行動することでやる気が出る
- 最初は小さな行動でOK。5分でも、1歩でも十分
- 「楽しめなくても、とりあえずやってみる」が合言葉

### 今日のワーク

最近「少しでもやってよかった」と思えた行動を1つ思い出してみましょう。

例：友だちに連絡した、散歩した、好きな音楽を聴いた

それがあなたにとっての「行動のヒント」です。ノートやメモに書き留めておきましょう。`,
    },
    {
      id: "sk1-l2", skillId: "sk1", title: "気分と行動のつながり",
      duration: 5, type: "learn", completed: false,
      content: `## 気分と行動のつながり

前回学んだ「行動すると気分が変わる」という話、もう少し深めてみましょう。

### 気分と行動はお互いに影響し合っている

いい気分のとき：
  元気 → 活動したくなる → 活動する → もっと元気になる

落ち込んでいるとき：
  落ち込む → 何もしたくない → 引きこもる → もっと落ち込む

どちらのループに入るかで、日々の感じ方がまったく変わります。

### 「気分が先」ではなく「行動が先」

多くの人は「気分がよくなったら行動しよう」と思いがちです。でも実は、行動することで気分がよくなることの方が多いんです。

脳の研究でも「体を動かしたり、誰かと関わったりすることで、気分を上げるホルモンが出る」ことがわかっています。

### 気分スコアをつけてみよう

今週から、1日1回「今の気分を0〜10点でつける」練習をしてみてください。

  0〜2点：とてもしんどい
  3〜4点：少しつらい
  5〜6点：まあまあ普通
  7〜8点：わりと元気
  9〜10点：とても気分がいい

### 今日のワーク

過去1週間を振り返って、「気分が少し上がった瞬間」を2〜3個書き出してみましょう。

どんな小さなことでもOKです。
- 美味しいものを食べた
- 好きな音楽を聴いた
- 友だちに話しかけられた

その「行動」が、あなたの気分を上げる鍵です。`,
    },
    {
      id: "sk1-l3", skillId: "sk1", title: "活動日記をつけてみよう",
      duration: 7, type: "work", completed: false,
      content: `## 活動日記をつけてみよう

行動活性化で一番大切なツールが「活動日記」です。
1日の行動と気分を記録することで、自分の「気分が上がるパターン」が見えてきます。

### 活動日記とは？

こんなシンプルなメモです。

  時間帯      ｜ 活動内容              ｜ 気分（0〜10）
  ────────────┼──────────────────────┼─────────────
  朝（7〜9時） ｜ 起きてシャワーを浴びた ｜ 4
  昼（12〜13時）｜ 友だちとお昼を食べた  ｜ 7
  放課後       ｜ 部屋でゴロゴロしていた ｜ 3
  夜（20時）   ｜ 好きなアニメを見た    ｜ 6

### なぜ記録が大切なの？

1. 気分が下がりやすい時間帯・状況がわかる
2. 気分が上がる行動のパターンが見えてくる
3. 「毎日何もしていない」という思い込みが修正できる（意外とやってる！）

### ポイント

- 完璧に書かなくてもOK。1日2〜3行でも十分
- 後から書いてもいい（寝る前5分にまとめてもOK）
- 「良い行動」だけじゃなく、普通の行動も記録する

### 今日のワーク

今日1日を振り返り、以下を書いてみましょう。

1. 今日したこと（3つ以上）
2. それぞれの気分スコア（0〜10点）
3. 一番気分が上がった行動はどれ？

気分が上がった行動はあなたの「パワースポット行動」です。これを増やすのが目標です！`,
    },
    {
      id: "sk1-l4", skillId: "sk1", title: "好きなことリストを作る",
      duration: 5, type: "work", completed: false,
      content: `## 好きなことリストを作る

行動活性化でとても大切なステップ、「活動リスト作り」をやってみましょう。

### なぜリストが必要なの？

落ち込んでいるとき、人は「やりたいことが何もない」と感じがちです。
でも実は、過去には楽しめていたこと、興味があることがたくさんあるはずです。

活動日記で記録した「気分が上がった行動」と合わせて、自分だけの「活動メニュー」を作りましょう。

### リストに入れるもの

■ 以前楽しんでいたこと
  例：スポーツ、音楽、ゲーム、読書、料理、絵を描くこと

■ やってみたいと思っていること
  例：行ったことがないカフェ、習ってみたいこと、行きたい場所

■ ちょっとだけ達成感があること
  例：部屋の片付け、課題を1つ終わらせる、ご飯を自分で作る

■ 人とつながれること
  例：友だちと話す、家族とご飯を食べる、グループLINEで近況報告

### ポイント

- 「楽しめるか不安」なものもリストに入れてOK
- 「大したことない」と思うことも入れていい
- 今すぐできる小さいものほど使いやすい

### 今日のワーク

「自分の活動リスト」を10個書いてみましょう。
過去に楽しかったこと、今興味があること、なんでもOKです。

書き終わったら、それぞれに「気軽さ」を3段階でつけてみてください。
  ★（すぐできる）
  ★★（少し準備が要る）
  ★★★（時間やお金がかかる）

★のものから今週試してみましょう！`,
    },
    {
      id: "sk1-l5", skillId: "sk1", title: "達成感を増やす方法",
      duration: 5, type: "learn", completed: false,
      content: `## 達成感を増やす方法

気分を上げる活動には2種類あります。それが「楽しさ」と「達成感」です。

### 楽しさ（Pleasure）と達成感（Mastery）

楽しさ系の活動：
  やっている間、気持ちよかったりリラックスできたりするもの。
  例：好きな音楽を聴く、動画を見る、友だちとおしゃべりする

達成感系の活動：
  終わった後に「やった！」「頑張った！」と感じるもの。
  例：部屋を片付ける、課題を終わらせる、ご飯を自分で作る

落ち込んでいる人は、どちらも減ってしまいがちです。でも、「達成感」は特に意欲回復に効果的です。

### 小さな「達成」を積み重ねる

達成感は大きなことじゃなくてOKです。

  ✓ 今日の日記を書いた
  ✓ 朝ご飯を食べた
  ✓ シャワーを浴びた
  ✓ 教科書を1ページ読んだ

これだけで、「自分は今日やれた」という感覚が積み上がっていきます。

### ポイント

- 自分に「ちゃんとできた！」と認める習慣をつけよう
- 比べるのは昨日の自分だけ
- 完璧にやる必要はない。「少しでもやった」がカウント

### 今日のワーク

前のレッスンで作った「活動リスト」を見直して、以下に分けてみましょう。

  楽しさ系：（リストから選ぶ）

  達成感系：（リストから選ぶ）

達成感系のものが少なかったら、「ちょっとしんどいけど、終わったら達成感がありそうなこと」を1つ追加してみてください。`,
    },
    {
      id: "sk1-l6", skillId: "sk1", title: "毎日のルーティンを見直す",
      duration: 7, type: "work", completed: false,
      content: `## 毎日のルーティンを見直す

行動を増やすために、毎日の「ルーティン（日課）」を整えることがとても効果的です。

### なぜルーティンが大事なの？

気分が落ちているとき、1日の流れがバラバラになりがちです。

  夜遅くまで起きている → 朝起きられない → 午後になってやっと活動する → また夜型に…

この乱れたリズムが、さらに気分を不安定にします。

### 3つのアンカー（固定点）を決める

毎日必ず守る「アンカー」を3つ設定します。

1. 起床時刻：毎朝同じ時間に起きる（休日も±1時間以内）
2. 食事：できれば1日3食、決まった時間帯に
3. 就寝時刻：遅くとも0時前に就寝する

この3つが整うだけで、気分の安定に大きく貢献します。

### ルーティンに「好きな活動」を組み込む

アンカーが決まったら、その隙間に「活動リスト」からやることを入れてみましょう。

  7:00  起床・シャワー
  8:00  朝ごはん + 好きな音楽を聴く
  放課後 友だちと少し話してから帰宅
  21:00 宿題を1科目だけやる
  22:30 今日の活動日記を書く
  23:00 就寝

### ポイント

- 完璧なルーティンを目指さなくてOK
- 崩れた日があっても、次の日にリセットすればいい
- 「眠くなくても布団に入る」だけでも十分

### 今日のワーク

明日1日の「理想のタイムライン」を簡単に書いてみましょう。7〜8割実現できれば大成功です！

  起床時刻：
  朝の活動：
  昼の活動：
  夜の活動：
  就寝時刻：`,
    },
    {
      id: "sk1-l7", skillId: "sk1", title: "人とのつながりを大切に",
      duration: 5, type: "learn", completed: false,
      content: `## 人とのつながりを大切に

行動活性化で見落としがちだけど、実はとても大切なのが「社会的なつながり」です。

### なぜ「人とのかかわり」が気分を上げるの？

人は本来、社会的な生き物です。他者とつながることで、脳から「幸福ホルモン」が分泌され、気分が改善されることが科学的に証明されています。

落ち込んでいると「誰かに会うのがしんどい」「連絡するのが面倒」と感じやすいですが、少しだけ踏み出してみると気分が変わることが多いです。

### つながりは「大きくなくていい」

- 友だちにひとことLINEを送る
- 家族と5分だけ話す
- クラスメートに「最近どう？」と声をかける
- 好きなコミュニティ（部活・SNS）に少し参加する

これだけで十分「社会的なつながり」になります。

### 「つながりを避けたい」と感じたら

落ち込みが強いと「人と話すのが億劫」「どうせ迷惑になる」と感じることがあります。でも、それ自体が「落ち込みの症状」かもしれません。

まずは「返信しなくていいLINEを送るだけ」くらいの小さな一歩でOKです。

### ポイント

- 「誰かと一緒にやる」と達成感も楽しさも2倍になる
- 久しぶりの連絡は相手もうれしいことが多い
- うまく話せなくても、そこにいるだけでいい

### 今日のワーク

今週、誰かに「ひとこと連絡」してみましょう。

  連絡する相手：

  内容の例：「最近どう？」「元気にしてる？」
        「○○ってもう見た？」「暇なときご飯でも行かない？」

返事が来なくてもOK。送ること自体がすでに「行動」です。`,
    },
    {
      id: "sk1-l8", skillId: "sk1", title: "週間活動計画を立てる",
      duration: 10, type: "work", completed: false,
      content: `## 週間活動計画を立てる

ここまで学んできたスキルを、週全体の計画として組み立てましょう。

### 週間計画を立てる理由

日々の計画だけでは「今日は気分が乗らないから、また明日…」となりがちです。週単位で計画することで、活動がより習慣化されやすくなります。

### 週間計画の作り方

ステップ1：活動リストから今週やるものを選ぶ
  - 楽しさ系から2〜3個
  - 達成感系から2〜3個
  - つながり系から1〜2個

ステップ2：曜日と時間を決める

  月曜日  放課後：友だちと話してから帰る
  火曜日  夜20時：好きな動画を30分見る
  水曜日  放課後：図書館で宿題を1つ終わらせる
  木曜日  夜：音楽を聴きながらストレッチ
  金曜日  夜21時：部屋の片付けを15分
  土曜日  昼：外を20分散歩する
  日曜日  夜：今週の活動日記を振り返る

ステップ3：実行して「できた・できなかった」を記録する

### ポイント

- 計画通りにできなくても自分を責めない
- できた日だけカウント（連続じゃなくてOK）
- 計画は「理想」ではなく「できそうな範囲」で立てる
- 1週間で5〜7つの活動が入れば十分

### 今日のワーク

「今週の活動計画」を作ってみましょう。

  月曜日：
  火曜日：
  水曜日：
  木曜日：
  金曜日：
  土曜日：
  日曜日：

各活動に対して、週末に「できた◯ / できなかった✕」を記録してみてください。`,
    },
    {
      id: "sk1-l9", skillId: "sk1", title: "「小さな一歩」で気分を変える",
      duration: 5, type: "learn", completed: false,
      content: `## 「小さな一歩」で気分を変える

気分が沈んでいるとき、「何もやる気がしない」と感じるのは自然なことです。
でも、行動活性化では「気分が変わるまで待つ」のではなく、「まず小さく動く」ことを大切にします。

### 小さな一歩の例

- 5分だけ外を歩く
- 好きな飲み物を作る
- 友だちにひとことLINEを送る
- 窓を開けて新鮮な空気を吸う

### 「やる気待ち」と「完璧主義」の落とし穴

よくある落とし穴が2つあります。

① やる気待ち：「やる気が出たらやろう」と待ち続けること
  → 行動しないからやる気も出ない悪循環に陥ります。

② 完璧主義：「どうせやるなら完璧にやらないと意味がない」
  → 完璧にできないなら何もしない、になってしまいます。

### 「5分だけ」ルール

何かをやりたくないとき、「5分だけやってみる」と決めます。
5分後にやめてもOK。でも多くの場合、始めると続けられます。

これは「作業興奮」と呼ばれる心理現象で、始めることで脳がやる気を出す仕組みがあります。

### ポイント

- 小さい行動が大きな変化のきっかけになる
- 「完璧にやる」より「とりあえずやる」が大事
- できなかった日は、「明日の自分に期待する」でOK

### 今日のワーク

あなたが「小さくても気分が上がること」を3つ思い浮かべてみましょう。
それぞれ「5分でできる小さなバージョン」に落とし込んでみてください。`,
    },
    {
      id: "sk1-l10", skillId: "sk1", title: "行動活性化の振り返り",
      duration: 7, type: "review", completed: false,
      content: `## 行動活性化の振り返り

おめでとうございます！行動活性化のプログラムを最後まで続けてくれましたね。
最終レッスンでは、ここまでの歩みを振り返り、これからの実践プランを作りましょう。

### ここまでで学んだこと

L1  行動活性化の基本：「行動が気分を変える」
L2  気分と行動のループ、気分スコアの記録
L3  活動日記で「気分が上がる行動」を発見
L4  自分だけの活動リストを作る
L5  楽しさ系と達成感系の違いと重要性
L6  ルーティンで気分を安定させる方法
L7  人とのつながりが気分に与える力
L8  週間計画で活動を習慣化する方法
L9  落とし穴（やる気待ち・完璧主義）への対処

### 自分の変化を振り返ろう

プログラムを始める前と今を比べて、どんな変化がありましたか？

- 以前よりも積極的に動けた場面は？
- 気分が上がった行動で、特に効果があったものは？
- まだ難しかったこと・これからも続けたいことは？

### これからの「マイ行動活性化プラン」

行動活性化は、1回やって終わりじゃありません。むしろこれからが本番。日常の中に取り入れ続けることが大切です。

決めておきたい3つのこと：

  1. 毎週続ける活動：
     （例：水曜日の散歩、週1回の友だちへの連絡）

  2. 気分が落ちたときに最初にやること：
     （例：まず5分だけ外に出る、好きな音楽を1曲聴く）

  3. 振り返りのタイミング：
     （例：日曜日の夜に活動日記を見返す）

### 今日のワーク

「私の行動活性化プラン」を1つにまとめてみましょう。

  気分が上がる行動 TOP3：

  毎週必ずやること：

  落ち込んだときの最初の一歩：

これを書き終えたあなたは、もうレジリエンスを高めるための「道具箱」を持っています。
どうか、自分自身を大切にしてください。`,
    },
  ],
  sk2: [
    { id: "sk2-l1", skillId: "sk2", title: "思考と感情の関係", duration: 5, type: "learn", content: "", completed: false },
    { id: "sk2-l2", skillId: "sk2", title: "自動思考に気づく", duration: 7, type: "learn", content: "", completed: false },
    { id: "sk2-l3", skillId: "sk2", title: "認知の歪みを知る①", duration: 8, type: "learn", content: "", completed: false },
    { id: "sk2-l4", skillId: "sk2", title: "認知の歪みを知る②", duration: 8, type: "learn", content: "", completed: false },
    { id: "sk2-l5", skillId: "sk2", title: "自分の歪みパターンを見つける", duration: 7, type: "work", content: "", completed: false },
    { id: "sk2-l6", skillId: "sk2", title: "証拠を集める", duration: 9, type: "work", content: "", completed: false },
    { id: "sk2-l7", skillId: "sk2", title: "別の見方を探す", duration: 8, type: "work", content: "", completed: false },
    { id: "sk2-l8", skillId: "sk2", title: "バランスのとれた考えを作る", duration: 9, type: "work", content: "", completed: false },
    { id: "sk2-l9", skillId: "sk2", title: "コアビリーフを探る", duration: 10, type: "work", content: "", completed: false },
    { id: "sk2-l10", skillId: "sk2", title: "思考記録表を使いこなす", duration: 8, type: "work", content: "", completed: false },
    { id: "sk2-l11", skillId: "sk2", title: "セルフ・コンパッション", duration: 8, type: "work", content: "", completed: false },
    { id: "sk2-l12", skillId: "sk2", title: "まとめと振り返り", duration: 10, type: "review", content: "", completed: false },
  ],
  sk3: [
    { id: "sk3-l1", skillId: "sk3", title: "問題解決法とは？", duration: 5, type: "learn", content: "", completed: false },
    { id: "sk3-l2", skillId: "sk3", title: "問題を明確に定義する", duration: 7, type: "work", content: "", completed: false },
    { id: "sk3-l3", skillId: "sk3", title: "ブレインストーミング", duration: 8, type: "work", content: "", completed: false },
    { id: "sk3-l4", skillId: "sk3", title: "解決策を評価・選択する", duration: 8, type: "work", content: "", completed: false },
    { id: "sk3-l5", skillId: "sk3", title: "アクションプランを立てる", duration: 9, type: "work", content: "", completed: false },
    { id: "sk3-l6", skillId: "sk3", title: "実行して振り返る", duration: 7, type: "review", content: "", completed: false },
    { id: "sk3-l7", skillId: "sk3", title: "コントロールできないことへの向き合い方", duration: 9, type: "learn", content: "", completed: false },
    { id: "sk3-l8", skillId: "sk3", title: "まとめと振り返り", duration: 7, type: "review", content: "", completed: false },
  ],
  sk4: [
    { id: "sk4-l1", skillId: "sk4", title: "アサーションとは？", duration: 5, type: "learn", content: "", completed: false },
    { id: "sk4-l2", skillId: "sk4", title: "自分のコミュニケーションスタイルを知る", duration: 7, type: "work", content: "", completed: false },
    { id: "sk4-l3", skillId: "sk4", title: "断る権利", duration: 8, type: "learn", content: "", completed: false },
    { id: "sk4-l4", skillId: "sk4", title: "DEスクリプト法を学ぶ", duration: 7, type: "learn", content: "", completed: false },
    { id: "sk4-l5", skillId: "sk4", title: "依頼・断りの練習", duration: 9, type: "work", content: "", completed: false },
    { id: "sk4-l6", skillId: "sk4", title: "感情を言葉にする", duration: 8, type: "work", content: "", completed: false },
    { id: "sk4-l7", skillId: "sk4", title: "批判・クレームへの対応", duration: 9, type: "learn", content: "", completed: false },
    { id: "sk4-l8", skillId: "sk4", title: "SNS・メールでのアサーション", duration: 8, type: "work", content: "", completed: false },
    { id: "sk4-l9", skillId: "sk4", title: "相手の気持ちを読む（共感力）", duration: 8, type: "learn", content: "", completed: false },
    { id: "sk4-l10", skillId: "sk4", title: "まとめと宣言", duration: 7, type: "review", content: "", completed: false },
  ],
  sk5: [
    { id: "sk5-l1", skillId: "sk5", title: "睡眠のしくみを知ろう", duration: 6, type: "learn", content: "", completed: false },
    { id: "sk5-l2", skillId: "sk5", title: "自分の睡眠パターンを記録する", duration: 7, type: "work", content: "", completed: false },
    { id: "sk5-l3", skillId: "sk5", title: "睡眠衛生（スリープハイジーン）", duration: 8, type: "learn", content: "", completed: false },
    { id: "sk5-l4", skillId: "sk5", title: "刺激制御法", duration: 9, type: "learn", content: "", completed: false },
    { id: "sk5-l5", skillId: "sk5", title: "睡眠制限法", duration: 9, type: "learn", content: "", completed: false },
    { id: "sk5-l6", skillId: "sk5", title: "リラクセーション技法", duration: 8, type: "work", content: "", completed: false },
    { id: "sk5-l7", skillId: "sk5", title: "眠れない夜の思考パターン", duration: 8, type: "learn", content: "", completed: false },
    { id: "sk5-l8", skillId: "sk5", title: "体内時計を整える", duration: 7, type: "learn", content: "", completed: false },
    { id: "sk5-l9", skillId: "sk5", title: "昼寝・アルコール・スマホとの付き合い方", duration: 7, type: "learn", content: "", completed: false },
    { id: "sk5-l10", skillId: "sk5", title: "まとめと睡眠改善プラン", duration: 10, type: "review", content: "", completed: false },
  ],
};

export const CHECK_HISTORY: CheckScore[] = [
  { week: "W1", phq: 14, gad: 12, psqi: 10, total: 52 },
  { week: "W2", phq: 12, gad: 10, psqi: 9, total: 58 },
  { week: "W3", phq: 10, gad: 8, psqi: 8, total: 65 },
  // 確認用: PHQ 3→ココロハ / GAD 6→フワリ
  { week: "W4（今週）", phq: 3, gad: 6, psqi: 7, total: 72 },
];

// セルフチェック設問は lib/check.ts に集約（PHQ-9 / GAD-7 / PSQI）
export { FREQUENCY_OPTIONS as ANSWER_OPTIONS } from "./check";

export const BADGES: Badge[] = [
  { id: "first-check", name: "初回Check", icon: "CircleCheck", color: "#E8895B", earned: true },
  { id: "streak-7", name: "7日連続", icon: "Flame", color: "#FB923C", earned: true },
  { id: "first-lesson", name: "初レッスン", icon: "BookOpen", color: "#818CF8", earned: true },
  { id: "days-30", name: "30日達成", icon: "Trophy", color: "#94A3B8", earned: false },
  { id: "all-skills", name: "全スキル制覇", icon: "Star", color: "#94A3B8", earned: false },
];
