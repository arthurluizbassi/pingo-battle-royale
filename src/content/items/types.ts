import { GAME, type ItemTier } from "@/config/game";
import type { SpecialEffect, StatModifiers } from "@/engine/types";

export type ItemCategory = "weapon" | "helmet" | "outfit";

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  weapon: "Arma",
  helmet: "Capacete",
  outfit: "Roupa",
};

export type ItemTag =
  | "balanced"
  | "heavy"
  | "fast"
  | "crit"
  | "defense"
  | "chaos"
  | "hp"
  | "critShield"
  | "speed"
  | "dodge"
  | "hybrid";

export const TAG_LABEL: Record<ItemTag, string> = {
  balanced: "Equilibrado",
  heavy: "Pesado",
  fast: "Rápido",
  crit: "Crítico",
  defense: "Defesa",
  chaos: "Caótico",
  hp: "Vida",
  critShield: "Anti-crítico",
  speed: "Velocidade",
  dodge: "Esquiva",
  hybrid: "Híbrido",
};

/** A complete, data-only item. The engine only reads statModifiers + specialEffect. */
export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  tier: ItemTier;
  price: number;
  /** key in the sprite registry (src/sprites/items) */
  sprite: string;
  statModifiers: StatModifiers;
  specialEffect: SpecialEffect | null;
  tags: ItemTag[];
}

export function defineItem(
  category: ItemCategory,
  item: Omit<ItemDefinition, "category" | "price" | "sprite" | "specialEffect"> & {
    specialEffect?: SpecialEffect;
    price?: number;
  },
): ItemDefinition {
  return {
    ...item,
    category,
    price: item.price ?? GAME.priceByTier[item.tier],
    sprite: item.id,
    specialEffect: item.specialEffect ?? null,
  };
}
