import { describe, expect, it } from "vitest";
import {
  BALANCE,
  computeStats,
  createRng,
  powerScore,
  simulateBattle,
  sumEffects,
  type CombatantInput,
  type SpecialEffect,
  type Stats,
} from "./index";

const naked = (id: string, effects: SpecialEffect[] = []): CombatantInput => ({
  id,
  name: id,
  stats: { ...BALANCE.base },
  effects,
});
const withStats = (id: string, stats: Partial<Stats>, effects: SpecialEffect[] = []): CombatantInput => ({
  id,
  name: id,
  stats: { ...BALANCE.base, ...stats },
  effects,
});

describe("rng", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng(728391);
    const b = createRng(728391);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it("differs between seeds and stays in [0, 1)", () => {
    const a = createRng(1);
    const b = createRng(2);
    let same = 0;
    for (let i = 0; i < 1000; i++) {
      const x = a.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      if (x === b.next()) same++;
    }
    expect(same).toBeLessThan(5);
  });

  it("weightedIndex never picks zero-weight entries", () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) expect(rng.weightedIndex([0, 1, 0, 2])).not.toBe(0);
  });
});

describe("stats", () => {
  it("sums modifiers on top of the base", () => {
    const s = computeStats([{ atk: 5 }, { atk: -2, hp: 10 }]);
    expect(s.atk).toBe(BALANCE.base.atk + 3);
    expect(s.hp).toBe(BALANCE.base.hp + 10);
  });

  it("clamps crit and dodge to their caps", () => {
    const s = computeStats([{ crit: 5, dodge: 5 }]);
    expect(s.crit).toBe(BALANCE.caps.crit[1]);
    expect(s.dodge).toBe(BALANCE.caps.dodge[1]);
    expect(s.dodge).toBeLessThan(0.5);
  });

  it("caps summed effects and keeps the widest chaos", () => {
    const e = sumEffects([
      { type: "block", value: 0.2 },
      { type: "block", value: 0.2 },
      { type: "chaos", value: 0.3 },
      { type: "chaos", value: 0.5 },
    ]);
    expect(e.block).toBe(BALANCE.effects.max.block);
    expect(e.chaos).toBe(0.5);
  });
});

describe("simulateBattle", () => {
  const royale = (n: number) => Array.from({ length: n }, (_, i) => naked(`p${i}`));

  it("is fully reproducible with the same seed and snapshot", () => {
    const input = { seed: 728391, participants: royale(12) };
    const first = simulateBattle(input);
    const second = simulateBattle(structuredClone(input));
    expect(second).toEqual(first);
  });

  it("different seeds produce different battles", () => {
    const a = simulateBattle({ seed: 1, participants: royale(12) });
    const b = simulateBattle({ seed: 2, participants: royale(12) });
    expect(a.events).not.toEqual(b.events);
  });

  it("does not mutate its input", () => {
    const participants = royale(6);
    const copy = structuredClone(participants);
    simulateBattle({ seed: 5, participants });
    expect(participants).toEqual(copy);
  });

  it("produces a single winner and unique placements 1..N", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = simulateBattle({ seed, participants: royale(20) });
      const placements = Object.values(r.fighters).map((f) => f.placement).sort((a, b) => a - b);
      expect(placements).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
      expect(r.fighters[r.winnerId].placement).toBe(1);
      expect(r.fighters[r.winnerId].finalHp).toBeGreaterThan(0);
    }
  });

  it("event log is consistent: kills, eliminations and victory", () => {
    const r = simulateBattle({ seed: 99, participants: royale(15) });
    const eliminations = r.events.filter((e) => e.type === "eliminated");
    expect(eliminations).toHaveLength(14);
    expect(r.events.filter((e) => e.type === "spawn")).toHaveLength(15);
    const last = r.events[r.events.length - 1];
    expect(last).toMatchObject({ type: "victory", id: r.winnerId });

    const kills = Object.values(r.fighters).reduce((s, f) => s + f.kills, 0);
    const zoneKills = eliminations.filter((e) => e.type === "eliminated" && e.by === null).length;
    expect(kills + zoneKills).toBe(14);

    // nobody acts after being eliminated
    const dead = new Set<string>();
    for (const e of r.events) {
      if (e.type === "attack") {
        expect(dead.has(e.attacker)).toBe(false);
        expect(dead.has(e.target)).toBe(false);
      }
      if (e.type === "eliminated") dead.add(e.id);
    }
  });

  it("damage recorded in attacks matches fighter totals", () => {
    const r = simulateBattle({ seed: 7, participants: royale(8) });
    const dealt: Record<string, number> = {};
    for (const e of r.events) {
      if (e.type === "attack") dealt[e.attacker] = (dealt[e.attacker] ?? 0) + e.damage;
    }
    for (const [id, f] of Object.entries(r.fighters)) expect(f.damageDealt).toBe(dealt[id] ?? 0);
  });

  it("sudden death always ends extremely tanky battles", () => {
    const tanks = [
      withStats("a", { hp: 200, def: 45, atk: 15, dodge: 0.3 }, [{ type: "block", value: 0.25 }]),
      withStats("b", { hp: 200, def: 45, atk: 15, dodge: 0.3 }, [{ type: "block", value: 0.25 }]),
      withStats("c", { hp: 200, def: 45, atk: 15, dodge: 0.3 }, [{ type: "block", value: 0.25 }]),
    ];
    const r = simulateBattle({ seed: 11, participants: tanks });
    expect(r.suddenDeathReached).toBe(true);
    expect(r.ticks).toBeLessThan(BALANCE.maxTicks);
    expect(r.events.some((e) => e.type === "zone")).toBe(true);
  });

  it("rejects invalid input", () => {
    expect(() => simulateBattle({ seed: 1, participants: [naked("a")] })).toThrow();
    expect(() => simulateBattle({ seed: 1, participants: [naked("a"), naked("a")] })).toThrow();
  });
});

describe("effects", () => {
  it("firstStrike boosts only the first attack", () => {
    const r = simulateBattle({
      seed: 3,
      participants: [naked("a", [{ type: "firstStrike", value: 0.5 }]), naked("b")],
    });
    const tagged = r.events.filter((e) => e.type === "attack" && e.tags.includes("firstStrike"));
    expect(tagged.length).toBe(1);
  });

  it("openingGuard triggers at most once per fighter", () => {
    for (let seed = 1; seed < 30; seed++) {
      const r = simulateBattle({
        seed,
        participants: [naked("a", [{ type: "openingGuard", value: 0.5 }]), naked("b")],
      });
      const guarded = r.events.filter((e) => e.type === "attack" && e.tags.includes("openingGuard"));
      expect(guarded.length).toBeLessThanOrEqual(1);
      guarded.forEach((e) => e.type === "attack" && expect(e.target).toBe("a"));
    }
  });

  it("adrenaline fires once when HP gets low", () => {
    let fired = 0;
    for (let seed = 1; seed < 60; seed++) {
      const r = simulateBattle({ seed, participants: [naked("a", [{ type: "adrenaline", value: 6 }]), naked("b")] });
      const events = r.events.filter((e) => e.type === "adrenaline");
      expect(events.length).toBeLessThanOrEqual(1);
      fired += events.length;
    }
    expect(fired).toBeGreaterThan(0);
  });

  it("critShield reduces crit damage received", () => {
    const avgCritDamage = (effects: SpecialEffect[]) => {
      let total = 0;
      let count = 0;
      for (let seed = 1; seed < 400; seed++) {
        const r = simulateBattle({ seed, participants: [withStats("atk", { crit: 0.4 }), naked("def", effects)] });
        for (const e of r.events) {
          if (e.type === "attack" && e.crit && e.target === "def" && !e.blocked) {
            total += e.damage;
            count++;
          }
        }
      }
      return total / count;
    };
    expect(avgCritDamage([{ type: "critShield", value: 0.6 }])).toBeLessThan(avgCritDamage([]) * 0.8);
  });
});

describe("balance direction (statistical)", () => {
  const duel = (a: CombatantInput, b: CombatantInput, n: number) => {
    let wins = 0;
    for (let i = 0; i < n; i++) {
      const participants = i % 2 ? [a, b] : [b, a];
      if (simulateBattle({ seed: i + 1, participants }).winnerId === a.id) wins++;
    }
    return wins / n;
  };

  it("mirror match is close to 50%", () => {
    const rate = duel(naked("a"), naked("b"), 3000);
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.55);
  });

  it("a clearly stronger Pingo is favored but NOT unbeatable", () => {
    const strong = withStats("strong", { hp: 120, atk: 46, def: 15, crit: 0.18 });
    const rate = duel(strong, naked("weak"), 3000);
    expect(rate).toBeGreaterThan(0.65);
    expect(rate).toBeLessThan(0.92);
  });

  it("power score ranks builds sensibly", () => {
    expect(powerScore(BALANCE.base)).toBe(100);
    expect(powerScore({ ...BALANCE.base, atk: 50 })).toBeGreaterThan(100);
    expect(powerScore({ ...BALANCE.base, hp: 80 })).toBeLessThan(100);
  });
});
