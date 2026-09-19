import { createClient } from "@/lib/supabase/client";
import {
  computeTotalScore,
  loadLatestCheckScores,
  type LatestCheckScores,
} from "@/lib/check-storage";
import { totalScoreBand } from "@/lib/dept-character";

/** 今月の総合スコアを monthly_score_snapshots に確定保存 */
export async function upsertMonthlyScoreSnapshot(
  scores?: LatestCheckScores
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const latest = scores ?? loadLatestCheckScores();
    const total = computeTotalScore(latest);
    if (total == null) return;

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const band = totalScoreBand(total);

    const { error } = await supabase.from("monthly_score_snapshots").upsert(
      {
        user_id: user.id,
        year_month: yearMonth,
        total_score: total,
        band,
        phq_score: latest.phq ?? null,
        gad_score: latest.gad ?? null,
        psqi_score: latest.psqi ?? null,
        computed_at: now.toISOString(),
      },
      { onConflict: "user_id,year_month" }
    );
    if (error) console.warn("monthly_score_snapshots upsert:", error.message);
  } catch (e) {
    console.warn("monthly_score_snapshots sync failed", e);
  }
}
