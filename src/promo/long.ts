/**
 * ~79 s promo with sound (1080×1350). Every scene declares, in ONE place:
 * its length in music bars, its drawing, its sound cues and its music style —
 * so image, sound effects and soundtrack stay in sync. Cuts land on the beat (128 BPM).
 */
import { ALL_ITEMS, getItem } from "@/content/items";
import { STAT_KEYS } from "@/engine/types";
import { formatModifier } from "@/lib/format";
import type { PingoLook } from "@/sprites/compose";
import type { GearSprites } from "@/sprites/items";
import { BODY_COLORS, type BodyColor } from "@/sprites/palette";
import type { BarStyle, SfxName } from "./audio";
import {
  C, CURSOR, H, LOCK, PAPER, TOMB, W, clamp01, createKit, easeInCubic, easeInOut, easeOutBack, easeOutCubic,
  easeOutElastic, lerp, prog, slam, type Ctx, type Kit, type MakeSurface,
} from "./kit";

export const BPM = 128;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const FPS = 30;

export type Cue = [t: number, name: SfxName, vol?: number, pitch?: number];

interface SceneDef {
  name: string;
  bars: number;
  transition: "blocks" | "flash" | "none";
  sfx: Cue[];
  impacts?: Array<[number, number]>;
  flashes?: number[];
  music: BarStyle[];
  draw: (k: Kit, ctx: Ctx, lt: number) => void;
}

// ------------------------------------------------------------------ cast
const HERO: PingoLook = { bodyColor: "rosa", eyes: "grande", mouth: "sorriso", detail: "bochechas" };
const HERO_GEAR: GearSprites = { weapon: "wifi_hammer", helmet: "viking_helmet", outfit: "hacker_hoodie" };
const ANA: PingoLook = { bodyColor: "menta", eyes: "brilho", mouth: "gato", detail: "bochechas" };
const ANA_GEAR: GearSprites = { helmet: "paper_crown" };

const hopOnBeat = (lt: number, height: number) => Math.abs(Math.sin((lt / BEAT) * Math.PI)) * height;

const FULL: BarStyle = { kick: true, snare: true, hat: true, bass: true, arp: true };
const bars = (n: number, style: BarStyle): BarStyle[] => Array.from({ length: n }, () => ({ ...style }));

// ================================================================== 1. HOOK
const S1_HOOK: SceneDef = {
  name: "hook",
  bars: 3,
  transition: "none",
  music: [{ hat: true, vol: 0.6 }, { hat: true, bass: true, vol: 0.8 }, { ...FULL, hit: true }],
  sfx: [
    ...[..."SEXTA · 22:00"].map((_, i): Cue => [0.1 + i * 0.05, "type", 0.8]),
    [0.75, "pop", 0.5, 0.9],
    [1.25, "pop", 0.5, 1],
    [2.6, "scratch", 0.9],
    [2.7, "pop", 0.6, 1.1],
    [3.75, "slam", 1],
    [3.8, "sparkle", 0.8],
    [4.25, "pop", 0.7, 1.3],
  ],
  impacts: [[3.75, 20]],
  flashes: [2.6],
  draw(k, ctx, lt) {
    if (lt < 2.6) {
      ctx.fillStyle = C.NIGHT;
      ctx.fillRect(0, 0, W, H);
      k.stars(ctx, lt, 5);
      // clock
      const clock = "SEXTA · 22:00";
      const shown = clock.slice(0, Math.floor(prog(lt, 0.1, 0.1 + clock.length * 0.05) * clock.length));
      k.panel(ctx, 250, 110, 580, 130, C.INK, 20, 0);
      k.text(ctx, shown + (Math.floor(lt * 3) % 2 ? "_" : ""), 540, 178, { size: 72, fill: C.RED });
      k.words(ctx, "Seu aluno ainda", 400, lt, 0.7, { size: 84, fill: C.WHITE });
      k.words(ctx, "não fez a tarefa.", 510, lt, 1.2, { size: 84, fill: C.WHITE });
      // sad Pingo + homework pile
      k.drawPingo(ctx, { bodyColor: "azul", eyes: "sono", mouth: "reta", detail: "nenhum" }, {}, 440, 1150, 12, {
        sy: 1 - 0.02 * Math.sin(lt * 2),
      });
      for (let i = 0; i < 4; i++) k.drawGrid(ctx, "paper", PAPER, 700 + (i % 2) * 14, 1080 - i * 60, 12, 1);
      for (let i = 0; i < 3; i++) {
        const z = (lt * 0.6 + i / 3) % 1;
        k.text(ctx, "z", 560 + z * 90 + i * 10, 700 - z * 160, { size: 40 + i * 12, fill: C.GRAY, alpha: 1 - z });
      }
      return;
    }
    const b = lt - 2.6;
    k.stripes(ctx, C.SUN, "#ffdf6e", 70, b * 160);
    k.words(ctx, "E se ele", 330, b, 0.1, { size: 110, fill: C.WHITE, stroke: C.INK, strokeW: 16, shadow: 8 });
    k.text(ctx, "QUISESSE", W / 2, 540, { size: 190, fill: C.PINK, stroke: C.INK, strokeW: 20, shadow: 12, scale: slam(lt, 3.75), rot: -0.04 });
    k.text(ctx, "fazer?", W / 2, 720, { size: 130, fill: C.WHITE, stroke: C.INK, strokeW: 16, shadow: 8, scale: easeOutBack(prog(lt, 4.25, 4.45)) });
    k.sparkles(ctx, 540, 540, lt - 3.8, 11, 420);
    const excited = lt >= 3.75;
    const rise = easeOutBack(prog(b, 0, 0.35));
    k.drawPingo(
      ctx,
      { bodyColor: "azul", eyes: excited ? "brilho" : "redondo", mouth: excited ? "aberta" : "sorriso", detail: "bochechas" },
      {},
      W / 2,
      1350 + 120 - rise * 170 - (excited ? hopOnBeat(lt - 3.75, 80) : 0),
      14,
      { shadow: false },
    );
  },
};

// ================================================================== 2. LOGO
const S2_LOGO: SceneDef = {
  name: "logo",
  bars: 3,
  transition: "blocks",
  music: bars(3, { ...FULL, lead: true }),
  sfx: [
    [0.0, "fall", 0.9],
    [0.4, "thud", 1],
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i): Cue => [0.42 + i * 0.06, "coin", 0.5, 1 + i * 0.04]),
    ...[0, 1, 2, 3, 4].map((i): Cue => [0.5 + i * 0.06, "pop", 0.4, 1 + i * 0.15]),
    [0.94, "slam", 1],
    [1.9, "sparkle", 0.6],
    [3.75, "sparkle", 0.7],
  ],
  impacts: [[0.4, 14], [0.94, 20]],
  draw(k, ctx, lt) {
    k.rays(ctx, W / 2, 820, C.GRAPE, "#8a6cff", lt * 0.35);
    k.burst(ctx, 540, 700, lt - 0.4, 14, [C.SUN, "#fff1a8", C.SUN], 21, 380);
    for (let i = 0; i < 10; i++) {
      const f = prog(lt, 0.4, 1.3);
      if (f <= 0 || f >= 1) continue;
      const a = -Math.PI / 2 + (i - 4.5) * 0.28;
      k.drawCoin(ctx, 540 + Math.cos(a) * 520 * easeOutCubic(f), 700 + Math.sin(a) * 520 * easeOutCubic(f) + f * f * 500, 64);
    }
    const fall = easeInCubic(prog(lt, 0.02, 0.4));
    const land = prog(lt, 0.4, 0.85);
    const sq = land > 0 ? easeOutElastic(land) : 0;
    const beatHop = lt > 1.9 ? hopOnBeat(lt - 1.9, 40) : 0;
    k.drawPingo(ctx, HERO, {}, W / 2, lerp(-200, 1060, fall) - beatHop, 13, {
      sx: land > 0 ? lerp(1.35, 1, sq) : 0.85,
      sy: land > 0 ? lerp(0.7, 1, sq) : 1.2,
      blink: lt > 3.0 && lt < 3.1,
    });
    const letters = [..."PINGO"];
    const lw = letters.map((l) => k.measure(ctx, l, 190));
    let x = W / 2 - lw.reduce((s, w) => s + w, 0) / 2;
    letters.forEach((l, i) => {
      const e = easeOutBack(prog(lt, 0.5 + i * 0.06, 0.74 + i * 0.06), 2.4);
      k.text(ctx, l, x + lw[i] / 2, lerp(-150, 210, e) + Math.sin(lt * 6 + i) * 4, { size: 190, fill: C.SUN, stroke: C.INK, strokeW: 20, shadow: 12 });
      x += lw[i];
    });
    k.text(ctx, "BATTLE ROYALE", W / 2, 370, { size: 116, fill: C.PINK, stroke: C.INK, strokeW: 16, shadow: 10, scale: slam(lt, 0.94, 0.15, 2.4), rot: -0.03 });
    const tg = easeOutCubic(prog(lt, 1.9, 2.2));
    k.text(ctx, "O jogo onde a tarefa", W / 2, 1160 + (1 - tg) * 40, { size: 60, fill: C.WHITE, stroke: C.INK, strokeW: 10, alpha: tg });
    k.text(ctx, "vira poder na arena.", W / 2, 1240 + (1 - tg) * 40, { size: 60, fill: C.SUN, stroke: C.INK, strokeW: 10, alpha: tg });
  },
};

// ================================================================== 3. EVERY STUDENT HAS A PINGO
const GALLERY: PingoLook[] = [
  { bodyColor: "azul", eyes: "redondo", mouth: "sorriso", detail: "bochechas" },
  { bodyColor: "amarelo", eyes: "feliz", mouth: "aberta", detail: "sardas" },
  { bodyColor: "roxo", eyes: "grande", mouth: "gato", detail: "estrela" },
  { bodyColor: "verde", eyes: "bravo", mouth: "dentes", detail: "broto" },
  { bodyColor: "rosa", eyes: "brilho", mouth: "lingua", detail: "bochechas" },
  { bodyColor: "laranja", eyes: "sono", mouth: "reta", detail: "curativo" },
  { bodyColor: "ciano", eyes: "ponto", mouth: "sorriso", detail: "nenhum" },
  { bodyColor: "vermelho", eyes: "redondo", mouth: "dentes", detail: "sardas" },
  { bodyColor: "cinza", eyes: "grande", mouth: "aberta", detail: "estrela" },
];
const S3_PINGOS: SceneDef = {
  name: "pingos",
  bars: 3,
  transition: "blocks",
  music: bars(3, { kick: true, hat: true, bass: true, arp: true }),
  sfx: [
    [0.05, "slam", 0.6],
    ...GALLERY.map((_, i): Cue => [0.47 + i * 0.234, "pop", 0.55, 0.8 + i * 0.08]),
    [3.75, "sparkle", 0.8],
    ...[0, 1, 2, 3, 4, 5, 6].map((i): Cue => [3.75 + i * 0.234, "type", 0.5, 0.8 + i * 0.05]),
  ],
  draw(k, ctx, lt) {
    k.checker(ctx, C.CREAM, "#fbe7b0", 90, lt * 50, lt * 50);
    k.text(ctx, "CADA ALUNO", W / 2, 130, { size: 100, fill: C.WHITE, stroke: C.INK, strokeW: 14, shadow: 8, scale: slam(lt, 0.05, 0.15, 2) });
    k.text(ctx, "TEM SEU PINGO", W / 2, 240, { size: 110, fill: C.PINK, stroke: C.INK, strokeW: 16, shadow: 10, scale: slam(lt, 0.25, 0.15, 2), rot: -0.02 });
    const colors = Object.keys(BODY_COLORS) as BodyColor[];
    GALLERY.forEach((look, i) => {
      const x = [250, 540, 830][i % 3];
      const y = [600, 880, 1160][Math.floor(i / 3)];
      const at = 0.47 + i * 0.234;
      const p = easeOutBack(prog(lt, at, at + 0.25), 2.5);
      const hop = lt > 2.8 ? hopOnBeat(lt - 2.8 + (i % 2) * BEAT, 40) : 0;
      const cycle = i === 4 && lt > 3.75 ? { ...look, bodyColor: colors[Math.floor((lt - 3.75) / (BEAT / 2)) % colors.length] } : look;
      k.drawPingo(ctx, cycle, {}, x, y - hop, 5.4 * p, { blink: Math.floor(lt * 2 + i) % 7 === 0 });
    });
    const c = easeOutBack(prog(lt, 3.75, 4.0));
    if (c > 0) {
      ctx.save();
      ctx.translate(W / 2, 1275);
      ctx.scale(c, c);
      k.chip(ctx, 0, 0, "Visual grátis: cor, olhos, boca...", C.WHITE, C.INK, 44);
      ctx.restore();
    }
  },
};

// ================================================================== 4. ACTIVITIES → COINS
const STUDENTS = [
  { name: "Ana", bal: 250, check: 0.94 },
  { name: "Bruno", bal: 140, check: 1.17 },
  { name: "Carla", bal: 90, check: null },
  { name: "Davi", bal: 310, check: 1.41 },
  { name: "Você", bal: 380, check: 1.64 },
];
const ROW_Y = (i: number) => 440 + i * 100;
const DIST_CLICK = 2.81;
const arrival = (order: number) => DIST_CLICK + 0.4 + order * 0.12;
const S4_COINS: SceneDef = {
  name: "coins",
  bars: 4,
  transition: "blocks",
  music: bars(4, FULL),
  sfx: [
    ...STUDENTS.filter((s) => s.check).map((s): Cue => [s.check!, "check", 0.8]),
    [DIST_CLICK, "button", 0.9],
    [DIST_CLICK + 0.05, "kaching", 0.7],
    ...[0, 1, 2, 3].map((o): Cue => [arrival(o), "coin", 0.6, 1 + o * 0.12]),
    [4.7, "pop", 0.5],
    [5.2, "pop", 0.5, 1.2],
  ],
  impacts: [[DIST_CLICK, 6]],
  draw(k, ctx, lt) {
    k.checker(ctx, C.CREAM, "#fbe7b0", 90, lt * 60, lt * 60);
    k.stepLabel(ctx, 1, "FAÇA AS ATIVIDADES", lt, C.GREEN);
    const e = easeOutBack(prog(lt, 0.1, 0.45));
    const py = lerp(1500, 250, e);
    k.panel(ctx, 90, py, 900, 820, C.WHITE);
    k.chip(ctx, 540, py, "PAINEL DO PROFESSOR", C.SUN, C.INK, 30);
    k.text(ctx, "Atividade 04 · Frações", 540, py + 95, { size: 54, fill: C.INK });
    const checked = STUDENTS.filter((s) => s.check);
    STUDENTS.forEach((s, i) => {
      const y = py + ROW_Y(i) - 250;
      if (s.name === "Você") {
        ctx.fillStyle = "#ffe0ee";
        k.roundRect(ctx, 130, y - 46, 820, 92, 14);
        ctx.fill();
      }
      ctx.fillStyle = "#f3ead2";
      k.roundRect(ctx, 150, y - 34, 68, 68, 12);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = C.INK;
      ctx.stroke();
      k.text(ctx, s.name, 250, y + 2, { size: 50, fill: C.INK, align: "left" });
      if (s.check !== null) {
        const c = easeOutBack(prog(lt, s.check, s.check + 0.15), 3);
        if (c > 0) {
          ctx.save();
          ctx.translate(184, y);
          ctx.scale(c, c);
          ctx.fillStyle = C.GREEN;
          k.roundRect(ctx, -34, -34, 68, 68, 12);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = C.WHITE;
          ctx.lineWidth = 11;
          ctx.lineCap = "square";
          ctx.beginPath();
          ctx.moveTo(-18, 2);
          ctx.lineTo(-5, 15);
          ctx.lineTo(18, -13);
          ctx.stroke();
          ctx.restore();
        }
      }
      const order = checked.indexOf(s);
      const got = order >= 0 && lt >= arrival(order);
      const bump = got ? 1 + 0.35 * (1 - prog(lt, arrival(order), arrival(order) + 0.25)) : 1;
      ctx.save();
      ctx.translate(840, y);
      ctx.scale(bump, bump);
      k.drawCoin(ctx, -60, 0, 44);
      k.text(ctx, String(s.bal + (got ? 100 : 0)), 20, 3, { size: 46, fill: got ? "#1f6b2a" : C.INK });
      ctx.restore();
    });
    const pressed = lt >= DIST_CLICK - 0.06 && lt < DIST_CLICK + 0.08;
    k.button(ctx, 250, py + 700, 580, 90, "DISTRIBUIR +100", C.SUN, pressed, 50);
    // flying coins
    checked.forEach((s, o) => {
      const f = prog(lt, DIST_CLICK + 0.05 + o * 0.12, arrival(o));
      if (f <= 0 || f >= 1) return;
      const ee = easeInOut(f);
      const y = py + ROW_Y(STUDENTS.indexOf(s)) - 250;
      k.drawCoin(ctx, lerp(540, 780, ee), lerp(py + 745, y, ee) - Math.sin(ee * Math.PI) * 160, 60);
    });
    // cursor
    const stops: Array<[number, number, number]> = [
      [0.5, 1000, 1400],
      [0.84, 184, py + ROW_Y(0) - 250],
      [1.07, 184, py + ROW_Y(1) - 250],
      [1.31, 184, py + ROW_Y(3) - 250],
      [1.54, 184, py + ROW_Y(4) - 250],
      [2.6, 560, py + 740],
      [3.4, 560, py + 740],
      [4.0, 950, 1400],
    ];
    let cx = stops[0][1];
    let cy = stops[0][2];
    for (let i = 1; i < stops.length; i++) {
      if (lt >= stops[i - 1][0]) {
        const f = easeInOut(prog(lt, stops[i - 1][0], stops[i][0]));
        cx = lerp(stops[i - 1][1], stops[i][1], f);
        cy = lerp(stops[i - 1][2], stops[i][2], f);
      }
    }
    if (lt > 0.5 && lt < 4) k.drawGrid(ctx, "cursor", CURSOR, cx, cy, pressed ? 6 : 7);
    const c1 = easeOutBack(prog(lt, 4.7, 4.95));
    const c2 = easeOutBack(prog(lt, 5.2, 5.45));
    k.text(ctx, "Cada moeda fica registrada.", W / 2, 1150, { size: 58, fill: C.INK, scale: c1 });
    k.text(ctx, "Aluno não gera moeda sozinho.", W / 2, 1235, { size: 50, fill: C.PINK, stroke: C.INK, strokeW: 8, scale: c2 });
  },
};

// ================================================================== 5. SHOP
const SHOP_ITEMS = ["wifi_hammer", "viking_helmet", "ceo_suit"];
const SHOP_NAMES = [["Martelo", "do Wi-Fi"], ["Capacete", "Viking"], ["Terno", "do CEO"]];
const CARDS_AT = 2.8;
const BUY = [3.75, 4.69];
const S5_SHOP: SceneDef = {
  name: "shop",
  bars: 4,
  transition: "blocks",
  music: bars(4, { ...FULL, lead: true }),
  sfx: [
    [0.05, "whoosh", 0.7],
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i): Cue => [0.3 + (1.3 * i) / 9, "tick", 0.6, 0.8 + i * 0.05]),
    [1.6, "slam", 0.6],
    [1.9, "pop", 0.6],
    [CARDS_AT - 0.1, "whoosh", 0.7],
    [BUY[0], "button", 0.8],
    [BUY[0] + 0.03, "kaching", 0.8],
    [BUY[0] + 0.06, "stamp", 0.8],
    [BUY[1], "button", 0.8],
    [BUY[1] + 0.03, "kaching", 0.8],
    [BUY[1] + 0.06, "stamp", 0.8],
    [5.3, "barDown", 0.5],
    [5.8, "pop", 0.5],
  ],
  impacts: [[1.6, 10], [BUY[0] + 0.06, 8], [BUY[1] + 0.06, 8]],
  draw(k, ctx, lt) {
    k.checker(ctx, C.MINT, "#4fd2c6", 90, -lt * 60, lt * 60);
    if (lt < CARDS_AT) {
      const exit = easeInCubic(prog(lt, CARDS_AT - 0.25, CARDS_AT)) * -1400;
      ctx.save();
      ctx.translate(0, exit);
      const off = lt * 180;
      for (let r = -1; r < 11; r++) {
        for (let c = -1; c < 8; c++) {
          const idx = (((c + r * 7) % ALL_ITEMS.length) + ALL_ITEMS.length) % ALL_ITEMS.length;
          const x = c * 160 + (off % 160) + (r % 2) * 80;
          const y = r * 150 - (off % 150) + 40;
          const appear = easeOutBack(prog(lt, 0.02 + ((c + r) % 6) * 0.04, 0.3 + ((c + r) % 6) * 0.04));
          ctx.globalAlpha = 0.9;
          k.drawItem(ctx, ALL_ITEMS[idx].id, x, y, 104 * appear, Math.sin(lt * 3 + c + r) * 0.1);
        }
      }
      ctx.globalAlpha = 1;
      const n = Math.floor(90 * easeOutCubic(prog(lt, 0.3, 1.6)));
      const pk = easeOutBack(prog(lt, 0.2, 0.45));
      ctx.save();
      ctx.translate(W / 2, 640);
      ctx.scale(pk, pk);
      k.panel(ctx, -320, -190, 640, 380, C.WHITE, 30);
      k.text(ctx, String(n), 0, -40, { size: 230, fill: C.SUN, stroke: C.INK, strokeW: 20, shadow: 10, scale: lt > 1.6 ? 1 + 0.2 * (1 - prog(lt, 1.6, 1.85)) : 1 });
      k.text(ctx, "ITENS", 0, 120, { size: 90, fill: C.INK });
      ctx.restore();
      const ck = easeOutBack(prog(lt, 1.9, 2.1));
      if (ck > 0) {
        ctx.save();
        ctx.translate(W / 2, 950);
        ctx.scale(ck, ck);
        k.chip(ctx, 0, 0, "30 armas · 30 capacetes · 30 roupas", C.SUN, C.INK, 40);
        ctx.restore();
      }
      ctx.restore();
      k.stepLabel(ctx, 2, "COMPRE ITENS", lt, C.SUN);
      return;
    }
    const t = lt - CARDS_AT;
    k.stepLabel(ctx, 2, "COMPRE ITENS", 1, C.SUN);
    const balance = lt < BUY[0] ? 480 : lt < BUY[1] ? 240 : 0;
    const bk = easeOutBack(prog(t, 0.1, 0.35));
    k.panel(ctx, lerp(1200, 770, bk), 230, 250, 90, C.WHITE, 45, 8);
    k.drawCoin(ctx, lerp(1200, 770, bk) + 55, 275, 54);
    k.text(ctx, String(balance), lerp(1200, 770, bk) + 160, 278, { size: 56, fill: C.INK });
    SHOP_ITEMS.forEach((id, i) => {
      const item = getItem(id)!;
      const e = easeOutBack(prog(t, 0.05 + i * 0.08, 0.4 + i * 0.08));
      const x = 55 + i * 330;
      const y = lerp(1500, 380, e);
      const bought = i < 2 && lt >= BUY[i];
      const broke = i === 2 && lt >= BUY[1] + 0.1;
      k.panel(ctx, x, y, 300, 600, C.WHITE, 22, 10);
      ctx.fillStyle = ["#cbe0fb", "#cbe0fb", "#e6d4fb"][i];
      k.roundRect(ctx, x + 18, y + 18, 264, 230, 14);
      ctx.fill();
      k.drawItem(ctx, id, x + 150, y + 133, 170, Math.sin(lt * 4 + i) * 0.06);
      k.text(ctx, SHOP_NAMES[i][0], x + 150, y + 290, { size: 44, fill: C.INK });
      k.text(ctx, SHOP_NAMES[i][1], x + 150, y + 338, { size: 44, fill: C.INK });
      k.drawCoin(ctx, x + 100, y + 395, 40);
      k.text(ctx, String(item.price), x + 170, y + 398, { size: 44, fill: C.INK });
      STAT_KEYS.filter((s) => item.statModifiers[s])
        .slice(0, 2)
        .forEach((m, j) => {
          const v = item.statModifiers[m]!;
          const cx = x + 80 + j * 140;
          ctx.fillStyle = v > 0 ? "#dff5dc" : "#fde0e0";
          k.roundRect(ctx, cx - 64, y + 430, 128, 44, 22);
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = C.INK;
          ctx.stroke();
          k.text(ctx, formatModifier(m, v), cx, y + 454, { size: 28, fill: v > 0 ? "#1f6b2a" : "#9e2a3a" });
        });
      const pressed = i < 2 && lt >= BUY[i] - 0.08 && lt < BUY[i];
      k.button(ctx, x + 30, y + 518, 240, 60, bought ? "É SEU!" : broke ? "SEM SALDO" : "COMPRAR", bought ? C.GREEN : broke ? C.GRAY : C.SUN, pressed, 36, bought ? C.WHITE : C.INK);
      if (bought) {
        k.text(ctx, "COMPRADO!", x + 150, y + 150, { size: 62, fill: C.RED, stroke: C.WHITE, strokeW: 10, scale: slam(lt, BUY[i], 0.18, 2.2), rot: -0.22 });
        k.sparkles(ctx, x + 150, y + 540, lt - BUY[i], 40 + i, 170);
      }
    });
    const path: Array<[number, number, number]> = [
      [CARDS_AT + 0.3, 980, 1340],
      [BUY[0] - 0.15, 210, 945],
      [BUY[0] + 0.2, 210, 945],
      [BUY[1] - 0.15, 540, 945],
      [BUY[1] + 0.3, 540, 945],
      [BUY[1] + 0.8, 900, 1250],
    ];
    let cx = path[0][1];
    let cy = path[0][2];
    for (let i = 1; i < path.length; i++) {
      if (lt >= path[i - 1][0]) {
        const f = easeInOut(prog(lt, path[i - 1][0], path[i][0]));
        cx = lerp(path[i - 1][1], path[i][1], f);
        cy = lerp(path[i - 1][2], path[i][2], f);
      }
    }
    if (lt > CARDS_AT + 0.3 && lt < 5.6) k.drawGrid(ctx, "cursor", CURSOR, cx, cy, BUY.some((b) => lt >= b - 0.08 && lt < b + 0.04) ? 6 : 7);
    const c1 = easeOutBack(prog(lt, 5.8, 6.05));
    k.text(ctx, "Sem loot box.", W / 2, 1110, { size: 64, fill: C.WHITE, stroke: C.INK, strokeW: 12, scale: c1 });
    k.text(ctx, "Você vê exatamente o que compra.", W / 2, 1195, { size: 50, fill: C.INK, scale: c1 });
  },
};

// ================================================================== 6. TRADE-OFFS
const TRADE = [
  { id: "wifi_hammer", name: "Martelo do Wi-Fi", bars: [["ATK", 0.5, 0.82], ["VEL", 0.5, 0.35], ["CRIT", 0.5, 0.5]] as const, at: 0.94 },
  { id: "plastic_dagger", name: "Adaga de Plástico", bars: [["ATK", 0.5, 0.42], ["VEL", 0.5, 0.66], ["CRIT", 0.5, 0.62]] as const, at: 1.875 },
];
const S6_TRADEOFF: SceneDef = {
  name: "tradeoff",
  bars: 3,
  transition: "blocks",
  music: bars(3, { kick: true, snare: true, hat: true, bass: true }),
  sfx: [
    [0.05, "slam", 0.9],
    [0.4, "pop", 0.5],
    [0.94, "barUp", 0.7],
    [1.1, "barDown", 0.7],
    [1.4, "slam", 0.6],
    [1.875, "barDown", 0.7],
    [2.05, "barUp", 0.7],
    [3.75, "pop", 0.6],
    [4.2, "slam", 0.7],
  ],
  impacts: [[0.05, 12], [1.4, 10], [4.2, 12]],
  draw(k, ctx, lt) {
    k.stripes(ctx, C.GRAPE, "#8a6cff", 80, lt * 120);
    k.text(ctx, "SEM PAY-TO-WIN", W / 2, 150, { size: 118, fill: C.SUN, stroke: C.INK, strokeW: 16, shadow: 10, scale: slam(lt, 0.05), rot: -0.02 });
    k.text(ctx, "cada item tem prós e contras", W / 2, 265, { size: 54, fill: C.WHITE, scale: easeOutBack(prog(lt, 0.4, 0.6)) });
    TRADE.forEach((it, i) => {
      const x = 50 + i * 520;
      const e = easeOutBack(prog(lt, 0.3 + i * 0.1, 0.6 + i * 0.1));
      const y = lerp(1500, 360, e);
      k.panel(ctx, x, y, 460, 600, C.WHITE);
      ctx.fillStyle = "#cbe0fb";
      k.roundRect(ctx, x + 20, y + 20, 420, 200, 14);
      ctx.fill();
      k.drawItem(ctx, it.id, x + 230, y + 120, 150, Math.sin(lt * 3 + i) * 0.08);
      k.text(ctx, it.name, x + 230, y + 265, { size: 42, fill: C.INK });
      it.bars.forEach(([label, from, to], j) => {
        const f = easeOutCubic(prog(lt, it.at + j * 0.08, it.at + 0.45 + j * 0.08));
        const v = lerp(from, to, f);
        const by = y + 340 + j * 85;
        k.text(ctx, label, x + 40, by + 12, { size: 38, fill: C.INK, align: "left" });
        const color = to > from ? C.GREEN : to < from ? C.RED : C.GRAY;
        k.bar(ctx, x + 150, by, 270, 26, v, color);
        if (f > 0.2 && to !== from) {
          // pixel arrow
          ctx.globalAlpha = f;
          ctx.fillStyle = color;
          const dir = to > from ? -1 : 1;
          for (let r = 0; r < 4; r++) ctx.fillRect(x + 430 - r * 5, by + 13 + dir * (r * 5 - 8), 6 + r * 10, 5);
          ctx.globalAlpha = 1;
        }
      });
    });
    const vs = slam(lt, 1.4, 0.15, 3);
    if (vs > 0) {
      ctx.save();
      ctx.translate(W / 2, 660);
      ctx.scale(vs, vs);
      ctx.fillStyle = C.PINK;
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = C.INK;
      ctx.stroke();
      k.text(ctx, "VS", 0, 4, { size: 70, fill: C.WHITE, stroke: C.INK, strokeW: 10 });
      ctx.restore();
    }
    k.text(ctx, "Mais moedas = mais opções.", W / 2, 1110, { size: 62, fill: C.WHITE, stroke: C.INK, strokeW: 12, scale: easeOutBack(prog(lt, 3.75, 4.0)) });
    k.text(ctx, "Não poder infinito.", W / 2, 1215, { size: 84, fill: C.SUN, stroke: C.INK, strokeW: 14, shadow: 8, scale: slam(lt, 4.2, 0.15, 2.2), rot: -0.03 });
  },
};

// ================================================================== 7. BUILD
const BUILDS: Array<{ label: string; gear: GearSprites; at: number; color: string }> = [
  { label: "TANK?", gear: { helmet: "knight_bucket", weapon: "door_shield", outfit: "turtle_shell" }, at: 0.2, color: C.SKY },
  { label: "VELOCIDADE?", gear: { helmet: "propeller_cap", weapon: "bbq_skewer", outfit: "racing_suit" }, at: 0.94, color: C.MINT },
  { label: "CRÍTICO?", gear: { helmet: "wizard_hat", weapon: "prompt_wand", outfit: "wizard_robe" }, at: 1.875, color: C.GRAPE },
  { label: "CAOS?", gear: { helmet: "tinfoil_hat", weapon: "rubber_chicken", outfit: "banana_suit" }, at: 2.81, color: C.ORANGE },
  { label: "A SUA BUILD!", gear: HERO_GEAR, at: 3.75, color: C.PINK },
];
const S7_BUILD: SceneDef = {
  name: "build",
  bars: 3,
  transition: "blocks",
  music: bars(3, { ...FULL, lead: true }),
  sfx: [...BUILDS.map((b, i): Cue => [b.at, i === 4 ? "slam" : "equip", 0.8, 1 + i * 0.1]), [3.8, "sparkle", 0.9], [4.5, "pop", 0.5]],
  impacts: [[3.75, 16]],
  draw(k, ctx, lt) {
    k.stripes(ctx, C.SKY, "#6db5f4", 80, lt * 160);
    k.stepLabel(ctx, 3, "MONTE SUA BUILD", lt, C.PINK);
    let current = -1;
    BUILDS.forEach((b, i) => {
      if (lt >= b.at) current = i;
    });
    const b = current >= 0 ? BUILDS[current] : null;
    const since = b ? lt - b.at : 0;
    const pop = b ? 1 + 0.15 * (1 - prog(since, 0, 0.2)) : 1;
    const hop = b ? Math.sin(prog(since, 0, 0.3) * Math.PI) * 70 : 0;
    k.drawPingo(ctx, HERO, b?.gear ?? {}, W / 2, 1000 - hop - (current === 4 ? hopOnBeat(since, 50) : 0), 13 * pop, { blink: lt > 4.6 && lt < 4.7 });
    if (b) {
      k.sparkles(ctx, W / 2, 620, since, current * 9, 260);
      const s = easeOutBack(prog(since, 0, 0.18), 3);
      ctx.save();
      ctx.translate(W / 2, 330);
      ctx.scale(s, s);
      ctx.rotate(-0.04);
      k.chip(ctx, 0, 0, b.label, b.color, C.WHITE, current === 4 ? 84 : 76);
      ctx.restore();
      const ids = [b.gear.weapon, b.gear.helmet, b.gear.outfit].filter(Boolean) as string[];
      ids.forEach((id, j) => {
        const x = 330 + j * 210;
        k.panel(ctx, x - 80, 1080, 160, 160, C.WHITE, 18, 6);
        k.drawItem(ctx, id, x, 1160, 110 * easeOutBack(prog(since, 0.03 * j, 0.2 + 0.03 * j)));
      });
    }
    k.text(ctx, "A estratégia é sua.", W / 2, 1300, { size: 52, fill: C.WHITE, stroke: C.INK, strokeW: 10, scale: easeOutBack(prog(lt, 4.5, 4.75)) });
  },
};

// ================================================================== 8. SATURDAY: LOCK & START
const LOCK_AT = 0.94;
const START_AT = 1.875;
const COUNT = [2.34, 2.81, 3.28];
const S8_START: SceneDef = {
  name: "start",
  bars: 2,
  transition: "blocks",
  music: [{ bass16: true, hat16: true, riser: true }, { bass16: true, riser: true, vol: 1.1 }],
  sfx: [
    ...[..."SÁBADO."].map((_, i): Cue => [0.05 + i * 0.06, "type", 0.8]),
    [LOCK_AT, "lock", 1],
    [START_AT, "button", 1],
    [START_AT + 0.02, "boom", 0.9],
    [COUNT[0], "beep", 0.9],
    [COUNT[1], "beep", 0.9],
    [COUNT[2], "beep", 0.9],
  ],
  impacts: [[START_AT, 14], [COUNT[0], 5], [COUNT[1], 7], [COUNT[2], 9]],
  flashes: [START_AT],
  draw(k, ctx, lt) {
    ctx.fillStyle = C.NIGHT;
    ctx.fillRect(0, 0, W, H);
    k.stars(ctx, lt, 9);
    const word = "SÁBADO.";
    k.text(ctx, word.slice(0, Math.ceil(prog(lt, 0.05, 0.05 + word.length * 0.06) * word.length)), W / 2, 190, {
      size: 150,
      fill: C.SUN,
      stroke: C.INK,
      strokeW: 16,
      shadow: 10,
    });
    const e = easeOutBack(prog(lt, 0.2, 0.5));
    const py = lerp(1500, 390, e);
    k.panel(ctx, 110, py, 860, 640, C.WHITE);
    k.chip(ctx, 540, py, "PINGO ROYALE #7", C.PINK, C.WHITE, 34);
    k.text(ctx, "12 Pingos inscritos", 540, py + 95, { size: 46, fill: C.INK });
    const locked = lt >= LOCK_AT;
    k.button(ctx, 190, py + 170, 700, 110, locked ? "LOADOUTS TRAVADOS" : "LOCK LOADOUTS", locked ? C.GREEN : C.SUN, lt >= LOCK_AT - 0.06 && lt < LOCK_AT + 0.06, 50, locked ? C.WHITE : C.INK);
    const ls = locked ? 1 + 0.5 * (1 - prog(lt, LOCK_AT, LOCK_AT + 0.25)) : 1;
    ctx.save();
    ctx.translate(250, py + 225);
    ctx.scale(ls, ls);
    k.drawGrid(ctx, "lock", LOCK, -32, -36, 8);
    ctx.restore();
    const started = lt >= START_AT;
    k.button(ctx, 190, py + 360, 700, 150, "START BATTLE!", started ? C.RED : C.PINK, lt >= START_AT - 0.06 && lt < START_AT + 0.08, 72, C.WHITE);
    // cursor
    const cx = lt < LOCK_AT ? lerp(1000, 560, easeInOut(prog(lt, 0.4, LOCK_AT - 0.1))) : 560;
    const cy = lt < LOCK_AT ? lerp(1400, py + 235, easeInOut(prog(lt, 0.4, LOCK_AT - 0.1))) : lerp(py + 235, py + 440, easeInOut(prog(lt, LOCK_AT + 0.2, START_AT - 0.1)));
    if (lt > 0.4 && lt < START_AT + 0.3) k.drawGrid(ctx, "cursor", CURSOR, cx, cy, 7);
    // countdown
    if (lt >= COUNT[0] - 0.05) {
      ctx.fillStyle = "rgba(35,26,46,0.7)";
      ctx.fillRect(0, 0, W, H);
      COUNT.forEach((c, i) => {
        if (lt < c || lt > c + BEAT) return;
        const s = slam(lt, c, 0.12, 2.4);
        k.text(ctx, String(3 - i), W / 2, 700, { size: 420, fill: [C.SUN, C.PINK, C.RED][i], stroke: C.INK, strokeW: 26, shadow: 16, scale: s, alpha: 1 - prog(lt, c + 0.3, c + BEAT) });
      });
    }
  },
};

// ================================================================== 9. BATTLE
interface Fighter {
  look: PingoLook;
  gear: GearSprites;
  x: number;
  y: number;
  tag?: [string, string];
}
const ROSTER: Fighter[] = [
  { look: HERO, gear: HERO_GEAR, x: 440, y: 800, tag: ["VOCÊ", C.PINK] },
  { look: ANA, gear: ANA_GEAR, x: 900, y: 1150, tag: ["ANA", C.MINT] },
  { look: { bodyColor: "azul", eyes: "bravo", mouth: "reta", detail: "nenhum" }, gear: { weapon: "fair_mallet", helmet: "construction_helmet" }, x: 420, y: 500 },
  { look: { bodyColor: "verde", eyes: "brilho", mouth: "gato", detail: "broto" }, gear: { weapon: "d20", helmet: "wizard_hat", outfit: "wizard_robe" }, x: 660, y: 540 },
  { look: { bodyColor: "amarelo", eyes: "redondo", mouth: "aberta", detail: "sardas" }, gear: { weapon: "plastic_dagger", helmet: "propeller_cap" }, x: 170, y: 830 },
  { look: { bodyColor: "roxo", eyes: "grande", mouth: "dentes", detail: "estrela" }, gear: { weapon: "prompt_wand", helmet: "pirate_hat", outfit: "ninja_suit" }, x: 910, y: 810 },
  { look: { bodyColor: "laranja", eyes: "sono", mouth: "sorriso", detail: "curativo" }, gear: { weapon: "pot_lid", helmet: "pot_helmet", outfit: "cardboard_armor" }, x: 900, y: 510 },
  { look: { bodyColor: "ciano", eyes: "ponto", mouth: "lingua", detail: "bochechas" }, gear: { weapon: "selfie_stick", outfit: "banana_suit" }, x: 430, y: 1160 },
  { look: { bodyColor: "vermelho", eyes: "feliz", mouth: "sorriso", detail: "nenhum" }, gear: {}, x: 180, y: 520 },
  { look: { bodyColor: "cinza", eyes: "bravo", mouth: "reta", detail: "nenhum" }, gear: { weapon: "door_shield", helmet: "knight_bucket", outfit: "tin_armor" }, x: 680, y: 840 },
  { look: { bodyColor: "azul", eyes: "feliz", mouth: "gato", detail: "estrela" }, gear: { weapon: "ninja_chopsticks", helmet: "ninja_headband", outfit: "superhero_cape" }, x: 200, y: 1130 },
  { look: { bodyColor: "roxo", eyes: "redondo", mouth: "aberta", detail: "bochechas" }, gear: { weapon: "d20", helmet: "vr_headset", outfit: "disco_outfit" }, x: 670, y: 1120 },
];
type Kind = "hit" | "crit" | "dodge";
interface Attack {
  a: number;
  b: number;
  t: number;
  label: string;
  kind: Kind;
  hp: number;
  kill?: boolean;
}
const A = (a: number, b: number, t: number, kind: Kind, label: string, hp: number, kill = false): Attack => ({ a, b, t, kind, label, hp, kill });
const ATTACKS: Attack[] = [
  A(2, 8, 0.6, "hit", "-38", 0.62),
  A(5, 6, 0.8, "crit", "CRÍTICO! -146", 0, true),
  A(4, 10, 1.0, "hit", "-41", 0.59),
  A(9, 3, 1.15, "hit", "-30", 0.7),
  A(3, 9, 1.4, "dodge", "ESQUIVOU!", 1),
  A(0, 4, 1.55, "crit", "CRÍTICO! -97", 0, true),
  A(7, 11, 1.7, "hit", "-44", 0.56),
  A(8, 2, 2.2, "hit", "-35", 0.65),
  A(10, 7, 2.35, "hit", "-40", 0.6),
  A(1, 11, 2.5, "hit", "-33", 0.23),
  A(11, 1, 2.8, "dodge", "ESQUIVOU!", 1),
  A(2, 8, 3.0, "hit", "-52", 0, true),
  A(5, 9, 3.2, "hit", "-48", 0.3),
  A(1, 11, 3.45, "hit", "-31", 0, true),
  A(9, 5, 3.7, "crit", "CRÍTICO! -120", 0, true),
  A(0, 2, 3.95, "hit", "-60", 0.1),
  A(7, 10, 4.2, "hit", "-44", 0, true),
  A(3, 0, 4.4, "dodge", "ESQUIVOU!", 1),
  A(2, 0, 4.6, "hit", "-35", 0.72),
  A(0, 2, 4.85, "hit", "-40", 0, true),
  A(9, 3, 5.9, "hit", "-45", 0.25),
  A(7, 1, 6.1, "hit", "-38", 0.62),
  A(1, 7, 6.4, "crit", "CRÍTICO! -104", 0, true),
  A(3, 9, 6.7, "crit", "CRÍTICO! -88", 0, true),
  A(0, 3, 7.9, "crit", "CRÍTICO! -133", 0, true),
  // the final duel, in slow motion
  A(0, 1, 9.8, "dodge", "ESQUIVOU!", 1),
  A(1, 0, 10.5, "hit", "-33", 0.45),
  A(0, 1, 11.2, "crit", "CRÍTICO! -83", 0.08),
  A(0, 1, 11.6, "dodge", "ESQUIVOU!!", 1),
  A(1, 0, 12.4, "crit", "CRÍTICO! -97", 0, true),
];
const SLOW_FROM = 9.4;
const impactOf = (a: Attack) => a.t + (a.t >= SLOW_FROM ? 0.26 : 0.14);
const deathOf = (a: Attack) => impactOf(a) + (a.t >= SLOW_FROM ? 0.2 : 0.05);
const DUEL_MOVE: [number, number] = [8.5, 9.3];
const DUEL_POS: Record<number, [number, number]> = { 0: [370, 1030], 1: [710, 1030] };
const WINNER = 1;
const VICTORY = 13.0;
const BANNERS: Array<{ t: number; text: string; dur: number; color: string; size: number }> = [
  { t: 0, text: "LUTEM!", dur: 0.9, color: C.SUN, size: 200 },
  { t: 1.95, text: "10 PINGOS RESTANTES", dur: 0.9, color: C.WHITE, size: 88 },
  { t: 5.2, text: "5 PINGOS RESTANTES", dur: 0.9, color: C.SUN, size: 90 },
  { t: 7.1, text: "FINAL 3", dur: 0.9, color: C.PINK, size: 140 },
  { t: 8.4, text: "DUELO FINAL!", dur: 1.3, color: C.RED, size: 130 },
];
const S9_BATTLE: SceneDef = {
  name: "battle",
  bars: 8,
  transition: "flash",
  music: [
    ...bars(5, { four: true, snare: true, hat16: true, bass16: true, arp: true }),
    ...bars(2, { kick: true, hat: true, bass: true, vol: 0.8 }),
    { kick: true, bass: true, vol: 0.5 },
  ],
  sfx: [
    [0, "boom", 1],
    ...ATTACKS.flatMap((a, i): Cue[] => {
      const slow = a.t >= SLOW_FROM;
      const cues: Cue[] = [];
      if (slow) cues.push([a.t, "whoosh", 0.6]);
      const big = slow && a.kind === "crit";
      cues.push([impactOf(a), a.kind === "hit" ? "hit" : a.kind === "crit" ? (big ? "critBig" : "crit") : "dodge", a.kind === "hit" ? 0.8 : 1, 0.85 + (i % 5) * 0.08]);
      if (a.kill) cues.push([deathOf(a), "elim", 0.8, 1 - (i % 3) * 0.08]);
      return cues;
    }),
    ...BANNERS.slice(1).map((b): Cue => [b.t - 0.4, "stinger", 0.8]),
    [12.9, "wah", 1],
    [13.3, "slam", 1],
    [13.35, "sparkle", 1],
  ],
  impacts: [
    [0, 20],
    ...ATTACKS.filter((a) => a.kind !== "dodge").map((a): [number, number] => [impactOf(a), a.kind === "crit" ? (a.t >= SLOW_FROM ? 34 : 22) : 6]),
    [13.3, 24],
  ],
  flashes: ATTACKS.filter((a) => a.kind === "crit").map((a) => impactOf(a)),
  draw(k, ctx, lt) {
    ctx.fillStyle = "#3a2a4a";
    ctx.fillRect(0, 0, W, H);
    const ax = 40;
    const ay = 280;
    for (let y = 0; y < 1040; y += 52) {
      for (let x = 0; x < 1000; x += 50) {
        ctx.fillStyle = ((x / 50 + y / 52) % 2 === 0) ? "#8fd16a" : "#7fc45c";
        ctx.fillRect(ax + x, ay + y, 50, 52);
      }
    }
    ctx.strokeStyle = "#d8c38a";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(540, 850, 170, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#5e3a22";
    ctx.fillRect(ax - 18, ay - 18, 1036, 18);
    ctx.fillRect(ax - 18, ay + 1040, 1036, 18);
    ctx.fillRect(ax - 18, ay, 18, 1040);
    ctx.fillRect(ax + 1000, ay, 18, 1040);

    const hp = ROSTER.map(() => 1);
    const deadAt = ROSTER.map(() => Infinity);
    for (const a of ATTACKS) {
      if (lt >= impactOf(a) && a.kind !== "dodge") hp[a.b] = Math.min(hp[a.b], a.hp);
      if (a.kill) deadAt[a.b] = deathOf(a);
    }
    const home = (i: number): [number, number] => {
      const f = ROSTER[i];
      const d = DUEL_POS[i];
      if (!d) return [f.x, f.y];
      const m = easeInOut(prog(lt, DUEL_MOVE[0], DUEL_MOVE[1]));
      return [lerp(f.x, d[0], m), lerp(f.y, d[1], m)];
    };

    const drawn: Array<{ i: number; x: number; y: number; scale: number }> = [];
    const order = ROSTER.map((_, i) => i).sort((i, j) => home(i)[1] - home(j)[1]);
    if (lt >= VICTORY) order.push(...order.splice(order.indexOf(WINNER), 1));
    for (const i of order) {
      const f = ROSTER[i];
      let [x, y] = home(i);
      let scale = 3.9;
      let white = false;
      let flip = false;
      let rot = 0;
      let alpha = 1;
      const attack = ATTACKS.find((a) => a.a === i && lt >= a.t && lt < impactOf(a) + (a.t >= SLOW_FROM ? 0.55 : 0.3));
      if (attack) {
        const [tx, ty] = home(attack.b);
        const dir = Math.sign(tx - x) || 1;
        const go = easeOutCubic(prog(lt, attack.t, impactOf(attack)));
        const back = easeInOut(prog(lt, impactOf(attack) + 0.12, impactOf(attack) + (attack.t >= SLOW_FROM ? 0.55 : 0.3)));
        const [hx, hy] = [x, y];
        x = lerp(lerp(hx, tx - dir * 140, go), hx, back);
        y = lerp(lerp(hy, ty + 8, go), hy, back);
        flip = dir < 0;
      }
      const hit = ATTACKS.find((a) => a.b === i && lt >= impactOf(a) && lt < impactOf(a) + 0.28);
      if (hit) {
        const dir = Math.sign(x - home(hit.a)[0]) || 1;
        if (hit.kind === "dodge") x += dir * 90 * Math.sin(prog(lt, impactOf(hit), impactOf(hit) + 0.28) * Math.PI);
        else {
          white = lt < impactOf(hit) + 0.07;
          x += dir * 24 * Math.sin((lt - hit.t) * 70) * (1 - prog(lt, impactOf(hit), impactOf(hit) + 0.28));
        }
      }
      if (i === WINNER && lt >= VICTORY) {
        const v = easeInOut(prog(lt, VICTORY, VICTORY + 0.4));
        x = lerp(x, 540, v);
        y = lerp(y, 1050, v) - Math.abs(Math.sin(Math.max(0, lt - VICTORY - 0.4) * 8)) * 80;
        scale = lerp(3.9, 8.5, v);
      }
      if (lt >= deadAt[i]) {
        const slowDeath = i === 0;
        const d = prog(lt, deadAt[i], deadAt[i] + (slowDeath ? 0.8 : 0.3));
        if (d >= 1) {
          k.drawGrid(ctx, "tomb", TOMB, x - 40, y - 80, 10, 1 - 0.7 * prog(lt, VICTORY, VICTORY + 0.3));
          continue;
        }
        rot = d * (slowDeath ? 5 : 8);
        scale *= 1 - d;
        alpha = 1 - d;
        k.burst(ctx, x, y - 80, lt - deadAt[i], 12, [C.WHITE, C.GRAY, C.SUN], i * 13, 150);
      }
      const bob = 1 + 0.04 * Math.sin(lt * 9 + i);
      k.drawPingo(ctx, f.look, f.gear, x, y, scale, { sx: 1 / bob, sy: bob, white, flip, rot, alpha });
      drawn.push({ i, x, y, scale });
    }
    // HP bars + name tags
    for (const d of drawn) {
      if (lt >= deadAt[d.i] || (d.i === WINNER && lt >= VICTORY)) continue;
      const by = d.y - d.scale * 40;
      k.bar(ctx, d.x - 55, by, 110, 14, hp[d.i], hp[d.i] > 0.6 ? C.GREEN : hp[d.i] > 0.3 ? C.SUN : C.RED);
      const tag = ROSTER[d.i].tag;
      if (tag) k.chip(ctx, d.x, by - 40, tag[0], tag[1], C.WHITE, 30);
    }
    // damage numbers
    for (const a of ATTACKS) {
      const f = prog(lt, impactOf(a), impactOf(a) + 0.75);
      if (f <= 0 || f >= 1) continue;
      const [tx, ty] = home(a.b);
      const crit = a.kind === "crit";
      const size = crit ? (a.t >= SLOW_FROM ? 96 : 72) : 56;
      const half = k.measure(ctx, a.label, size) / 2 + 30;
      k.text(ctx, a.label, Math.min(W - half, Math.max(half, tx)), ty - 230 - f * 90, {
        size,
        fill: crit ? C.SUN : a.kind === "dodge" ? "#5ad1e6" : C.WHITE,
        stroke: C.INK,
        strokeW: 12,
        scale: easeOutBack(prog(lt, impactOf(a), impactOf(a) + 0.15), 3),
        alpha: 1 - prog(lt, impactOf(a) + 0.55, impactOf(a) + 0.75),
        rot: crit ? -0.06 : 0,
      });
      if (crit) k.burst(ctx, tx, ty - 110, lt - impactOf(a), 16, [C.SUN, C.WHITE, C.ORANGE], a.t * 100, 240);
    }
    // slow-motion vignette
    const vig = prog(lt, SLOW_FROM - 0.3, SLOW_FROM) * (1 - prog(lt, VICTORY, VICTORY + 0.3));
    if (vig > 0) {
      ctx.fillStyle = `rgba(35,26,46,${0.45 * vig})`;
      ctx.fillRect(0, 260, W, 60);
      ctx.fillRect(0, H - 60, W, 60);
      ctx.fillRect(0, 260, 50, H);
      ctx.fillRect(W - 50, 260, 50, H);
      k.text(ctx, "CÂMERA LENTA", W - 40, 300, { size: 30, fill: C.RED, align: "right", alpha: vig * (Math.floor(lt * 3) % 2 ? 1 : 0.4) });
    }
    // banners
    for (const b of BANNERS) {
      const f = prog(lt, b.t, b.t + b.dur);
      if (f <= 0 || f >= 1) continue;
      const x = f < 0.25 ? lerp(-500, W / 2, easeOutBack(f / 0.25)) : f > 0.8 ? lerp(W / 2, W + 700, easeInCubic((f - 0.8) / 0.2)) : W / 2;
      ctx.fillStyle = "rgba(35,26,46,0.88)";
      ctx.fillRect(0, 770 - b.size * 0.7, W, b.size * 1.4);
      k.text(ctx, b.text, x, 775, { size: b.size, fill: b.color, stroke: C.INK, strokeW: 14 });
      if (b.text === "DUELO FINAL!" && f > 0.3) {
        k.text(ctx, "VOCÊ (equipado)  vs  ANA (quase pelada)", W / 2, 775 + b.size * 0.9, { size: 38, fill: C.WHITE, alpha: prog(f, 0.3, 0.45) });
      }
    }
    // HUD
    ctx.fillStyle = C.INK;
    ctx.fillRect(0, 0, W, 250);
    k.text(ctx, "PINGO ROYALE #7", 60, 90, { size: 60, fill: C.WHITE, align: "left" });
    k.text(ctx, "Sábado · Turma 7ºB", 60, 170, { size: 40, fill: C.GRAY, align: "left" });
    const alive = ROSTER.filter((_, i) => lt < deadAt[i]).length;
    const lastDeath = Math.max(-1, ...deadAt.filter((d) => d <= lt));
    const bump = lastDeath > 0 ? 1 + 0.4 * (1 - prog(lt, lastDeath, lastDeath + 0.3)) : 1;
    k.text(ctx, "RESTAM", 860, 70, { size: 40, fill: C.GRAY });
    k.text(ctx, String(alive), 860, 160, { size: 110, fill: alive <= 3 ? C.RED : C.SUN, stroke: C.INK, strokeW: 10, scale: bump });
    // zebra!
    if (lt >= VICTORY) {
      k.confetti(ctx, lt - VICTORY, 77);
      k.text(ctx, "ZEBRA!!!", W / 2, 560, {
        size: 200,
        fill: C.PINK,
        stroke: C.INK,
        strokeW: 22,
        shadow: 12,
        scale: slam(lt, 13.3, 0.16, 3),
        rot: -0.06 + Math.sin(lt * 8) * 0.03,
      });
    }
  },
};

// ================================================================== 10. THE LESSON
const S10_LESSON: SceneDef = {
  name: "lesson",
  bars: 3,
  transition: "flash",
  music: [{ hit: true }, { kick: true, hat: true, bass: true, arp: true }, { kick: true, snare: true, hat: true, bass: true, arp: true }],
  sfx: [
    [0, "fanfare", 1],
    [0.05, "pop", 0.6],
    [0.35, "slam", 0.7],
    [1.9, "pop", 0.6],
    [2.3, "coin", 0.8],
    [2.81, "pop", 0.6],
    [3.28, "slam", 1],
    [4.2, "pop", 0.5],
  ],
  impacts: [[0.35, 12], [3.28, 20]],
  flashes: [0],
  draw(k, ctx, lt) {
    k.rays(ctx, W / 2, 800, C.SUN, "#ffe27a", lt * 0.4);
    k.confetti(ctx, lt + 0.6, 31);
    k.text(ctx, "O Pingo QUASE PELADO", W / 2, 140, { size: 80, fill: C.WHITE, stroke: C.INK, strokeW: 14, shadow: 8, scale: easeOutBack(prog(lt, 0.05, 0.3)) });
    k.text(ctx, "da ANA venceu!", W / 2, 250, { size: 120, fill: C.PINK, stroke: C.INK, strokeW: 16, shadow: 10, scale: slam(lt, 0.35, 0.15, 2.4), rot: -0.03 });
    k.drawPingo(ctx, ANA, ANA_GEAR, W / 2, 860 - hopOnBeat(lt, 70), 11, { blink: lt > 2.5 && lt < 2.6 });
    k.chip(ctx, W / 2, 400, "só uma Coroa de Papel", C.MINT, C.WHITE, 38);
    const p = easeOutBack(prog(lt, 1.85, 2.15));
    if (p > 0) {
      ctx.save();
      ctx.translate(W / 2, 1095);
      ctx.scale(p, p);
      k.panel(ctx, -460, -165, 920, 330, C.WHITE, 26);
      ctx.restore();
    }
    k.text(ctx, "Fez mais tarefas?", W / 2, 985, { size: 54, fill: C.INK, alpha: prog(lt, 1.9, 2.05) });
    k.text(ctx, "Mais chances.", W / 2, 1060, { size: 70, fill: "#1f6b2a", scale: easeOutBack(prog(lt, 2.3, 2.5)) });
    k.text(ctx, "Garantia?", 400, 1170, { size: 58, fill: C.INK, alpha: prog(lt, 2.81, 2.95) });
    k.text(ctx, "NUNCA.", 740, 1170, { size: 96, fill: C.RED, stroke: C.INK, strokeW: 12, scale: slam(lt, 3.28, 0.14, 2.6), rot: -0.05 });
    k.text(ctx, "É isso que deixa todo sábado imprevisível.", W / 2, 1305, { size: 38, fill: C.INK, alpha: prog(lt, 4.2, 4.4) });
  },
};

// ================================================================== 11. FOR TEACHERS
const FEATURES: Array<{ text: string; icon: (k: Kit, ctx: Ctx, x: number, y: number) => void }> = [
  { text: "Painel do professor", icon: (k, ctx, x, y) => k.drawGrid(ctx, "cursor", CURSOR, x - 30, y - 45, 6) },
  { text: "Moedas com histórico", icon: (k, ctx, x, y) => k.drawCoin(ctx, x, y, 80) },
  { text: "Loja com rotação", icon: (k, ctx, x, y) => k.drawItem(ctx, "wifi_hammer", x, y, 90) },
  { text: "Replay de toda batalha", icon: (k, ctx, x, y) => k.drawPingo(ctx, HERO, HERO_GEAR, x, y + 45, 2.4, { shadow: false }) },
  { text: "Ranking da temporada", icon: (k, ctx, x, y) => k.drawItem(ctx, "paper_crown", x, y, 90) },
  {
    text: "Sem dinheiro real nem apostas",
    icon: (_k, ctx, x, y) => {
      ctx.strokeStyle = C.RED;
      ctx.lineWidth = 16;
      ctx.lineCap = "square";
      ctx.beginPath();
      ctx.moveTo(x - 30, y - 30);
      ctx.lineTo(x + 30, y + 30);
      ctx.moveTo(x + 30, y - 30);
      ctx.lineTo(x - 30, y + 30);
      ctx.stroke();
    },
  },
];
const S11_TEACHER: SceneDef = {
  name: "teacher",
  bars: 3,
  transition: "blocks",
  music: bars(3, FULL),
  sfx: [[0.05, "slam", 0.6], ...FEATURES.map((_, i): Cue => [0.47 + i * 0.47, "check", 0.7, 1 + i * 0.06]), [3.75, "sparkle", 0.6], [3.8, "pop", 0.6]],
  draw(k, ctx, lt) {
    k.checker(ctx, C.NIGHT, "#33265a", 90, lt * 40, -lt * 40);
    k.text(ctx, "E PARA O PROFESSOR:", W / 2, 150, { size: 90, fill: C.SUN, stroke: C.INK, strokeW: 14, shadow: 8, scale: slam(lt, 0.05, 0.15, 2) });
    FEATURES.forEach((f, i) => {
      const at = 0.47 + i * 0.47;
      const e = easeOutBack(prog(lt, at, at + 0.25));
      const y = 320 + i * 150;
      const x = lerp(-1100, 70, e);
      k.panel(ctx, x, y - 58, 940, 116, i === 5 ? "#fde0e0" : C.WHITE, 20, 8);
      f.icon(k, ctx, x + 80, y);
      k.text(ctx, f.text, x + 160, y + 3, { size: 48, fill: C.INK, align: "left" });
    });
    k.text(ctx, "Pronto para usar na sua turma.", W / 2, 1270, { size: 58, fill: C.WHITE, stroke: C.INK, strokeW: 10, scale: easeOutBack(prog(lt, 3.8, 4.05)) });
  },
};

// ================================================================== 12. END CARD
const S12_END: SceneDef = {
  name: "end",
  bars: 3,
  transition: "blocks",
  music: [{ ...FULL, lead: true }, { ...FULL, lead: true }, { hit: true, vol: 1.1 }],
  sfx: [[0.05, "slam", 0.9], [0.3, "slam", 0.7], [1.875, "pop", 0.6], [2.1, "pop", 0.6, 1.15], [2.34, "pop", 0.6, 1.3], [3.75, "sparkle", 1], [3.75, "fanfare", 0.8]],
  impacts: [[0.05, 14], [0.3, 10]],
  draw(k, ctx, lt) {
    k.rays(ctx, W / 2, 900, C.SUN, "#ffe27a", -lt * 0.4);
    if (lt > 3.75) k.confetti(ctx, lt - 3.75, 91);
    k.text(ctx, "PINGO", W / 2, 180, { size: 180, fill: C.WHITE, stroke: C.INK, strokeW: 20, shadow: 12, scale: slam(lt, 0.05, 0.15, 2.2) });
    k.text(ctx, "BATTLE ROYALE", W / 2, 330, { size: 112, fill: C.PINK, stroke: C.INK, strokeW: 16, shadow: 10, scale: slam(lt, 0.3, 0.15, 2.2), rot: -0.03 });
    const enter = easeOutBack(prog(lt, 0.4, 0.8));
    k.drawPingo(ctx, HERO, HERO_GEAR, 330, 900 - hopOnBeat(lt, 60), 9 * enter, { blink: lt > 2.6 && lt < 2.7 });
    k.drawPingo(ctx, ANA, ANA_GEAR, 750, 900 - hopOnBeat(lt + BEAT, 60), 9 * enter, { flip: true, blink: lt > 3.3 && lt < 3.4 });
    const lines: Array<[string, string]> = [["Faça a tarefa.", C.INK], ["Equipe o Pingo.", C.INK], ["Vença a arena.", C.PINK]];
    lines.forEach(([l, color], i) => {
      k.text(ctx, l, W / 2, 1020 + i * 80, {
        size: 64,
        fill: color,
        stroke: i === 2 ? C.INK : undefined,
        strokeW: i === 2 ? 10 : 0,
        scale: easeOutBack(prog(lt, 1.875 + i * 0.234, 2.1 + i * 0.234)),
      });
    });
    k.text(ctx, "feito com Claude Code", W / 2, 1290, { size: 34, fill: C.INK, alpha: 0.75 * prog(lt, 3.75, 4.1) });
  },
};

// ================================================================== timeline
export const SCENES: SceneDef[] = [
  S1_HOOK, S2_LOGO, S3_PINGOS, S4_COINS, S5_SHOP, S6_TRADEOFF, S7_BUILD, S8_START, S9_BATTLE, S10_LESSON, S11_TEACHER, S12_END,
];
export const STARTS = SCENES.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].bars * BAR], []);
export const DURATION = SCENES.reduce((s, sc) => s + sc.bars * BAR, 0);
const WIPE = 0.17;

/** Absolute sound cues (scene cues + automatic transition whooshes). */
export function allCues(): Cue[] {
  const cues: Cue[] = [];
  SCENES.forEach((s, i) => {
    for (const [t, name, vol, pitch] of s.sfx) cues.push([STARTS[i] + t, name, vol, pitch]);
    if (i > 0 && s.transition === "blocks") cues.push([STARTS[i] - 0.2, "whoosh", 0.45]);
  });
  return cues.sort((a, b) => a[0] - b[0]);
}

export function musicPlan(): BarStyle[] {
  return SCENES.flatMap((s) => s.music);
}

const IMPACTS = SCENES.flatMap((s, i) => (s.impacts ?? []).map(([t, a]): [number, number] => [STARTS[i] + t, a]));
const FLASHES = [
  ...SCENES.flatMap((s, i) => (s.flashes ?? []).map((t) => STARTS[i] + t)),
  ...SCENES.map((s, i) => (s.transition === "flash" ? STARTS[i] : -1)).filter((t) => t >= 0),
];

export function createLongPromo(make: MakeSurface) {
  const k = createKit(make);

  function wipe(ctx: Ctx, t: number) {
    SCENES.forEach((s, i) => {
      if (i === 0 || s.transition !== "blocks") return;
      const edge = STARTS[i];
      const p = prog(t, edge - WIPE, edge + WIPE);
      if (p <= 0 || p >= 1) return;
      const tile = 90;
      const cols = Math.ceil(W / tile);
      const rows = Math.ceil(H / tile);
      ctx.fillStyle = i % 2 ? C.INK : "#3a2a4a";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = (c + r) / (cols + rows);
          const grow = p < 0.5 ? clamp01(p * 2 * 1.6 - d * 0.6) : clamp01(1 - ((p - 0.5) * 2 * 1.6 - d * 0.6));
          const size = tile * easeOutCubic(grow);
          if (size > 0) ctx.fillRect(c * tile + (tile - size) / 2, r * tile + (tile - size) / 2, size + 1, size + 1);
        }
      }
    });
  }

  function render(ctx: Ctx, t: number) {
    const time = Math.min(Math.max(t, 0), DURATION - 1e-6);
    let scene = 0;
    STARTS.forEach((s, i) => {
      if (time >= s) scene = i;
    });
    let sx = 0;
    let sy = 0;
    IMPACTS.forEach(([ti, amp], i) => {
      const d = time - ti;
      if (d < 0 || d > 0.45) return;
      const a = amp * Math.exp(-d * 9);
      sx += Math.sin(d * 70 + i) * a;
      sy += Math.cos(d * 55 + i * 2) * a;
    });
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(sx, sy);
    ctx.fillStyle = C.INK;
    ctx.fillRect(-40, -40, W + 80, H + 80);
    SCENES[scene].draw(k, ctx, time - STARTS[scene]);
    ctx.restore();
    wipe(ctx, time);
    for (const f of FLASHES) {
      const a = 1 - prog(time, f, f + 0.14);
      if (time >= f && a > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.6 * a})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    // fade out at the very end
    const out = prog(time, DURATION - 0.5, DURATION);
    if (out > 0) {
      ctx.fillStyle = `rgba(35,26,46,${out})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  return { render };
}
