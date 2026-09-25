import type Phaser from "phaser";
import type { BattleEvent } from "@/engine";
import { composePingo, type Grid, type PingoLook } from "@/sprites/compose";
import { gearFromSprites, type GearSprites } from "@/sprites/items";
import { buildTimeline, type FeedEntry, type Step, type Timeline } from "./timeline";

/**
 * Phaser scene that PLAYS BACK a stored battle. It contains no combat logic:
 * every number shown comes from the saved event log.
 */

export interface ArenaParticipant {
  id: string;
  pingoName: string;
  look: PingoLook;
  gear: GearSprites;
}

export interface ArenaCallbacks {
  onFeed: (entry: FeedEntry) => void;
  onVictory: (winnerId: string) => void;
  onReset: () => void;
  onProgress?: (elapsed: number, total: number) => void;
}

export interface ArenaController {
  play(): void;
  pause(): void;
  setSpeed(speed: number): void;
  restart(): void;
  skipToEnd(): void;
  destroy(): void;
}

const W = 720;
const H = 440;
const ARENA = { x: 36, y: 64, w: W - 72, h: H - 96 };
const COLORS = {
  grassA: 0x8fd16a,
  grassB: 0x7fc45c,
  path: 0xd8c38a,
  wall: 0x5e3a22,
  wallTop: 0x9a6232,
  ink: 0x231a2e,
};

interface Fighter {
  id: string;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  hpBar: Phaser.GameObjects.Graphics;
  maxHp: number;
  hp: number;
  baseX: number;
  baseY: number;
  alive: boolean;
}

function drawGrid(scene: Phaser.Scene, key: string, grid: Grid) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, grid[0].length, grid.length)!;
  const ctx = tex.getContext();
  grid.forEach((row, y) =>
    row.forEach((color, x) => {
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  tex.refresh();
}

export function mountArena(
  PhaserLib: typeof Phaser,
  parent: HTMLElement,
  data: { participants: ArenaParticipant[]; events: BattleEvent[]; fontFamily: string; forceTimeout?: boolean },
  callbacks: ArenaCallbacks,
): ArenaController {
  const names = Object.fromEntries(data.participants.map((p) => [p.id, p.pingoName]));
  const timeline: Timeline = buildTimeline(data.events, names);
  const spawns = new Map(
    data.events.filter((e): e is Extract<BattleEvent, { type: "spawn" }> => e.type === "spawn").map((e) => [e.id, e]),
  );
  const n = data.participants.length;
  const pingoScale = n <= 6 ? 2.2 : n <= 12 ? 1.8 : n <= 20 ? 1.5 : 1.25;
  const font = data.fontFamily || "monospace";

  const state = { playing: true, speed: 1, elapsed: 0, stepIndex: 0, feedIndex: 0, finished: false };

  class ArenaScene extends PhaserLib.Scene {
    fighters = new Map<string, Fighter>();
    zone?: Phaser.GameObjects.Graphics;
    zoneInset = 0;
    vignette?: Phaser.GameObjects.Graphics;

    constructor() {
      super("arena");
    }

    toScreen(x: number, y: number) {
      return { x: ARENA.x + x * ARENA.w, y: ARENA.y + 10 + y * (ARENA.h - 20) };
    }

    create() {
      state.elapsed = 0;
      state.stepIndex = 0;
      state.feedIndex = 0;
      state.finished = false;
      this.fighters.clear();
      this.zone = undefined;
      this.zoneInset = 0;
      this.vignette = undefined;
      this.tweens.timeScale = state.speed;
      this.time.timeScale = state.speed;

      this.drawArena();
      this.makeSharedTextures();

      data.participants.forEach((p, i) => this.createFighter(p, i));

      // title
      this.add
        .text(W / 2, 22, "PINGO BATTLE ROYALE", { fontFamily: font, fontSize: "26px", color: "#ffd23f", stroke: "#231a2e", strokeThickness: 6 })
        .setOrigin(0.5)
        .setResolution(2);
    }

    drawArena() {
      const g = this.add.graphics();
      g.fillStyle(0x3a2a4a, 1).fillRect(0, 0, W, H);
      // checker grass
      const tile = 24;
      for (let y = ARENA.y; y < ARENA.y + ARENA.h; y += tile) {
        for (let x = ARENA.x; x < ARENA.x + ARENA.w; x += tile) {
          const odd = ((x - ARENA.x) / tile + (y - ARENA.y) / tile) % 2 === 0;
          g.fillStyle(odd ? COLORS.grassA : COLORS.grassB, 1).fillRect(x, y, tile, tile);
        }
      }
      // center ring
      g.lineStyle(4, COLORS.path, 0.8).strokeCircle(W / 2, ARENA.y + ARENA.h / 2, 70);
      // little flowers/rocks (deterministic)
      for (let i = 0; i < 40; i++) {
        const x = ARENA.x + ((i * 97) % ARENA.w);
        const y = ARENA.y + ((i * 53) % ARENA.h);
        g.fillStyle(i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0xffd23f : 0x5e8c3a, 1).fillRect(x, y, 3, 3);
      }
      // walls
      g.fillStyle(COLORS.wall, 1).fillRect(ARENA.x - 10, ARENA.y - 10, ARENA.w + 20, 10);
      g.fillStyle(COLORS.wall, 1).fillRect(ARENA.x - 10, ARENA.y + ARENA.h, ARENA.w + 20, 10);
      g.fillStyle(COLORS.wall, 1).fillRect(ARENA.x - 10, ARENA.y, 10, ARENA.h);
      g.fillStyle(COLORS.wall, 1).fillRect(ARENA.x + ARENA.w, ARENA.y, 10, ARENA.h);
      g.fillStyle(COLORS.wallTop, 1).fillRect(ARENA.x - 10, ARENA.y - 10, ARENA.w + 20, 4);
    }

    makeSharedTextures() {
      if (!this.textures.exists("px")) {
        const t = this.textures.createCanvas("px", 2, 2)!;
        t.getContext().fillStyle = "#ffffff";
        t.getContext().fillRect(0, 0, 2, 2);
        t.refresh();
      }
      if (!this.textures.exists("tomb")) {
        drawGrid(
          this,
          "tomb",
          [
            "..kkkk..",
            ".kWWWWk.",
            "kWWkWWWk",
            "kWkkkWWk",
            "kWWkWWWk",
            "kWWkWWWk",
            "kWWWWWWk",
            "kkkkkkkk",
          ].map((row) => [...row].map((c) => (c === "k" ? "#231a2e" : c === "W" ? "#c9c3d2" : null))),
        );
      }
    }

    createFighter(p: ArenaParticipant, index: number) {
      const spawn = spawns.get(p.id);
      const gear = gearFromSprites(p.gear);
      drawGrid(this, `pingo-${p.id}`, composePingo(p.look, gear));
      drawGrid(this, `pingo-${p.id}-blink`, composePingo(p.look, gear, { blink: true }));

      const pos = this.toScreen(spawn?.x ?? 0.5, spawn?.y ?? 0.5);
      const container = this.add.container(pos.x, pos.y);
      const shadow = this.add.ellipse(0, 0, 22 * pingoScale, 6 * pingoScale, 0x000000, 0.2);
      const sprite = this.add.image(0, 0, `pingo-${p.id}`).setOrigin(0.5, 0.9).setScale(pingoScale);
      const label = this.add
        .text(0, -36 * pingoScale, p.pingoName, {
          fontFamily: font,
          fontSize: `${Math.round(9 + pingoScale * 2)}px`,
          color: "#ffffff",
          stroke: "#231a2e",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setResolution(2);
      const hpBar = this.add.graphics();
      container.add([shadow, sprite, hpBar, label]);
      container.setDepth(pos.y);

      const fighter: Fighter = {
        id: p.id,
        container,
        sprite,
        label,
        hpBar,
        maxHp: spawn?.maxHp ?? 100,
        hp: spawn?.hp ?? 100,
        baseX: pos.x,
        baseY: pos.y,
        alive: true,
      };
      this.fighters.set(p.id, fighter);
      this.drawHp(fighter);

      // drop-in intro
      container.y = pos.y - 300;
      container.alpha = 0;
      this.tweens.add({ targets: container, y: pos.y, alpha: 1, duration: 500, delay: 80 + index * 40, ease: "Bounce.easeOut" });
      // idle bob (on the sprite, so container moves stay free)
      this.tweens.add({
        targets: sprite,
        scaleY: pingoScale * 0.95,
        scaleX: pingoScale * 1.03,
        duration: 500 + ((index * 67) % 300),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      // blink
      this.time.addEvent({
        delay: 2200 + ((index * 331) % 2500),
        loop: true,
        callback: () => {
          if (!fighter.alive) return;
          sprite.setTexture(`pingo-${p.id}-blink`);
          this.time.delayedCall(130, () => fighter.alive && sprite.setTexture(`pingo-${p.id}`));
        },
      });
    }

    drawHp(f: Fighter) {
      const w = 26 * pingoScale;
      const h = 4 + pingoScale;
      const y = -33 * pingoScale + 12;
      const ratio = Math.max(0, f.hp / f.maxHp);
      const color = ratio > 0.6 ? 0x4fbf5a : ratio > 0.3 ? 0xffd23f : 0xe84a4a;
      f.hpBar.clear();
      f.hpBar.fillStyle(COLORS.ink, 1).fillRect(-w / 2 - 2, y - 2, w + 4, h + 4);
      f.hpBar.fillStyle(0x4d4658, 1).fillRect(-w / 2, y, w, h);
      f.hpBar.fillStyle(color, 1).fillRect(-w / 2, y, w * ratio, h);
    }

    floatText(x: number, y: number, text: string, color: string, size = 16, rise = 36) {
      const t = this.add
        .text(x, y, text, { fontFamily: font, fontSize: `${size}px`, color, stroke: "#231a2e", strokeThickness: 5 })
        .setOrigin(0.5)
        .setDepth(2000)
        .setResolution(2);
      this.tweens.add({ targets: t, y: y - rise, alpha: { from: 1, to: 0 }, duration: 900, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
    }

    burst(x: number, y: number, colors: number[], count = 10) {
      for (let i = 0; i < count; i++) {
        const p = this.add.image(x, y, "px").setTint(colors[i % colors.length]).setScale(2).setDepth(1500);
        const angle = (Math.PI * 2 * i) / count;
        this.tweens.add({
          targets: p,
          x: x + Math.cos(angle) * (18 + (i % 3) * 8),
          y: y + Math.sin(angle) * (18 + (i % 3) * 8) - 10,
          alpha: 0,
          duration: 500,
          onComplete: () => p.destroy(),
        });
      }
    }

    runStep(step: Step) {
      switch (step.kind) {
        case "attack":
          return this.playAttack(step);
        case "eliminate":
          return this.playEliminate(step.event.id);
        case "adrenaline": {
          const f = this.fighters.get(step.id);
          if (!f) return;
          this.floatText(f.container.x, f.container.y - 50 * pingoScale * 0.6, "ADRENALINA!", "#ff6fa8", 14);
          f.sprite.setTint(0xffb0b0);
          this.time.delayedCall(600, () => f.sprite.clearTint());
          return;
        }
        case "zone":
          return this.playZone(step);
        case "banner":
          return this.showBanner(step.text, step.tone, step.duration);
        case "victory":
          return this.playVictory(step.id);
      }
    }

    playAttack(step: Extract<Step, { kind: "attack" }>) {
      const e = step.event;
      const a = this.fighters.get(e.attacker);
      const t = this.fighters.get(e.target);
      if (!a || !t) return;
      const dest = this.toScreen(e.x, e.y);
      const d = step.duration;
      a.sprite.setFlipX(t.container.x < dest.x);
      a.container.setDepth(dest.y + 1);

      this.tweens.add({ targets: a.container, x: dest.x, y: dest.y, duration: d * 0.38, ease: "Quad.easeOut" });
      const dx = Math.sign(t.container.x - dest.x || 1) * 12;
      this.tweens.add({ targets: a.container, x: dest.x + dx, duration: d * 0.12, delay: d * 0.4, yoyo: true, ease: "Quad.easeIn" });

      this.time.delayedCall(d * 0.5, () => {
        const tx = t.container.x;
        const ty = t.container.y - 30 * pingoScale;
        if (e.dodged) {
          this.tweens.add({ targets: t.container, x: tx + (dx > 0 ? 16 : -16), duration: d * 0.15, yoyo: true });
          this.floatText(tx, ty, "ESQUIVOU!", "#5ad1e6", 14);
          return;
        }
        t.hp = e.targetHp;
        this.drawHp(t);
        t.sprite.setTintFill(0xffffff);
        this.time.delayedCall(90, () => t.sprite.clearTint());
        this.tweens.add({ targets: t.sprite, x: { from: -4, to: 4 }, duration: 50, yoyo: true, repeat: 2, onComplete: () => t.sprite.setX(0) });

        if (e.crit) {
          this.floatText(tx, ty - 8, `CRÍTICO! -${e.damage}`, "#ffd23f", 22, 50);
          this.cameras.main.shake(180, 0.008);
          this.burst(tx, ty + 10, [0xffd23f, 0xffffff, 0xf28c28], 14);
        } else {
          this.floatText(tx, ty, `-${e.damage}`, "#ffffff", 16);
          this.burst(tx, ty + 12, [0xffffff, 0xc9c3d2], 6);
        }
        if (e.blocked) this.floatText(tx + 26, ty + 14, "BLOQUEIO", "#c9c3d2", 11, 20);
        if (e.tags.includes("firstStrike")) this.floatText(tx, ty - 26, "GOLPE DE ABERTURA!", "#f28c28", 12, 24);
        if (e.tags.includes("openingGuard")) this.floatText(tx - 24, ty + 14, "GUARDA!", "#5aa9f0", 11, 20);
        if (e.tags.includes("chaosHigh")) this.floatText(tx, ty - 26, "CAOS!!", "#9b6bf2", 14, 24);
        if (e.tags.includes("chaosLow")) this.floatText(tx, ty - 26, "caos...", "#9b6bf2", 10, 20);
      });
    }

    playEliminate(id: string) {
      const f = this.fighters.get(id);
      if (!f || !f.alive) return;
      f.alive = false;
      f.hp = 0;
      this.drawHp(f);
      this.burst(f.container.x, f.container.y - 20, [0xffffff, 0xc9c3d2, 0x8b8397], 12);
      this.tweens.killTweensOf(f.sprite);
      this.tweens.add({
        targets: f.sprite,
        angle: 360,
        scale: 0,
        alpha: 0,
        duration: 550,
        ease: "Back.easeIn",
        onComplete: () => {
          f.hpBar.setVisible(false);
          f.label.setAlpha(0.45).setY(-8);
          const tomb = this.add.image(0, 0, "tomb").setOrigin(0.5, 1).setScale(pingoScale * 1.4).setAlpha(0.9);
          f.container.addAt(tomb, 1);
        },
      });
    }

    playZone(step: Extract<Step, { kind: "zone" }>) {
      if (!this.zone) {
        this.zone = this.add.graphics().setDepth(1900);
      }
      this.zoneInset = Math.min(this.zoneInset + 10, 120);
      const i = this.zoneInset;
      this.zone.clear();
      this.zone.fillStyle(0xe84a4a, 0.28);
      this.zone.fillRect(ARENA.x, ARENA.y, ARENA.w, i);
      this.zone.fillRect(ARENA.x, ARENA.y + ARENA.h - i, ARENA.w, i);
      this.zone.fillRect(ARENA.x, ARENA.y + i, i, ARENA.h - 2 * i);
      this.zone.fillRect(ARENA.x + ARENA.w - i, ARENA.y + i, i, ARENA.h - 2 * i);
      this.zone.lineStyle(3, 0xe84a4a, 0.9).strokeRect(ARENA.x + i, ARENA.y + i, ARENA.w - 2 * i, ARENA.h - 2 * i);
      for (const hit of step.hits) {
        const f = this.fighters.get(hit.id);
        if (!f) continue;
        f.hp = hit.hp;
        this.drawHp(f);
        this.floatText(f.container.x, f.container.y - 30 * pingoScale, `-${hit.damage}`, "#d0457e", 14);
        f.sprite.setTint(0xff8080);
        this.time.delayedCall(200, () => f.sprite.clearTint());
      }
    }

    showBanner(text: string, tone: "info" | "danger" | "final", duration: number) {
      const color = tone === "info" ? 0xffd23f : tone === "danger" ? 0xe84a4a : 0xff6fa8;
      const bar = this.add.rectangle(W / 2, H / 2, W, 64, COLORS.ink, 0.85).setDepth(3000);
      const label = this.add
        .text(W / 2, H / 2, text, {
          fontFamily: font,
          fontSize: tone === "final" ? "40px" : "34px",
          color: `#${color.toString(16).padStart(6, "0")}`,
          stroke: "#231a2e",
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setDepth(3001)
        .setResolution(2)
        .setScale(0.2);
      this.tweens.add({ targets: label, scale: 1, duration: 280, ease: "Back.easeOut" });
      this.tweens.add({ targets: [bar, label], alpha: 0, delay: duration - 350, duration: 350, onComplete: () => { bar.destroy(); label.destroy(); } });
      if (tone === "final" && !this.vignette) {
        // tension: pulsing red frame for the final Pingos
        this.vignette = this.add.graphics().setDepth(2500);
        this.vignette.lineStyle(14, 0xe84a4a, 1).strokeRect(7, 7, W - 14, H - 14);
        this.tweens.add({ targets: this.vignette, alpha: { from: 0.15, to: 0.6 }, duration: 600, yoyo: true, repeat: -1 });
      }
    }

    playVictory(id: string) {
      const f = this.fighters.get(id);
      this.vignette?.destroy();
      if (!f) return;
      f.container.setDepth(2800);
      this.tweens.killTweensOf(f.container);
      this.tweens.add({ targets: f.container, x: W / 2, y: H / 2 + 60, duration: 700, ease: "Quad.easeOut" });
      this.tweens.killTweensOf(f.sprite);
      f.sprite.setScale(pingoScale);
      this.tweens.add({ targets: f.sprite, scale: 3.4, duration: 700, ease: "Back.easeOut" });
      this.tweens.add({ targets: f.sprite, y: -26, duration: 280, yoyo: true, repeat: -1, delay: 800, ease: "Quad.easeOut" });
      f.label.setFontSize(20).setY(-36 * 3.4 - 6);
      f.hpBar.setVisible(false);

      const colors = [0xffd23f, 0xff6fa8, 0x34c6b8, 0x7b5cff, 0x4fbf5a, 0xe84a4a, 0xffffff];
      for (let i = 0; i < 140; i++) {
        const c = this.add
          .image((i * 53) % W, -10 - ((i * 37) % 200), "px")
          .setTint(colors[i % colors.length])
          .setScale(2 + (i % 3))
          .setDepth(2900);
        this.tweens.add({
          targets: c,
          y: H + 20,
          x: c.x + (((i * 29) % 80) - 40),
          angle: 360 * ((i % 2) * 2 - 1),
          duration: 1800 + ((i * 71) % 1600),
          delay: (i * 23) % 1200,
          repeat: 2,
        });
      }
      callbacks.onVictory(id);
    }

    update(_time: number, delta: number) {
      if (!state.playing || state.finished) return;
      state.elapsed += delta * state.speed;
      while (state.stepIndex < timeline.steps.length && timeline.steps[state.stepIndex].at <= state.elapsed) {
        this.runStep(timeline.steps[state.stepIndex++]);
      }
      while (state.feedIndex < timeline.feed.length && timeline.feed[state.feedIndex].at <= state.elapsed) {
        callbacks.onFeed(timeline.feed[state.feedIndex++]);
      }
      callbacks.onProgress?.(Math.min(state.elapsed, timeline.duration), timeline.duration);
      if (state.stepIndex >= timeline.steps.length && state.elapsed > timeline.duration) state.finished = true;
    }
  }

  const game = new PhaserLib.Game({
    type: PhaserLib.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: "#3a2a4a",
    pixelArt: true,
    // debug aid: requestAnimationFrame stops in hidden tabs, setTimeout keeps ticking
    fps: data.forceTimeout ? { forceSetTimeOut: true, target: 30 } : undefined,
    scale: { mode: PhaserLib.Scale.FIT, autoCenter: PhaserLib.Scale.CENTER_BOTH },
    scene: ArenaScene,
    banner: false,
  });

  const scene = () => game.scene.getScene("arena") as InstanceType<typeof ArenaScene> | null;

  return {
    play() {
      state.playing = true;
      const s = scene();
      if (s) {
        s.tweens.resumeAll();
        s.time.paused = false;
      }
    },
    pause() {
      state.playing = false;
      const s = scene();
      if (s) {
        s.tweens.pauseAll();
        s.time.paused = true;
      }
    },
    setSpeed(speed: number) {
      state.speed = speed;
      const s = scene();
      if (s) {
        s.tweens.timeScale = speed;
        s.time.timeScale = speed;
      }
    },
    restart() {
      callbacks.onReset();
      state.playing = true;
      scene()?.scene.restart();
    },
    skipToEnd() {
      // jump to the victory: show every remaining feed entry and the final state instantly
      const s = scene();
      if (!s) return;
      while (state.stepIndex < timeline.steps.length) {
        const step = timeline.steps[state.stepIndex++];
        if (step.kind === "attack") {
          const f = s.fighters.get(step.event.target);
          if (f && !step.event.dodged) {
            f.hp = step.event.targetHp;
            s.drawHp(f);
          }
        } else if (step.kind === "eliminate" || step.kind === "victory") {
          s.runStep(step);
        }
      }
      while (state.feedIndex < timeline.feed.length) callbacks.onFeed(timeline.feed[state.feedIndex++]);
      state.elapsed = timeline.duration;
      state.playing = true;
    },
    destroy() {
      game.destroy(true);
    },
  };
}
