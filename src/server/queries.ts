import "server-only";
import { EMPTY_LOADOUT, type Loadout } from "@/content/items";
import type { BattleRow, EquippedRow, PingoRow, ProfileRow, SeasonRow } from "@/lib/db-types";
import { computeRanking, type RankingRow } from "@/lib/ranking";
import { createClient } from "@/lib/supabase/server";

/** All reads here run AS the logged-in user: Row Level Security decides what is visible. */

export async function getStudentState(profileId: string) {
  const supabase = await createClient();
  const [{ data: pingo }, { data: wallet }, { data: equipped }, { data: inventory }] = await Promise.all([
    supabase.from("pingos").select("*").eq("owner_id", profileId).maybeSingle<PingoRow>(),
    supabase.from("wallets").select("balance").eq("owner_id", profileId).maybeSingle(),
    supabase.from("equipped_items").select("*").eq("owner_id", profileId).returns<EquippedRow[]>(),
    supabase.from("inventories").select("item_id, acquired_at").eq("owner_id", profileId).order("acquired_at"),
  ]);
  return {
    pingo,
    balance: (wallet?.balance as number | undefined) ?? 0,
    loadout: loadoutFromRows(equipped ?? []),
    inventory: (inventory ?? []).map((row) => row.item_id as string),
  };
}

export function loadoutFromRows(rows: Pick<EquippedRow, "slot" | "item_id">[]): Loadout {
  const loadout: Loadout = { ...EMPTY_LOADOUT };
  for (const row of rows) loadout[row.slot] = row.item_id;
  return loadout;
}

export async function getNextBattle(classId: string): Promise<BattleRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("battles")
    .select("*")
    .eq("class_id", classId)
    .in("status", ["scheduled", "locked"])
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<BattleRow>();
  return data;
}

export async function getActiveSeason(classId: string): Promise<SeasonRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("class_id", classId)
    .eq("active", true)
    .maybeSingle<SeasonRow>();
  return data;
}

export async function getSeasonRanking(seasonId: string): Promise<RankingRow[]> {
  const supabase = await createClient();
  const { data: battles } = await supabase
    .from("battles")
    .select("id")
    .eq("season_id", seasonId)
    .eq("status", "finished");
  const ids = (battles ?? []).map((b) => b.id as string);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("battle_participants")
    .select("profile_id, placement, kills")
    .in("battle_id", ids);
  return computeRanking(data ?? []);
}

export async function getClassmates(classId: string) {
  const supabase = await createClient();
  const [{ data: profiles }, { data: pingos }, { data: equipped }] = await Promise.all([
    supabase.from("profiles").select("*").eq("class_id", classId).eq("role", "student").order("display_name").returns<ProfileRow[]>(),
    supabase.from("pingos").select("*").returns<PingoRow[]>(),
    supabase.from("equipped_items").select("*").returns<EquippedRow[]>(),
  ]);
  return (profiles ?? []).map((profile) => ({
    profile,
    pingo: (pingos ?? []).find((p) => p.owner_id === profile.id) ?? null,
    loadout: loadoutFromRows((equipped ?? []).filter((e) => e.owner_id === profile.id)),
  }));
}
