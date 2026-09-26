/**
 * Tiny chiptune synth: sound effects + background music generated from code
 * (no samples, no copyright issues). Output: stereo float buffers → 16-bit WAV.
 */
export const SR = 44100;

type Wave = "square" | "triangle" | "sine" | "saw";

function osc(wave: Wave, phase: number, duty = 0.5): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case "square":
      return p < duty ? 1 : -1;
    case "triangle":
      return 4 * Math.abs(p - 0.5) - 1;
    case "saw":
      return 2 * p - 1;
    case "sine":
      return Math.sin(2 * Math.PI * p);
  }
}

export interface ToneOpts {
  f0: number;
  f1?: number;
  dur: number;
  wave?: Wave;
  duty?: number;
  vol?: number;
  attack?: number;
  /** envelope shape: higher = faster decay; 0 = flat (then short release) */
  decay?: number;
  vibrato?: number;
}

export function tone(o: ToneOpts): Float32Array {
  const n = Math.max(1, Math.floor(o.dur * SR));
  const out = new Float32Array(n);
  let phase = 0;
  const attack = o.attack ?? 0.004;
  const decay = o.decay ?? 1.5;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = i / n;
    let f = o.f1 ? o.f0 * (o.f1 / o.f0) ** k : o.f0;
    if (o.vibrato) f *= 1 + o.vibrato * Math.sin(2 * Math.PI * 6 * t);
    phase += f / SR;
    const env = Math.min(1, t / attack) * (decay > 0 ? (1 - k) ** decay : Math.min(1, (1 - k) * 12));
    out[i] = osc(o.wave ?? "square", phase, o.duty) * env * (o.vol ?? 0.5);
  }
  return out;
}

let noiseSeed = 1;
function white() {
  noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0;
  return (noiseSeed / 4294967296) * 2 - 1;
}

export function noise(o: { dur: number; vol?: number; lp0?: number; lp1?: number; highpass?: boolean; attack?: number; decay?: number }): Float32Array {
  const n = Math.max(1, Math.floor(o.dur * SR));
  const out = new Float32Array(n);
  let y = 0;
  const attack = o.attack ?? 0.002;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const fc = (o.lp0 ?? 8000) * ((o.lp1 ?? o.lp0 ?? 8000) / (o.lp0 ?? 8000)) ** k;
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    const x = white();
    y += a * (x - y);
    const s = o.highpass ? x - y : y;
    const env = Math.min(1, i / SR / attack) * (1 - k) ** (o.decay ?? 2);
    out[i] = s * env * (o.vol ?? 0.5);
  }
  return out;
}

function concat(...parts: Array<[number, Float32Array]>): Float32Array {
  const len = Math.max(...parts.map(([t, b]) => Math.floor(t * SR) + b.length));
  const out = new Float32Array(len);
  for (const [t, b] of parts) {
    const o = Math.floor(t * SR);
    for (let i = 0; i < b.length; i++) out[o + i] += b[i];
  }
  return out;
}

const midi = (m: number) => 440 * 2 ** ((m - 69) / 12);

// ------------------------------------------------------------------ sound effects
export type SfxName =
  | "type" | "pop" | "coin" | "check" | "click" | "whoosh" | "fall" | "thud" | "slam" | "kaching" | "stamp"
  | "hit" | "crit" | "critBig" | "dodge" | "elim" | "beep" | "go" | "lock" | "button" | "fanfare" | "stinger"
  | "sparkle" | "equip" | "barUp" | "barDown" | "boom" | "wah" | "scratch" | "tick";

export function sfx(name: SfxName, pitch = 1): Float32Array {
  const p = pitch;
  switch (name) {
    case "type":
      return tone({ f0: 1100 * p, dur: 0.035, duty: 0.25, vol: 0.18, decay: 2 });
    case "tick":
      return tone({ f0: 1760 * p, dur: 0.05, duty: 0.25, vol: 0.2, decay: 3 });
    case "pop":
      return tone({ f0: 320 * p, f1: 980 * p, dur: 0.09, wave: "sine", vol: 0.55, decay: 1.2 });
    case "coin":
      return concat([0, tone({ f0: midi(83) * p, dur: 0.07, vol: 0.28, decay: 0 })], [0.07, tone({ f0: midi(88) * p, dur: 0.3, vol: 0.28, decay: 1.4 })]);
    case "check":
      return concat([0, tone({ f0: midi(84) * p, dur: 0.06, duty: 0.25, vol: 0.25 })], [0.06, tone({ f0: midi(91) * p, dur: 0.14, duty: 0.25, vol: 0.25 })]);
    case "click":
      return noise({ dur: 0.02, lp0: 6000, highpass: true, vol: 0.6, decay: 3 });
    case "whoosh":
      return noise({ dur: 0.38, lp0: 300, lp1: 5000, vol: 0.5, attack: 0.15, decay: 1.2 });
    case "fall":
      return tone({ f0: 1900, f1: 280, dur: 0.42, wave: "sine", vol: 0.3, decay: 0.3 });
    case "thud":
      return concat([0, tone({ f0: 140, f1: 38, dur: 0.38, wave: "sine", vol: 0.95, decay: 1.4 })], [0, noise({ dur: 0.14, lp0: 900, vol: 0.5 })]);
    case "slam":
      return concat(
        [0, tone({ f0: 160, f1: 40, dur: 0.5, wave: "sine", vol: 1, decay: 1.2 })],
        [0, noise({ dur: 0.25, lp0: 3500, lp1: 400, vol: 0.55 })],
        [0, tone({ f0: 82, dur: 0.18, vol: 0.25, decay: 2 })],
      );
    case "kaching":
      return concat(
        [0, noise({ dur: 0.06, lp0: 7000, highpass: true, vol: 0.4 })],
        [0.02, sfx("coin", 1.05)],
        [0.08, tone({ f0: 2637, dur: 0.6, wave: "sine", vol: 0.18, decay: 2.5 })],
        [0.08, tone({ f0: 3951, dur: 0.4, wave: "sine", vol: 0.1, decay: 3 })],
      );
    case "stamp":
      return concat([0, tone({ f0: 110, f1: 50, dur: 0.2, wave: "sine", vol: 0.8 })], [0, noise({ dur: 0.08, lp0: 2500, vol: 0.5 })]);
    case "hit":
      return concat([0, noise({ dur: 0.13, lp0: 2800 * p, lp1: 600, vol: 0.55 })], [0, tone({ f0: 180 * p, f1: 60, dur: 0.12, vol: 0.35, decay: 1.5 })]);
    case "crit":
      return concat(
        [0, sfx("slam")],
        [0, tone({ f0: 1500 * p, f1: 180, dur: 0.28, vol: 0.28, decay: 1 })],
        [0.0, noise({ dur: 0.35, lp0: 6000, lp1: 800, vol: 0.4 })],
      );
    case "critBig":
      return concat([0, sfx("crit", 0.8)], [0.02, tone({ f0: 55, dur: 1.1, wave: "sine", vol: 0.7, decay: 1.3 })], [0, noise({ dur: 0.9, lp0: 1200, lp1: 200, vol: 0.45, decay: 1.2 })]);
    case "dodge":
      return noise({ dur: 0.22, lp0: 1500, lp1: 9000, vol: 0.45, attack: 0.06, decay: 1.5 });
    case "elim":
      return concat(
        ...[76, 71, 64, 59, 52].map((m, i) => [i * 0.055, tone({ f0: midi(m) * p, dur: 0.07, vol: 0.22, decay: 0 })] as [number, Float32Array]),
        [0.05, noise({ dur: 0.25, lp0: 1800, vol: 0.35 })],
      );
    case "beep":
      return tone({ f0: 880, dur: 0.16, vol: 0.3, decay: 0 });
    case "go":
      return concat([0, tone({ f0: 1760, dur: 0.5, vol: 0.28, decay: 0.8 })], [0, tone({ f0: 880, dur: 0.5, wave: "triangle", vol: 0.35, decay: 0.8 })]);
    case "lock":
      return concat([0, sfx("click")], [0.04, tone({ f0: 2400, dur: 0.04, vol: 0.3 })], [0.09, sfx("click")], [0.09, tone({ f0: 130, f1: 60, dur: 0.12, wave: "sine", vol: 0.6 })]);
    case "button":
      return concat([0, sfx("click")], [0, tone({ f0: 440, dur: 0.06, vol: 0.25 })], [0.01, tone({ f0: 100, f1: 50, dur: 0.15, wave: "sine", vol: 0.6 })]);
    case "fanfare": {
      const notes: Array<[number, number, number]> = [
        [0, 72, 0.12], [0.12, 76, 0.12], [0.24, 79, 0.12], [0.36, 84, 0.7], [0.36, 79, 0.7], [0.36, 76, 0.7],
      ];
      return concat(
        ...notes.map(([t, m, d]) => [t, tone({ f0: midi(m), dur: d, duty: 0.25, vol: 0.2, decay: d > 0.5 ? 0.6 : 0 })] as [number, Float32Array]),
        ...notes.map(([t, m, d]) => [t, tone({ f0: midi(m - 12), dur: d, wave: "triangle", vol: 0.25, decay: d > 0.5 ? 0.6 : 0 })] as [number, Float32Array]),
      );
    }
    case "stinger":
      return concat([0, noise({ dur: 0.45, lp0: 400, lp1: 7000, vol: 0.35, attack: 0.35, decay: 0.5 })], [0.4, sfx("slam")]);
    case "sparkle":
      return concat(...[0, 1, 2, 3, 4, 5].map((i) => [i * 0.05, tone({ f0: 2000 + ((i * 733) % 2000), dur: 0.08, wave: "sine", vol: 0.14, decay: 2 })] as [number, Float32Array]));
    case "equip":
      return concat([0, noise({ dur: 0.07, lp0: 5000, vol: 0.4 })], [0, tone({ f0: 330 * p, f1: 660 * p, dur: 0.1, vol: 0.25 })], [0.08, sfx("sparkle")]);
    case "barUp":
      return tone({ f0: 330, f1: 990, dur: 0.35, duty: 0.25, vol: 0.18, decay: 0.4 });
    case "barDown":
      return tone({ f0: 700, f1: 220, dur: 0.35, duty: 0.25, vol: 0.18, decay: 0.4 });
    case "boom":
      return concat([0, sfx("slam")], [0, tone({ f0: 70, dur: 1.4, wave: "sine", vol: 0.7, decay: 1.2 })], [0.05, noise({ dur: 1.2, lp0: 1500, lp1: 150, vol: 0.4, decay: 1.4 })]);
    case "wah":
      // comedic sad trombone
      return concat(
        ...[67, 66, 65].map((m, i) => [i * 0.38, tone({ f0: midi(m - 12), dur: 0.36, wave: "saw", vol: 0.22, decay: 0.2, vibrato: 0.006 })] as [number, Float32Array]),
        [1.14, tone({ f0: midi(52), dur: 0.95, wave: "saw", vol: 0.22, decay: 0.5, vibrato: 0.02 })],
      );
    case "scratch":
      return concat([0, noise({ dur: 0.25, lp0: 4000, lp1: 300, vol: 0.5, decay: 0.6 })], [0, tone({ f0: 600, f1: 120, dur: 0.25, wave: "saw", vol: 0.2 })]);
  }
}

// ------------------------------------------------------------------ mixer
export class Mix {
  readonly l: Float32Array;
  readonly r: Float32Array;
  constructor(seconds: number) {
    this.l = new Float32Array(Math.ceil(seconds * SR));
    this.r = new Float32Array(Math.ceil(seconds * SR));
  }
  add(t: number, buf: Float32Array, vol = 1, pan = 0) {
    const o = Math.floor(t * SR);
    const gl = vol * Math.min(1, 1 - pan);
    const gr = vol * Math.min(1, 1 + pan);
    for (let i = 0; i < buf.length && o + i < this.l.length; i++) {
      if (o + i < 0) continue;
      this.l[o + i] += buf[i] * gl;
      this.r[o + i] += buf[i] * gr;
    }
  }
  /** a few decaying repeats, alternating sides — cheap "big room" */
  echo(t: number, buf: Float32Array, vol = 1, repeats = 3) {
    this.add(t, buf, vol);
    for (let i = 1; i <= repeats; i++) this.add(t + i * 0.13, buf, vol * 0.4 ** i, i % 2 ? -0.6 : 0.6);
  }
  toWav(): Buffer {
    const n = this.l.length;
    const soft = (x: number) => Math.tanh(1.3 * x) / Math.tanh(1.3);
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(soft(this.l[i])), Math.abs(soft(this.r[i])));
    // leave ~1.5 dB of headroom: AAC encoding overshoots a little
    const gain = peak > 0 ? 0.84 / peak : 1;
    const data = Buffer.alloc(n * 4);
    for (let i = 0; i < n; i++) {
      data.writeInt16LE(Math.round(soft(this.l[i]) * gain * 32767), i * 4);
      data.writeInt16LE(Math.round(soft(this.r[i]) * gain * 32767), i * 4 + 2);
    }
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(2, 22);
    header.writeUInt32LE(SR, 24);
    header.writeUInt32LE(SR * 4, 28);
    header.writeUInt16LE(4, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(data.length, 40);
    return Buffer.concat([header, data]);
  }
}

// ------------------------------------------------------------------ music
export interface BarStyle {
  kick?: boolean;
  four?: boolean;
  snare?: boolean;
  hat?: boolean;
  hat16?: boolean;
  bass?: boolean;
  bass16?: boolean;
  arp?: boolean;
  lead?: boolean;
  hit?: boolean;
  riser?: boolean;
  vol?: number;
}

const PROG: Array<{ root: number; minor: boolean }> = [
  { root: 45, minor: true }, // Am
  { root: 41, minor: false }, // F
  { root: 48, minor: false }, // C
  { root: 43, minor: false }, // G
];
const LEAD = [
  [69, 72, 76, 72],
  [69, 72, 77, 76],
  [67, 72, 76, 79],
  [79, 77, 74, 71],
];

export function renderMusic(mix: Mix, bars: BarStyle[], bpm: number, master = 0.8) {
  const beat = 60 / bpm;
  const bar = beat * 4;
  const kick = tone({ f0: 150, f1: 45, dur: 0.22, wave: "sine", vol: 0.6, decay: 1.4 });
  const snare = concat([0, noise({ dur: 0.15, lp0: 6500, vol: 0.34 })], [0, tone({ f0: 190, dur: 0.07, wave: "triangle", vol: 0.25 })]);
  const hat = noise({ dur: 0.035, lp0: 7000, highpass: true, vol: 0.2, decay: 3 });
  bars.forEach((s, b) => {
    const t0 = b * bar;
    const v = (s.vol ?? 1) * master;
    const chord = PROG[b % 4];
    const tones = [0, chord.minor ? 3 : 4, 7, 12];
    for (let q = 0; q < 4; q++) {
      const t = t0 + q * beat;
      if ((s.kick && (q === 0 || q === 2)) || s.four) mix.add(t, kick, v);
      if (s.snare && (q === 1 || q === 3)) mix.add(t, snare, v);
      if (s.lead) {
        mix.add(t, tone({ f0: midi(LEAD[b % 4][q]), dur: beat * 0.9, duty: 0.25, vol: 0.1, decay: 0.7, vibrato: 0.004 }), v, 0.15);
      }
    }
    for (let e = 0; e < 8; e++) {
      const t = t0 + (e * beat) / 2;
      if (s.hat && !s.hat16) mix.add(t, hat, v * (e % 2 ? 0.6 : 1), -0.3);
      if (s.bass && !s.bass16) {
        const off = [0, 0, 12, 0, 7, 0, 12, 7][e];
        mix.add(t, tone({ f0: midi(chord.root - 12 + off), dur: beat / 2 - 0.01, wave: "triangle", vol: 0.32, decay: 0.3 }), v);
      }
    }
    for (let x = 0; x < 16; x++) {
      const t = t0 + (x * beat) / 4;
      if (s.hat16) mix.add(t, hat, v * (x % 2 ? 0.55 : 0.9), -0.3);
      if (s.bass16) mix.add(t, tone({ f0: midi(chord.root - 12 + (x % 2 ? 12 : 0)), dur: beat / 4 - 0.005, wave: "triangle", vol: 0.3, decay: 0.3 }), v);
      if (s.arp) {
        const order = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3];
        mix.add(t, tone({ f0: midi(chord.root + 24 + tones[order[x]]), dur: beat / 4, duty: 0.125, vol: 0.055, decay: 1.2 }), v, 0.35);
      }
    }
    if (s.riser) mix.add(t0, noise({ dur: bar, lp0: 200, lp1: 9000, vol: 0.25, attack: bar * 0.9, decay: 0.2 }), v);
    if (s.hit) {
      for (const n of [0, ...tones]) mix.add(t0, tone({ f0: midi(chord.root + 12 + n), dur: bar * 1.5, duty: 0.25, vol: 0.09, decay: 1.2 }), v);
      mix.add(t0, kick, v);
      mix.add(t0, noise({ dur: 1.2, lp0: 8000, lp1: 1000, vol: 0.25, decay: 2 }), v);
    }
  });
}
