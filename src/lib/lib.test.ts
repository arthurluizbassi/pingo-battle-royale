import { describe, expect, it } from "vitest";
import { ALL_ITEMS, getItem } from "@/content/items";
import { BALANCE, createRng, simulateBattle } from "@/engine";
import { summarizeBattle, trophiesFor } from "./battle-summary";
import { computeRanking, placementPoints } from "./ranking";
import { pickRotation } from "./shop-rotation";
import { buildSnapshot, combatantFromSnapshot } from "./snapshot";

describe("shop rotation", () => {
  it("picks N items per category with at least one cheap item each", () => {
    const rng = createRng(1);
    const ids = pickRotation(5, [], rng.next);
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    for (const cat of ["weapon", "helmet", "outfit"]) {
      const items = ids.map((id) => getItem(id)!).filter((i) => i.category === cat);
      expect(items).toHaveLength(5);
      expect(items.some((i) => i.tier <= 2)).toBe(true);
    }
  });

  it("prefers items that were not in the previous rotation", () => {
    const rng = createRng(2);
    const first = pickRotation(5, [], rng.next);
    const second = pickRotation(5, first, rng.next);
    expect(second.filter((id) => first.includes(id))).toHaveLength(0);
  });
});

describe("ranking", () => {
  it("scores placements and kills and sorts by points", () => {
    const rows = computeRanking([
      { profile_id: "a", placement: 1, kills: 3 },
      { profile_id: "b", placement: 2, kills: 1 },
      { profile_id: "a", placement: 5, kills: 0 },
      { profile_id: "c", placement: 9, kills: 0 },
    ]);
    expect(rows.map((r) => r.profileId)).toEqual(["a", "b", "c"]);
    expect(rows[0].points).toBe(placementPoints(1) + 3 + placementPoints(5));
    expect(rows[0].wins).toBe(1);
    expect(rows[2].points).toBe(placementPoints(9));
  });
});

describe("snapshots, summaries and trophies", () => {
  const profiles = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, username: `u${i}`, display_name: `Aluno ${i}` }));
  const snapshots = profiles.map((p, i) => buildSnapshot(p, null, i < 3 ? [ALL_ITEMS[i * 31].id] : []));

  it("snapshot copies item definitions and computes stats", () => {
    expect(snapshots[0].items[0].statModifiers).toEqual(ALL_ITEMS[0].statModifiers);
    expect(snapshots[7].stats).toEqual(BALANCE.base);
    expect(snapshots[7].powerScore).toBe(100);
  });

  it("the same snapshots + seed always give the same battle", () => {
    const a = simulateBattle({ seed: 42, participants: snapshots.map(combatantFromSnapshot) });
    const b = simulateBattle({ seed: 42, participants: structuredClone(snapshots).map(combatantFromSnapshot) });
    expect(b.events).toEqual(a.events);
  });

  it("summary and trophies are consistent with the result", () => {
    const result = simulateBattle({ seed: 7, participants: snapshots.map(combatantFromSnapshot) });
    const summary = summarizeBattle(result, snapshots);
    expect(summary.participants).toBe(8);
    expect(summary.funStats.length).toBeGreaterThan(0);
    const trophies = trophiesFor(result, "Royale #1");
    expect(trophies.find((t) => t.kind === "champion")?.profile_id).toBe(result.winnerId);
    expect(trophies.filter((t) => t.kind === "runner_up")).toHaveLength(1);
  });
});
