import type { Stats } from "./types";

/**
 * EVERY combat balance number lives here.
 * Explained in GAME_BALANCE.md. Change a value, then run `npm run simulate`.
 */
export const BALANCE = {
  /** Every Pingo starts with exactly these stats. */
  base: {
    hp: 100,
    atk: 40,
    def: 10,
    spd: 20,
    crit: 0.15,
    dodge: 0.12,
  } satisfies Stats,

  /**
   * Multiplies max HP after the caps. 1 in the Battle Royale; duels use DUEL_BALANCE
   * (more HP = more hits = a longer, more fun show, with almost the same win rates).
   */
  hpMultiplier: 1,

  /** Hard limits applied after summing equipment. [min, max] */
  caps: {
    hp: [50, 200],
    atk: [15, 80],
    def: [0, 45],
    spd: [8, 40],
    crit: [0, 0.4],
    dodge: [0, 0.3],
  } satisfies Record<keyof Stats, [number, number]>,

  damage: {
    /** damage = ATK * K / (K + DEF). Higher K = defense matters less. */
    defenseK: 50,
    /** normal hits deal 65%..135% (≈ 3 hits to knock out a naked Pingo) */
    varianceMin: 0.65,
    varianceMax: 1.35,
    critMultiplier: 2.5,
    minDamage: 1,
  },

  /** Each tick a Pingo gains SPD in its gauge; it acts when the gauge reaches the threshold. */
  gauge: {
    threshold: 200,
    /** random starting gauge so the faster Pingo does not always strike first */
    initialJitter: 120,
  },

  effects: {
    blockReduction: 0.6,
    adrenalineHpThreshold: 0.35,
    /** caps for the SUM of the same effect coming from several items */
    max: {
      firstStrike: 1.0,
      openingGuard: 0.8,
      adrenaline: 12,
      block: 0.25,
      chaos: 0.7,
      critDamage: 1.0,
      critShield: 0.6,
    },
  },

  /** Battle royale target selection (no effect in 1v1). */
  targeting: {
    /** weight = 1 / (distanceBias + distance): prefers nearby Pingos */
    distanceBias: 0.15,
    /** weight /= 1 + heatPenalty * (recent hits taken from OTHER Pingos) */
    heatPenalty: 1.5,
    /** multiplied every tick: recent-hit memory fades (half-life ≈ 1 action) */
    heatDecay: 0.93,
    /** multiplier to hit back whoever hit you recently */
    retaliationBonus: 3,
    retaliationWindow: 25,
    /** multiplier to keep attacking the same target */
    focusBonus: 2,
  },

  arena: {
    /** positions are in a 0..1 square */
    margin: 0.06,
    minSpawnDistance: 0.12,
    engageDistance: 0.06,
  },

  /** Ends long battles: from startTick on, a shrinking zone deals growing true damage. */
  suddenDeath: {
    startTick: 150,
    pulseInterval: 10,
    /** fraction of max HP on the first pulse */
    baseDamage: 0.05,
    /** extra fraction added each pulse */
    damageGrowth: 0.03,
  },

  /** absolute safety net, never expected to be hit */
  maxTicks: 3000,
};

export type BalanceConfig = typeof BALANCE;

/** 1v1 duels: same rules, more HP so each duel lasts ~7-8 hits instead of ~4. */
export const DUEL_BALANCE: BalanceConfig = { ...BALANCE, hpMultiplier: 1.7 };

/** Bump when combat rules change. Stored with each battle for traceability. */
export const ENGINE_VERSION = "pingo-engine-1";
