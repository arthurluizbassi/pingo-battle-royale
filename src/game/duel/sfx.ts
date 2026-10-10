/**
 * 8-bit sound effects synthesized with WebAudio (no audio files to download).
 * Browsers only allow sound after a user gesture: call `unlock()` from the click
 * on "Encontrar Batalha" and everything after that can play.
 */

export type SfxName =
  | "search"
  | "found"
  | "vsSlide"
  | "vsSlam"
  | "count"
  | "fight"
  | "whoosh"
  | "hit"
  | "heavyHit"
  | "crit"
  | "dodge"
  | "block"
  | "keys"
  | "slap"
  | "honk"
  | "squeak"
  | "zap"
  | "magic"
  | "bonk"
  | "splash"
  | "pages"
  | "dice"
  | "boing"
  | "adrenaline"
  | "ko"
  | "victory"
  | "defeat";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;

export function unlock() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    // gentle limiter so stacked hits never clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(value: boolean) {
  muted = value;
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.5, ctx.currentTime, 0.02);
}

export function isMuted() {
  return muted;
}

// ---------------------------------------------------------------- primitives

function tone(
  type: OscillatorType,
  freq: number,
  dur: number,
  { at = 0, to, vol = 0.3, attack = 0.005, curve = "exp" }: { at?: number; to?: number; vol?: number; attack?: number; curve?: "exp" | "lin" } = {},
) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) {
    if (curve === "exp") osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    else osc.frequency.linearRampToValueAtTime(to, t + dur);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(
  dur: number,
  { at = 0, vol = 0.3, filter = "bandpass", freq = 2000, to, q = 1 }: { at?: number; vol?: number; filter?: BiquadFilterType; freq?: number; to?: number; q?: number } = {},
) {
  if (!ctx || !master || !noiseBuffer) return;
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.playbackRate.value = 0.5 + Math.random();
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

const NOTE = (n: number) => 440 * 2 ** ((n - 69) / 12);

// ---------------------------------------------------------------- the sounds

const SOUNDS: Record<SfxName, () => void> = {
  search: () => {
    tone("square", 1320, 0.08, { vol: 0.12 });
    tone("square", 1760, 0.12, { at: 0.07, vol: 0.08 });
  },
  found: () => {
    [72, 76, 79, 84].forEach((n, i) => tone("square", NOTE(n), 0.12, { at: i * 0.06, vol: 0.18 }));
  },
  vsSlide: () => noise(0.35, { filter: "bandpass", freq: 400, to: 4000, vol: 0.25, q: 0.8 }),
  vsSlam: () => {
    tone("sine", 120, 0.6, { to: 35, vol: 0.9 });
    tone("square", 90, 0.25, { to: 40, vol: 0.25 });
    noise(0.5, { filter: "lowpass", freq: 3000, to: 200, vol: 0.6 });
  },
  count: () => tone("square", NOTE(69), 0.14, { vol: 0.2 }),
  fight: () => {
    [60, 64, 67, 72].forEach((n) => tone("square", NOTE(n), 0.5, { vol: 0.12 }));
    tone("sawtooth", NOTE(48), 0.5, { vol: 0.15 });
    noise(0.3, { filter: "highpass", freq: 3000, vol: 0.2 });
  },
  whoosh: () => noise(0.22, { filter: "bandpass", freq: 600, to: 3500, vol: 0.35, q: 1.2 }),
  hit: () => {
    tone("sine", 220, 0.18, { to: 60, vol: 0.6 });
    noise(0.12, { filter: "lowpass", freq: 2500, to: 300, vol: 0.5 });
  },
  heavyHit: () => {
    tone("sine", 160, 0.35, { to: 40, vol: 0.9 });
    tone("square", 110, 0.15, { to: 50, vol: 0.2 });
    noise(0.25, { filter: "lowpass", freq: 1800, to: 120, vol: 0.7 });
  },
  crit: () => {
    tone("sine", 200, 0.45, { to: 40, vol: 0.9 });
    noise(0.3, { filter: "lowpass", freq: 4000, to: 200, vol: 0.7 });
    [84, 88, 91, 96].forEach((n, i) => tone("square", NOTE(n), 0.18, { at: 0.04 + i * 0.045, vol: 0.12 }));
  },
  dodge: () => {
    noise(0.18, { filter: "bandpass", freq: 3000, to: 900, vol: 0.3, q: 2 });
    tone("triangle", 900, 0.15, { to: 1600, vol: 0.12 });
  },
  block: () => {
    tone("square", 1250, 0.25, { vol: 0.15 });
    tone("square", 1873, 0.3, { vol: 0.1 });
    tone("triangle", 2600, 0.35, { vol: 0.08 });
    noise(0.08, { filter: "highpass", freq: 4000, vol: 0.4 });
  },
  keys: () => {
    for (let i = 0; i < 9; i++) noise(0.03, { at: i * 0.045 + Math.random() * 0.02, filter: "highpass", freq: 3500 + Math.random() * 2500, vol: 0.35 });
  },
  slap: () => {
    noise(0.07, { filter: "highpass", freq: 1500, vol: 0.9 });
    tone("sine", 300, 0.1, { to: 90, vol: 0.5 });
  },
  honk: () => {
    tone("sawtooth", 233, 0.5, { vol: 0.3, attack: 0.02 });
    tone("square", 349, 0.5, { vol: 0.12, attack: 0.02 });
  },
  squeak: () => {
    tone("square", 900, 0.15, { to: 2000, vol: 0.18 });
    tone("square", 2000, 0.25, { at: 0.14, to: 700, vol: 0.18 });
  },
  zap: () => {
    tone("sawtooth", 1800, 0.25, { to: 120, vol: 0.25 });
    noise(0.2, { filter: "highpass", freq: 5000, vol: 0.2 });
  },
  magic: () => {
    [79, 83, 86, 91, 95].forEach((n, i) => tone("triangle", NOTE(n), 0.2, { at: i * 0.05, vol: 0.18 }));
  },
  bonk: () => {
    tone("triangle", 700, 0.12, { to: 350, vol: 0.5 });
    tone("sine", 140, 0.2, { to: 60, vol: 0.6 });
  },
  splash: () => {
    noise(0.35, { filter: "bandpass", freq: 1200, to: 400, vol: 0.5, q: 0.7 });
    tone("sine", 500, 0.12, { to: 1200, vol: 0.15 });
  },
  pages: () => {
    for (let i = 0; i < 6; i++) noise(0.06, { at: i * 0.05, filter: "bandpass", freq: 2500, vol: 0.25, q: 0.6 });
  },
  dice: () => {
    for (let i = 0; i < 5; i++) tone("square", 1400 + i * 120, 0.03, { at: i * 0.06, vol: 0.15 });
  },
  boing: () => tone("sine", 180, 0.4, { to: 520, vol: 0.4, curve: "lin" }),
  adrenaline: () => {
    [57, 60, 64, 69].forEach((n, i) => tone("sawtooth", NOTE(n), 0.12, { at: i * 0.07, vol: 0.12 }));
  },
  ko: () => {
    tone("sine", 140, 1.2, { to: 30, vol: 1 });
    noise(1.0, { filter: "lowpass", freq: 5000, to: 100, vol: 0.8 });
    tone("square", NOTE(55), 0.6, { at: 0.1, to: NOTE(31), vol: 0.15 });
  },
  victory: () => {
    const seq: Array<[number, number, number]> = [
      [72, 0, 0.12], [76, 0.12, 0.12], [79, 0.24, 0.12], [84, 0.36, 0.5], [79, 0.62, 0.12], [84, 0.74, 0.8],
    ];
    for (const [n, at, d] of seq) {
      tone("square", NOTE(n), d, { at, vol: 0.16 });
      tone("triangle", NOTE(n - 12), d, { at, vol: 0.18 });
    }
  },
  defeat: () => {
    [67, 66, 65, 64].forEach((n, i) => tone("triangle", NOTE(n), i === 3 ? 0.9 : 0.3, { at: i * 0.32, vol: 0.25, to: i === 3 ? NOTE(60) : undefined }));
  },
};

export function sfx(name: SfxName) {
  if (!ctx || muted) return;
  try {
    SOUNDS[name]();
  } catch {
    // sound is decoration: never break the battle because of audio
  }
}

/** A tiny 4-bar chiptune loop for the fight (bass + hats), 150 BPM. */
export function startMusic() {
  if (!ctx || musicTimer) return;
  const bass = [45, 45, 57, 45, 48, 48, 60, 48, 43, 43, 55, 43, 50, 50, 52, 55];
  let step = 0;
  const beat = 60 / 150 / 2;
  musicTimer = setInterval(() => {
    if (muted) {
      step++;
      return;
    }
    const n = bass[step % bass.length];
    tone("triangle", NOTE(n), beat * 0.9, { vol: 0.16 });
    if (step % 2 === 1) noise(0.03, { filter: "highpass", freq: 7000, vol: 0.06 });
    if (step % 4 === 2) noise(0.08, { filter: "bandpass", freq: 1800, vol: 0.08 });
    step++;
  }, beat * 1000);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
