/**
 * Exports every sprite as SVG + a contact sheet for visual review.
 *   npm run sprites:export
 * Output: public/sprites/items/<id>.svg and sprite-preview/index.html (git-ignored)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_ITEMS } from "@/content/items";
import { composeItemIcon, composePingo, DEFAULT_LOOK, gridToSvg, type PingoLook } from "@/sprites/compose";
import { DETAIL_STYLES, EYE_STYLES, MOUTH_STYLES } from "@/sprites/data/face";
import { artFor, gearFromSprites } from "@/sprites/items";
import { BODY_COLORS, type BodyColor } from "@/sprites/palette";

const root = process.cwd();
const iconDir = join(root, "public", "sprites", "items");
const previewDir = join(root, "sprite-preview");
mkdirSync(iconDir, { recursive: true });
mkdirSync(previewDir, { recursive: true });

const cards: string[] = [];
for (const item of ALL_ITEMS) {
  const art = artFor(item.category, item.sprite)!;
  const icon = gridToSvg(composeItemIcon(item.category, art), 160);
  writeFileSync(join(iconDir, `${item.id}.svg`), icon);
  const onPingo = gridToSvg(composePingo(DEFAULT_LOOK, gearFromSprites({ [item.category]: item.sprite })), 160);
  cards.push(`<figure>${icon}${onPingo}<figcaption>${item.name}<br><small>${item.id} · T${item.tier}</small></figcaption></figure>`);
}

// a few full loadouts and all cosmetic options
const looks: string[] = [];
const colors = Object.keys(BODY_COLORS) as BodyColor[];
const eyes = Object.keys(EYE_STYLES) as PingoLook["eyes"][];
const mouths = Object.keys(MOUTH_STYLES) as PingoLook["mouth"][];
const details = Object.keys(DETAIL_STYLES) as PingoLook["detail"][];
colors.forEach((bodyColor, i) => {
  const look: PingoLook = {
    bodyColor,
    eyes: eyes[i % eyes.length],
    mouth: mouths[i % mouths.length],
    detail: details[i % details.length],
  };
  const pick = (cat: "weapon" | "helmet" | "outfit") => {
    const list = ALL_ITEMS.filter((it) => it.category === cat);
    return list[(i * 7) % list.length].sprite;
  };
  const gear = gearFromSprites({ weapon: pick("weapon"), helmet: pick("helmet"), outfit: pick("outfit") });
  looks.push(gridToSvg(composePingo(look), 160) + gridToSvg(composePingo(look, gear), 160));
  looks.push(gridToSvg(composePingo(look, gear, { blink: true }), 160));
});

writeFileSync(
  join(previewDir, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Pingo sprites</title>
<style>body{font-family:sans-serif;background:#efe7d6;margin:16px}figure{display:inline-block;margin:6px;padding:6px;background:#fff;border:2px solid #231a2e;text-align:center;font-size:12px;width:330px}svg{image-rendering:pixelated}section{margin-bottom:24px}</style>
<h1>Looks & loadouts</h1><section>${looks.join("")}</section>
<h1>Itens (${ALL_ITEMS.length})</h1><section>${cards.join("")}</section>`,
);
console.log(`exported ${ALL_ITEMS.length} item icons to public/sprites/items and preview to sprite-preview/index.html`);
