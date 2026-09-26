/**
 * Renders the long promo (~79 s) with synthesized soundtrack + sound effects.
 *
 *   npm run promo:long                          # → promo/pingo-battle-royale-longo.mp4
 *   npm run promo:long -- --frames 3.9,50,61    # PNG stills only (review)
 *   npm run promo:long -- --audio-only          # just promo/trilha.wav
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { Mix, renderMusic, sfx } from "@/promo/audio";
import { FONT, H, W, type Surface } from "@/promo/kit";
import { allCues, BPM, createLongPromo, DURATION, FPS, musicPlan } from "@/promo/long";

GlobalFonts.registerFromPath(join(process.cwd(), "public", "fonts", "PixelifySans.ttf"), FONT);
const outDir = join(process.cwd(), "promo");
mkdirSync(join(outDir, "frames"), { recursive: true });

const make = (w: number, h: number): Surface => {
  const c = createCanvas(w, h);
  return { canvas: c as unknown as Surface["canvas"], ctx: c.getContext("2d") as unknown as CanvasRenderingContext2D };
};

function buildAudio(): string {
  const mix = new Mix(DURATION + 0.5);
  renderMusic(mix, musicPlan(), BPM, 0.75);
  for (const [t, name, vol = 1, pitch = 1] of allCues()) {
    const buf = sfx(name, pitch);
    if (name === "crit" || name === "critBig" || name === "boom") mix.echo(t, buf, vol);
    else mix.add(t, buf, vol);
  }
  const file = join(outDir, "trilha.wav");
  writeFileSync(file, mix.toWav());
  return file;
}

const promo = createLongPromo(make);
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

const framesArg = process.argv.indexOf("--frames");
if (framesArg > 0) {
  for (const t of process.argv[framesArg + 1].split(",").map(Number)) {
    promo.render(ctx, t);
    const file = join(outDir, "frames", `long-t${t.toFixed(2)}.png`);
    writeFileSync(file, canvas.toBuffer("image/png"));
    console.log("wrote", file);
  }
  process.exit(0);
}

const audio = buildAudio();
console.log(`✔ trilha: ${audio} (${DURATION.toFixed(2)} s)`);
if (process.argv.includes("--audio-only")) process.exit(0);

const output = join(outDir, "pingo-battle-royale-longo.mp4");
const total = Math.round(DURATION * FPS);
const proc = spawn(
  ffmpeg.path,
  [
    "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "-", "-i", audio,
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", output,
  ],
  { stdio: ["pipe", "ignore", "pipe"] },
);
let stderr = "";
proc.stderr.on("data", (d) => (stderr += d));

(async () => {
  for (let f = 0; f < total; f++) {
    promo.render(ctx, f / FPS);
    const data = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!proc.stdin.write(data)) await new Promise((r) => proc.stdin.once("drain", r));
    if (f % 60 === 0) process.stdout.write(`\rrender ${f}/${total}`);
  }
  proc.stdin.end();
  proc.on("close", (code) => {
    if (code === 0) console.log(`\n✔ ${output}`);
    else console.error(`\n✖ ffmpeg exit ${code}\n${stderr.slice(-2000)}`);
    process.exit(code ?? 1);
  });
})();
