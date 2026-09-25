/**
 * 15-second promo animation (1080×1350, 4:5 for LinkedIn).
 * Pure function of time: render(ctx, t). Runs in the browser (/dev/promo) and in Node
 * (scripts/render-promo.ts → MP4). Uses the REAL game sprites.
 */
import { getItem } from "@/content/items";
import { formatModifier } from "@/lib/format";
import { STAT_KEYS } from "@/engine/types";
import { composeItemIcon, composePingo, gridBounds, type Grid, type PingoLook } from "@/sprites/compose";
import { artFor, gearFromSprites, type GearSprites } from "@/sprites/items";
import { BODY_COLORS, PALETTE, type BodyColor } from "@/sprites/palette";

export const PROMO = { W: 1080, H: 1350, FPS: 30, DURATION: 15, FONT: "Pixelify Sans" };

type Ctx = CanvasRenderingContext2D;
export interface Surface {
  canvas: CanvasImageSource & { width: number; height: number };
  ctx: Ctx;
}
export type MakeSurface = (w: number, h: number) => Surface;

const INK = "#231a2e";
const CREAM = "#fff4d6";
const SUN = "#ffd23f";
const PINK = "#ff6fa8";
const GRAPE = "#7b5cff";
const MINT = "#34c6b8";
const WHITE = "#fffdf7";
const GREEN = "#4fbf5a";
const RED = "#e84a4a";

// ------------------------------------------------------------------ timing
const SCENES = [1.9, 1.8, 2.4, 2.3, 1.7, 3.1, 1.8];
const START = SCENES.reduce<number[]>((acc, d, i) => [...acc, (acc[i - 1] ?? 0) + (i ? SCENES[i - 1] : 0)], []);
const at = (scene: number, local: number) => START[scene] + local;
const WIPE = 0.18;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const easeInCubic = (x: number) => x ** 3;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const easeOutBack = (x: number, s = 1.9) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;
const easeOutElastic = (x: number) =>
  x === 0 || x === 1 ? x : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// screen-shake impacts (global seconds, strength in px)
const IMPACTS: Array<[number, number]> = [
  [at(0, 0.95), 16],
  [at(1, 0.3), 12],
  [at(1, 0.65), 18],
  [at(3, 0.9), 7],
  [at(3, 1.4), 7],
  [at(5, 0.15), 18],
  [at(5, 0.56), 26],
  [at(5, 0.99), 20],
  [at(5, 2.09), 28],
];
const FLASHES = [at(5, 0.56), at(5, 0.99), at(5, 2.09)];

// ------------------------------------------------------------------ looks
const HERO: PingoLook = { bodyColor: "rosa", eyes: "grande", mouth: "sorriso", detail: "bochechas" };
const HERO_GEAR: GearSprites = { weapon: "wifi_hammer", helmet: "viking_helmet", outfit: "hacker_hoodie" };

export function createPromo(make: MakeSurface) {
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

  function pingo(look: PingoLook, gear: GearSprites = {}, blink = false): { surf: Surface; key: string } {
    const key = `p:${look.bodyColor}:${look.eyes}:${look.mouth}:${look.detail}:${gear.weapon}:${gear.helmet}:${gear.outfit}:${blink}`;
    return { key, surf: gridSurface(key, composePingo(look, gearFromSprites(gear), { blink })) };
  }

  // ---------------------------------------------------------------- drawing helpers
  function drawPingo(
    ctx: Ctx,
    look: PingoLook,
    gear: GearSprites,
    x: number,
    y: number,
    scale: number,
    o: { sx?: number; sy?: number; rot?: number; alpha?: number; flip?: boolean; blink?: boolean; white?: boolean; shadow?: boolean } = {},
  ) {
    const { surf, key } = pingo(look, gear, o.blink);
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

  function drawItem(ctx: Ctx, id: string, cx: number, cy: number, box: number, rot = 0) {
    const item = getItem(id);
    if (!item) return;
    const grid = composeItemIcon(item.category, artFor(item.category, item.sprite)!);
    const surf = gridSurface(`i:${id}`, grid);
    const b = gridBounds(grid);
    const s = box / Math.max(b.w, b.h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(surf.canvas, b.x, b.y, b.w, b.h, (-b.w * s) / 2, (-b.h * s) / 2, b.w * s, b.h * s);
    ctx.restore();
  }

  function drawGrid(ctx: Ctx, key: string, rows: string[], x: number, y: number, px: number) {
    const surf = gridSurface(key, charGrid(rows));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(surf.canvas, x, y, rows[0].length * px, rows.length * px);
    ctx.restore();
  }

  const COIN = [".kkk.", "kyyYk", "kywYk", "kyyYk", ".kkk."];
  const drawCoin = (ctx: Ctx, cx: number, cy: number, size: number) =>
    drawGrid(ctx, "coin", COIN, cx - size / 2, cy - size / 2, size / 5);

  const CURSOR = [
    "k..........", "kk.........", "kwk........", "kwwk.......", "kwwwk......", "kwwwwk.....", "kwwwwwk....",
    "kwwwwwwk...", "kwwwwwwwk..", "kwwwwwwwwk.", "kwwwwwkkkkk", "kwwkwwk....", "kwk.kwwk...", "kk...kwwk..",
    "k....kwwk..", "......kk...",
  ];
  const TOMB = ["..kkkk..", ".kWWWWk.", "kWWkWWWk", "kWkkkWWk", "kWWkWWWk", "kWWkWWWk", "kWWWWWWk", "kkkkkkkk"];

  function text(
    ctx: Ctx,
    str: string,
    x: number,
    y: number,
    o: { size: number; fill: string; stroke?: string; strokeW?: number; shadow?: number; align?: CanvasTextAlign; alpha?: number; scale?: number; rot?: number },
  ) {
    if ((o.alpha ?? 1) <= 0 || (o.scale ?? 1) <= 0.001) return;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.scale !== undefined) ctx.scale(o.scale, o.scale);
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.font = `700 ${o.size}px "${PROMO.FONT}"`;
    ctx.textAlign = o.align ?? "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    if (o.shadow) {
      ctx.fillStyle = INK;
      ctx.strokeStyle = INK;
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
    ctx.fillStyle = INK;
    roundRect(ctx, x + shadow, y + shadow, w, h, r);
    ctx.fill();
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  function checker(ctx: Ctx, a: string, b: string, tile: number, ox: number, oy: number) {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, PROMO.W, PROMO.H);
    ctx.fillStyle = b;
    const sx = ((ox % (tile * 2)) + tile * 2) % (tile * 2);
    const sy = ((oy % (tile * 2)) + tile * 2) % (tile * 2);
    for (let y = -tile * 2 + sy; y < PROMO.H + tile; y += tile) {
      for (let x = -tile * 2 + sx; x < PROMO.W + tile; x += tile) {
        const i = Math.round((x - sx) / tile) + Math.round((y - sy) / tile);
        if (((i % 2) + 2) % 2 === 0) ctx.fillRect(x, y, tile, tile);
      }
    }
  }

  function stripes(ctx: Ctx, base: string, band: string, width: number, offset: number) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, PROMO.W, PROMO.H);
    ctx.save();
    ctx.translate(PROMO.W / 2, PROMO.H / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = band;
    const span = 2200;
    const o = offset % (width * 2);
    for (let x = -span + o; x < span; x += width * 2) ctx.fillRect(x, -span, width, span * 2);
    ctx.restore();
  }

  function rays(ctx: Ctx, cx: number, cy: number, base: string, ray: string, angle: number, n = 14) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, PROMO.W, PROMO.H);
    ctx.fillStyle = ray;
    const R = 2000;
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

  function stepLabel(ctx: Ctx, n: number, label: string, lt: number, color: string) {
    const k = easeOutBack(prog(lt, 0.02, 0.3));
    const x = lerp(-700, 60, k);
    ctx.save();
    ctx.font = `700 56px "${PROMO.FONT}"`;
    const w = ctx.measureText(label).width + 150;
    ctx.restore();
    panel(ctx, x, 70, w, 104, WHITE, 52, 8);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 56, 122, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    text(ctx, String(n), x + 56, 124, { size: 52, fill: WHITE, stroke: INK, strokeW: 8 });
    text(ctx, label, x + 108, 124, { size: 56, fill: INK, align: "left" });
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
      ctx.fillStyle = i % 2 ? SUN : WHITE;
      ctx.fillRect(x - s / 2, y - s / 6, s, s / 3);
      ctx.fillRect(x - s / 6, y - s / 2, s / 3, s);
    }
  }

  function confetti(ctx: Ctx, lt: number, seed: number) {
    if (lt < 0) return;
    const colors = [SUN, PINK, MINT, GRAPE, GREEN, RED, WHITE];
    for (let i = 0; i < 160; i++) {
      const x0 = rnd(seed + i) * PROMO.W;
      const speed = 500 + rnd(seed + i * 2) * 700;
      const y = -60 - rnd(seed + i * 5) * 700 + lt * speed;
      if (y > PROMO.H + 40) continue;
      const x = x0 + Math.sin(lt * 5 + i) * 40;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lt * (4 + rnd(i) * 6) * (i % 2 ? 1 : -1));
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(-10, -6, 20, 12);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- scenes
  function scene1(ctx: Ctx, lt: number) {
    stripes(ctx, SUN, "#ffdf6e", 70, lt * 140);
    const words = ["E", "SE", "FAZER", "A", "TAREFA"];
    ctx.font = `700 92px "${PROMO.FONT}"`;
    const gap = 28;
    const widths = words.map((w) => ctx.measureText(w).width);
    let x = PROMO.W / 2 - (widths.reduce((s, w) => s + w, 0) + gap * (words.length - 1)) / 2;
    words.forEach((w, i) => {
      const k = easeOutBack(prog(lt, 0.05 + i * 0.08, 0.3 + i * 0.08));
      text(ctx, w, x + widths[i] / 2, 360 - (1 - k) * 60, { size: 92, fill: WHITE, stroke: INK, strokeW: 14, shadow: 8, scale: k });
      x += widths[i] + gap;
    });
    const v = easeOutBack(prog(lt, 0.5, 0.72));
    text(ctx, "VALESSE", PROMO.W / 2, 500, { size: 120, fill: WHITE, stroke: INK, strokeW: 16, shadow: 8, scale: v, rot: -0.03 });
    const s = prog(lt, 0.8, 0.97);
    text(ctx, "PODER?", PROMO.W / 2, 720, {
      size: 250,
      fill: PINK,
      stroke: INK,
      strokeW: 22,
      shadow: 14,
      scale: s > 0 ? lerp(2.8, 1, easeOutCubic(s)) : 0,
      alpha: s > 0 ? 1 : 0,
      rot: 0.04,
    });
    sparkles(ctx, 540, 720, lt - 0.97, 11, 380);
    // peeking Pingo
    const p = easeOutBack(prog(lt, 1.05, 1.4));
    drawPingo(ctx, HERO, {}, PROMO.W / 2, PROMO.H + 260 - p * 180, 16, { blink: lt > 1.55 && lt < 1.65, shadow: false });
  }

  function scene2(ctx: Ctx, lt: number) {
    rays(ctx, PROMO.W / 2, 820, GRAPE, "#8a6cff", lt * 0.35);
    // coins burst behind
    burst(ctx, 540, 700, lt - 0.3, 14, [SUN, "#fff1a8", SUN], 21, 380);
    for (let i = 0; i < 10; i++) {
      const k = prog(lt, 0.3, 1.1);
      if (k <= 0 || k >= 1) continue;
      const a = -Math.PI / 2 + (i - 4.5) * 0.28;
      const d = 520 * easeOutCubic(k);
      drawCoin(ctx, 540 + Math.cos(a) * d, 700 + Math.sin(a) * d + k * k * 500, 64);
    }
    // Pingo drop + squash
    const fall = easeInCubic(prog(lt, 0.02, 0.3));
    const land = prog(lt, 0.3, 0.75);
    const squash = land > 0 ? easeOutElastic(land) : 0;
    const sx = land > 0 ? lerp(1.35, 1, squash) : 0.85;
    const sy = land > 0 ? lerp(0.7, 1, squash) : 1.2;
    drawPingo(ctx, HERO, {}, PROMO.W / 2, lerp(-200, 1060, fall), 13, { sx, sy, blink: lt > 1.3 && lt < 1.4 });
    // title
    const letters = [..."PINGO"];
    ctx.font = `700 190px "${PROMO.FONT}"`;
    const lw = letters.map((l) => ctx.measureText(l).width);
    let x = PROMO.W / 2 - lw.reduce((s, w) => s + w, 0) / 2;
    letters.forEach((l, i) => {
      const k = easeOutBack(prog(lt, 0.18 + i * 0.05, 0.42 + i * 0.05), 2.4);
      text(ctx, l, x + lw[i] / 2, lerp(-150, 210, k) + Math.sin(lt * 6 + i) * 4, { size: 190, fill: SUN, stroke: INK, strokeW: 20, shadow: 12 });
      x += lw[i];
    });
    const b = prog(lt, 0.55, 0.7);
    text(ctx, "BATTLE ROYALE", PROMO.W / 2, 370, {
      size: 116,
      fill: PINK,
      stroke: INK,
      strokeW: 16,
      shadow: 10,
      scale: b > 0 ? lerp(2.4, 1, easeOutCubic(b)) : 0,
      rot: -0.03,
    });
    const tg = easeOutCubic(prog(lt, 0.85, 1.15));
    text(ctx, "O jogo onde a tarefa", PROMO.W / 2, 1160 + (1 - tg) * 40, { size: 60, fill: WHITE, stroke: INK, strokeW: 10, alpha: tg });
    text(ctx, "vira poder na arena.", PROMO.W / 2, 1240 + (1 - tg) * 40, { size: 60, fill: SUN, stroke: INK, strokeW: 10, alpha: tg });
  }

  function scene3(ctx: Ctx, lt: number) {
    checker(ctx, CREAM, "#fbe7b0", 90, lt * 60, lt * 60);
    stepLabel(ctx, 1, "FAÇA AS ATIVIDADES", lt, GREEN);
    const k = easeOutBack(prog(lt, 0.1, 0.4));
    const py = lerp(1400, 250, k);
    panel(ctx, 120, py, 840, 600, WHITE);
    text(ctx, "Suas atividades", 540, py + 70, { size: 54, fill: INK });
    const tasks = ["Atividade 01", "Lição de casa", "Projeto de ciências", "Quiz de frações"];
    const checks = [0.45, 0.7, 0.95, 1.2];
    tasks.forEach((task, i) => {
      const y = py + 170 + i * 110;
      ctx.fillStyle = "#f3ead2";
      roundRect(ctx, 170, y - 38, 76, 76, 12);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = INK;
      ctx.stroke();
      text(ctx, task, 280, y + 2, { size: 50, fill: INK, align: "left" });
      const c = easeOutBack(prog(lt, checks[i], checks[i] + 0.18), 3);
      if (c > 0) {
        ctx.save();
        ctx.translate(208, y);
        ctx.scale(c, c);
        ctx.fillStyle = GREEN;
        roundRect(ctx, -38, -38, 76, 76, 12);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 12;
        ctx.lineCap = "square";
        ctx.beginPath();
        ctx.moveTo(-20, 2);
        ctx.lineTo(-6, 16);
        ctx.lineTo(20, -14);
        ctx.stroke();
        ctx.restore();
        text(ctx, "+120", 870, y + 2 - prog(lt, checks[i], checks[i] + 0.5) * 30, {
          size: 46,
          fill: GREEN,
          stroke: INK,
          strokeW: 8,
          alpha: 1 - prog(lt, checks[i] + 0.4, checks[i] + 0.7),
          align: "right",
        });
      }
    });
    // counter
    const arrivals = checks.map((c) => c + 0.42);
    const earned = arrivals.filter((a) => lt >= a).length * 120;
    const lastArrival = Math.max(-1, ...arrivals.filter((a) => lt >= a));
    const bump = lastArrival > 0 ? 1 + 0.25 * (1 - prog(lt, lastArrival, lastArrival + 0.25)) : 1;
    const ck = easeOutBack(prog(lt, 0.2, 0.5));
    panel(ctx, 250, lerp(1500, 1000, ck), 580, 200, SUN, 30);
    ctx.save();
    ctx.translate(540, lerp(1500, 1000, ck) + 100);
    ctx.scale(bump, bump);
    drawCoin(ctx, -160, 0, 110);
    text(ctx, String(earned), 40, 4, { size: 120, fill: WHITE, stroke: INK, strokeW: 16, shadow: 8 });
    ctx.restore();
    text(ctx, "PingoCoins", 540, lerp(1500, 1000, ck) + 245, { size: 44, fill: INK });
    // flying coins
    checks.forEach((c, i) => {
      for (let j = 0; j < 3; j++) {
        const f = prog(lt, c + j * 0.05, c + 0.4 + j * 0.05);
        if (f <= 0 || f >= 1) continue;
        const sx = 208;
        const sy = py + 170 + i * 110;
        const e = easeInOut(f);
        const x = lerp(sx, 380, e);
        const y = lerp(sy, 1100, e) - Math.sin(e * Math.PI) * 220;
        drawCoin(ctx, x, y, 70 - e * 20);
      }
    });
  }

  function scene4(ctx: Ctx, lt: number) {
    checker(ctx, MINT, "#4fd2c6", 90, -lt * 60, lt * 60);
    stepLabel(ctx, 2, "COMPRE ITENS", lt, SUN);
    const items = ["wifi_hammer", "viking_helmet", "ceo_suit"];
    const names = [["Martelo", "do Wi-Fi"], ["Capacete", "Viking"], ["Terno", "do CEO"]];
    const buyAt = [0.9, 1.4];
    const balance = lt < buyAt[0] ? 480 : lt < buyAt[1] ? 240 : 0;
    // balance chip
    const bk = easeOutBack(prog(lt, 0.1, 0.35));
    panel(ctx, lerp(1200, 770, bk), 230, 250, 90, WHITE, 45, 8);
    drawCoin(ctx, lerp(1200, 770, bk) + 55, 275, 54);
    text(ctx, String(balance), lerp(1200, 770, bk) + 160, 278, { size: 56, fill: INK });

    items.forEach((id, i) => {
      const item = getItem(id)!;
      const k = easeOutBack(prog(lt, 0.05 + i * 0.08, 0.4 + i * 0.08));
      const x = 55 + i * 330;
      const y = lerp(1500, 380, k);
      const bought = i < 2 && lt >= buyAt[i];
      const broke = i === 2 && lt >= buyAt[1] + 0.1;
      panel(ctx, x, y, 300, 600, WHITE, 22, 10);
      ctx.fillStyle = ["#cbe0fb", "#cbe0fb", "#e6d4fb"][i];
      roundRect(ctx, x + 18, y + 18, 264, 230, 14);
      ctx.fill();
      drawItem(ctx, id, x + 150, y + 133, 170, Math.sin(lt * 4 + i) * 0.06);
      text(ctx, names[i][0], x + 150, y + 290, { size: 44, fill: INK });
      text(ctx, names[i][1], x + 150, y + 338, { size: 44, fill: INK });
      drawCoin(ctx, x + 100, y + 395, 40);
      text(ctx, String(item.price), x + 170, y + 398, { size: 44, fill: INK });
      const mods = STAT_KEYS.filter((s) => item.statModifiers[s]).slice(0, 2);
      mods.forEach((m, j) => {
        const v = item.statModifiers[m]!;
        const cy = y + 452 + j * 0;
        const cx = x + 80 + j * 140;
        ctx.fillStyle = v > 0 ? "#dff5dc" : "#fde0e0";
        roundRect(ctx, cx - 64, cy - 22, 128, 44, 22);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = INK;
        ctx.stroke();
        text(ctx, formatModifier(m, v), cx, cy + 2, { size: 28, fill: v > 0 ? "#1f6b2a" : "#9e2a3a" });
      });
      // button
      const pressed = i < 2 && lt >= buyAt[i] - 0.08 && lt < buyAt[i];
      const by = y + 520 + (pressed ? 6 : 0);
      ctx.fillStyle = INK;
      roundRect(ctx, x + 30, y + 526, 240, 60, 14);
      ctx.fill();
      ctx.fillStyle = bought ? GREEN : broke ? "#c9c3d2" : SUN;
      roundRect(ctx, x + 30, by - 4, 240, 60, 14);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.stroke();
      text(ctx, bought ? "É SEU!" : broke ? "SEM SALDO" : "COMPRAR", x + 150, by + 27, { size: 36, fill: bought ? WHITE : INK });
      if (bought) {
        const s = prog(lt, buyAt[i], buyAt[i] + 0.2);
        text(ctx, "COMPRADO!", x + 150, y + 150, {
          size: 62,
          fill: RED,
          stroke: WHITE,
          strokeW: 10,
          scale: lerp(2.2, 1, easeOutCubic(s)),
          alpha: s > 0 ? 1 : 0,
          rot: -0.22,
        });
        sparkles(ctx, x + 150, y + 540, lt - buyAt[i], 40 + i, 170);
      }
    });
    // cursor path
    const path: Array<[number, number, number]> = [
      [0.35, 980, 1340],
      [0.78, 210, 945],
      [1.05, 210, 945],
      [1.28, 540, 945],
      [1.65, 540, 945],
      [2.0, 900, 1250],
    ];
    let cx = path[0][1];
    let cy = path[0][2];
    for (let i = 1; i < path.length; i++) {
      const k = easeInOut(prog(lt, path[i - 1][0], path[i][0]));
      if (lt >= path[i - 1][0]) {
        cx = lerp(path[i - 1][1], path[i][1], k);
        cy = lerp(path[i - 1][2], path[i][2], k);
      }
    }
    if (lt > 0.35) {
      const click = buyAt.some((b) => lt >= b - 0.08 && lt < b + 0.04);
      drawGrid(ctx, "cursor", CURSOR, cx, cy, click ? 6 : 7);
    }
  }

  function scene5(ctx: Ctx, lt: number) {
    stripes(ctx, "#5aa9f0", "#6db5f4", 80, lt * 160);
    stepLabel(ctx, 3, "MONTE SEU PINGO", lt, PINK);
    const colors = Object.keys(BODY_COLORS) as BodyColor[];
    const eyes: PingoLook["eyes"][] = ["redondo", "ponto", "feliz", "brilho", "bravo", "grande"];
    const ci = lt < 0.45 ? Math.floor(lt / 0.06) % colors.length : colors.indexOf("rosa");
    const ei = lt < 0.3 ? 5 : lt < 0.55 ? Math.floor((lt - 0.3) / 0.05) % eyes.length : 5;
    const look: PingoLook = { ...HERO, bodyColor: colors[ci], eyes: eyes[ei] };
    const gear: GearSprites = {};
    const equips: Array<[keyof GearSprites, number]> = [
      ["helmet", 0.7],
      ["weapon", 0.95],
      ["outfit", 1.2],
    ];
    for (const [slot, time] of equips) if (lt >= time) gear[slot] = HERO_GEAR[slot];
    const lastEquip = Math.max(-1, ...equips.map(([, time]) => time).filter((time) => lt >= time));
    const hop = lastEquip > 0 ? Math.sin(prog(lt, lastEquip, lastEquip + 0.3) * Math.PI) : 0;
    const pop = lastEquip > 0 ? 1 + 0.12 * (1 - prog(lt, lastEquip, lastEquip + 0.2)) : 1;
    const swap = lt < 0.55 ? 1 + 0.05 * Math.sin(lt * 60) : 1;
    drawPingo(ctx, look, gear, 540, 1030 - hop * 90, 15 * pop * swap, { blink: lt > 1.5 && lt < 1.58 });
    // flying items
    const fly: Array<[string, number, number, number, number, number]> = [
      ["viking_helmet", 0.55, 540, -150, 540, 420],
      ["wifi_hammer", 0.8, 1250, 500, 830, 640],
      ["hacker_hoodie", 1.05, -150, 900, 540, 860],
    ];
    for (const [id, start, x0, y0, x1, y1] of fly) {
      const k = prog(lt, start, start + 0.15);
      if (k > 0 && k < 1) drawItem(ctx, id, lerp(x0, x1, easeInCubic(k)), lerp(y0, y1, easeInCubic(k)), 190, k * 3);
      sparkles(ctx, x1, y1, lt - start - 0.15, 60 + start * 10, 220);
    }
    const bursts: Array<[number, string]> = [
      [0.7, "+5 DEF"],
      [0.95, "+18 ATK"],
      [1.2, "+5% ESQ"],
    ];
    bursts.forEach(([time, label], i) => {
      const k = prog(lt, time, time + 0.5);
      if (k > 0 && k < 1)
        text(ctx, label, [230, 850, 250][i], 560 - k * 80 + i * 120, {
          size: 70,
          fill: SUN,
          stroke: INK,
          strokeW: 12,
          alpha: 1 - prog(lt, time + 0.35, time + 0.5),
          scale: easeOutBack(prog(lt, time, time + 0.15)),
        });
    });
    // swatches
    colors.forEach((c, i) => {
      const x = 90 + i * 92;
      const sel = i === ci;
      ctx.fillStyle = INK;
      roundRect(ctx, x + 5, 1195 + 5, 76, 76, 12);
      ctx.fill();
      ctx.fillStyle = BODY_COLORS[c].main;
      roundRect(ctx, x, sel ? 1180 : 1195, 76, 76, 12);
      ctx.fill();
      ctx.lineWidth = sel ? 8 : 5;
      ctx.strokeStyle = INK;
      ctx.stroke();
    });
  }

  // arena roster: look, gear, home (x, feet y)
  const ROSTER: Array<{ look: PingoLook; gear: GearSprites; x: number; y: number }> = [
    { look: HERO, gear: HERO_GEAR, x: 300, y: 640 },
    { look: { bodyColor: "azul", eyes: "bravo", mouth: "reta", detail: "nenhum" }, gear: { weapon: "fair_mallet", helmet: "construction_helmet" }, x: 600, y: 520 },
    { look: { bodyColor: "verde", eyes: "brilho", mouth: "gato", detail: "broto" }, gear: { weapon: "d20", helmet: "wizard_hat", outfit: "wizard_robe" }, x: 860, y: 640 },
    { look: { bodyColor: "amarelo", eyes: "redondo", mouth: "aberta", detail: "sardas" }, gear: { weapon: "plastic_dagger", helmet: "propeller_cap" }, x: 230, y: 960 },
    { look: { bodyColor: "roxo", eyes: "grande", mouth: "dentes", detail: "estrela" }, gear: { weapon: "prompt_wand", helmet: "pirate_hat", outfit: "ninja_suit" }, x: 560, y: 860 },
    { look: { bodyColor: "laranja", eyes: "sono", mouth: "sorriso", detail: "curativo" }, gear: { weapon: "pot_lid", helmet: "pot_helmet", outfit: "cardboard_armor" }, x: 870, y: 960 },
    { look: { bodyColor: "ciano", eyes: "ponto", mouth: "lingua", detail: "bochechas" }, gear: { weapon: "selfie_stick", outfit: "banana_suit" }, x: 720, y: 1180 },
    { look: { bodyColor: "vermelho", eyes: "feliz", mouth: "sorriso", detail: "nenhum" }, gear: {}, x: 360, y: 1180 },
  ];
  // attacks: attacker, target, local time, label, kind, eliminates?
  const ATTACKS: Array<{ a: number; b: number; t: number; label: string; kind: "hit" | "crit" | "dodge"; kill?: boolean; hp: number }> = [
    { a: 1, b: 2, t: 0.3, label: "-38", kind: "hit", hp: 0.62 },
    { a: 4, b: 5, t: 0.42, label: "CRÍTICO! -146", kind: "crit", kill: true, hp: 0 },
    { a: 3, b: 7, t: 0.55, label: "-41", kind: "hit", hp: 0.59 },
    { a: 2, b: 1, t: 0.72, label: "ESQUIVOU!", kind: "dodge", hp: 1 },
    { a: 0, b: 3, t: 0.85, label: "CRÍTICO! -97", kind: "crit", kill: true, hp: 0 },
    { a: 6, b: 7, t: 0.9, label: "-44", kind: "hit", kill: true, hp: 0 },
    { a: 1, b: 6, t: 1.1, label: "-60", kind: "hit", kill: true, hp: 0 },
    { a: 4, b: 2, t: 1.2, label: "-52", kind: "hit", kill: true, hp: 0 },
    { a: 4, b: 1, t: 1.6, label: "-49", kind: "hit", kill: true, hp: 0 },
    { a: 0, b: 4, t: 1.95, label: "CRÍTICO! -133", kind: "crit", kill: true, hp: 0 },
  ];
  const IMPACT = 0.14;
  const VICTORY = 2.25;

  function scene6(ctx: Ctx, lt: number) {
    ctx.fillStyle = "#3a2a4a";
    ctx.fillRect(0, 0, PROMO.W, PROMO.H);
    // arena floor
    const ax = 40;
    const ay = 300;
    const aw = 1000;
    const ah = 1010;
    for (let y = 0; y < ah; y += 50) {
      for (let x = 0; x < aw; x += 50) {
        ctx.fillStyle = ((x + y) / 50) % 2 === 0 ? "#8fd16a" : "#7fc45c";
        ctx.fillRect(ax + x, ay + y, 50, 50);
      }
    }
    ctx.strokeStyle = "#d8c38a";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(540, 800, 170, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#5e3a22";
    ctx.fillRect(ax - 18, ay - 18, aw + 36, 18);
    ctx.fillRect(ax - 18, ay + ah, aw + 36, 18);
    ctx.fillRect(ax - 18, ay, 18, ah);
    ctx.fillRect(ax + aw, ay, 18, ah);

    // state per fighter
    const hp = ROSTER.map(() => 1);
    const deadAt = ROSTER.map(() => Infinity);
    for (const atk of ATTACKS) {
      if (lt >= atk.t + IMPACT && atk.kind !== "dodge") hp[atk.b] = Math.min(hp[atk.b], atk.hp);
      if (atk.kill) deadAt[atk.b] = atk.t + IMPACT + 0.05;
    }

    const order = ROSTER.map((_, i) => i).sort((i, j) => ROSTER[i].y - ROSTER[j].y);
    if (lt >= VICTORY) order.push(...order.splice(order.indexOf(0), 1)); // champion on top
    for (const i of order) {
      const f = ROSTER[i];
      let x = f.x;
      let y = f.y;
      let white = false;
      let flip = false;
      let scale = 4.6;
      let rot = 0;
      let alpha = 1;
      // attacking?
      const mine = ATTACKS.find((a) => a.a === i && lt >= a.t && lt < a.t + 0.45);
      if (mine) {
        const tgt = ROSTER[mine.b];
        const dir = Math.sign(tgt.x - f.x) || 1;
        const stopX = tgt.x - dir * 150;
        const stopY = tgt.y + 10;
        const go = easeOutCubic(prog(lt, mine.t, mine.t + IMPACT));
        const back = easeInOut(prog(lt, mine.t + 0.28, mine.t + 0.45));
        x = lerp(lerp(f.x, stopX, go), f.x, back);
        y = lerp(lerp(f.y, stopY, go), f.y, back);
        flip = dir < 0;
      }
      // hit?
      const hit = ATTACKS.find((a) => a.b === i && lt >= a.t + IMPACT && lt < a.t + IMPACT + 0.25);
      if (hit) {
        const dir = Math.sign(f.x - ROSTER[hit.a].x) || 1;
        if (hit.kind === "dodge") x += dir * 90 * Math.sin(prog(lt, hit.t + IMPACT, hit.t + IMPACT + 0.25) * Math.PI);
        else {
          white = lt < hit.t + IMPACT + 0.07;
          x += dir * 26 * Math.sin((lt - hit.t) * 70) * (1 - prog(lt, hit.t + IMPACT, hit.t + IMPACT + 0.25));
        }
      }
      // victory
      if (i === 0 && lt >= VICTORY) {
        const v = easeInOut(prog(lt, VICTORY, VICTORY + 0.35));
        x = lerp(f.x, 540, v);
        y = lerp(f.y, 1000, v) - Math.abs(Math.sin(Math.max(0, lt - VICTORY - 0.35) * 9)) * 90;
        scale = lerp(4.6, 9, v);
      }
      // dying
      if (lt >= deadAt[i]) {
        const d = prog(lt, deadAt[i], deadAt[i] + 0.3);
        if (d >= 1) {
          ctx.globalAlpha = 1 - 0.7 * prog(lt, VICTORY, VICTORY + 0.3);
          drawGrid(ctx, "tomb", TOMB, f.x - 44, f.y - 88, 11);
          ctx.globalAlpha = 1;
          continue;
        }
        rot = d * 8;
        scale *= 1 - d;
        alpha = 1 - d;
        burst(ctx, f.x, f.y - 90, lt - deadAt[i], 12, [WHITE, "#c9c3d2", SUN], i * 13, 160);
      }
      const bob = 1 + 0.04 * Math.sin(lt * 9 + i);
      drawPingo(ctx, f.look, f.gear, x, y, scale, { sx: 1 / bob, sy: bob, white, flip, rot, alpha });
      // HP bar
      if (lt < deadAt[i] && !(i === 0 && lt >= VICTORY)) {
        const w = 130;
        const by = y - scale * 40;
        ctx.fillStyle = INK;
        ctx.fillRect(x - w / 2 - 5, by - 5, w + 10, 26);
        ctx.fillStyle = "#4d4658";
        ctx.fillRect(x - w / 2, by, w, 16);
        ctx.fillStyle = hp[i] > 0.6 ? GREEN : hp[i] > 0.3 ? SUN : RED;
        ctx.fillRect(x - w / 2, by, w * hp[i], 16);
      }
    }
    // damage texts
    for (const atk of ATTACKS) {
      const k = prog(lt, atk.t + IMPACT, atk.t + IMPACT + 0.7);
      if (k <= 0 || k >= 1) continue;
      const tgt = ROSTER[atk.b];
      const crit = atk.kind === "crit";
      ctx.font = `700 ${crit ? 78 : 60}px "${PROMO.FONT}"`;
      const half = ctx.measureText(atk.label).width / 2 + 30;
      const tx = Math.min(PROMO.W - half, Math.max(half, tgt.x));
      text(ctx, atk.label, tx, tgt.y - 250 - k * 90, {
        size: crit ? 78 : 60,
        fill: crit ? SUN : atk.kind === "dodge" ? "#5ad1e6" : WHITE,
        stroke: INK,
        strokeW: 12,
        scale: easeOutBack(prog(lt, atk.t + IMPACT, atk.t + IMPACT + 0.15), 3),
        alpha: 1 - prog(lt, atk.t + IMPACT + 0.5, atk.t + IMPACT + 0.7),
        rot: crit ? -0.06 : 0,
      });
      if (crit) burst(ctx, tgt.x, tgt.y - 120, lt - atk.t - IMPACT, 16, [SUN, WHITE, "#f28c28"], atk.t * 100, 240);
    }
    // FINAL 3 banner
    const fb = prog(lt, 1.42, 1.9);
    if (fb > 0 && fb < 1) {
      const x = lerp(-600, 1680, easeInOut(fb) * 0.5 + (fb > 0.5 ? easeInCubic((fb - 0.5) * 2) * 0.5 : 0));
      ctx.fillStyle = "rgba(35,26,46,0.88)";
      ctx.fillRect(0, 730, PROMO.W, 150);
      text(ctx, "FINAL 3", fb < 0.5 ? lerp(-400, 540, easeOutBack(fb * 2)) : lerp(540, 1600, easeInCubic((fb - 0.5) * 2)), 808, {
        size: 120,
        fill: PINK,
        stroke: INK,
        strokeW: 14,
      });
      void x;
    }
    // label (on top)
    const lk = prog(lt, 0.02, 0.17);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, PROMO.W, 250);
    text(ctx, "4 · E CAIAM NA", PROMO.W / 2, 90, { size: 76, fill: WHITE, scale: lk > 0 ? lerp(2.4, 1, easeOutCubic(lk)) : 0 });
    text(ctx, "PORRADA!", PROMO.W / 2, 185, {
      size: 110,
      fill: SUN,
      stroke: RED,
      strokeW: 10,
      scale: lk > 0 ? lerp(2.8, 1, easeOutCubic(prog(lt, 0.06, 0.2))) : 0,
      rot: -0.03,
    });
    // victory
    if (lt >= VICTORY) {
      confetti(ctx, lt - VICTORY, 77);
      const c = prog(lt, VICTORY + 0.25, VICTORY + 0.42);
      text(ctx, "CAMPEÃO!", PROMO.W / 2, 520, {
        size: 150,
        fill: SUN,
        stroke: INK,
        strokeW: 18,
        shadow: 10,
        scale: c > 0 ? lerp(2.6, 1, easeOutCubic(c)) : 0,
        rot: -0.05 + Math.sin(lt * 8) * 0.02,
      });
    }
  }

  function scene7(ctx: Ctx, lt: number) {
    rays(ctx, PROMO.W / 2, 860, SUN, "#ffe27a", -lt * 0.4);
    confetti(ctx, lt + 0.9, 91);
    const hop = Math.abs(Math.sin(lt * 7));
    const enter = easeOutBack(prog(lt, 0.05, 0.4));
    drawPingo(ctx, HERO, HERO_GEAR, PROMO.W / 2, 930 - hop * 70, 12 * enter, { sx: 1 + (1 - hop) * 0.06, sy: 1 - (1 - hop) * 0.06, blink: lt > 1.2 && lt < 1.28 });
    const t1 = easeOutBack(prog(lt, 0.05, 0.3), 2.2);
    text(ctx, "PINGO", PROMO.W / 2, 180, { size: 180, fill: WHITE, stroke: INK, strokeW: 20, shadow: 12, scale: t1 });
    text(ctx, "BATTLE ROYALE", PROMO.W / 2, 330, { size: 112, fill: PINK, stroke: INK, strokeW: 16, shadow: 10, scale: easeOutBack(prog(lt, 0.12, 0.38), 2.2), rot: -0.03 });
    const lines = ["Faça a tarefa.", "Equipe o Pingo.", "Vença a arena."];
    lines.forEach((l, i) => {
      const k = easeOutBack(prog(lt, 0.35 + i * 0.12, 0.6 + i * 0.12));
      text(ctx, l, PROMO.W / 2, 1040 + i * 82, { size: 66, fill: i === 2 ? PINK : INK, stroke: i === 2 ? INK : undefined, strokeW: i === 2 ? 10 : 0, scale: k });
    });
  }

  const DRAW = [scene1, scene2, scene3, scene4, scene5, scene6, scene7];

  function wipe(ctx: Ctx, t: number) {
    for (let s = 1; s < START.length; s++) {
      const edge = START[s];
      const p = prog(t, edge - WIPE, edge + WIPE);
      if (p <= 0 || p >= 1) continue;
      const tile = 90;
      const cols = Math.ceil(PROMO.W / tile);
      const rows = Math.ceil(PROMO.H / tile);
      ctx.fillStyle = s % 2 ? INK : "#3a2a4a";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = (c + r) / (cols + rows);
          // first half: blocks grow in diagonally; second half: shrink away
          const grow = p < 0.5 ? clamp01(p * 2 * 1.6 - d * 0.6) : clamp01(1 - ((p - 0.5) * 2 * 1.6 - d * 0.6));
          const size = tile * easeOutCubic(grow);
          if (size <= 0) continue;
          ctx.fillRect(c * tile + (tile - size) / 2, r * tile + (tile - size) / 2, size + 1, size + 1);
        }
      }
    }
  }

  function render(ctx: Ctx, t: number) {
    const time = Math.min(Math.max(t, 0), PROMO.DURATION - 1e-6);
    let scene = START.length - 1;
    for (let i = 0; i < START.length; i++) if (time >= START[i]) scene = i;
    let sx = 0;
    let sy = 0;
    IMPACTS.forEach(([ti, amp], i) => {
      const d = time - ti;
      if (d < 0 || d > 0.45) return;
      const k = amp * Math.exp(-d * 9);
      sx += Math.sin(d * 70 + i) * k;
      sy += Math.cos(d * 55 + i * 2) * k;
    });
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(sx, sy);
    ctx.fillStyle = INK;
    ctx.fillRect(-40, -40, PROMO.W + 80, PROMO.H + 80);
    DRAW[scene](ctx, time - START[scene]);
    ctx.restore();
    wipe(ctx, time);
    for (const f of FLASHES) {
      const k = 1 - prog(time, f, f + 0.12);
      if (time >= f && k > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.55 * k})`;
        ctx.fillRect(0, 0, PROMO.W, PROMO.H);
      }
    }
  }

  return { render };
}
