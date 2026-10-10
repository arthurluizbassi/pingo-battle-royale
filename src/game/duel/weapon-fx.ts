import type { SfxName } from "./sfx";

/**
 * How each weapon LOOKS and SOUNDS in a duel. Pure presentation: the combat numbers
 * come from the engine. A new weapon without an entry falls back to UNARMED-ish smash.
 */

export type AttackStyle =
  /** run in, wind up, slam from above */
  | "smash"
  /** dash through the target leaving a slash arc */
  | "slash"
  /** quick lunge forward, poke */
  | "stab"
  /** the weapon flies to the target and comes back */
  | "throw"
  /** raise the weapon, a beam/projectile of glyphs flies */
  | "magic"
  /** sound waves push the target */
  | "honk"
  /** shoulder charge holding a shield */
  | "bash"
  /** no weapon: jump + headbutt */
  | "headbutt";

export type Debris =
  | "keys"
  | "pages"
  | "sparks"
  | "stars"
  | "feathers"
  | "water"
  | "wifi"
  | "glyphs"
  | "notes"
  | "spikes"
  | "splinters"
  | "confetti"
  | "lightning"
  | "smoke"
  | "numbers";

export interface WeaponFx {
  style: AttackStyle;
  debris: Debris;
  /** onomatopoeia shown on impact */
  word: string;
  /** extra impact sound (on top of the hit) */
  sfx: SfxName;
  /** throw: spin while flying */
  spin?: boolean;
  /** tint of slash arcs / beams */
  color?: number;
}

export const UNARMED: WeaponFx = { style: "headbutt", debris: "stars", word: "TOINC!", sfx: "boing" };

export const WEAPON_FX: Record<string, WeaponFx> = {
  cardboard_sword: { style: "slash", debris: "splinters", word: "PAF!", sfx: "slap", color: 0xd8a866 },
  ruler_katana: { style: "slash", debris: "numbers", word: "ZÁS!", sfx: "whoosh", color: 0xffd23f },
  mechanical_keyboard: { style: "smash", debris: "keys", word: "TEC-TEC!", sfx: "keys" },
  battle_umbrella: { style: "stab", debris: "water", word: "PLIC!", sfx: "splash", color: 0x5ad1e6 },
  selfie_stick: { style: "stab", debris: "stars", word: "CLICK!", sfx: "zap", color: 0xffffff },
  sofa_leg: { style: "smash", debris: "splinters", word: "BONK!", sfx: "bonk" },
  fair_mallet: { style: "smash", debris: "stars", word: "PLÓC!", sfx: "boing" },
  frozen_fish: { style: "smash", debris: "water", word: "SPLOFT!", sfx: "splash" },
  wifi_hammer: { style: "smash", debris: "wifi", word: "BZZT!", sfx: "zap" },
  aquarium_anchor: { style: "smash", debris: "water", word: "CLONK!", sfx: "heavyHit" },
  plastic_dagger: { style: "stab", debris: "sparks", word: "TIC!", sfx: "slap", color: 0xff8fb8 },
  ninja_chopsticks: { style: "slash", debris: "sparks", word: "XIU!", sfx: "whoosh", color: 0xfbf7ef },
  sharp_spinner: { style: "throw", debris: "sparks", word: "VRRRR!", sfx: "zap", spin: true },
  lightning_yoyo: { style: "throw", debris: "lightning", word: "ZIUM!", sfx: "zap", spin: true },
  bbq_skewer: { style: "stab", debris: "smoke", word: "TSSS!", sfx: "slap", color: 0xf28c28 },
  sharpened_pencil: { style: "stab", debris: "splinters", word: "RISC!", sfx: "slap", color: 0x231a2e },
  geometry_compass: { style: "slash", debris: "numbers", word: "360°!", sfx: "whoosh", color: 0xb8c4d6 },
  pet_cactus: { style: "stab", debris: "spikes", word: "AI-AI!", sfx: "slap", color: 0x3fa34d },
  party_laser_sword: { style: "slash", debris: "confetti", word: "VZZUM!", sfx: "zap", color: 0xff6fa8 },
  prompt_wand: { style: "magic", debris: "glyphs", word: "{PROMPT}", sfx: "magic", color: 0x9b6bf2 },
  pot_lid: { style: "bash", debris: "sparks", word: "DOOONG!", sfx: "block" },
  pool_noodle: { style: "smash", debris: "water", word: "FLOP!", sfx: "boing" },
  coffee_broom: { style: "slash", debris: "smoke", word: "VASSH!", sfx: "whoosh", color: 0xd8a866 },
  door_shield: { style: "bash", debris: "splinters", word: "BLAM!", sfx: "heavyHit" },
  thick_book: { style: "smash", debris: "pages", word: "PÁF!", sfx: "pages" },
  rubber_chicken: { style: "throw", debris: "feathers", word: "QUÉÉÉ!", sfx: "squeak", spin: true },
  ballistic_flipflop: { style: "throw", debris: "stars", word: "PLAFT!", sfx: "slap", spin: true },
  clown_horn: { style: "honk", debris: "notes", word: "FÓÓÓN!", sfx: "honk" },
  d20: { style: "throw", debris: "numbers", word: "20!", sfx: "dice", spin: true },
  universal_remote: { style: "magic", debris: "glyphs", word: "PAUSE!", sfx: "zap", color: 0x5ad1e6 },
};

export function weaponFx(weaponId: string | null | undefined): WeaponFx {
  if (!weaponId) return UNARMED;
  return WEAPON_FX[weaponId] ?? { style: "smash", debris: "stars", word: "POW!", sfx: "bonk" };
}
