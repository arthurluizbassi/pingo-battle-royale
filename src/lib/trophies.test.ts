import { describe, expect, it } from "vitest";
import { GAME } from "@/config/game";
import { trophyDelta } from "./trophies";

const START = GAME.duels.trophies.start;

describe("duel trophies", () => {
  it("equal trophies: a duel is worth half of k each way", () => {
    expect(trophyDelta(START, START, true)).toBe(30);
    expect(trophyDelta(START, START, false)).toBe(-30);
  });

  it("beating someone with more trophies pays more; losing to someone with fewer costs more", () => {
    expect(trophyDelta(1000, 1200, true)).toBe(46);
    expect(trophyDelta(1000, 1200, false)).toBe(-14);
    expect(trophyDelta(1000, 800, true)).toBe(14);
    expect(trophyDelta(1000, 800, false)).toBe(-46);
  });

  it("a losing streak costs less each time, a winning streak pays less each time", () => {
    const streak = (won: boolean) => {
      let mine = START;
      const deltas: number[] = [];
      for (let i = 0; i < 12; i++) {
        const d = trophyDelta(mine, START, won);
        deltas.push(Math.abs(d));
        mine += d;
      }
      return { deltas, mine };
    };
    const losing = streak(false);
    const winning = streak(true);
    expect(losing.deltas).toEqual([30, 27, 25, 23, 21, 20, 18, 17, 16, 15, 14, 13]);
    expect(winning.deltas).toEqual(losing.deltas);
    expect(losing.mine).toBe(761);
    expect(winning.mine).toBe(1239);
  });

  it("always moves at least one trophy and never goes below zero", () => {
    expect(trophyDelta(3000, 0, true)).toBe(1);
    expect(trophyDelta(0, 3000, false)).toBe(0);
    expect(trophyDelta(10, 10, false)).toBe(-10);
  });
});
