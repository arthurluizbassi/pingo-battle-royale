import { BALANCE, type BalanceConfig } from "./balance";
import {
  EFFECT_TYPES,
  STAT_KEYS,
  type EffectTotals,
  type SpecialEffect,
  type StatModifiers,
  type Stats,
} from "./types";

export function clampStats(stats: Stats, config: BalanceConfig = BALANCE): Stats {
  const out = { ...stats };
  for (const key of STAT_KEYS) {
    const [min, max] = config.caps[key];
    out[key] = Math.min(max, Math.max(min, stats[key]));
  }
  return out;
}

/** Base stats + all equipment modifiers, clamped to the caps. */
export function computeStats(
  modifiers: StatModifiers[],
  config: BalanceConfig = BALANCE,
): Stats {
  const total: Stats = { ...config.base };
  for (const mod of modifiers) {
    for (const key of STAT_KEYS) total[key] += mod[key] ?? 0;
  }
  // avoid float noise like 0.15000000000000002 in UI and snapshots
  total.crit = Math.round(total.crit * 1000) / 1000;
  total.dodge = Math.round(total.dodge * 1000) / 1000;
  return clampStats(total, config);
}

/** Same-type effects add up (except chaos, which takes the widest), then get capped. */
export function sumEffects(
  effects: SpecialEffect[],
  config: BalanceConfig = BALANCE,
): EffectTotals {
  const totals = Object.fromEntries(EFFECT_TYPES.map((t) => [t, 0])) as EffectTotals;
  for (const effect of effects) {
    totals[effect.type] =
      effect.type === "chaos"
        ? Math.max(totals.chaos, effect.value)
        : totals[effect.type] + effect.value;
  }
  for (const type of EFFECT_TYPES) {
    totals[type] = Math.min(totals[type], config.effects.max[type]);
  }
  return totals;
}
