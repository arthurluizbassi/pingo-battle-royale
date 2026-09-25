import { describe, expect, it } from "vitest";
import { EFFECT_TYPES, STAT_KEYS } from "@/engine";
import { ALL_ITEMS, itemsByCategory } from "./index";

describe("item catalog", () => {
  it("has at least 30 items per category (90 total)", () => {
    expect(itemsByCategory("weapon").length).toBeGreaterThanOrEqual(30);
    expect(itemsByCategory("helmet").length).toBeGreaterThanOrEqual(30);
    expect(itemsByCategory("outfit").length).toBeGreaterThanOrEqual(30);
  });

  it("uses unique ids and names", () => {
    expect(new Set(ALL_ITEMS.map((i) => i.id)).size).toBe(ALL_ITEMS.length);
    expect(new Set(ALL_ITEMS.map((i) => i.name)).size).toBe(ALL_ITEMS.length);
  });

  it("only uses known stats and effects", () => {
    for (const item of ALL_ITEMS) {
      for (const key of Object.keys(item.statModifiers)) expect(STAT_KEYS).toContain(key);
      if (item.specialEffect) expect(EFFECT_TYPES).toContain(item.specialEffect.type);
      expect(item.price).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(5);
    }
  });

  it("never has an item that is a pure upgrade of +lots of everything", () => {
    for (const item of ALL_ITEMS) {
      const m = item.statModifiers;
      // attack above +10 must cost speed (heavy weapons are sidegrades)
      if ((m.atk ?? 0) > 10) expect(m.spd ?? 0).toBeLessThan(0);
    }
  });
});
