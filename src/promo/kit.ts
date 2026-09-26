/**
 * Drawing kit shared by the promo videos: easing, colors, pixel sprites, text, panels, particles.
 * Works with any Canvas 2D context (browser canvas or @napi-rs/canvas in Node).
 */
import { getItem } from "@/content/items";
import { composeItemIcon, composePingo, gridBounds, type Grid, type PingoLook } from "@/sprites/compose";
import { artFor, gearFromSprites, type GearSprites } from "@/sprites/items";
import { PALETTE } from "@/sprites/palette";

export const W = 1080;
export const H = 1350;
export const FONT = "Pixelify Sans";

export type Ctx = CanvasRenderingContext2D;
export interface Surface {
  canvas: CanvasImageSource & { width: number; height: number };
  ctx: Ctx;
}
export type MakeSurface = (w: number, h: number) => Surface;

export const C = {
  INK: "#231a2e",
  NIGHT: "#2b1f45",
  CREAM: "#fff4d6",
  SUN: "#ffd23f",
  PINK: "#ff6fa8",
  GRAPE: "#7b5cff",
  MINT: "#34c6b8",
  SKY: "#5aa9f0",
  WHITE: "#fffdf7",
  GREEN: "#4fbf5a",
  RED: "#e84a4a",
  ORANGE: "#f28c28",
  GRAY: "#c9c3d2",
};

// ------------------------------------------------------------------ math & easing
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
export const easeInCubic = (x: number) => x ** 3;
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOutBack = (x: number, s = 1.9) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;
export const easeOutElastic = (x: number) =>
  x === 0 || x === 1 ? x : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
export const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
/** 0 before `a`, then scale from `from` to 1 — the classic "slam" */
export const slam = (t: number, a: number, dur = 0.16, from = 2.6) => {
  const k = prog(t, a, a + dur);
  return t < a ? 0 : lerp(from, 1, easeOutCubic(k));
};

// ------------------------------------------------------------------ pixel grids
export const COIN = [".kkk.", "kyyYk", "kywYk", "kyyYk", ".kkk."];
export const CURSOR = [
  "k..........", "kk.........", "kwk........", "kwwk.......", "kwwwk......", "kwwwwk.....", "kwwwwwk....",
  "kwwwwwwk...", "kwwwwwwwk..", "kwwwwwwwwk.", "kwwwwwkkkkk", "kwwkwwk....", "kwk.kwwk...", "kk...kwwk..",
  "k....kwwk..", "......kk...",
];
export const TOMB = ["..kkkk..", ".kWWWWk.", "kWWkWWWk", "kWkkkWWk", "kWWkWWWk", "kWWkWWWk", "kWWWWWWk", "kkkkkkkk"];
export const LOCK = ["..kkkk..", ".k....k.", ".k....k.", "kkkkkkkk", "kyyyyyYk", "kyyYkyYk", "kyyYkyYk", "kyyyyyYk", "kkkkkkkk"];
export const PAPER = ["kkkkkkkk", "kwwwwwWk", "kwkkkkWk", "kwwwwwWk", "kwkkkWWk", "kwwwwwWk", "kwkkkkWk", "kkkkkkkk"];

export function createKit(make: MakeSurface) {
  const cache = new Map<string, Surface>();

  function gridSurface(key: string, grid: Grid): Surface {
    const hit = cache.get(key);
    if (hit) return hit;
    const s = make(grid[0].length, grid.length);
    grid.forEach((row, y) =>
      row.forEach((c, x) => {
        if (!c) return;
        s.ctx.fillStyle = c;
        s.ctx.fillRect(x, y, 1, 1);
      }),
    );
    cache.set(key, s);
    return s;
  }

  function whiteOf(key: string, src: Surface): Surface {
    const k = `${key}#white`;
    const hit = cache.get(k);
    if (hit) return hit;
    const s = make(src.canvas.width, src.canvas.height);
    s.ctx.drawImage(src.canvas, 0, 0);
    s.ctx.globalCompositeOperation = "source-in";
    s.ctx.fillStyle = "#ffffff";
    s.ctx.fillRect(0, 0, src.canvas.width, src.canvas.height);
    cache.set(k, s);
    return s;
  }

  const charGrid = (rows: string[]): Grid => rows.map((r) => [...r].map((c) => (c === "." ? null : (PALETTE[c] ?? null))));

  function drawPingo(
    ctx: Ctx,
    look: PingoLook,
    gear: GearSprites,
    x: number,
    y: number,
    scale: number,
    o: { sx?: number; sy?: number; rot?: number; alpha?: number; flip?: boolean; blink?: boolean; white?: boolean; shadow?: boolean } = {},
  ) {
    if (scale <= 0.01) return;
    const key = `p:${look.bodyColor}:${look.eyes}:${look.mouth}:${look.detail}:${gear.weapon}:${gear.helmet}:${gear.outfit}:${o.blink}`;
    const surf = gridSurface(key, composePingo(look, gearFromSprites(gear), { blink: o.blink }));
    const img = o.white ? whiteOf(key, surf) : surf;
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    if (o.shadow !== false) {
      ctx.fillStyle = "rgba(35,26,46,0.22)";
      ctx.beginPath();
      ctx.ellipse(x, y - scale * 1.5, scale * 10 * (o.sx ?? 1), scale * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(x, y);
    ctx.rotate(o.rot ?? 0);
    ctx.scale(scale * (o.sx ?? 1) * (o.flip ? -1 : 1), scale * (o.sy ?? 1));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img.canvas, -20, -37);
    ctx.restore();
  }

  function drawItem(ctx: Ctx, id: string, cx: number, cy: number, box: number, rot = 0, alpha = 1) {
    const item = getItem(id);
    if (!item) return;
    const grid = composeItemIcon(item.category, artFor(item.category, item.sprite)!);
    const surf = gridSurface(`i:${id}`, grid);
    const b = gridBounds(grid);
    const s = box / Math.max(b.w, b.h);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(surf.canvas, b.x, b.y, b.w, b.h, (-b.w * s) / 2, (-b.h * s) / 2, b.w * s, b.h * s);
    ctx.restore();
  }

  function drawGrid(ctx: Ctx, key: string, rows: string[], x: number, y: number, px: number, alpha = 1) {
    const surf = gridSurface(`g:${key}`, charGrid(rows));
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(surf.canvas, x, y, rows[0].length * px, rows.length * px);
    ctx.restore();
  }

  const drawCoin = (ctx: Ctx, cx: number, cy: number, size: number) => drawGrid(ctx, "coin", COIN, cx - size / 2, cy - size / 2, size / 5);

  function measure(ctx: Ctx, str: string, size: number) {
    ctx.save();
    ctx.font = `700 ${size}px "${FONT}"`;
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }

  function text(
    ctx: Ctx,
    str: string,
    x: number,
    y: number,
    o: {
      size: number;
      fill: string;
      stroke?: string;
      strokeW?: number;
      shadow?: number;
      align?: CanvasTextAlign;
      alpha?: number;
      scale?: number;
      rot?: number;
    },
  ) {
    if ((o.alpha ?? 1) <= 0.001 || (o.scale ?? 1) <= 0.001) return;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.scale !== undefined) ctx.scale(o.scale, o.scale);
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.font = `700 ${o.size}px "${FONT}"`;
    ctx.textAlign = o.align ?? "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    if (o.shadow) {
      ctx.fillStyle = C.INK;
      ctx.strokeStyle = C.INK;
      ctx.lineWidth = o.strokeW ?? 0;
      if (o.strokeW) ctx.strokeText(str, o.shadow, o.shadow);
      ctx.fillText(str, o.shadow, o.shadow);
    }
    if (o.stroke && o.strokeW) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.strokeW;
      ctx.strokeText(str, 0, 0);
    }
    ctx.fillStyle = o.fill;
    ctx.fillText(str, 0, 0);
    ctx.restore();
  }

  /** Words that pop one by one, centered. */
  function words(
    ctx: Ctx,
    line: string,
    y: number,
    t: number,
    start: number,
    o: { size: number; fill: string; stroke?: string; strokeW?: number; shadow?: number; step?: number; gap?: number },
  ) {
    const parts = line.split(" ");
    const gap = o.gap ?? o.size * 0.3;
    const widths = parts.map((p) => measure(ctx, p, o.size));
    let x = W / 2 - (widths.reduce((s, w) => s + w, 0) + gap * (parts.length - 1)) / 2;
    parts.forEach((p, i) => {
      const k = easeOutBack(prog(t, start + i * (o.step ?? 0.08), start + i * (o.step ?? 0.08) + 0.22));
      text(ctx, p, x + widths[i] / 2, y - (1 - k) * 50, { ...o, scale: k });
      x += widths[i] + gap;
    });
  }

  function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function panel(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, r = 22, shadow = 12) {
    ctx.fillStyle = C.INK;
    roundRect(ctx, x + shadow, y + shadow, w, h, r);
    ctx.fill();
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = C.INK;
    ctx.stroke();
  }

  function button(ctx: Ctx, x: number, y: number, w: number, h: number, label: string, fill: string, pressed: boolean, size = 44, color = C.INK) {
    ctx.fillStyle = C.INK;
    roundRect(ctx, x, y + 8, w, h, 16);
    ctx.fill();
    const by = y + (pressed ? 7 : 0);
    ctx.fillStyle = fill;
    roundRect(ctx, x, by, w, h, 16);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.INK;
    ctx.stroke();
    text(ctx, label, x + w / 2, by + h / 2 + 2, { size, fill: color });
  }

  function checker(ctx: Ctx, a: string, b: string, tile: number, ox: number, oy: number) {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = b;
    const sx = ((ox % (tile * 2)) + tile * 2) % (tile * 2);
    const sy = ((oy % (tile * 2)) + tile * 2) % (tile * 2);
    for (let y = -tile * 2 + sy; y < H + tile; y += tile) {
      for (let x = -tile * 2 + sx; x < W + tile; x += tile) {
        const i = Math.round((x - sx) / tile) + Math.round((y - sy) / tile);
        if (((i % 2) + 2) % 2 === 0) ctx.fillRect(x, y, tile, tile);
      }
    }
  }

  function stripes(ctx: Ctx, base: string, band: string, width: number, offset: number) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = band;
    const span = 2200;
    const o = offset % (width * 2);
    for (let x = -span + o; x < span; x += width * 2) ctx.fillRect(x, -span, width, span * 2);
    ctx.restore();
  }

  function rays(ctx: Ctx, cx: number, cy: number, base: string, ray: string, angle: number, n = 14) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = ray;
    const R = 2200;
    for (let i = 0; i < n; i++) {
      const a0 = angle + (i * 2 * Math.PI) / n;
      const a1 = a0 + Math.PI / n;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
      ctx.closePath();
      ctx.fill();
    }
  }

  function stars(ctx: Ctx, t: number, seed: number) {
    for (let i = 0; i < 70; i++) {
      const x = rnd(seed + i) * W;
      const y = rnd(seed + i * 3) * H;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + rnd(i) * 3) + i));
      const s = 4 + Math.floor(rnd(seed + i * 7) * 3) * 3;
      ctx.globalAlpha = tw;
      ctx.fillStyle = i % 5 === 0 ? C.SUN : C.WHITE;
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function stepLabel(ctx: Ctx, n: number | string, label: string, lt: number, color: string, y = 70) {
    const k = easeOutBack(prog(lt, 0.02, 0.3));
    const x = lerp(-900, 60, k);
    const w = measure(ctx, label, 56) + 150;
    panel(ctx, x, y, w, 104, C.WHITE, 52, 8);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 56, y + 52, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.INK;
    ctx.stroke();
    text(ctx, String(n), x + 56, y + 54, { size: 52, fill: C.WHITE, stroke: C.INK, strokeW: 8 });
    text(ctx, label, x + 108, y + 54, { size: 56, fill: C.INK, align: "left" });
  }

  function burst(ctx: Ctx, cx: number, cy: number, lt: number, count: number, colors: string[], seed: number, dist = 220) {
    if (lt < 0 || lt > 0.8) return;
    const k = easeOutCubic(prog(lt, 0, 0.8));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rnd(seed + i) * 0.5;
      const d = dist * (0.6 + rnd(seed + i * 7) * 0.6) * k;
      ctx.globalAlpha = 1 - prog(lt, 0.4, 0.8);
      ctx.fillStyle = colors[i % colors.length];
      const s = 14 + rnd(seed + i * 3) * 12;
      ctx.fillRect(cx + Math.cos(a) * d - s / 2, cy + Math.sin(a) * d - s / 2 + k * k * 60, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function sparkles(ctx: Ctx, cx: number, cy: number, lt: number, seed: number, r = 140) {
    if (lt < 0 || lt > 0.6) return;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rnd(seed + i);
      const d = r * easeOutCubic(prog(lt, 0, 0.6));
      const s = 30 * (1 - prog(lt, 0.2, 0.6));
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      ctx.fillStyle = i % 2 ? C.SUN : C.WHITE;
      ctx.fillRect(x - s / 2, y - s / 6, s, s / 3);
      ctx.fillRect(x - s / 6, y - s / 2, s / 3, s);
    }
  }

  function confetti(ctx: Ctx, lt: number, seed: number, count = 160) {
    if (lt < 0) return;
    const colors = [C.SUN, C.PINK, C.MINT, C.GRAPE, C.GREEN, C.RED, C.WHITE];
    for (let i = 0; i < count; i++) {
      const x0 = rnd(seed + i) * W;
      const speed = 500 + rnd(seed + i * 2) * 700;
      const y = -60 - rnd(seed + i * 5) * 700 + lt * speed;
      if (y > H + 40) continue;
      const x = x0 + Math.sin(lt * 5 + i) * 40;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lt * (4 + rnd(i) * 6) * (i % 2 ? 1 : -1));
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(-10, -6, 20, 12);
      ctx.restore();
    }
  }

  function bar(ctx: Ctx, x: number, y: number, w: number, h: number, value: number, color: string) {
    ctx.fillStyle = C.INK;
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    ctx.fillStyle = "#4d4658";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * clamp01(value), h);
  }

  function chip(ctx: Ctx, cx: number, cy: number, label: string, fill: string, color = C.INK, size = 36) {
    const w = measure(ctx, label, size) + 44;
    const h = size + 22;
    ctx.fillStyle = C.INK;
    roundRect(ctx, cx - w / 2 + 5, cy - h / 2 + 5, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = fill;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.INK;
    ctx.stroke();
    text(ctx, label, cx, cy + 2, { size, fill: color });
  }

  return {
    drawPingo, drawItem, drawGrid, drawCoin, measure, text, words, roundRect, panel, button, checker, stripes, rays,
    stars, stepLabel, burst, sparkles, confetti, bar, chip,
  };
}

export type Kit = ReturnType<typeof createKit>;
