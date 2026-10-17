/**
 * Turns an icon (SVG/PNG) into a 16x16 pixel icon in the game palette, with the ink outline.
 *   npx tsx scripts/pixelize-icon.ts <image> [<image> ...]   → prints the rows of each one
 * How: render big, split into 14x14 cells, map every pixel to the nearest PALETTE color,
 * keep the most common color of each cell (keeps flat shapes crisp), then outline in ink.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { PALETTE } from "@/sprites/palette";

const CELLS = 14; // 1px left free on each side for the outline
const CELL_PX = 16;

const keys = Object.keys(PALETTE);
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const paletteRgb = keys.map((k) => rgb(PALETTE[k]));

function nearest(r: number, g: number, b: number): string {
  let best = 0;
  let bestD = Infinity;
  paletteRgb.forEach(([pr, pg, pb], i) => {
    // weighted distance: the eye is more sensitive to green
    const d = 2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return keys[best];
}

export function outline(grid: string[][]): string[][] {
  const n = grid.length;
  const out = grid.map((row) => [...row]);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (grid[y][x] !== ".") continue;
      const near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => {
        const c = grid[y + dy]?.[x + dx];
        return c !== undefined && c !== "." && c !== "k";
      });
      if (near) out[y][x] = "k";
    }
  return out;
}

export async function pixelize(file: string, coverage = 0.45): Promise<string[]> {
  const img = await loadImage(readFileSync(file));
  const size = CELLS * CELL_PX;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  const data = ctx.getImageData(0, 0, size, size).data;

  const grid: string[][] = Array.from({ length: 16 }, () => Array(16).fill("."));
  for (let cy = 0; cy < CELLS; cy++)
    for (let cx = 0; cx < CELLS; cx++) {
      const count = new Map<string, number>();
      let opaque = 0;
      for (let y = 0; y < CELL_PX; y++)
        for (let x = 0; x < CELL_PX; x++) {
          const i = ((cy * CELL_PX + y) * size + cx * CELL_PX + x) * 4;
          if (data[i + 3] < 128) continue;
          opaque++;
          const k = nearest(data[i], data[i + 1], data[i + 2]);
          count.set(k, (count.get(k) ?? 0) + 1);
        }
      if (opaque < CELL_PX * CELL_PX * coverage) continue;
      grid[cy + 1][cx + 1] = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  return outline(grid).map((row) => row.join(""));
}

if (process.argv[1]?.includes("pixelize-icon")) {
  (async () => {
    for (const file of process.argv.slice(2)) {
      console.log(`// ${basename(file)}`);
      for (const row of await pixelize(file)) console.log(`      "${row}",`);
    }
  })();
}
