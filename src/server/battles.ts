import "server-only";
import {
  BALANCE,
  ENGINE_VERSION,
  generateSeed,
  simulateBattle,
  type BalanceConfig,
  type BattleEvent,
  type BattleResult,
} from "@/engine";
import { summarizeBattle, trophiesFor } from "@/lib/battle-summary";
import type { BattleRow, EquippedRow, ParticipantRow, ParticipantSnapshot, PingoRow, ProfileRow, ProgressRow } from "@/lib/db-types";
import { progressFromRow } from "@/lib/levels";
import { buildSnapshot, combatantFromSnapshot } from "@/lib/snapshot";
import { createAdminClient } from "@/lib/supabase/admin";

async function loadBattle(battleId: string, classId: string): Promise<BattleRow> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("battles")
    .select("*")
    .eq("id", battleId)
    .eq("class_id", classId)
    .single<BattleRow>();
  if (!data) throw new Error("Batalha não encontrada.");
  return data;
}

/** LOCK LOADOUTS: capture every participant's equipment right now. */
export async function lockBattle(battleId: string, classId: string): Promise<void> {
  const admin = createAdminClient();
  const battle = await loadBattle(battleId, classId);
  if (battle.status !== "scheduled") throw new Error("Os loadouts desta batalha já foram travados.");

  const { data: participants } = await admin
    .from("battle_participants")
    .select("profile_id")
    .eq("battle_id", battleId);
  const ids = (participants ?? []).map((p) => p.profile_id as string);
  if (ids.length < 2) throw new Error("São necessários pelo menos 2 participantes.");

  const [{ data: profiles }, { data: pingos }, { data: equipped }, { data: progress }] = await Promise.all([
    admin.from("profiles").select("*").in("id", ids).returns<ProfileRow[]>(),
    admin.from("pingos").select("*").in("owner_id", ids).returns<PingoRow[]>(),
    admin.from("equipped_items").select("*").in("owner_id", ids).returns<EquippedRow[]>(),
    admin.from("pingo_progress").select("*").in("owner_id", ids).returns<ProgressRow[]>(),
  ]);

  const snapshots = (profiles ?? []).map((profile) => {
    const pingo = (pingos ?? []).find((p) => p.owner_id === profile.id) ?? null;
    const items = (equipped ?? []).filter((e) => e.owner_id === profile.id).map((e) => e.item_id);
    // level points earned in duels count in the Battle Royale too
    const snapshot = buildSnapshot(profile, pingo, items, progressFromRow((progress ?? []).find((p) => p.owner_id === profile.id)));
    return { profile_id: profile.id, power_score: snapshot.powerScore, snapshot };
  });

  const { error } = await admin.rpc("lock_battle", { p_battle_id: battleId, p_snapshots: snapshots });
  if (error) throw new Error(`Falha ao travar loadouts: ${error.message}`);
}

/** START BATTLE: new seed, full simulation on the server, everything saved in one transaction. */
export async function startBattle(battleId: string, classId: string): Promise<void> {
  const admin = createAdminClient();
  const battle = await loadBattle(battleId, classId);
  if (battle.status !== "locked") throw new Error("Trave os loadouts antes de iniciar a batalha.");

  const { data: rows } = await admin
    .from("battle_participants")
    .select("*")
    .eq("battle_id", battleId)
    .returns<ParticipantRow[]>();
  const snapshots = (rows ?? []).map((r) => r.snapshot).filter((s): s is ParticipantSnapshot => s !== null);
  if (snapshots.length < 2) throw new Error("São necessários pelo menos 2 participantes com loadout travado.");

  // stable order => the seed alone reproduces the battle
  snapshots.sort((a, b) => a.profileId.localeCompare(b.profileId));
  const seed = generateSeed();
  const result = simulateBattle({ seed, participants: snapshots.map(combatantFromSnapshot) }, BALANCE);

  const results = Object.entries(result.fighters).map(([profileId, f]) => ({
    profile_id: profileId,
    ...f,
    eliminatedBy: f.eliminatedBy ?? "",
  }));

  const { error } = await admin.rpc("finish_battle", {
    p_battle_id: battleId,
    p_seed: seed,
    p_engine_version: ENGINE_VERSION,
    p_balance: BALANCE,
    p_winner: result.winnerId,
    p_summary: summarizeBattle(result, snapshots),
    p_results: results,
    p_events: result.events,
    p_trophies: trophiesFor(result, battle.name),
  });
  if (error) throw new Error(`Falha ao salvar a batalha: ${error.message}`);
}

export async function loadBattleEvents(battleId: string): Promise<BattleEvent[]> {
  const admin = createAdminClient();
  const events: BattleEvent[] = [];
  // PostgREST returns at most 1000 rows per request
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("battle_events")
      .select("payload")
      .eq("battle_id", battleId)
      .order("seq")
      .range(from, from + 999);
    events.push(...(data ?? []).map((row) => row.payload as BattleEvent));
    if (!data || data.length < 1000) break;
  }
  return events;
}

/**
 * Re-runs a stored battle from its seed + snapshots + stored balance config and
 * compares with the saved event log. Proves the replay is the real battle.
 */
export async function verifyBattle(
  battle: BattleRow,
  snapshots: ParticipantSnapshot[],
  storedEvents: BattleEvent[],
): Promise<{ identical: boolean; result: BattleResult }> {
  if (battle.seed == null) throw new Error("Batalha sem seed.");
  const ordered = [...snapshots].sort((a, b) => a.profileId.localeCompare(b.profileId));
  const config = (battle.balance_snapshot as BalanceConfig | null) ?? BALANCE;
  const result = simulateBattle({ seed: battle.seed, participants: ordered.map(combatantFromSnapshot) }, config);
  return { identical: canonical(result.events) === canonical(storedEvents), result };
}

/** JSON with sorted keys: Postgres jsonb does not keep key order. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}
