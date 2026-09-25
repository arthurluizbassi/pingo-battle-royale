export const STAT_KEYS = ["hp", "atk", "def", "spd", "crit", "dodge"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

/** crit and dodge are probabilities (0.05 = 5%). */
export type Stats = Record<StatKey, number>;
export type StatModifiers = Partial<Stats>;

/**
 * The complete list of special effects. Keep it short on purpose.
 * - firstStrike:  first attack of the battle deals +value (0.5 = +50%)
 * - openingGuard: first hit received is reduced by value (0.5 = -50%)
 * - adrenaline:   +value SPD once HP drops below the balance threshold
 * - block:        value chance to reduce an incoming hit (reduction in balance config)
 * - chaos:        damage variance becomes 1 ± value instead of the normal range
 * - critDamage:   crit multiplier +value
 * - critShield:   crits received deal value (0.4 = 40%) less of their EXTRA damage
 */
export const EFFECT_TYPES = [
  "firstStrike",
  "openingGuard",
  "adrenaline",
  "block",
  "chaos",
  "critDamage",
  "critShield",
] as const;
export type EffectType = (typeof EFFECT_TYPES)[number];

export interface SpecialEffect {
  type: EffectType;
  value: number;
}

export type EffectTotals = Record<EffectType, number>;

export interface CombatantInput {
  id: string;
  name: string;
  stats: Stats;
  effects: SpecialEffect[];
}

export interface BattleInput {
  participants: CombatantInput[];
  seed: number;
}

export type BattleEvent =
  | { type: "spawn"; t: number; id: string; x: number; y: number; hp: number; maxHp: number }
  | {
      type: "attack";
      t: number;
      attacker: string;
      target: string;
      /** attacker position after moving next to the target */
      x: number;
      y: number;
      dodged: boolean;
      crit: boolean;
      blocked: boolean;
      damage: number;
      targetHp: number;
      tags: AttackTag[];
    }
  | { type: "adrenaline"; t: number; id: string }
  | { type: "eliminated"; t: number; id: string; by: string | null; remaining: number; placement: number }
  | { type: "suddenDeath"; t: number }
  | { type: "zone"; t: number; id: string; damage: number; hp: number }
  | { type: "victory"; t: number; id: string };

export type AttackTag = "firstStrike" | "openingGuard" | "chaosHigh" | "chaosLow";

export interface FighterStats {
  placement: number;
  kills: number;
  attacks: number;
  hits: number;
  crits: number;
  dodges: number;
  blocks: number;
  damageDealt: number;
  damageTaken: number;
  biggestHit: number;
  finalHp: number;
  eliminatedBy: string | null;
  eliminatedAt: number | null;
}

export interface BattleResult {
  engineVersion: string;
  seed: number;
  winnerId: string;
  ticks: number;
  suddenDeathReached: boolean;
  events: BattleEvent[];
  fighters: Record<string, FighterStats>;
}
