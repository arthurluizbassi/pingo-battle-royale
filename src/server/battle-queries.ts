import "server-only";
import type { ReplayParticipant } from "@/components/arena/ArenaReplay";
import type { BattleEvent } from "@/engine";
import type { BattleRow, EquippedRow, ParticipantRow, ParticipantSnapshot, PingoRow, ProfileRow } from "@/lib/db-types";
import { lookFromPingo } from "@/lib/snapshot";
import { createClient } from "@/lib/supabase/server";
import { loadoutFromRows } from "./queries";

/** Reads run as the logged-in user (RLS: only battles of their class, events only when finished). */

export async function getBattle(battleId: string): Promise<BattleRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("battles").select("*").eq("id", battleId).maybeSingle<BattleRow>();
  return data;
}

export async function getParticipants(battleId: string) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("battle_participants")
    .select("*")
    .eq("battle_id", battleId)
    .returns<ParticipantRow[]>();
  const ids = (rows ?? []).map((r) => r.profile_id);
  if (!ids.length) return [];
  const [{ data: profiles }, { data: pingos }, { data: equipped }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", ids).returns<ProfileRow[]>(),
    supabase.from("pingos").select("*").in("owner_id", ids).returns<PingoRow[]>(),
    supabase.from("equipped_items").select("*").in("owner_id", ids).returns<EquippedRow[]>(),
  ]);
  return (rows ?? []).map((row) => ({
    row,
    profile: (profiles ?? []).find((p) => p.id === row.profile_id) ?? null,
    pingo: (pingos ?? []).find((p) => p.owner_id === row.profile_id) ?? null,
    /** CURRENT equipment (only for display before the lock) */
    currentLoadout: loadoutFromRows((equipped ?? []).filter((e) => e.owner_id === row.profile_id)),
  }));
}

export async function getEvents(battleId: string): Promise<BattleEvent[]> {
  const supabase = await createClient();
  const events: BattleEvent[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("battle_events")
      .select("payload")
      .eq("battle_id", battleId)
      .order("seq")
      .range(from, from + 999);
    events.push(...(data ?? []).map((r) => r.payload as BattleEvent));
    if (!data || data.length < 1000) break;
  }
  return events;
}

/** Replay data comes from the FROZEN snapshots, never from today's equipment. */
export function replayParticipant(snapshot: ParticipantSnapshot): ReplayParticipant {
  return {
    id: snapshot.profileId,
    pingoName: snapshot.pingoName,
    displayName: snapshot.displayName,
    look: snapshot.look ?? lookFromPingo(null),
    gear: Object.fromEntries(snapshot.items.map((i) => [i.category, i.sprite])),
    items: snapshot.items.map((i) => ({ id: i.id, name: i.name, category: i.category, sprite: i.sprite })),
  };
}
