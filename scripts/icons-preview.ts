/**
 * Builds sprite-preview/icones.html: every UI emoji next to its pixel-art replacement.
 * Also checks that every icon is 16x16 and only uses palette colors.
 *   npx tsx scripts/icons-preview.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { ICONS, type PixelIcon } from "@/sprites/icons";
import { PALETTE } from "@/sprites/palette";

const SIZE = 16;
const out = join(process.cwd(), "sprite-preview");
mkdirSync(out, { recursive: true });

// ---------- validation
const problems: string[] = [];
for (const [name, icon] of Object.entries(ICONS) as [string, PixelIcon][]) {
  if (icon.rows.length !== SIZE) problems.push(`${name}: ${icon.rows.length} linhas`);
  icon.rows.forEach((row, y) => {
    if (row.length !== SIZE) problems.push(`${name}: linha ${y} tem ${row.length} colunas`);
    for (const ch of row) if (ch !== "." && !PALETTE[ch]) problems.push(`${name}: cor desconhecida "${ch}" na linha ${y}`);
  });
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

function svg(icon: PixelIcon, px: number) {
  let rects = "";
  icon.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      if (ch !== ".") rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${PALETTE[ch]}"/>`;
      x += w;
    }
  });
  return `<svg viewBox="0 0 16 16" width="${px}" height="${px}" shape-rendering="crispEdges">${rects}</svg>`;
}

// ---------- contact sheet PNG (for quick review)
const entries = Object.entries(ICONS) as [string, PixelIcon][];
const cols = 8;
const cell = 16 * 6 + 24;
const sheet = createCanvas(cols * cell, Math.ceil(entries.length / cols) * cell);
const ctx = sheet.getContext("2d");
ctx.fillStyle = "#fff4d6";
ctx.fillRect(0, 0, sheet.width, sheet.height);
entries.forEach(([, icon], i) => {
  const ox = (i % cols) * cell + 12;
  const oy = Math.floor(i / cols) * cell + 12;
  icon.rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(ox + x * 6, oy + y * 6, 6, 6);
    }),
  );
});
writeFileSync(join(out, "icones-contato.png"), sheet.toBuffer("image/png"));

// ---------- HTML preview
const cards = entries
  .map(
    ([name, icon]) => `
    <div class="card">
      <div class="pair">
        <div class="emoji" title="como aparece hoje (muda em cada aparelho)">${icon.replaces.map((e) => `<span>${e}</span>`).join("")}</div>
        <div class="arrow">→</div>
        <div class="pixel">${svg(icon, 64)}</div>
      </div>
      <div class="sizes">${svg(icon, 16)}${svg(icon, 24)}${svg(icon, 32)}</div>
      <div class="name">${icon.label}</div>
      <code>${name}</code>
    </div>`,
  )
  .join("");

// page body (also published as a Claude artifact, which adds its own <html>/<head>/<body>)
const page = `<title>Ícones do Pingo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jersey+10&family=Nunito:wght@400;700&display=swap">
<style>
  /* layout: game-panel cards in a wrapping grid; each card = today's emoji → pixel icon → real sizes */
  :root {
    --bg: #fff4d6; --card: #fffdf7; --ink: #231a2e; --text: #231a2e; --muted: #6f6680;
    --tile: #fffdf7; --tile-line: #e7dcc0; --sun: #ffd23f; --bubble: #ff6fa8;
    --display: "Jersey 10", "Courier New", monospace; --body: Nunito, system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --bg: #1d1626; --card: #2b2236; --ink: #0f0b15; --text: #fff4d6; --muted: #b9adc9; --tile: #fff4d6; --tile-line: #cbbd97; color-scheme: dark; }
  }
  :root[data-theme="dark"] { --bg: #1d1626; --card: #2b2236; --ink: #0f0b15; --text: #fff4d6; --muted: #b9adc9; --tile: #fff4d6; --tile-line: #cbbd97; color-scheme: dark; }
  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: var(--body); font-size: 15px;
         padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 20px 40px; }
  .wrap { max-width: 1100px; margin: 0 auto; display: grid; gap: 18px; }
  h1 { font-family: var(--display); font-size: clamp(36px, 7vw, 52px); line-height: 1; margin: 0; letter-spacing: .04em; text-wrap: balance; }
  .intro { margin: 0; max-width: 65ch; line-height: 1.5; color: var(--muted); }
  .demo { display: flex; flex-wrap: wrap; gap: 10px; }
  .btn { display: inline-flex; align-items: center; gap: 6px; font-family: var(--display); font-size: 22px; color: #231a2e;
         padding: 6px 12px; border: 3px solid var(--ink); border-radius: 6px; background: var(--sun); box-shadow: 0 4px 0 var(--ink); }
  .btn.pink { background: var(--bubble); } .btn.white { background: #fffdf7; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px; }
  .card { background: var(--card); border: 3px solid var(--ink); border-radius: 6px; box-shadow: 4px 4px 0 var(--ink);
          padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 0; }
  .pair { display: flex; align-items: center; gap: 10px; min-height: 76px; }
  .emoji { display: flex; flex-wrap: wrap; gap: 2px; max-width: 72px; justify-content: center; font-size: 30px; line-height: 1.1; }
  .arrow { font-size: 18px; color: var(--muted); }
  .pixel { background: var(--tile); border-radius: 4px; padding: 6px; line-height: 0; }
  .pixel svg, .sizes svg { image-rendering: pixelated; }
  .sizes { display: flex; align-items: flex-end; gap: 8px; padding: 4px 8px; background: var(--tile); border: 2px solid var(--tile-line); border-radius: 4px; line-height: 0; }
  .name { font-weight: 700; text-align: center; font-size: 14px; }
  code { font-size: 11px; color: var(--muted); }
</style>
<div class="wrap">
  <h1>Ícones do Pingo em pixel art</h1>
  <p class="intro">À esquerda, o emoji de hoje: ele muda de desenho em cada aparelho. À direita, a versão em pixel art (16×16, paleta do jogo), igual em qualquer tela. Embaixo, o mesmo ícone em 16, 24 e 32 px, o tamanho real nos botões.</p>
  <div class="demo">
    <span class="btn pink">${svg(ICONS.swords, 24)} Encontrar Batalha</span>
    <span class="btn white">${svg(ICONS.star, 22)} Nv 5</span>
    <span class="btn">${svg(ICONS.coinBag, 22)} Moedas</span>
    <span class="btn white">${svg(ICONS.trophy, 22)} Ranking</span>
    <span class="btn white">${svg(ICONS.play, 20)} Assistir</span>
  </div>
  <div class="grid">${cards}</div>
</div>`;
writeFileSync(join(out, "icones-artifact.html"), page);
writeFileSync(
  join(out, "icones.html"),
  `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${page}
</head></html>`,
);
console.log(`✔ ${entries.length} ícones válidos → sprite-preview/icones.html (+ icones-contato.png)`);
