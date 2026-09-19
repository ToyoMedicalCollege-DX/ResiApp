# DB設計書（v2）
## ResiApp — Supabase（PostgreSQL）前提

**作成日：** 2026年7月17日  
**更新日：** 2026年9月19日  
**バージョン：** 2.3（通知設定を全体ON＋毎日の通知時間のみに）  
**前提：** 認証は Supabase Auth（`auth.users`）。アプリプロフィールは `public.profiles`（既存マイグレーション準拠）。

---

## 0. 要件との対応

| 要件 | 主なテーブル |
|------|----------------|
| 新規登録（名前・学科・学籍番号・パスワード） | `auth.users` + `profiles` |
| 今日の体調（5段階＋日付） | `condition_logs` |
| 体調相談（本人／返信） | `consult_threads` + `consult_messages` |
| セルフチェック設問回答・回答時刻 | `check_sessions` + `check_answers` |
| セルフチェック危機フラグ | `check_sessions.crisis`（**採用**） |
| トレーニング実施（未／済） | `lesson_completions` |
| 成長記録 | 上記の集計＋任意で `monthly_score_snapshots` |
| 天気地域 | `user_preferences` |
| 相談窓口リンクのクリック数 | `support_link_clicks` |
| プッシュ通知設定 | `notification_settings`（**採用・将来実装**） |

パスワードは **DBに平文保存しない**（Supabase Auth がハッシュ管理）。

---

## 1. テーブル一覧（推奨）

| # | テーブル | 優先 | 概要 |
|---|----------|------|------|
| 1 | `profiles` | 必須・既存 | 名前・学科・学籍番号 |
| 2 | `condition_logs` | 必須 | 日次の気分（最高〜最低） |
| 3 | `consult_threads` | 必須 | 体調相談スレッド |
| 4 | `consult_messages` | 必須 | 相談の各メッセージ |
| 5 | `check_sessions` | 必須 | チェック1回分のヘッダ・合計点 |
| 6 | `check_answers` | 必須 | 設問ごとの回答と回答時刻 |
| 7 | `lesson_completions` | 必須 | レッスン完了（未は行なし） |
| 8 | `user_preferences` | 必須 | 天気表示地域など |
| 9 | `support_link_clicks` | 必須 | 相談窓口リンクのクリック |
| 10 | `weather_snapshots` | 任意 | 気圧・天気の要約キャッシュ |
| 11 | `work_answers` | 推奨 | トレーニング内ワーク入力 |
| 12 | `user_badges` | 推奨 | 成長・達成バッジ |
| 13 | `monthly_score_snapshots` | 任意 | 月次総合スコアの確定値 |
| 14 | `app_events` | 任意 | 画面閲覧などの簡易分析 |
| 15 | `notification_settings` | **採用・将来** | プッシュ通知設定 |

マスタ（スキル／レッスン／設問文言）は **アプリコード管理**でよい（頻繁にJOINしない想定）。

---

## 2. ER概要

```
auth.users ──1:1── profiles
                │
                ├──< condition_logs
                ├──< consult_threads ──< consult_messages
                ├──< check_sessions ──< check_answers
                ├──< lesson_completions
                ├──< work_answers
                ├──< user_badges
                ├──< support_link_clicks
                ├──< monthly_score_snapshots
                ├──  user_preferences (1:1)
                └──  notification_settings (1:1)

weather_snapshots <──（任意）── condition_logs
```

---

## 3. テーブル詳細

### 3.1 `profiles`（既存）

新規登録の業務データ。パスワードは Auth 側。

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID PK | `auth.users.id` |
| `student_id` | TEXT UNIQUE | 学籍番号（大文字正規化） |
| `name` | TEXT | 表示名 |
| `department` | TEXT | 4学科 CHECK |
| `school` | TEXT | 任意（現状未使用可） |
| `grade` | SMALLINT | 任意 |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**学科 CHECK：** `歯科技工士学科` / `救急救命士学科` / `鍼灸師学科` / `柔道整復師学科`

---

### 3.2 `condition_logs` — 今日の体調

```sql
CREATE TABLE public.condition_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT (CURRENT_DATE),
  mood            TEXT NOT NULL
                    CHECK (mood IN ('great','good','okay','bad','rough')),
  mood_score      SMALLINT NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  pressure_alert  TEXT
                    CHECK (pressure_alert IS NULL
                      OR pressure_alert IN ('normal','mild','caution')),
  weather_snapshot_id UUID REFERENCES public.weather_snapshots(id) ON DELETE SET NULL,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
```

| mood | UI | score |
|------|-----|-------|
| great | 最高 | 5 |
| good | 良い | 4 |
| okay | 普通 | 3 |
| bad | つらい | 2 |
| rough | 最低 | 1 |

成長グラフは `(user_id, date, mood_score)` で足りる。

---

### 3.3 `consult_threads` / `consult_messages` — 体調相談

```sql
CREATE TABLE public.consult_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','closed','escalated')),
  mood_at_start TEXT
                CHECK (mood_at_start IS NULL
                  OR mood_at_start IN ('great','good','okay','bad','rough')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.consult_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES public.consult_threads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content     TEXT NOT NULL,
  model       TEXT,                 -- 例: gpt-4.1-mini
  token_in    INTEGER,
  token_out   INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- 1ユーザー複数スレッド可（日ごと／話題ごと）。v1 は「最新 open 1本」でも可。
- `content` は相談文面のため **RLS 厳格・バックアップ方針を別途**。

---

### 3.4 `check_sessions` / `check_answers` — セルフチェック

尺度はアプリ表示上「こころ／やすらぎ／ねむり」。DB キーは `phq` / `gad` / `psqi`。

```sql
CREATE TABLE public.check_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scale           TEXT NOT NULL CHECK (scale IN ('phq','gad','psqi')),
  period_ym       TEXT,              -- 例 '2026-09'（月次集計用・任意）
  raw_score       SMALLINT NOT NULL, -- 尺度生点
  max_score       SMALLINT NOT NULL,
  band            TEXT,              -- 良好/普通/注意 等（アプリ定義）
  crisis          BOOLEAN NOT NULL DEFAULT false, -- ★採用: PHQ危機項目など
  started_at      TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms     INTEGER,           -- セッション所要（任意）
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`crisis`（採用）**
- 現行アプリ: PHQ の最終設問（自傷・死にたい気持ち）で 1 点以上なら `crisis = true`（`lib/check.ts` の `evaluateCheck`）。
- `true` のとき: 結果画面でサポート誘導、必要なら通知・監査用クエリに使う。
- GAD / PSQI では通常 `false`（将来拡張可）。

```sql
CREATE INDEX idx_check_sessions_crisis
  ON public.check_sessions (user_id, completed_at DESC)
  WHERE crisis = true;
```

```sql
CREATE TABLE public.check_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.check_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scale           TEXT NOT NULL CHECK (scale IN ('phq','gad','psqi')),
  question_id     TEXT NOT NULL,     -- 例 'phq3'（アプリ設問ID）
  question_no     SMALLINT NOT NULL,
  answer_value    SMALLINT,          -- choice: 0〜3
  answer_text     TEXT,              -- time入力など（就寝時刻）
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT now(), -- ★回答時刻
  latency_ms      INTEGER,           -- 前問からの経過（任意）
  UNIQUE (session_id, question_id)
);
```

**総合スコア（今月）** はアプリで `phq/gad/psqi` の最新セッションから換算して表示。  
確定保存したい場合は `monthly_score_snapshots` を使う。

```sql
CREATE TABLE public.monthly_score_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year_month    TEXT NOT NULL,       -- 'YYYY-MM'
  total_score   SMALLINT NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  band          TEXT NOT NULL CHECK (band IN ('good','okay','caution')),
  phq_score     SMALLINT,
  gad_score     SMALLINT,
  psqi_score    SMALLINT,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year_month)
);
```

---

### 3.4b `notification_settings` — 通知設定（**採用**）

スキーマは先行作成し、プッシュ配信は後から接続する。

```sql
CREATE TABLE public.notification_settings (
  user_id               UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_enabled          BOOLEAN NOT NULL DEFAULT true,
  daily_reminder_time   TIME NOT NULL DEFAULT '20:00:00',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| カラム | 説明 |
|--------|------|
| `push_enabled` | 通知全体のマスタースイッチ |
| `daily_reminder_time` | 毎日の通知時間 |

**登録時:** `profiles` 作成トリガーまたは初回ログインでデフォルト行を INSERT する想定。

**画面対応（設定）**
- 通知を受け取る → `push_enabled`
- 毎日の通知時間 → `daily_reminder_time`
---

### 3.5 `lesson_completions` — トレーニング未／済

```sql
CREATE TABLE public.lesson_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id        TEXT NOT NULL CHECK (skill_id IN ('sk1','sk2','sk3','sk4','sk5')),
  lesson_id       TEXT NOT NULL,     -- 例 'sk1-l3'
  status          TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed')), -- 未実施は行なし
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_spent_sec  INTEGER,
  UNIQUE (user_id, lesson_id)
);
```

「未」＝行が無い、で十分。進捗率は `COUNT(completed) / レッスン総数`。

---

### 3.6 `user_preferences` — 天気地域

```sql
CREATE TABLE public.user_preferences (
  user_id             UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  weather_region_key  TEXT NOT NULL DEFAULT 'osaka',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

（既存マイグレーションに近い。`weather_enabled` は現状アプリで常時ONなら省略可。）

---

### 3.7 `support_link_clicks` — 相談窓口クリック

```sql
CREATE TABLE public.support_link_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- 未ログインも可なら NULL
  link_key      TEXT NOT NULL,   -- 例 'ssc_web' / 'ssc_tel' / 'clinic_tel'
  link_label    TEXT,            -- 表示名のスナップショット
  href          TEXT NOT NULL,
  group_name    TEXT,            -- 例 'スチューデントサービスセンター'
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent    TEXT,
  path          TEXT             -- クリック元画面 '/settings' 等
);

CREATE INDEX idx_support_clicks_link_time
  ON public.support_link_clicks (link_key, clicked_at DESC);
CREATE INDEX idx_support_clicks_user_time
  ON public.support_link_clicks (user_id, clicked_at DESC);
```

集計は `COUNT(*) GROUP BY link_key`。個人特定を避ける集計ビューを管理者用に切る想定。

---

### 3.8 推奨追加

#### `work_answers`（トレーニング・ワーク）
レッスン内テキスト回答。成長の質的振り返りに有用。

#### `user_badges`
初回チェック・連続利用など。成長画面のモチベーション用。

#### `weather_snapshots`
地域×取得時刻の要約。`condition_logs.pressure_alert` の根拠を残す。

#### `app_events`（任意・軽量分析）
```sql
-- event_name 例: home_tab_weather, check_start, training_open
user_id, event_name, props JSONB, created_at
```

---

## 4. 成長記録に「足りる／足す」もの

| 成長で見たいこと | 元データ | 追加が必要か |
|------------------|----------|--------------|
| 気分の推移 | `condition_logs` | 不要 |
| 気圧注意日との重なり | `condition_logs.pressure_alert` | 任意で snapshot 紐付け |
| チェック総合・各尺度推移 | `check_sessions` / snapshots | 月次確定なら snapshot |
| 学科キャラ帯（良好/普通/注意） | 総合スコア＋`profiles.department` | 不要（アプリ計算） |
| トレーニング進捗 | `lesson_completions` | 不要 |
| 連続利用日数 | `condition_logs` or `app_events` | 任意で `profiles.last_active_at` |
| バッジ | — | `user_badges` 推奨 |

---

## 5. 追加提案（未採用・任意）

1. **同意・免責の受諾ログ** … `consent_logs`  
2. **管理者用集計ロール** … 個人メッセージは見せず集計のみ  
3. **データ保持期間ポリシー** … 特に `consult_messages`  
4. **レート制限** … 相談 API の日次 COUNT  
5. **`app_events`** … 画面閲覧の簡易分析  

~~危機フラグ / 通知設定は採用済み（§0・§3.4・§3.4b）。~~

---

## 6. RLS 方針（共通）

| テーブル | 方針 |
|----------|------|
| ユーザー所有データ全般 | `auth.uid() = user_id` の SELECT/INSERT/UPDATE |
| `profiles` | 本人のみ（既存ポリシー） |
| `check_sessions` / `check_answers` | 本人のみ。`crisis` 行も本人スコープ（集計は service_role） |
| `notification_settings` | 本人のみ SELECT/UPDATE（INSERT は初回デフォルト） |
| `support_link_clicks` | 本人 INSERT。集計は service_role / 管理ビュー |
| `consult_messages` | 本人のみ。管理者直読みは原則禁止 |
| DELETE | 原則アプリから制限（論理削除が必要なら `deleted_at`） |

---

## 7. インデックス（最低限）

```sql
CREATE INDEX idx_condition_logs_user_date ON condition_logs (user_id, date DESC);
CREATE INDEX idx_check_sessions_user_scale_time ON check_sessions (user_id, scale, completed_at DESC);
CREATE INDEX idx_check_answers_session ON check_answers (session_id, question_no);
CREATE INDEX idx_lesson_completions_user_skill ON lesson_completions (user_id, skill_id);
CREATE INDEX idx_consult_messages_thread_time ON consult_messages (thread_id, created_at);
CREATE INDEX idx_support_clicks_link_time ON support_link_clicks (link_key, clicked_at DESC);
```

---

## 8. 実装優先度（提案）

| Phase | 内容 |
|-------|------|
| P0 | `condition_logs`, `check_sessions`（**含 crisis**）, `check_answers`, `lesson_completions`, `user_preferences` |
| P0' | `notification_settings` テーブル作成（UI・プッシュ接続は後続） |
| P1 | `consult_*`, `support_link_clicks` |
| P2 | `work_answers`, `user_badges`, `monthly_score_snapshots`, `weather_snapshots` |
| P3 | `app_events`, 同意ログ、プッシュ配信本体 |

---

## 9. 現行コードとの差分メモ

- いま多くは **localStorage**（体調・天気・最新チェックスコア）。  
- `profiles` / `user_preferences` 骨子はマイグレーション済。  
- DB本実装時は「書き込み先を Supabase に切替＋既存端末データの任意マイグレーション」が必要。

---

**次のアクション案：** Supabase で `20260917_profiles.sql` → `20260919_resiapp_core_tables.sql` を順に実行する（SQL Editor 可）。旧 `20260919_check_sessions_and_notifications.sql` / `notification_settings_simplify.sql` はコアSQLに包含済みのため、未適用環境ではコアのみでよい。
