import { buildFromItems, getItem, type ItemDefinition } from "@/content/items";
import { powerScore, type CombatantInput } from "@/engine";
import type { PingoLook } from "@/sprites/compose";
import type { ParticipantSnapshot, PingoRow, ProfileRow } from "./db-types";
import { NEW_PROGRESS, statsWithLevel, type Progress } from "./levels";

export function lookFromPingo(pingo: Pick<PingoRow, "body_color" | "eyes" | "mouth" | "detail"> | null): PingoLook {
  return {
    bodyColor: (pingo?.body_color ?? "azul") as PingoLook["bodyColor"],
    eyes: (pingo?.eyes ?? "redondo") as PingoLook["eyes"],
    mouth: (pingo?.mouth ?? "sorriso") as PingoLook["mouth"],
    detail: (pingo?.detail ?? "bochechas") as PingoLook["detail"],
  };
}

/** Freezes a participant: copies the full item definitions so future catalog edits can't change history. */
export function buildSnapshot(
  profile: Pick<ProfileRow, "id" | "username" | "display_name">,
  pingo: PingoRow | null,
  equippedItemIds: string[],
  progress: Progress = NEW_PROGRESS,
): ParticipantSnapshot {
  const items = equippedItemIds.map((id) => getItem(id)).filter((i): i is ItemDefinition => i !== null);
  const { effects } = buildFromItems(items);
  // items + level points (from duels), clamped to the caps
  const stats = statsWithLevel(items.map((i) => i.statModifiers), progress.statPoints);
  return {
    profileId: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    pingoName: pingo?.name ?? profile.display_name,
    look: lookFromPingo(pingo),
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      sprite: i.sprite,
      statModifiers: i.statModifiers,
      specialEffect: i.specialEffect,
    })),
    stats,
    effects,
    powerScore: powerScore(stats, effects),
    level: progress.level,
    statPoints: progress.statPoints,
  };
}

export function combatantFromSnapshot(snapshot: ParticipantSnapshot): CombatantInput {
  return { id: snapshot.profileId, name: snapshot.pingoName, stats: snapshot.stats, effects: snapshot.effects };
}
