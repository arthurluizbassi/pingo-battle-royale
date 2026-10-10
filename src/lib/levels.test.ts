import { describe, expect, it } from "vitest";
import { GAME } from "@/config/game";
import { BALANCE } from "@/engine";
import {
  LEVEL_THRESHOLDS,
  availablePoints,
  levelBonus,
  levelFromXp,
  levelProgress,
  parseStatPoints,
  statsWithLevel,
  xpToNext,
} from "./levels";
import { pickOpponent } from "./matchmaking";

describe("XP curve", () => {
  it("level 2 comes after ~3 duels and the max level costs the configured total", () => {
    expect(xpToNext(1)).toBe(65);
    expect(LEVEL_THRESHOLDS).toHaveLength(GAME.levels.max - 1);
    expect(Math.abs(LEVEL_THRESHOLDS.at(-1)! - GAME.levels.totalXp)).toBeLessThan(100);
  });

  it("every level costs at least as much as the previous one", () => {
    for (let l = 2; l < GAME.levels.max; l++) expect(xpToNext(l)).toBeGreaterThanOrEqual(xpToNext(l - 1));
  });

  it("levelFromXp matches the thresholds and stops at the max", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(64)).toBe(1);
    expect(levelFromXp(65)).toBe(2);
    expect(levelFromXp(LEVEL_THRESHOLDS[4])).toBe(6);
    expect(levelFromXp(10_000_000)).toBe(GAME.levels.max);
  });

  it("levelProgress fills the bar inside the level", () => {
    expect(levelProgress(70)).toEqual({ level: 2, inLevel: 5, needed: xpToNext(2), max: false });
    expect(levelProgress(10_000_000).max).toBe(true);
  });
});

describe("stat points", () => {
  it("each upgrade adds its value and speed costs more", () => {
    expect(levelBonus({ hp: 3, crit: 2, spd: 1 })).toEqual({ hp: 6, crit: 0.03, spd: 1 });
    expect(GAME.levels.upgrades.spd.cost).toBeGreaterThan(1);
  });

  it("level points respect the stat caps", () => {
    const stats = statsWithLevel([{ dodge: 0.15 }], { dodge: 19 });
    expect(stats.dodge).toBe(BALANCE.caps.dodge[1]);
  });

  it("available points = (level - 1) × points per level - spent", () => {
    expect(availablePoints({ level: 1, pointsSpent: 0 })).toBe(0);
    expect(availablePoints({ level: 6, pointsSpent: 3 })).toBe(5 * GAME.levels.pointsPerLevel - 3);
  });

  it("parseStatPoints ignores junk from the database", () => {
    expect(parseStatPoints({ hp: 2, atk: -1, def: 1.5, hack: 9, spd: "3" })).toEqual({ hp: 2 });
    expect(parseStatPoints(null)).toEqual({});
  });
});

describe("matchmaking", () => {
  const me = { id: "me", level: 10 };
  const class30 = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, level: 1 + (i % 20) }));
  let seed = 1;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  it("never picks yourself and returns null when alone", () => {
    expect(pickOpponent(me, [me], { recent: [], todayCounts: {} }, random)).toBeNull();
    for (let i = 0; i < 200; i++) expect(pickOpponent(me, [me, ...class30], { recent: [], todayCounts: {} }, random)!.id).not.toBe("me");
  });

  it("prefers similar levels", () => {
    let near = 0;
    for (let i = 0; i < 2000; i++) {
      const o = pickOpponent(me, class30, { recent: [], todayCounts: {} }, random)!;
      if (Math.abs(o.level - me.level) <= 3) near++;
    }
    expect(near / 2000).toBeGreaterThan(0.4);
  });

  it("skips recent opponents and the ones already faced twice today", () => {
    const small = [{ id: "a", level: 10 }, { id: "b", level: 10 }, { id: "c", level: 1 }];
    for (let i = 0; i < 100; i++) {
      expect(pickOpponent(me, small, { recent: ["a"], todayCounts: { b: 2 } }, random)!.id).toBe("c");
    }
  });

  it("falls back to anyone when every rule excludes everybody", () => {
    const one = [{ id: "a", level: 10 }];
    expect(pickOpponent(me, one, { recent: ["a"], todayCounts: { a: 5 } }, random)!.id).toBe("a");
  });
});
