import "server-only";
import type { DailyPodium, DailyRankingRow } from "@/lib/db-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { schoolDay } from "./duels";

/**
 * Pays the podium of every finished day that is still unpaid (the database does it once per day).
 * Called on the busy pages, so the first visit after midnight pays yesterday. Never breaks a page.
 */
export async function settlePendingRankings(classId: string): Promise<void> {
  try {
    await createAdminClient().rpc("settle_pending_rankings", { p_class: classId });
  } catch {
    // the next page load tries again
  }
}

/** Today's ranking of the user's class (RLS decides the class). */
export async function getTodayRanking(): Promise<DailyRankingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("daily_ranking");
  return (data as DailyRankingRow[] | null) ?? [];
}

export async function getRecentPodiums(classId: string, days = 7): Promise<DailyPodium[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_rankings")
    .select("*")
    .eq("class_id", classId)
    .order("day", { ascending: false })
    .limit(days)
    .returns<DailyPodium[]>();
  return data ?? [];
}

export async function getDailyPrizes(classId: string): Promise<[number, number, number]> {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("daily_prizes").eq("id", classId).maybeSingle();
  const p = (data?.daily_prizes as number[] | undefined) ?? [0, 0, 0];
  return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0];
}

/** Next midnight in Brasília (UTC-3, no daylight saving time since 2019), as ISO. */
export function nextMidnightBrasilia(now = new Date()): string {
  const today = schoolDay(now);
  return new Date(new Date(`${today}T00:00:00-03:00`).getTime() + 24 * 3600 * 1000).toISOString();
}
