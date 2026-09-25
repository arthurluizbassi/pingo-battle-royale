import { BODY_ROWS, HAND_ROWS } from "./data/base";
import {
  DETAIL_STYLES,
  EYE_STYLES,
  MOUTH_STYLES,
  type DetailStyleId,
  type EyeStyleId,
  type MouthStyleId,
} from "./data/face";
import { BODY_COLORS, OUTLINE_COLOR, PALETTE, SHADE_OF, type BodyColor } from "./palette";
import type { HelmetArt, OutfitArt, PixelLayer, WeaponArt } from "./types";

export const SPRITE_SIZE = 40;
/** column between x=19 and x=20: center of the head/body */
const BODY_AXIS = 19.5;
/** column of the right hand where weapons are held */
const HAND_AXIS = 32;

/** grid[y][x] = CSS color or null (transparent) */
export type Grid = (string | null)[][];

export interface PingoLook {
  bodyColor: BodyColor;
  eyes: EyeStyleId;
  mouth: MouthStyleId;
  detail: DetailStyleId;
}

export interface PingoGear {
  weapon?: WeaponArt | null;
  helmet?: HelmetArt | null;
  outfit?: OutfitArt | null;
}

export interface ComposeOptions {
  blink?: boolean;
  /** shift the eyes to look sideways */
  lookDx?: -1 | 0 | 1;
}

export const DEFAULT_LOOK: PingoLook = {
  bodyColor: "azul",
  eyes: "redondo",
  mouth: "sorriso",
  detail: "bochechas",
};

/** Expands mirrored rows and resolves the left column of each row. */
export function layerCells(layer: PixelLayer, axis: number): Array<[number, number, string]> {
  const cells: Array<[number, number, string]> = [];
  layer.rows.forEach((raw, i) => {
    let row = raw;
    if (layer.mirror === "even") row = raw + [...raw].reverse().join("");
    if (layer.mirror === "odd") row = raw + [...raw.slice(0, -1)].reverse().join("");
    const start = layer.x ?? Math.floor(axis + 0.5 - row.length / 2);
    for (let j = 0; j < row.length; j++) {
      const ch = row[j];
      if (ch !== "." && ch !== " ") cells.push([start + j, layer.y + i, ch]);
    }
  });
  return cells;
}

export function composePingo(
  look: PingoLook,
  gear: PingoGear = {},
  options: ComposeOptions = {},
): Grid {
  const grid: Grid = Array.from({ length: SPRITE_SIZE }, () => Array(SPRITE_SIZE).fill(null));
  const body = BODY_COLORS[look.bodyColor] ?? BODY_COLORS.azul;
  const put = (x: number, y: number, color: string | null) => {
    if (color && x >= 0 && y >= 0 && x < SPRITE_SIZE && y < SPRITE_SIZE) grid[y][x] = color;
  };
  const drawLayers = (layers: PixelLayer[] | undefined, axis: number) => {
    for (const layer of layers ?? []) {
      for (const [x, y, ch] of layerCells(layer, axis)) put(x, y, PALETTE[ch] ?? null);
    }
  };

  // 1. things behind the body
  drawLayers(gear.outfit?.back, BODY_AXIS);
  drawLayers(gear.helmet?.back, BODY_AXIS);
  drawLayers(gear.weapon?.back, HAND_AXIS);

  // 2. body
  const bodyColorOf: Record<string, string> = {
    "0": OUTLINE_COLOR,
    "1": body.main,
    "2": body.shade,
    "3": body.light,
  };
  BODY_ROWS.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) put(x, y, bodyColorOf[row[x]] ?? null);
  });

  // 3. outfit painted over the body interior
  const outfit = gear.outfit;
  if (outfit) {
    const top = outfit.top ?? 24;
    const detail = new Map<string, string>();
    if (outfit.rows) {
      const layer: PixelLayer = { y: top, rows: outfit.rows, mirror: outfit.mirror ? "even" : undefined };
      for (const [x, y, ch] of layerCells(layer, BODY_AXIS)) detail.set(`${x},${y}`, ch);
    }
    const sleeves = outfit.sleeves === undefined ? outfit.fill : outfit.sleeves;
    BODY_ROWS.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const base = row[x];
        if (base !== "1" && base !== "2" && base !== "3") continue;
        const isArm = y >= 23 && y <= 26 && (x <= 9 || x >= 30);
        const isFoot = y >= 34;
        let key: string | null | undefined;
        if (isArm) key = sleeves;
        else if (!isFoot && y >= top) key = detail.get(`${x},${y}`) ?? outfit.fill;
        if (!key || key === "_") continue;
        const shaded = base === "2" ? (SHADE_OF[key] ?? key) : key;
        put(x, y, PALETTE[shaded] ?? null);
      }
    });
    drawLayers(outfit.front, BODY_AXIS);
  }

  // remember the right hand (with sleeve color) to redraw it over the weapon
  const hand: Array<[number, number, string | null]> = [];
  HAND_ROWS.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== ".") hand.push([x, y, grid[y][x]]);
  });

  // 4. face
  drawLayers(DETAIL_STYLES[look.detail]?.layers ?? [], BODY_AXIS);
  const eyes = EYE_STYLES[look.eyes] ?? EYE_STYLES.redondo;
  const dx = options.lookDx ?? 0;
  if (options.blink) {
    const w = eyes.width;
    drawLayers(
      [
        { x: (w === 3 ? 13 : 14) + dx, y: 19, rows: ["k".repeat(w)] },
        { x: 24 + dx, y: 19, rows: ["k".repeat(w)] },
      ],
      BODY_AXIS,
    );
  } else {
    drawLayers(
      [
        { ...eyes.left, x: (eyes.left.x ?? 0) + dx },
        { ...eyes.right, x: (eyes.right.x ?? 0) + dx },
      ],
      BODY_AXIS,
    );
  }
  drawLayers([(MOUTH_STYLES[look.mouth] ?? MOUTH_STYLES.sorriso).layer], BODY_AXIS);

  // 5. helmet, 6. weapon, 7. hand over the weapon grip
  drawLayers(gear.helmet?.layers, BODY_AXIS);
  if (gear.weapon) {
    drawLayers(gear.weapon.layers, HAND_AXIS);
    for (const [x, y, color] of hand) put(x, y, color);
  }

  return grid;
}

/** Renders a single item (no Pingo) — used for shop cards and icons. */
export function composeItemIcon(
  category: "weapon" | "helmet" | "outfit",
  art: WeaponArt | HelmetArt | OutfitArt,
): Grid {
  if (category === "outfit") {
    // show the outfit on a neutral, faceless ghost body
    const grid = composePingo(
      { bodyColor: "cinza", eyes: "ponto", mouth: "reta", detail: "nenhum" },
      { outfit: art as OutfitArt },
    );
    return grid;
  }
  const grid: Grid = Array.from({ length: SPRITE_SIZE }, () => Array(SPRITE_SIZE).fill(null));
  const axis = category === "weapon" ? HAND_AXIS : BODY_AXIS;
  const layers = [...((art as WeaponArt).back ?? []), ...(art as WeaponArt).layers];
  for (const layer of layers) {
    for (const [x, y, ch] of layerCells(layer, axis)) {
      if (x >= 0 && y >= 0 && x < SPRITE_SIZE && y < SPRITE_SIZE) grid[y][x] = PALETTE[ch] ?? null;
    }
  }
  return grid;
}

/** Bounding box of non-empty pixels, for cropping icons. */
export function gridBounds(grid: Grid) {
  let minX = SPRITE_SIZE, minY = SPRITE_SIZE, maxX = -1, maxY = -1;
  grid.forEach((row, y) =>
    row.forEach((c, x) => {
      if (!c) return;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }),
  );
  if (maxX < 0) return { x: 0, y: 0, w: SPRITE_SIZE, h: SPRITE_SIZE };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export interface PixelRun { x: number; y: number; w: number; color: string }

/** Merges horizontal runs of equal color => far fewer SVG rects. */
export function gridToRuns(grid: Grid): PixelRun[] {
  const runs: PixelRun[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const color = row[x];
      if (!color) { x++; continue; }
      let w = 1;
      while (x + w < row.length && row[x + w] === color) w++;
      runs.push({ x, y, w, color });
      x += w;
    }
  });
  return runs;
}

export function gridToSvg(grid: Grid, size = SPRITE_SIZE * 8): string {
  const rects = gridToRuns(grid)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.color}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}" width="${size}" height="${size}" shape-rendering="crispEdges">${rects}</svg>`;
}
