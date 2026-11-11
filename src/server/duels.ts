import "server-only";
import { GAME } from "@/config/game";
import { DUEL_BALANCE, ENGINE_VERSION, generateSeed, simulateBattle, type BattleEvent } from "@/engine";
import type { EquippedRow, PingoRow, ProfileRow, ProgressRow } from "@/lib/db-types";
import { LEVEL_THRESHOLDS, progressFromRow } from "@/lib/levels";
import { pickOpponent } from "@/lib/matchmaking";
import { buildSnapshot, combatantFromSnapshot } from "@/lib/snapshot";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DuelOutcome {
  duelId: string;
  foeId: string;
  events: BattleEvent[];
  won: boolean;
  /** false = past the daily limit: a friendly duel without XP */
  counted: boolean;
  xpGained: number;
  xpBefore: number;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
  duelsToday: number;
  /** trophies of the day, before and after this duel (every duel counts, friendly ones included) */
  trophiesBefore: number;
  trophiesAfter: number;
}

/** "YYYY-MM-DD" in the school's time zone (the daily limit resets at midnight in Brazil). */
export function schoolDay(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(date));
}

/**
 * The whole duel happens on the server: pick the opponent, freeze both Pingos, run the engine,
 * then `record_duel` saves it and awards XP in one transaction. The browser only watches.
 */
export async function runDuel(userId: string, classId: string): Promise<DuelOutcome> {
  const admin = createAdminClient();
  const { data: students } = await admin
    .from("profiles")
    .select("*")
    .eq("class_id", classId)
    .eq("role", "student")
    .eq("active", true)
    .eq("pending", false)
    .returns<ProfileRow[]>();
  const ids = (students ?? []).map((s) => s.id);
  const me = (students ?? []).find((s) => s.id === userId);
  if (!me) throw new Error("not_allowed");

  const [{ data: pingos }, { data: equipped }, { data: progress }, { data: recent }] = await Promise.all([
    admin.from("pingos").select("*").in("owner_id", ids).returns<PingoRow[]>(),
    admin.from("equipped_items").select("*").in("owner_id", ids).returns<EquippedRow[]>(),
    admin.from("pingo_progress").select("*").in("owner_id", ids).returns<ProgressRow[]>(),
    admin
      .from("duels")
      .select("defender_id, created_at")
      .eq("challenger_id", userId)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const progressOf = (id: string) => progressFromRow((progress ?? []).find((p) => p.owner_id === id));
  const today = schoolDay(new Date());
  const todayCounts: Record<string, number> = {};
  for (const d of recent ?? []) {
    if (schoolDay(d.created_at as string) === today) todayCounts[d.defender_id as string] = (todayCounts[d.defender_id as string] ?? 0) + 1;
  }
  const foeCandidate = pickOpponent(
    { id: userId, level: progressOf(userId).level },
    (students ?? []).map((s) => ({ id: s.id, level: progressOf(s.id).level })),
    { recent: (recent ?? []).map((d) => d.defender_id as string), todayCounts },
    Math.random,
  );
  if (!foeCandidate) throw new Error("no_opponent");
  const foe = (students ?? []).find((s) => s.id === foeCandidate.id)!;

  const snapshotOf = (profile: ProfileRow) =>
    buildSnapshot(
      profile,
      (pingos ?? []).find((p) => p.owner_id === profile.id) ?? null,
      (equipped ?? []).filter((e) => e.owner_id === profile.id).map((e) => e.item_id),
      progressOf(profile.id),
    );
  const snapshots = [snapshotOf(me), snapshotOf(foe)] as const;
  const seed = generateSeed();
  // order is part of the replay: [challenger, defender]
  const result = simulateBattle({ seed, participants: snapshots.map(combatantFromSnapshot) }, DUEL_BALANCE);

  const { data, error } = await admin.rpc("record_duel", {
    p_challenger: me.id,
    p_defender: foe.id,
    p_winner: result.winnerId,
    p_seed: seed,
    p_engine_version: ENGINE_VERSION,
    p_balance: DUEL_BALANCE,
    p_snapshots: snapshots,
    p_events: result.events,
    p_xp_win: GAME.duels.xpWin,
    p_xp_loss: GAME.duels.xpLoss,
    p_daily_limit: GAME.duels.dailyXpDuels,
    p_min_interval_seconds: GAME.duels.minSecondsBetween,
    p_level_thresholds: LEVEL_THRESHOLDS,
    p_trophy_start: GAME.duels.trophies.start,
    p_trophy_k: GAME.duels.trophies.k,
    p_trophy_scale: GAME.duels.trophies.scale,
  });
  if (error) throw new Error(error.message);
  const saved = data as {
    duel_id: string;
    counted: boolean;
    xp_gained: number;
    xp_before: number;
    xp_after: number;
    level_before: number;
    level_after: number;
    duels_today: number;
    trophies_before: number;
    trophies_after: number;
  };

  return {
    duelId: saved.duel_id,
    foeId: foe.id,
    events: result.events,
    won: result.winnerId === me.id,
    counted: saved.counted,
    xpGained: saved.xp_gained,
    xpBefore: saved.xp_before,
    xpAfter: saved.xp_after,
    levelBefore: saved.level_before,
    levelAfter: saved.level_after,
    duelsToday: saved.duels_today,
    trophiesBefore: saved.trophies_before,
    trophiesAfter: saved.trophies_after,
  };
}
