import { BALANCE, type BalanceConfig } from "./balance";
import { sumEffects } from "./stats";
import type { SpecialEffect, Stats } from "./types";

/**
 * Rough build strength for ANALYSIS ONLY (never decides a battle).
 * In a duel you win if you deal (your DPS) × (your effective HP) faster than the enemy,
 * so the score is sqrt(EHP × DPS), normalized so a naked Pingo = 100.
 */
export function powerScore(
  stats: Stats,
  effects: SpecialEffect[] = [],
  config: BalanceConfig = BALANCE,
): number {
  const raw = rawPower(stats, effects, config);
  const naked = rawPower(config.base, [], config);
  return Math.round(100 * Math.sqrt(raw / naked));
}

function rawPower(stats: Stats, effects: SpecialEffect[], config: BalanceConfig) {
  const e = sumEffects(effects, config);
  const k = config.damage.defenseK;

  // approximations of what effects are worth over a ~6 hit fight
  const blockFactor = 1 - e.block * config.effects.blockReduction;
  const guardFactor = 1 + e.openingGuard / 6;
  const firstStrikeFactor = 1 + e.firstStrike / 6;
  const adrenalineFactor = 1 + (e.adrenaline / stats.spd) * 0.3;
  const critMultiplier = config.damage.critMultiplier + e.critDamage;
  // against an enemy with base crit chance
  const incomingCritExtra = config.base.crit * (config.damage.critMultiplier - 1);
  const critShieldFactor = (1 + incomingCritExtra) / (1 + incomingCritExtra * (1 - e.critShield));

  const ehp =
    ((stats.hp * (k + stats.def)) / k / (1 - stats.dodge) / blockFactor) * guardFactor * critShieldFactor;
  const dps =
    stats.atk * stats.spd * (1 + stats.crit * (critMultiplier - 1)) * firstStrikeFactor * adrenalineFactor;
  return ehp * dps;
}
