import { computeStats, type SpecialEffect, type Stats } from "@/engine";
import { HELMETS } from "./helmets";
import { OUTFITS } from "./outfits";
import type { ItemCategory, ItemDefinition } from "./types";
import { WEAPONS } from "./weapons";

export * from "./types";

export const ALL_ITEMS: ItemDefinition[] = [...WEAPONS, ...HELMETS, ...OUTFITS];

const BY_ID = new Map(ALL_ITEMS.map((item) => [item.id, item]));

export function getItem(id: string | null | undefined): ItemDefinition | null {
  return id ? (BY_ID.get(id) ?? null) : null;
}

export function itemsByCategory(category: ItemCategory): ItemDefinition[] {
  return ALL_ITEMS.filter((item) => item.category === category);
}

export interface Loadout {
  weapon: string | null;
  helmet: string | null;
  outfit: string | null;
}

export const EMPTY_LOADOUT: Loadout = { weapon: null, helmet: null, outfit: null };

export function loadoutItems(loadout: Partial<Loadout>): ItemDefinition[] {
  return [loadout.weapon, loadout.helmet, loadout.outfit]
    .map((id) => getItem(id))
    .filter((item): item is ItemDefinition => item !== null);
}

/** Stats + effects of a set of equipped items (works with snapshot copies too). */
export function buildFromItems(items: Pick<ItemDefinition, "statModifiers" | "specialEffect">[]): {
  stats: Stats;
  effects: SpecialEffect[];
} {
  return {
    stats: computeStats(items.map((i) => i.statModifiers)),
    effects: items.flatMap((i) => (i.specialEffect ? [i.specialEffect] : [])),
  };
}
