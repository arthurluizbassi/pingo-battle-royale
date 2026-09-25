/**
 * The ONLY source of randomness for the battle engine.
 * mulberry32: tiny, fast, deterministic across JS runtimes.
 * Same seed + same inputs => exactly the same battle.
 */
export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** float in [min, max) */
  range(min: number, max: number): number;
  /** integer in [min, max] (inclusive) */
  int(min: number, max: number): number;
  /** true with probability p */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** index chosen proportionally to weights (all >= 0) */
  weightedIndex(weights: readonly number[]): number;
  shuffle<T>(items: readonly T[]): T[];
}

export const MAX_SEED = 2_147_483_647;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    weightedIndex: (weights) => {
      const total = weights.reduce((sum, w) => sum + w, 0);
      if (total <= 0) return Math.floor(next() * weights.length);
      let roll = next() * total;
      for (let i = 0; i < weights.length; i++) {
        roll -= weights[i];
        if (roll < 0) return i;
      }
      return weights.length - 1;
    },
    shuffle: (items) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
  return rng;
}

/** Seed for a new battle. Uses crypto when available (server), never inside the engine loop. */
export function generateSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return (buf[0] % (MAX_SEED - 1)) + 1;
}
