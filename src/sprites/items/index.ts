import type { HelmetArt, OutfitArt, WeaponArt } from "../types";
import type { PingoGear } from "../compose";
import { HELMET_ART } from "./helmets";
import { OUTFIT_ART } from "./outfits";
import { WEAPON_ART } from "./weapons";

export { HELMET_ART, OUTFIT_ART, WEAPON_ART };

export type ItemArt = WeaponArt | HelmetArt | OutfitArt;

export function artFor(category: "weapon" | "helmet" | "outfit", sprite: string | null | undefined): ItemArt | null {
  if (!sprite) return null;
  if (category === "weapon") return WEAPON_ART[sprite] ?? null;
  if (category === "helmet") return HELMET_ART[sprite] ?? null;
  return OUTFIT_ART[sprite] ?? null;
}

/** Sprite keys of the equipped items (for items, sprite key == item id by default). */
export interface GearSprites {
  weapon?: string | null;
  helmet?: string | null;
  outfit?: string | null;
}

export function gearFromSprites(sprites: GearSprites): PingoGear {
  return {
    weapon: sprites.weapon ? (WEAPON_ART[sprites.weapon] ?? null) : null,
    helmet: sprites.helmet ? (HELMET_ART[sprites.helmet] ?? null) : null,
    outfit: sprites.outfit ? (OUTFIT_ART[sprites.outfit] ?? null) : null,
  };
}
