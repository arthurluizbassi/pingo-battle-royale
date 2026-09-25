import { describe, expect, it } from "vitest";
import { ALL_ITEMS } from "@/content/items";
import { composePingo, DEFAULT_LOOK, gridToRuns, SPRITE_SIZE } from "./compose";
import { BODY_ROWS } from "./data/base";
import { artFor, gearFromSprites } from "./items";
import { PALETTE } from "./palette";

describe("sprites", () => {
  it("every catalog item has art in its category", () => {
    for (const item of ALL_ITEMS) {
      expect(artFor(item.category, item.sprite), `${item.category}:${item.id}`).not.toBeNull();
    }
  });

  it("art only uses palette keys", () => {
    const allowed = new Set([...Object.keys(PALETTE), ".", "_", " "]);
    for (const item of ALL_ITEMS) {
      const art = artFor(item.category, item.sprite)!;
      const layers = [
        ...("layers" in art ? art.layers : []),
        ...(art.back ?? []),
        ...("front" in art ? (art.front ?? []) : []),
      ];
      const rows = [...layers.flatMap((l) => l.rows), ...("rows" in art && art.rows ? art.rows : [])];
      for (const row of rows) {
        for (const ch of row) expect(allowed.has(ch), `${item.id}: '${ch}'`).toBe(true);
      }
    }
  });

  it("base body is a 40x40 grid", () => {
    expect(BODY_ROWS).toHaveLength(SPRITE_SIZE);
    for (const row of BODY_ROWS) expect(row).toHaveLength(SPRITE_SIZE);
  });

  it("equipping an item changes the rendered Pingo", () => {
    const naked = gridToRuns(composePingo(DEFAULT_LOOK));
    for (const item of ALL_ITEMS) {
      const gear = gearFromSprites({ [item.category]: item.sprite });
      const dressed = gridToRuns(composePingo(DEFAULT_LOOK, gear));
      expect(dressed, item.id).not.toEqual(naked);
    }
  });
});
