/**
 * Renders the promo animation to MP4 (H.264, 1080×1350, 30 fps) — no browser needed.
 *
 *   npm run promo                         # → promo/pingo-battle-royale.mp4
 *   npm run promo -- --frames 0.5,2.6,7   # only PNG stills (for review) → promo/frames/
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { createPromo, PROMO, type Surface } from "@/promo/promo";

GlobalFonts.registerFromPath(join(process.cwd(), "public", "fonts", "PixelifySans.ttf"), PROMO.FONT);

const make = (w: number, h: number): Surface => {
  const canvas = createCanvas(w, h);
  return { canvas: canvas as unknown as Surface["canvas"], ctx: canvas.getContext("2d") as unknown as CanvasRenderingContext2D };
};

const outDir = join(process.cwd(), "promo");
mkdirSync(outDir, { recursive: true });
const promo = createPromo(make);
const canvas = createCanvas(PROMO.W, PROMO.H);
const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

const framesArg = process.argv.indexOf("--frames");
if (framesArg > 0) {
  mkdirSync(join(outDir, "frames"), { recursive: true });
  for (const t of process.argv[framesArg + 1].split(",").map(Number)) {
    promo.render(ctx, t);
    const file = join(outDir, "frames", `t${t.toFixed(2)}.png`);
    writeFileSync(file, canvas.toBuffer("image/png"));
    console.log("wrote", file);
  }
  process.exit(0);
}

const output = join(outDir, "pingo-battle-royale.mp4");
const total = Math.round(PROMO.DURATION * PROMO.FPS);
const proc = spawn(
  ffmpeg.path,
  [
    "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${PROMO.W}x${PROMO.H}`, "-r", String(PROMO.FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output,
  ],
  { stdio: ["pipe", "ignore", "pipe"] },
);
let stderr = "";
proc.stderr.on("data", (d) => (stderr += d));

(async () => {
  for (let f = 0; f < total; f++) {
    promo.render(ctx, f / PROMO.FPS);
    const data = Buffer.from(ctx.getImageData(0, 0, PROMO.W, PROMO.H).data.buffer);
    if (!proc.stdin.write(data)) await new Promise((r) => proc.stdin.once("drain", r));
    if (f % 30 === 0) process.stdout.write(`\rrender ${f}/${total}`);
  }
  proc.stdin.end();
  proc.on("close", (code) => {
    if (code === 0) console.log(`\n✔ ${output}`);
    else console.error(`\n✖ ffmpeg exit ${code}\n${stderr.slice(-2000)}`);
    process.exit(code ?? 1);
  });
})();
