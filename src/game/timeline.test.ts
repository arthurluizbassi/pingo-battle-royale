import { describe, expect, it } from "vitest";
import { BALANCE, simulateBattle, type CombatantInput } from "@/engine";
import { buildTimeline, gapFor } from "./timeline";

const royale = (n: number): CombatantInput[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Pingo ${i}`, stats: { ...BALANCE.base }, effects: [] }));
const names = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`p${i}`, `Pingo ${i}`]));

describe("replay timeline", () => {
  it("contains every attack and elimination exactly once, in a sorted schedule", () => {
    const result = simulateBattle({ seed: 27, participants: royale(12) });
    const tl = buildTimeline(result.events, names(12));
    const attacks = result.events.filter((e) => e.type === "attack").length;
    expect(tl.steps.filter((s) => s.kind === "attack")).toHaveLength(attacks);
    expect(tl.steps.filter((s) => s.kind === "eliminate")).toHaveLength(11);
    expect(tl.steps.filter((s) => s.kind === "victory")).toHaveLength(1);
    for (let i = 1; i < tl.steps.length; i++) expect(tl.steps[i].at).toBeGreaterThanOrEqual(tl.steps[i - 1].at);
  });

  it("never shows a Pingo in two actions at the same time and keeps its HP order", () => {
    const result = simulateBattle({ seed: 5, participants: royale(20) });
    const tl = buildTimeline(result.events, names(20));
    const lastEnd = new Map<string, number>();
    const hpSeen = new Map<string, number>();
    for (const step of tl.steps) {
      if (step.kind !== "attack") continue;
      for (const id of [step.event.attacker, step.event.target]) {
        expect(step.at).toBeGreaterThanOrEqual(lastEnd.get(id) ?? 0);
        lastEnd.set(id, step.at + step.duration);
      }
      const prev = hpSeen.get(step.event.target) ?? Infinity;
      expect(step.event.targetHp).toBeLessThanOrEqual(prev);
      hpSeen.set(step.event.target, step.event.targetHp);
    }
  });

  it("shows milestone banners and slows down at the end", () => {
    const result = simulateBattle({ seed: 3, participants: royale(12) });
    const tl = buildTimeline(result.events, names(12));
    const banners = tl.steps.filter((s) => s.kind === "banner").map((s) => (s.kind === "banner" ? s.text : ""));
    expect(banners).toContain("10 PINGOS RESTANTES");
    expect(banners).toContain("FINAL 3");
    expect(banners).toContain("ÚLTIMO PINGO!");
    expect(gapFor(2)).toBeGreaterThan(gapFor(20));
  });

  it("a 25-Pingo royale fits a class (under ~4 minutes at 1x)", () => {
    const result = simulateBattle({ seed: 99, participants: royale(25) });
    const tl = buildTimeline(result.events, names(25));
    expect(tl.duration).toBeLessThan(4 * 60 * 1000);
    expect(tl.duration).toBeGreaterThan(30 * 1000);
  });
});
