import { BALANCE, ENGINE_VERSION, type BalanceConfig } from "./balance";
import { createRng, type Rng } from "./rng";
import { clampStats, sumEffects } from "./stats";
import type {
  AttackTag,
  BattleEvent,
  BattleInput,
  BattleResult,
  CombatantInput,
  EffectTotals,
  FighterStats,
  Stats,
} from "./types";

interface Fighter {
  id: string;
  stats: Stats;
  effects: EffectTotals;
  maxHp: number;
  hp: number;
  gauge: number;
  x: number;
  y: number;
  alive: boolean;
  /** recent hits taken, per attacker id; decays every tick */
  heat: Map<string, number>;
  lastAttackerId: string | null;
  lastAttackedAt: number;
  lastTargetId: string | null;
  firstStrikeUsed: boolean;
  openingGuardUsed: boolean;
  adrenalineOn: boolean;
  record: FighterStats;
}

/**
 * Runs a full battle (1v1 duel or battle royale — same rules).
 * Pure function: no I/O, no Math.random, no Date. Same input => same output.
 */
export function simulateBattle(
  input: BattleInput,
  config: BalanceConfig = BALANCE,
): BattleResult {
  if (input.participants.length < 2) throw new Error("A battle needs at least 2 participants");
  const ids = new Set(input.participants.map((p) => p.id));
  if (ids.size !== input.participants.length) throw new Error("Duplicate participant ids");

  const rng = createRng(input.seed);
  const events: BattleEvent[] = [];
  const fighters = input.participants.map((p) => createFighter(p, config, rng));
  placeFighters(fighters, config, rng);

  for (const f of fighters) {
    events.push({ type: "spawn", t: 0, id: f.id, x: f.x, y: f.y, hp: f.hp, maxHp: f.maxHp });
  }

  let aliveCount = fighters.length;
  let suddenDeathReached = false;
  let pulse = 0;
  let tick = 0;

  const eliminate = (victim: Fighter, killer: Fighter | null) => {
    victim.alive = false;
    victim.hp = 0;
    victim.record.placement = aliveCount;
    victim.record.eliminatedBy = killer?.id ?? null;
    victim.record.eliminatedAt = tick;
    aliveCount--;
    if (killer) killer.record.kills++;
    events.push({
      type: "eliminated",
      t: tick,
      id: victim.id,
      by: killer?.id ?? null,
      remaining: aliveCount,
      placement: victim.record.placement,
    });
  };

  while (aliveCount > 1 && tick < config.maxTicks) {
    tick++;

    // --- sudden death zone ---
    const sd = config.suddenDeath;
    if (tick >= sd.startTick) {
      if (!suddenDeathReached) {
        suddenDeathReached = true;
        events.push({ type: "suddenDeath", t: tick });
      }
      if ((tick - sd.startTick) % sd.pulseInterval === 0) {
        const fraction = sd.baseDamage + sd.damageGrowth * pulse;
        pulse++;
        // weakest first, so simultaneous deaths get fair placements
        const victims = fighters.filter((f) => f.alive).sort((a, b) => a.hp - b.hp);
        for (const f of victims) {
          const damage = Math.max(1, Math.ceil(f.maxHp * fraction));
          const lastOneStanding = aliveCount === 1;
          f.hp = lastOneStanding ? Math.max(1, f.hp - damage) : f.hp - damage;
          f.record.damageTaken += damage;
          events.push({ type: "zone", t: tick, id: f.id, damage, hp: Math.max(0, f.hp) });
          if (f.hp <= 0) eliminate(f, null);
          else checkAdrenaline(f, config, events, tick);
        }
        if (aliveCount <= 1) break;
      }
    }

    // --- gauges ---
    for (const f of fighters) {
      if (!f.alive) continue;
      f.gauge += f.stats.spd + (f.adrenalineOn ? f.effects.adrenaline : 0);
    }
    const ready = fighters
      .filter((f) => f.alive && f.gauge >= config.gauge.threshold)
      .map((f) => ({ f, tiebreak: rng.next() }))
      .sort((a, b) => b.f.gauge - a.f.gauge || a.tiebreak - b.tiebreak)
      .map((entry) => entry.f);

    for (const attacker of ready) {
      if (!attacker.alive || aliveCount <= 1) continue;
      attacker.gauge -= config.gauge.threshold;
      const target = chooseTarget(attacker, fighters, tick, config, rng);
      moveNextTo(attacker, target, config);
      resolveAttack(attacker, target, tick, config, rng, events);
      if (target.hp <= 0) eliminate(target, attacker);
    }

    // --- heat decay ---
    for (const f of fighters) {
      for (const [id, heat] of f.heat) {
        const next = heat * config.targeting.heatDecay;
        if (next < 0.05) f.heat.delete(id);
        else f.heat.set(id, next);
      }
    }
  }

  // Safety net (maxTicks): highest HP ratio wins, the rest are ranked by HP ratio.
  if (aliveCount > 1) {
    const survivors = fighters
      .filter((f) => f.alive)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    for (const f of survivors.slice(0, -1)) eliminate(f, null);
  }

  const winner = fighters.find((f) => f.alive)!;
  winner.record.placement = 1;
  winner.record.finalHp = winner.hp;
  events.push({ type: "victory", t: tick, id: winner.id });

  return {
    engineVersion: ENGINE_VERSION,
    seed: input.seed,
    winnerId: winner.id,
    ticks: tick,
    suddenDeathReached,
    events,
    fighters: Object.fromEntries(fighters.map((f) => [f.id, f.record])),
  };
}

function createFighter(p: CombatantInput, config: BalanceConfig, rng: Rng): Fighter {
  const stats = clampStats(p.stats, config);
  const maxHp = Math.round(stats.hp * config.hpMultiplier);
  return {
    id: p.id,
    stats,
    effects: sumEffects(p.effects, config),
    maxHp,
    hp: maxHp,
    gauge: rng.range(0, config.gauge.initialJitter),
    x: 0.5,
    y: 0.5,
    alive: true,
    heat: new Map(),
    lastAttackerId: null,
    lastAttackedAt: -Infinity,
    lastTargetId: null,
    firstStrikeUsed: false,
    openingGuardUsed: false,
    adrenalineOn: false,
    record: {
      placement: 0,
      kills: 0,
      attacks: 0,
      hits: 0,
      crits: 0,
      dodges: 0,
      blocks: 0,
      damageDealt: 0,
      damageTaken: 0,
      biggestHit: 0,
      finalHp: 0,
      eliminatedBy: null,
      eliminatedAt: null,
    },
  };
}

/** Random spawn points with a minimum distance between Pingos (best effort). */
function placeFighters(fighters: Fighter[], config: BalanceConfig, rng: Rng) {
  const { margin, minSpawnDistance } = config.arena;
  const placed: Fighter[] = [];
  for (const f of fighters) {
    let best = { x: 0.5, y: 0.5, gap: -1 };
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = rng.range(margin, 1 - margin);
      const y = rng.range(margin, 1 - margin);
      const gap = placed.reduce((min, o) => Math.min(min, Math.hypot(o.x - x, o.y - y)), Infinity);
      if (gap > best.gap) best = { x, y, gap };
      if (gap >= minSpawnDistance) break;
    }
    f.x = round3(best.x);
    f.y = round3(best.y);
    placed.push(f);
  }
}

function chooseTarget(
  attacker: Fighter,
  fighters: Fighter[],
  tick: number,
  config: BalanceConfig,
  rng: Rng,
): Fighter {
  const t = config.targeting;
  const candidates = fighters.filter((f) => f.alive && f.id !== attacker.id);
  if (candidates.length === 1) return candidates[0];

  const weights = candidates.map((c) => {
    const distance = Math.hypot(c.x - attacker.x, c.y - attacker.y);
    let weight = 1 / (t.distanceBias + distance);

    // anti dog-pile: someone who was just hit a lot by OTHERS is less attractive
    let heatFromOthers = 0;
    for (const [sourceId, heat] of c.heat) if (sourceId !== attacker.id) heatFromOthers += heat;
    weight /= 1 + t.heatPenalty * heatFromOthers;

    if (attacker.lastAttackerId === c.id && tick - attacker.lastAttackedAt <= t.retaliationWindow) {
      weight *= t.retaliationBonus;
    }
    if (attacker.lastTargetId === c.id) weight *= t.focusBonus;
    return weight;
  });
  return candidates[rng.weightedIndex(weights)];
}

function moveNextTo(attacker: Fighter, target: Fighter, config: BalanceConfig) {
  const dx = attacker.x - target.x;
  const dy = attacker.y - target.y;
  const len = Math.hypot(dx, dy) || 1;
  const d = config.arena.engageDistance;
  const m = config.arena.margin;
  attacker.x = round3(clamp(target.x + (dx / len) * d, m, 1 - m));
  attacker.y = round3(clamp(target.y + (dy / len) * d, m, 1 - m));
}

function resolveAttack(
  attacker: Fighter,
  target: Fighter,
  tick: number,
  config: BalanceConfig,
  rng: Rng,
  events: BattleEvent[],
) {
  const dmgCfg = config.damage;
  const tags: AttackTag[] = [];
  attacker.record.attacks++;
  attacker.lastTargetId = target.id;
  target.lastAttackerId = attacker.id;
  target.lastAttackedAt = tick;
  target.heat.set(attacker.id, (target.heat.get(attacker.id) ?? 0) + 1);

  const firstStrike = !attacker.firstStrikeUsed && attacker.effects.firstStrike > 0;
  attacker.firstStrikeUsed = true;

  // The same number of rolls happens every attack, which keeps battles easy to reason about.
  const dodgeRoll = rng.next();
  const critRoll = rng.next();
  const varianceRoll = rng.next();
  const blockRoll = rng.next();

  if (dodgeRoll < target.stats.dodge) {
    target.record.dodges++;
    events.push({
      type: "attack",
      t: tick,
      attacker: attacker.id,
      target: target.id,
      x: attacker.x,
      y: attacker.y,
      dodged: true,
      crit: false,
      blocked: false,
      damage: 0,
      targetHp: target.hp,
      tags: firstStrike ? ["firstStrike"] : [],
    });
    return;
  }

  let damage =
    (attacker.stats.atk * dmgCfg.defenseK) / (dmgCfg.defenseK + target.stats.def);

  const chaos = attacker.effects.chaos;
  if (chaos > 0) {
    const variance = 1 - chaos + 2 * chaos * varianceRoll;
    if (varianceRoll > 0.8) tags.push("chaosHigh");
    if (varianceRoll < 0.2) tags.push("chaosLow");
    damage *= variance;
  } else {
    damage *= dmgCfg.varianceMin + (dmgCfg.varianceMax - dmgCfg.varianceMin) * varianceRoll;
  }

  const crit = critRoll < attacker.stats.crit;
  if (crit) {
    const extra = dmgCfg.critMultiplier + attacker.effects.critDamage - 1;
    damage *= 1 + extra * (1 - target.effects.critShield);
  }

  if (firstStrike) {
    damage *= 1 + attacker.effects.firstStrike;
    tags.push("firstStrike");
  }

  const blocked = blockRoll < target.effects.block;
  if (blocked) damage *= 1 - config.effects.blockReduction;

  if (!target.openingGuardUsed && target.effects.openingGuard > 0) {
    target.openingGuardUsed = true;
    damage *= 1 - target.effects.openingGuard;
    tags.push("openingGuard");
  }

  const dealt = Math.max(dmgCfg.minDamage, Math.round(damage));
  target.hp -= dealt;

  attacker.record.hits++;
  if (crit) attacker.record.crits++;
  if (blocked) target.record.blocks++;
  attacker.record.damageDealt += dealt;
  attacker.record.biggestHit = Math.max(attacker.record.biggestHit, dealt);
  target.record.damageTaken += dealt;

  events.push({
    type: "attack",
    t: tick,
    attacker: attacker.id,
    target: target.id,
    x: attacker.x,
    y: attacker.y,
    dodged: false,
    crit,
    blocked,
    damage: dealt,
    targetHp: Math.max(0, target.hp),
    tags,
  });

  if (target.hp > 0) checkAdrenaline(target, config, events, tick);
}

function checkAdrenaline(f: Fighter, config: BalanceConfig, events: BattleEvent[], tick: number) {
  if (
    !f.adrenalineOn &&
    f.effects.adrenaline > 0 &&
    f.hp <= f.maxHp * config.effects.adrenalineHpThreshold
  ) {
    f.adrenalineOn = true;
    events.push({ type: "adrenaline", t: tick, id: f.id });
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;
