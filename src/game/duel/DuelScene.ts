import type Phaser from "phaser";
import type { BattleEvent } from "@/engine";
import { HAND_ROWS } from "@/sprites/data/base";
import { composeItemIcon, composePingo, type Grid, type PingoLook } from "@/sprites/compose";
import { ICONS } from "@/sprites/icons";
import { BODY_COLORS, PALETTE } from "@/sprites/palette";
import { WEAPON_ART, gearFromSprites, type GearSprites } from "@/sprites/items";
import { sfx, startMusic, stopMusic } from "./sfx";
import { weaponFx, type Debris, type WeaponFx } from "./weapon-fx";

/**
 * 1v1 duel PLAYBACK: a fighting-game style show (VS intro, hits, crits, K.O.) driven by the
 * engine's event log. No combat logic here — every number comes from the events.
 */

export interface DuelFighter {
  id: string;
  pingoName: string;
  displayName: string;
  look: PingoLook;
  gear: GearSprites;
  level?: number;
}

export interface DuelData {
  /** the student watching (always on the left) */
  you: DuelFighter;
  foe: DuelFighter;
  events: BattleEvent[];
  fontFamily: string;
  forceTimeout?: boolean;
}

export interface DuelCallbacks {
  onFinished: (winnerId: string) => void;
}

export interface DuelController {
  setSpeed(speed: number): void;
  destroy(): void;
}

const W = 960;
const H = 540;
const GROUND = 440;
/** sprite scale: a 40px Pingo becomes 200px */
const S = 5;
const HOME = { left: 300, right: W - 300 };
const INK = 0x231a2e;
const SIDE_COLOR = { left: 0xffd23f, right: 0x7b5cff };

type Side = "left" | "right";

interface Fighter {
  id: string;
  side: Side;
  dir: 1 | -1;
  data: DuelFighter;
  fx: WeaponFx;
  container: Phaser.GameObjects.Container;
  rig: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  weapon: Phaser.GameObjects.Image | null;
  hand: Phaser.GameObjects.Image | null;
  shadow: Phaser.GameObjects.Ellipse;
  hp: number;
  maxHp: number;
  hpBar: { fill: Phaser.GameObjects.Rectangle; trail: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; x: number; w: number };
  idle: Phaser.Tweens.Tween | null;
}

interface Particle {
  obj: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.AlphaSingle & Phaser.GameObjects.GameObject;
  vx: number;
  vy: number;
  va: number;
  gravity: number;
  drag: number;
  life: number;
  age: number;
  flutter?: number;
  grow?: number;
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

/** Tiny pixel textures from strings ('.' = transparent). */
function drawPixels(scene: Phaser.Scene, key: string, rows: string[], colors: Record<string, string>) {
  drawGrid(
    scene,
    key,
    rows.map((r) => [...r].map((c) => colors[c] ?? null)),
  );
}

export function mountDuel(PhaserLib: typeof Phaser, parent: HTMLElement, data: DuelData, callbacks: DuelCallbacks): DuelController {
  const font = data.fontFamily || "monospace";
  const px = (size: number) => `${Math.round(size * 1.25)}px`;
  let speed = 1;
  let destroyed = false;

  class DuelScene extends PhaserLib.Scene {
    world!: Phaser.GameObjects.Layer;
    ui!: Phaser.GameObjects.Layer;
    uiCam!: Phaser.Cameras.Scene2D.Camera;
    fighters = new Map<string, Fighter>();
    particles: Particle[] = [];
    crowd: Phaser.GameObjects.Image[] = [];
    rays!: Phaser.GameObjects.Image;
    clouds: Phaser.GameObjects.Image[] = [];
    slowMo = 1;
    pace = 1;

    constructor() {
      super("duel");
    }

    // ------------------------------------------------------------ helpers
    wait(ms: number) {
      return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()));
    }

    tw(config: Phaser.Types.Tweens.TweenBuilderConfig) {
      return new Promise<void>((resolve) => {
        this.tweens.add({ ...config, onComplete: () => resolve() });
      });
    }

    text(x: number, y: number, value: string, size: number, color = "#ffffff", stroke = 8) {
      return this.add
        .text(x, y, value, { fontFamily: font, fontSize: px(size), color, stroke: "#231a2e", strokeThickness: stroke, align: "center" })
        .setOrigin(0.5)
        .setResolution(2);
    }

    toWorld<T extends Phaser.GameObjects.GameObject>(obj: T): T {
      this.world.add(obj);
      return obj;
    }

    toUi<T extends Phaser.GameObjects.GameObject>(obj: T): T {
      this.ui.add(obj);
      return obj;
    }

    // ------------------------------------------------------------ setup
    create() {
      this.world = this.add.layer();
      this.ui = this.add.layer().setDepth(100);
      this.uiCam = this.cameras.add(0, 0, W, H);
      this.cameras.main.ignore(this.ui);
      this.uiCam.ignore(this.world);
      this.tweens.timeScale = speed;
      this.time.timeScale = speed;

      this.makeTextures();
      this.drawBackground();
      this.createFighter(data.you, "left");
      this.createFighter(data.foe, "right");
      this.drawHud();

      void this.direct();
    }

    makeTextures() {
      const k = "#231a2e";
      drawPixels(this, "px", ["ww", "ww"], { w: "#ffffff" });
      drawPixels(this, "star", ["...y...", "..yyy..", "yyyyyyy", ".yyyyy.", ".yy.yy.", "y.....y"], { y: "#ffd23f" });
      drawPixels(
        this,
        "keycap",
        ["kkkkkkkkkk", "kwwwwwwwwk", "kwwwwwwwwk", "kwwwwwwwwk", "kwwwwwwwwk", "kwwwwwwwwk", "kwwwwwwwwk", "kWWWWWWWWk", "kWWWWWWWWk", "kkkkkkkkkk"],
        { k, w: "#fbf7ef", W: "#c9c3d2" },
      );
      drawPixels(this, "page", ["wwwwwww", "wkkkkkw", "wwwwwww", "wkkkkww", "wwwwwww", "wkkkkkw", "wwwwwww", "wkkkwww", "wwwwwww"], { w: "#fbf7ef", k: "#8b8397" });
      drawPixels(this, "feather", ["..ww", ".wwW", "wwW.", "wW..", "W..."], { w: "#fbf7ef", W: "#ffd23f" });
      drawPixels(this, "drop", [".c.", "ccc", "cCc", ".c."], { c: "#5ad1e6", C: "#3b7de0" });
      drawPixels(this, "spike", ["e", "e", "E", "E"], { e: "#8fdc5a", E: "#22683b" });
      drawPixels(this, "splinter", ["nnN", "NNm"], { n: "#d8a866", N: "#9a6232", m: "#5e3a22" });
      drawPixels(this, "bolt", ["..yy", ".yy.", "yyyy", ".yy.", "yy..", "y..."], { y: "#ffd23f" });
      drawPixels(this, "wifi", [".ccccc.", "c.....c", "..ccc..", ".c...c.", "...c..."], { c: "#5ad1e6" });
      drawPixels(this, "smoke", [".ggg.", "ggggg", "ggggg", ".ggg."], { g: "#c9c3d2" });
      // the same pixel icon the UI uses (an emoji note would look different on every device)
      drawPixels(this, "note-icon", ICONS.note.rows, PALETTE);
      drawPixels(this, "cloud", ["....wwww......", "..wwwwwwww.ww.", ".wwwwwwwwwwwww", "wwwwwwwwwwwwww", ".WWWWWWWWWWWW."], { w: "#ffffff", W: "#dfe8ff" });

      // crowd heads: little Pingos in every body color
      Object.entries(BODY_COLORS).forEach(([name, c]) => {
        drawPixels(
          this,
          `fan-${name}`,
          ["..kkkk..", ".kmmmmk.", "kmmmmmmk", "kmkmmkmk", "kmmmmmmk", "kssssssk", ".kkkkkk."],
          { k, m: c.main, s: c.shade },
        );
      });

      // sun rays: a big wheel of alternating wedges, rotated slowly behind the action
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const R = 700;
      for (let i = 0; i < 24; i++) {
        const a0 = (i / 24) * Math.PI * 2;
        const a1 = ((i + 0.5) / 24) * Math.PI * 2;
        g.fillStyle(0xffffff, 1);
        g.fillTriangle(R, R, R + Math.cos(a0) * R, R + Math.sin(a0) * R, R + Math.cos(a1) * R, R + Math.sin(a1) * R);
      }
      if (this.textures.exists("rays")) this.textures.remove("rays");
      g.generateTexture("rays", R * 2, R * 2);
      g.destroy();
    }

    drawBackground() {
      const first = this.world.length;
      const sky = this.toWorld(this.add.graphics());
      sky.fillGradientStyle(0x6fc3ff, 0x6fc3ff, 0xffd9a8, 0xffd9a8, 1);
      sky.fillRect(-200, -200, W + 400, GROUND + 200);
      this.rays = this.toWorld(this.add.image(W / 2, GROUND - 60, "rays").setAlpha(0.12).setScale(1.2));
      for (let i = 0; i < 6; i++) {
        const c = this.toWorld(this.add.image((i * 197) % W, 40 + ((i * 53) % 150), "cloud").setScale(4 + (i % 3)).setAlpha(0.9));
        this.clouds.push(c);
      }
      // far hills
      const hills = this.toWorld(this.add.graphics());
      hills.fillStyle(0x8fd16a, 1);
      for (let x = -200; x < W + 200; x += 160) hills.fillCircle(x, GROUND - 30, 110);
      hills.fillStyle(0x6fb85a, 1);
      for (let x = -120; x < W + 200; x += 210) hills.fillCircle(x, GROUND - 10, 80);

      // the crowd behind the barrier
      const colors = Object.keys(BODY_COLORS);
      for (let i = 0; i < 30; i++) {
        const x = 20 + i * 32 + ((i * 7) % 9);
        const fan = this.toWorld(this.add.image(x, GROUND - 52 + ((i * 5) % 8), `fan-${colors[i % colors.length]}`).setScale(4).setOrigin(0.5, 1));
        this.crowd.push(fan);
        this.tweens.add({ targets: fan, y: fan.y - 6, duration: 380 + ((i * 37) % 200), yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: (i * 61) % 400 });
      }
      const barrier = this.toWorld(this.add.graphics());
      barrier.fillStyle(INK, 1).fillRect(-200, GROUND - 46, W + 400, 8);
      barrier.fillStyle(0xff6fa8, 1).fillRect(-200, GROUND - 38, W + 400, 14);
      barrier.fillStyle(0xffffff, 1);
      for (let x = -200; x < W + 200; x += 48) barrier.fillRect(x, GROUND - 38, 24, 14);

      // stage floor
      const floor = this.toWorld(this.add.graphics());
      floor.fillStyle(0x3a2a4a, 1).fillRect(-200, GROUND - 24, W + 400, H - GROUND + 300);
      for (let x = -200; x < W + 200; x += 40) {
        floor.fillStyle(((x / 40) & 1) === 0 ? 0x4d3a62 : 0x45345a, 1).fillRect(x, GROUND - 24, 40, H);
      }
      floor.fillStyle(0xffd23f, 1).fillRect(-200, GROUND - 24, W + 400, 5);
      // everything drawn so far is scenery: keep it behind fighters and effects
      this.world.list.slice(first).forEach((obj, i) => (obj as unknown as Phaser.GameObjects.Components.Depth).setDepth(-100 + i * 0.01));
    }

    createFighter(d: DuelFighter, side: Side) {
      const gear = gearFromSprites(d.gear);
      const key = `duel-${side}`;
      drawGrid(this, key, composePingo(d.look, { helmet: gear.helmet, outfit: gear.outfit }));
      drawGrid(this, `${key}-blink`, composePingo(d.look, { helmet: gear.helmet, outfit: gear.outfit }, { blink: true }));
      drawGrid(this, `${key}-full`, composePingo(d.look, gear));
      const weaponArt = d.gear.weapon ? WEAPON_ART[d.gear.weapon] : null;
      if (weaponArt) {
        drawGrid(this, `${key}-weapon`, composeItemIcon("weapon", weaponArt));
        // the right hand alone, drawn over the weapon grip
        const bodyGrid = composePingo(d.look, { helmet: gear.helmet, outfit: gear.outfit });
        const hand: Grid = bodyGrid.map((row, y) => row.map((c, x) => (HAND_ROWS[y]?.[x] && HAND_ROWS[y][x] !== "." ? c : null)));
        drawGrid(this, `${key}-hand`, hand);
      }

      const dir: 1 | -1 = side === "left" ? 1 : -1;
      const container = this.toWorld(this.add.container(HOME[side], GROUND));
      const shadow = this.add.ellipse(0, 0, 26 * S, 7 * S, 0x000000, 0.25);
      const rig = this.add.container(0, 0);
      const body = this.add.image(-19.5 * S, -37 * S, key).setOrigin(0, 0).setScale(S);
      rig.add(body);
      let weapon: Phaser.GameObjects.Image | null = null;
      let hand: Phaser.GameObjects.Image | null = null;
      if (weaponArt) {
        // grip pixel (32.5, 25) is the rotation pivot
        weapon = this.add.image((32.5 - 19.5) * S, (25 - 37) * S, `${key}-weapon`).setOrigin(32.5 / 40, 25 / 40).setScale(S);
        hand = this.add.image(-19.5 * S, -37 * S, `${key}-hand`).setOrigin(0, 0).setScale(S);
        rig.add([weapon, hand]);
      }
      container.add([shadow, rig]);
      container.scaleX = dir;

      const fighter: Fighter = {
        id: d.id,
        side,
        dir,
        data: d,
        fx: weaponFx(d.gear.weapon),
        container,
        rig,
        body,
        weapon,
        hand,
        shadow,
        hp: 100,
        maxHp: 100,
        hpBar: null as unknown as Fighter["hpBar"],
        idle: null,
      };
      const spawn = data.events.find((e): e is Extract<BattleEvent, { type: "spawn" }> => e.type === "spawn" && e.id === d.id);
      if (spawn) {
        fighter.hp = spawn.hp;
        fighter.maxHp = spawn.maxHp;
      }
      this.fighters.set(d.id, fighter);
      this.startIdle(fighter);
      this.time.addEvent({
        delay: 2400 + (side === "left" ? 0 : 900),
        loop: true,
        callback: () => {
          if (fighter.hp <= 0) return;
          body.setTexture(`${key}-blink`);
          this.time.delayedCall(120, () => body.setTexture(key));
        },
      });
    }

    startIdle(f: Fighter) {
      f.idle?.stop();
      f.rig.setScale(1).setY(0).setAngle(0);
      f.idle = this.tweens.add({ targets: f.rig, scaleY: 0.95, scaleX: 1.03, duration: 420, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    stopIdle(f: Fighter) {
      f.idle?.stop();
      f.idle = null;
      f.rig.setScale(1);
    }

    drawHud() {
      for (const f of this.fighters.values()) {
        const left = f.side === "left";
        const w = 360;
        const x = left ? 40 : W - 40 - w;
        const y = 34;
        this.toUi(this.add.rectangle(x - 4, y - 4, w + 8, 30, INK).setOrigin(0));
        this.toUi(this.add.rectangle(x, y, w, 22, 0x4d4658).setOrigin(0));
        const trail = this.toUi(this.add.rectangle(left ? x : x + w, y, w, 22, 0xffffff).setOrigin(left ? 0 : 1, 0));
        const fill = this.toUi(this.add.rectangle(left ? x : x + w, y, w, 22, 0x4fbf5a).setOrigin(left ? 0 : 1, 0));
        this.toUi(this.add.rectangle(x, y, w, 5, 0xffffff, 0.35).setOrigin(0));
        const name = this.toUi(this.text(left ? x : x + w, y + 46, f.data.pingoName, 20, "#ffffff", 6).setOrigin(left ? 0 : 1, 0.5));
        const lvl = this.toUi(
          this.text(left ? x + name.width + 14 : x + w - name.width - 14, y + 46, `Nv ${f.data.level ?? 1}`, 13, left ? "#ffd23f" : "#c9b8ff", 5).setOrigin(left ? 0 : 1, 0.5),
        );
        void lvl;
        const hpText = this.toUi(this.text(left ? x + w - 6 : x + 6, y + 11, `${f.hp}`, 13, "#ffffff", 4).setOrigin(left ? 1 : 0, 0.5));
        f.hpBar = { fill, trail, text: hpText, x, w };
        this.updateHp(f, false);
      }
      this.toUi(this.text(W / 2, 46, "VS", 26, "#ff6fa8", 8));
    }

    updateHp(f: Fighter, animate = true) {
      const ratio = Math.max(0, f.hp / f.maxHp);
      const color = ratio > 0.6 ? 0x4fbf5a : ratio > 0.3 ? 0xffd23f : 0xe84a4a;
      f.hpBar.fill.setFillStyle(color);
      f.hpBar.text.setText(`${Math.max(0, Math.round(f.hp))}`);
      if (!animate) {
        f.hpBar.fill.width = f.hpBar.w * ratio;
        f.hpBar.trail.width = f.hpBar.w * ratio;
        return;
      }
      this.tweens.add({ targets: f.hpBar.fill, width: f.hpBar.w * ratio, duration: 120 });
      this.tweens.add({ targets: f.hpBar.trail, width: f.hpBar.w * ratio, duration: 500, delay: 350, ease: "Quad.easeIn" });
    }

    // ------------------------------------------------------------ the show
    async direct() {
      await this.introVs();
      await this.readyFight();
      const attacks = data.events.filter((e) => e.type === "attack").length;
      // long duels play a bit faster so every duel lands around 15-30 s
      const pace = Math.min(1.9, Math.max(1, attacks / 11));
      this.setPace(pace);
      for (const ev of data.events) {
        if (destroyed) return;
        if (ev.type === "attack") await this.playAttack(ev);
        else if (ev.type === "adrenaline") await this.adrenaline(ev.id);
        else if (ev.type === "suddenDeath") await this.banner("MORTE SÚBITA!", "#e84a4a", 900);
        else if (ev.type === "zone") await this.zoneHit(ev.id, ev.damage, ev.hp);
        else if (ev.type === "victory") {
          this.setPace(1);
          await this.knockout(ev.id);
        }
      }
    }

    setPace(p: number) {
      this.pace = p;
      this.applyTime();
    }

    /** final clock = user speed (1x/2x) × duel pace × slow motion */
    applyTime() {
      this.tweens.timeScale = speed * this.pace * this.slowMo;
      this.time.timeScale = speed * this.pace * this.slowMo;
    }

    async introVs() {
      const you = this.fighters.get(data.you.id)!;
      const foe = this.fighters.get(data.foe.id)!;
      const overlay = this.toUi(this.add.container(0, 0));
      const bg = this.add.rectangle(0, 0, W, H, INK).setOrigin(0);
      // two diagonal panels
      const pl = this.add.graphics().fillStyle(SIDE_COLOR.left, 1).fillPoints([{ x: 0, y: 0 }, { x: W / 2 + 70, y: 0 }, { x: W / 2 - 70, y: H }, { x: 0, y: H }], true);
      const pr = this.add.graphics().fillStyle(SIDE_COLOR.right, 1).fillPoints([{ x: W / 2 + 70, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: W / 2 - 70, y: H }], true);
      // diagonal stripes for motion
      const stripes = this.add.graphics();
      stripes.fillStyle(0xffffff, 0.12);
      for (let x = -H; x < W + H; x += 60) stripes.fillPoints([{ x, y: 0 }, { x: x + 24, y: 0 }, { x: x + 24 - H * 0.3, y: H }, { x: x - H * 0.3, y: H }], true);
      const portraitL = this.add.image(250, H / 2 + 40, "duel-left-full").setScale(7.5).setOrigin(0.5);
      const portraitR = this.add.image(W - 250, H / 2 + 40, "duel-right-full").setScale(7.5).setOrigin(0.5).setFlipX(true);
      const nameL = this.text(250, 90, you.data.pingoName, 42, "#ffffff", 10);
      const subL = this.text(250, 138, `de ${you.data.displayName} · Nv ${you.data.level ?? 1}`, 18, "#231a2e", 0);
      const nameR = this.text(W - 250, 90, foe.data.pingoName, 42, "#ffffff", 10);
      const subR = this.text(W - 250, 138, `de ${foe.data.displayName} · Nv ${foe.data.level ?? 1}`, 18, "#ffffff", 0);
      const vs = this.text(W / 2, H / 2, "VS", 120, "#ff6fa8", 16).setScale(5).setAlpha(0);
      overlay.add([bg, pl, pr, stripes, portraitL, portraitR, nameL, subL, nameR, subR, vs]);

      pl.x = -W;
      pr.x = W;
      portraitL.x -= 600;
      portraitR.x += 600;
      for (const t of [nameL, subL]) t.x -= 500;
      for (const t of [nameR, subR]) t.x += 500;
      this.tweens.add({ targets: stripes, x: 60, duration: 2600, ease: "Linear" });

      sfx("vsSlide");
      await Promise.all([
        this.tw({ targets: pl, x: 0, duration: 260, ease: "Cubic.easeOut" }),
        this.tw({ targets: pr, x: 0, duration: 260, ease: "Cubic.easeOut" }),
      ]);
      sfx("whoosh");
      await Promise.all([
        this.tw({ targets: portraitL, x: 250, duration: 300, ease: "Back.easeOut" }),
        this.tw({ targets: portraitR, x: W - 250, duration: 300, ease: "Back.easeOut" }),
        this.tw({ targets: [nameL, subL], x: "+=500", duration: 320, ease: "Back.easeOut", delay: 60 }),
        this.tw({ targets: [nameR, subR], x: "-=500", duration: 320, ease: "Back.easeOut", delay: 60 }),
      ]);
      this.tweens.add({ targets: [portraitL, portraitR], scaleY: 7.2, scaleX: 7.8, duration: 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      await this.tw({ targets: vs, scale: 1, alpha: 1, duration: 170, ease: "Quad.easeIn" });
      sfx("vsSlam");
      this.uiCam.shake(320, 0.02);
      this.uiCam.flash(160, 255, 255, 255);
      this.burstLines(overlay, W / 2, H / 2);
      this.tweens.add({ targets: vs, scale: 1.08, duration: 180, yoyo: true, repeat: 3 });
      await this.wait(1250);
      sfx("vsSlide");
      await Promise.all([
        this.tw({ targets: [pl, portraitL, nameL, subL], x: `-=${W}`, duration: 320, ease: "Cubic.easeIn" }),
        this.tw({ targets: [pr, portraitR, nameR, subR], x: `+=${W}`, duration: 320, ease: "Cubic.easeIn" }),
        this.tw({ targets: [vs, bg, stripes], alpha: 0, duration: 320 }),
      ]);
      overlay.destroy();
    }

    burstLines(into: Phaser.GameObjects.Container | null, x: number, y: number) {
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const line = this.add.rectangle(x + Math.cos(a) * 80, y + Math.sin(a) * 80, 60, 6, 0xffffff).setRotation(a);
        if (into) into.add(line);
        else this.toUi(line);
        this.tweens.add({
          targets: line,
          x: x + Math.cos(a) * 420,
          y: y + Math.sin(a) * 420,
          scaleX: 2.5,
          alpha: 0,
          duration: 450,
          ease: "Quad.easeOut",
          onComplete: () => line.destroy(),
        });
      }
    }

    async readyFight() {
      await this.banner("PRONTOS?", "#ffffff", 700, "count");
      startMusic();
      sfx("fight");
      this.cameras.main.shake(200, 0.01);
      this.cheer();
      await this.banner("LUTA!", "#ffd23f", 650, null, 1.6);
    }

    async banner(value: string, color: string, ms: number, sound: Parameters<typeof sfx>[0] | null = null, size = 1) {
      if (sound) sfx(sound);
      const bar = this.toUi(this.add.rectangle(W / 2, H / 2, W, 110, INK, 0.85).setScale(1, 0));
      const t = this.toUi(this.text(W / 2, H / 2, value, 70 * size, color, 12).setScale(3).setAlpha(0));
      this.tweens.add({ targets: bar, scaleY: 1, duration: 140, ease: "Quad.easeOut" });
      await this.tw({ targets: t, scale: 1, alpha: 1, duration: 180, ease: "Back.easeOut" });
      await this.wait(ms - 320);
      await Promise.all([
        this.tw({ targets: t, scaleX: 1.6, scaleY: 0.2, alpha: 0, duration: 140 }),
        this.tw({ targets: bar, scaleY: 0, duration: 140 }),
      ]);
      bar.destroy();
      t.destroy();
    }

    cheer(power = 1) {
      for (const fan of this.crowd) {
        this.tweens.add({ targets: fan, scaleY: 4.6, scaleX: 3.7, duration: 110, yoyo: true, delay: Math.random() * 150 });
        this.tweens.add({ targets: fan, y: `-=${(10 + Math.random() * 14) * power}`, duration: 160, yoyo: true, delay: Math.random() * 150, ease: "Quad.easeOut" });
      }
    }

    // ------------------------------------------------------------ attacks
    async playAttack(ev: Extract<BattleEvent, { type: "attack" }>) {
      const a = this.fighters.get(ev.attacker);
      const t = this.fighters.get(ev.target);
      if (!a || !t) return;
      if (ev.tags.includes("firstStrike")) await this.callout(a, "GOLPE DE ABERTURA!", "#ffd23f");
      if (ev.tags.includes("chaosHigh")) await this.callout(a, "CAOS MÁXIMO!", "#ff6fa8");
      if (ev.tags.includes("chaosLow")) await this.callout(a, "caos fraquinho...", "#c9c3d2");

      this.stopIdle(a);
      a.container.setDepth(2);
      t.container.setDepth(1);
      switch (a.fx.style) {
        case "smash":
          await this.smash(a, t, ev);
          break;
        case "slash":
          await this.slash(a, t, ev);
          break;
        case "stab":
          await this.stab(a, t, ev);
          break;
        case "throw":
          await this.throwWeapon(a, t, ev);
          break;
        case "magic":
          await this.magic(a, t, ev);
          break;
        case "honk":
          await this.honk(a, t, ev);
          break;
        case "bash":
          await this.bash(a, t, ev);
          break;
        default:
          await this.headbutt(a, t, ev);
      }
      if (t.hp > 0) this.startIdle(t);
      this.startIdle(a);
      await this.wait(260);
    }

    /** x where the attacker stands to hit the target from `gap` px away */
    reach(a: Fighter, t: Fighter, gap: number) {
      return t.container.x - a.dir * gap;
    }

    async dash(a: Fighter, toX: number, ms: number) {
      sfx("whoosh");
      this.speedLines(a.container.y - 80, a.dir);
      const ghostTimer = this.time.addEvent({ delay: 35, loop: true, callback: () => this.afterimage(a, 0xffffff) });
      await this.tw({ targets: a.container, x: toX, duration: ms, ease: "Cubic.easeIn" });
      ghostTimer.remove();
    }

    async goHome(a: Fighter, ms = 280) {
      await this.tw({ targets: a.container, x: HOME[a.side], duration: ms, ease: "Quad.easeOut" });
    }

    async smash(a: Fighter, t: Fighter, ev: Extract<BattleEvent, { type: "attack" }>) {
      await this.dash(a, this.reach(a, t, 115), 230);
      // wind up: hop and raise the weapon behind the head
      await Promise.all([
        this.tw({ targets: a.rig, y: -46, duration: 170, ease: "Quad.easeOut" }),
        a.weapon ? this.tw({ targets: a.weapon, angle: -110, duration: 170, ease: "Quad.easeOut" }) : Promise.resolve(),
      ]);
      if (ev.crit) await this.critCharge(a, t);
      await Promise.all([
        this.tw({ targets: a.rig, y: 6, duration: 80, ease: "Quad.easeIn" }),
        a.weapon ? this.tw({ targets: a.weapon, angle: 95, duration: 80, ease: "Quad.easeIn" }) : Promise.resolve(),
      ]);
      await this.impact(a, t, ev, t.container.x - a.dir * 40, GROUND - 120);
      await Promise.all([
        a.weapon ? this.tw({ targets: a.weapon, angle: 0, duration: 200 }) : Promise.resolve(),
        this.tw({ targets: a.rig, y: 0, duration: 200 }),
      ]);
      await this.goHome(a);
    }

    async slash(a: Fighter, t: Fighter, ev: Extract<BattleEvent, { type: "attack" }>) {
      await this.dash(a, this.reach(a, t, 95), 190);
      if (a.weapon) await this.tw({ targets: a.weapon, angle: -130, duration: 120, ease: "Quad.easeOut" });
      if (ev.crit) await this.critCharge(a, t);
      if (a.weapon) await this.tw({ targets: a.weapon, angle: 70, duration: 70 });
      this.slashArc(t.container.x, GROUND - 95, a.dir, a.fx.color ?? 0xffffff, ev.crit);
      await this.impact(a, t, ev, t.container.x - a.dir * 10, GROUND - 100);
      if (a.weapon) this.tweens.add({ targets: a.weapon, angle: 0, duration: 220 });
      await this.goHome(a);
    }

    async stab(a: Fighter, t: Fighter, ev: Extract<BattleEvent, { type: "attack" }>) {
      await this.dash(a, this.reach(a, t, 165), 160);
      if (a.weapon) await this.tw({ targets: a.weapon, angle: 90, duration: 110 });
      if (ev.crit) await this.critCharge(a, t);
      // three quick pokes, the last one lands
      for (let i = 0; i < 2; i++) {
        await this.tw({ targets: a.container, x: `+=${a.dir * 26}`, duration: 55, yoyo: true });
        sfx("whoosh");
      }
      await this.tw({ targets: a.container, x: `+=${a.dir * 46}`, duration: 70 });
      await this.impact(a, t, ev, t.container.x - a.dir * 50, GROUND - 95);
      if (a.weapon) this.tweens.add({ targets: a.weapon, angle: 0, duration: 220 });
      await this.goHome(a);
    }

    async throwWeapon(a: Fighter, t: Fighter, ev: Extract<BattleEvent, { type: "attack" }>) {
      const weapon = a.weapon;
      if (!weapon) return this.headbutt(a, t, ev);
      await this.tw({ targets: a.container, x: `+=${a.dir * 60}`, duration: 160 });
      await this.tw({ targets: weapon, angle: -140, duration: 180, ease: "Quad.easeOut" });
      if (ev.crit) await this.critCharge(a, t);
      await this.tw({ targets: weapon, angle: 40, duration: 70 });
      weapon.setVisible(false);
      sfx("whoosh");
      sfx(a.fx.sfx);
      const sx = a.container.x + a.dir * 60;
      const sy = GROUND - 120;
      const ex = t.container.x - a.dir * 20;
      const ey = GROUND - 100;
      const proj = this.toWorld(this.add.image(sx, sy, `duel-${a.side}-weapon`).setScale(S).setFlipX(a.dir < 0).setDepth(5));
      const path = { p: 0 };
      await this.tw({
        targets: path,
        p: 1,
        duration: 380,
        ease: "Sine.easeIn",
        onUpdate: () => {
          const p = path.p;
          proj.x = sx + (ex - sx) * p;
          proj.y = sy + (ey - sy) * p - Math.sin(p * Math.PI) * 120;
          proj.angle = a.fx.spin ? p * 900 * a.dir : 0;
          if (Math.random() < 0.6) this.puff(proj.x, proj.y, 0xffffff);
        },
      });
      await this.impact(a, t, ev, ex, ey);
      // boomerang back
      const back = { p: 0 };
      await this.tw({
        targets: back,
        p: 1,
        duration: 330,
        ease: "Sine.easeOut",
        onUpdate: () => {
          const p = back.p;
          proj.x = ex + (sx - ex) * p;
          proj.y = ey + (sy - ey) * p - Math.sin(p * Math.PI) * 70;
          proj.angle = a.fx.spin ? -p * 720 * a.dir : 0;
        },
      });
      proj.destroy();
      weapon.setVisible(true).setAngle(0);
      await this.goHome(a, 200);
    }

    async magic(a: Fighter, t: Fighter, ev: Extract<BattleEvent, { type: "attack" }>) {
      sfx("magic");
      await Promise.all([
        this.tw({ targets: a.rig, y: -30, duration: 220, ease: "Quad.easeOut" }),
        a.weapon ? this.tw({ targets: a.weapon, angle: -35, duration: 220 }) : Promise.resolve(),
      ]);
      // glyph ring around the caster
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        this.spawnDebris(a.fx.debris, a.container.x + Math.cos(ang) * 80, GROUND - 110 + Math.sin(ang) * 60, 0, -60, 0.6);
      }
      if (ev.crit) await this.critCharge(a, t);
      const color = a.fx.color ?? 0x9b6bf2;
      const sx = a.container.x + a.dir * 70;
      const beam = this.toWorld(this.add.rectangle(sx, GROUND - 130, 10, 26, color).setOrigin(a.dir > 0 ? 0 : 1, 0.5).setDepth(5));
      const core = this.toWorld(this.add.rectangle(sx, GROUND - 130, 10, 8, 0xffffff).setOrigin(a.dir > 0 ? 0 : 1, 0.5).setDepth(6));
      sfx("zap");
      const len = Math.abs(t.container.x - sx);
      await Promise.all([this.tw({ targets: [beam, core], width: len, duration: 140, ease: "Quad.easeIn" })]);
      await this.impact(a, t, ev, t.container.x - a.dir * 20, GROUND - 120);
      await this.tw({ targets: [beam, core], scaleY: 0, alpha: 0, duration: 200 });
      beam.destroy();
      core.destroy();
      await Promise.all([
        this.tw({ targets: a.rig, y: 0, duration: 200 }),
        a.weapon ? this.tw({ targets: a.weapon, angle: 0, duration: 200 }) : Promise.resolve(),
      ]);
    }

    async honk(a: Fighter, t: Fighter, ev: Extract<BattleEvent, { type: "attack" }>) {
      await this.tw({ targets: a.container, x: `+=${a.dir * 70}`, duration: 150 });
      await this.tw({ targets: a.rig, scaleX: 1.25, scaleY: 0.8, duration: 140 });
      if (ev.crit) await this.critCharge(a, t);
      sfx("honk");
      this.tweens.add({ targets: a.rig, scaleX: 0.9, scaleY: 1.12, duration: 120, yoyo: true });
      for (let i = 0; i < 4; i++) {
        const ring = this.toWorld(this.add.circle(a.container.x + a.dir * 60, GROUND - 110, 20).setStrokeStyle(8, 0xffd23f).setDepth(5));
        this.tweens.add({
          targets: ring,
          x: t.container.x,
          scale: 4,
          alpha: 0,
          duration: 420,
          delay: i * 70,
          onComplete: () => ring.destroy(),
        });
      }
      await this.wait(260);
      await this.impact(a, t, ev, t.container.x - a.dir * 30, GROUND - 120, 2);
      await this.goHome(a);
    }

    async bash(a: Fighter, t: Fighter, ev: Extract<BattleEvent, { type: "attack" }>) {
      if (a.weapon) await this.tw({ targets: a.weapon, angle: 70, duration: 140 });
      await this.tw({ targets: a.rig, angle: 12, duration: 120 });
      if (ev.crit) await this.critCharge(a, t);
      await this.dash(a, this.reach(a, t, 100), 200);
      await this.impact(a, t, ev, t.container.x - a.dir * 50, GROUND - 100, 1.8);
      this.tweens.add({ targets: a.rig, angle: 0, duration: 200 });
      if (a.weapon) this.tweens.add({ targets: a.weapon, angle: 0, duration: 200 });
      await this.goHome(a);
    }

    async headbutt(a: Fighter, t: Fighter, ev: Extract<BattleEvent, { type: "attack" }>) {
      sfx("boing");
      const toX = this.reach(a, t, 110);
      const fromX = a.container.x;
      const hop = { p: 0 };
      await this.tw({
        targets: hop,
        p: 1,
        duration: 320,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          a.container.x = fromX + (toX - fromX) * hop.p;
          a.rig.y = -Math.sin(hop.p * Math.PI) * 90;
          a.rig.angle = hop.p * 25;
        },
      });
      if (ev.crit) await this.critCharge(a, t);
      await this.impact(a, t, ev, t.container.x - a.dir * 50, GROUND - 120);
      this.tweens.add({ targets: a.rig, angle: 0, y: 0, duration: 200 });
      await this.goHome(a);
    }

    // ------------------------------------------------------------ impact & fx
    async critCharge(a: Fighter, t: Fighter) {
      // freeze, zoom on the action, sunburst behind
      const cam = this.cameras.main;
      const midX = (a.container.x + t.container.x) / 2;
      const rays = this.toWorld(this.add.image(midX, GROUND - 110, "rays").setTint(0xffd23f).setAlpha(0).setScale(0.3).setDepth(-5));
      this.tweens.add({ targets: rays, alpha: 0.55, scale: 0.9, angle: 40, duration: 380 });
      sfx("adrenaline");
      cam.pan(midX, GROUND - 140, 160, "Quad.easeOut");
      cam.zoomTo(1.35, 160, "Quad.easeOut");
      await this.wait(260);
      this.time.delayedCall(700, () => {
        cam.pan(W / 2, H / 2, 260, "Quad.easeInOut");
        cam.zoomTo(1, 260, "Quad.easeInOut");
        this.tweens.add({ targets: rays, alpha: 0, duration: 300, onComplete: () => rays.destroy() });
      });
    }

    async impact(a: Fighter, t: Fighter, ev: Extract<BattleEvent, { type: "attack" }>, x: number, y: number, push = 1) {
      if (ev.dodged) {
        sfx("dodge");
        this.popWord(t.container.x, GROUND - 210, "ERROU!", "#ffffff", 34, a.dir);
        for (let i = 0; i < 3; i++) this.time.delayedCall(i * 40, () => this.afterimage(t, 0x5ad1e6));
        await this.tw({ targets: t.container, x: `+=${a.dir * 70}`, duration: 120, ease: "Quad.easeOut", yoyo: true, hold: 160 });
        return;
      }
      const cam = this.cameras.main;
      // hit-stop: a tiny freeze sells the impact
      await this.wait(ev.crit ? 90 : 45);
      sfx(ev.crit ? "crit" : ev.damage >= 30 ? "heavyHit" : "hit");
      sfx(a.fx.sfx);
      cam.shake(ev.crit ? 380 : 160, ev.crit ? 0.022 : 0.009);
      if (ev.crit) cam.flash(120, 255, 240, 180);
      this.flashWhite(t);
      this.spawnBurst(a.fx.debris, x, y, a.dir, ev.crit ? 26 : 14);
      this.spawnBurst("sparks", x, y, a.dir, ev.crit ? 12 : 6);
      this.hitRing(x, y, ev.crit);

      if (ev.blocked) {
        sfx("block");
        const shield = this.toWorld(this.add.circle(t.container.x, GROUND - 95, 90, 0x5ad1e6, 0.25).setStrokeStyle(6, 0xffffff).setDepth(6));
        this.tweens.add({ targets: shield, scale: 1.3, alpha: 0, duration: 380, onComplete: () => shield.destroy() });
        this.popWord(t.container.x, GROUND - 230, "BLOQUEIO!", "#5ad1e6", 30, a.dir);
      }

      this.popWord(x, y - 70, a.fx.word, ev.crit ? "#ffd23f" : "#ffffff", ev.crit ? 54 : 40, a.dir);
      if (ev.crit) this.popWord(W / 2, 130, "CRÍTICO!", "#ff6fa8", 64, 0, true);
      this.damageNumber(t.container.x + a.dir * 30, GROUND - 190, ev.damage, ev.crit);

      t.hp = ev.targetHp;
      this.updateHp(t);
      if (ev.crit || ev.damage >= 30) this.cheer(ev.crit ? 1.6 : 1);
      // knock back + squash
      this.tweens.add({ targets: t.rig, scaleX: 0.8, scaleY: 1.15, angle: -8, duration: 70, yoyo: true });
      await this.tw({ targets: t.container, x: `+=${a.dir * 40 * push}`, duration: 110, ease: "Quad.easeOut" });
      this.tweens.add({ targets: t.container, x: HOME[t.side], duration: 380, delay: 120, ease: "Quad.easeInOut" });
    }

    flashWhite(f: Fighter) {
      const parts = [f.body, f.weapon, f.hand].filter((p): p is Phaser.GameObjects.Image => Boolean(p));
      for (const p of parts) p.setTintFill(0xffffff);
      this.time.delayedCall(70, () => {
        for (const p of parts) p.setTint(0xff7070);
        this.time.delayedCall(120, () => parts.forEach((p) => p.clearTint()));
      });
    }

    afterimage(f: Fighter, tint: number) {
      const ghost = this.toWorld(
        this.add
          .image(f.container.x, f.container.y + f.rig.y, f.body.texture.key)
          .setOrigin(19.5 / 40, 37 / 40)
          .setScale(S)
          .setFlipX(f.dir < 0)
          .setTintFill(tint)
          .setAlpha(0.45),
      );
      ghost.setDepth(0);
      this.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
    }

    speedLines(y: number, dir: number) {
      for (let i = 0; i < 10; i++) {
        const ly = y - 90 + Math.random() * 180;
        const line = this.toWorld(this.add.rectangle(dir > 0 ? -50 : W + 50, ly, 120 + Math.random() * 160, 4, 0xffffff, 0.8).setDepth(4));
        this.tweens.add({
          targets: line,
          x: dir > 0 ? W + 200 : -200,
          duration: 260 + Math.random() * 120,
          onComplete: () => line.destroy(),
        });
      }
    }

    slashArc(x: number, y: number, dir: number, color: number, big: boolean) {
      const g = this.toWorld(this.add.graphics().setDepth(6));
      g.x = x;
      g.y = y;
      const r = big ? 150 : 115;
      g.lineStyle(big ? 22 : 16, color, 1);
      g.beginPath();
      g.arc(0, 0, r, -2.2, 0.6, false);
      g.strokePath();
      g.lineStyle(big ? 8 : 6, 0xffffff, 1);
      g.beginPath();
      g.arc(0, 0, r, -2.0, 0.4, false);
      g.strokePath();
      g.scaleX = dir;
      g.setScale(0.6 * dir, 0.6);
      this.tweens.add({ targets: g, scaleX: 1.1 * dir, scaleY: 1.1, alpha: 0, duration: 300, ease: "Quad.easeOut", onComplete: () => g.destroy() });
    }

    hitRing(x: number, y: number, big: boolean) {
      const ring = this.toWorld(this.add.circle(x, y, 18, 0xffffff, 0.9).setDepth(7));
      this.tweens.add({ targets: ring, scale: big ? 5 : 3, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
      // comic "impact star"
      const star = this.toWorld(this.add.star(x, y, 9, 20, big ? 70 : 48, 0xffd23f).setStrokeStyle(5, INK).setDepth(7));
      this.tweens.add({ targets: star, scale: 1.3, angle: 30, alpha: 0, duration: 240, delay: 40, onComplete: () => star.destroy() });
    }

    popWord(x: number, y: number, value: string, color: string, size: number, dir: number, ui = false) {
      const t = this.text(x, y, value, size, color, 10).setScale(0.2).setAngle(dir * -8 + (Math.random() * 8 - 4)).setDepth(8);
      if (ui) this.toUi(t);
      else this.toWorld(t);
      this.tweens.add({ targets: t, scale: 1.15, duration: 140, ease: "Back.easeOut" });
      this.tweens.add({ targets: t, y: y - 40, alpha: 0, delay: 520, duration: 360, onComplete: () => t.destroy() });
    }

    damageNumber(x: number, y: number, dmg: number, crit: boolean) {
      const t = this.toWorld(this.text(x, y, `-${dmg}`, crit ? 58 : 40, crit ? "#ffd23f" : "#ffffff", 9).setDepth(9).setScale(0.3));
      this.tweens.add({ targets: t, scale: 1, duration: 120, ease: "Back.easeOut" });
      this.particles.push({ obj: t, vx: (Math.random() - 0.5) * 120, vy: -380, va: 0, gravity: 900, drag: 0, life: 1.1, age: 0 });
    }

    puff(x: number, y: number, tint: number) {
      const p = this.toWorld(this.add.image(x, y, "smoke").setScale(3).setTint(tint).setAlpha(0.7).setDepth(3));
      this.particles.push({ obj: p, vx: 0, vy: -20, va: 0, gravity: 0, drag: 0, life: 0.35, age: 0, grow: 3 });
    }

    spawnBurst(kind: Debris, x: number, y: number, dir: number, count: number) {
      for (let i = 0; i < count; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
        const speedV = 260 + Math.random() * 420;
        this.spawnDebris(kind, x, y, Math.cos(ang) * speedV * 0.8 + dir * 180, Math.sin(ang) * speedV, 1);
      }
    }

    spawnDebris(kind: Debris, x: number, y: number, vx: number, vy: number, lifeScale: number) {
      let obj: Particle["obj"];
      let gravity = 1100;
      let flutter: number | undefined;
      let life = 1.1 * lifeScale;
      let grow: number | undefined;
      const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
      switch (kind) {
        case "keys": {
          const c = this.add.container(x, y);
          c.add(this.add.image(0, 0, "keycap").setScale(3));
          c.add(this.text(0, -2, pick(["Q", "W", "E", "A", "S", "D", "Z", "X", "!", "?", "@", "#", "K", "P"]), 15, "#231a2e", 0));
          obj = c;
          break;
        }
        case "pages":
          obj = this.add.image(x, y, "page").setScale(3);
          gravity = 260;
          flutter = 6;
          life = 1.6 * lifeScale;
          break;
        case "feathers":
          obj = this.add.image(x, y, "feather").setScale(4);
          gravity = 180;
          flutter = 5;
          life = 1.8 * lifeScale;
          break;
        case "water":
          obj = this.add.image(x, y, "drop").setScale(4);
          break;
        case "spikes":
          obj = this.add.image(x, y, "spike").setScale(4);
          break;
        case "splinters":
          obj = this.add.image(x, y, "splinter").setScale(4);
          break;
        case "lightning":
          obj = this.add.image(x, y, "bolt").setScale(4);
          gravity = 300;
          break;
        case "wifi":
          obj = this.add.image(x, y, "wifi").setScale(4);
          gravity = 0;
          vy *= 0.4;
          break;
        case "smoke":
          obj = this.add.image(x, y, "smoke").setScale(4).setAlpha(0.8);
          gravity = -200;
          grow = 2;
          break;
        case "stars":
          obj = this.add.image(x, y, "star").setScale(4);
          break;
        case "confetti":
          obj = this.add.rectangle(x, y, 10, 6, pick([0xffd23f, 0xff6fa8, 0x34c6b8, 0x7b5cff, 0x4fbf5a]));
          gravity = 500;
          flutter = 4;
          break;
        case "glyphs":
          obj = this.text(x, y, pick(["{ }", "</>", "AI", "?!", "01", "*"]), 22, pick(["#c9b8ff", "#5ad1e6", "#ffffff"]), 5);
          gravity = 100;
          break;
        case "notes":
          obj = this.add.image(x, y, "note-icon").setScale(2.5);
          gravity = 80;
          flutter = 3;
          break;
        case "numbers":
          obj = this.text(x, y, pick(["1", "2", "7", "20", "π", "90°", "+1", "cm"]), 24, pick(["#ffd23f", "#ffffff", "#8fdc5a"]), 5);
          break;
        default:
          obj = this.add.image(x, y, "px").setScale(3).setTint(pick([0xffffff, 0xffd23f, 0xfff0a0]));
          gravity = 0;
          life = 0.35 * lifeScale;
      }
      this.toWorld(obj as unknown as Phaser.GameObjects.GameObject);
      (obj as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(7);
      this.particles.push({ obj, vx, vy, va: (Math.random() - 0.5) * 900, gravity, drag: 0.6, life, age: 0, flutter, grow });
    }

    async callout(f: Fighter, value: string, color: string) {
      this.popWord(f.container.x, GROUND - 250, value, color, 30, f.dir);
      sfx("adrenaline");
      await this.wait(500);
    }

    async adrenaline(id: string) {
      const f = this.fighters.get(id);
      if (!f) return;
      sfx("adrenaline");
      const aura = this.toWorld(this.add.ellipse(f.container.x, GROUND - 90, 170, 220, 0xe84a4a, 0.35).setDepth(0));
      this.tweens.add({ targets: aura, scale: 1.25, alpha: 0.1, duration: 300, yoyo: true, repeat: 2, onComplete: () => aura.destroy() });
      this.popWord(f.container.x, GROUND - 240, "ADRENALINA!", "#e84a4a", 36, f.dir);
      await this.wait(700);
    }

    async zoneHit(id: string, damage: number, hp: number) {
      const f = this.fighters.get(id);
      if (!f) return;
      sfx("zap");
      this.spawnBurst("lightning", f.container.x, GROUND - 120, 0, 10);
      this.flashWhite(f);
      this.damageNumber(f.container.x, GROUND - 200, damage, false);
      f.hp = hp;
      this.updateHp(f);
      await this.wait(400);
    }

    // ------------------------------------------------------------ knock-out
    async knockout(winnerId: string) {
      const winner = this.fighters.get(winnerId)!;
      const loser = [...this.fighters.values()].find((f) => f.id !== winnerId)!;
      stopMusic();
      sfx("ko");
      this.stopIdle(loser);
      this.cameras.main.flash(200, 255, 255, 255);
      this.cameras.main.shake(500, 0.03);
      // slow motion launch off the stage, Smash-style
      this.slowMo = 0.45;
      this.applyTime();
      const fromX = loser.container.x;
      const fly = { p: 0 };
      const endX = loser.side === "left" ? -120 : W + 120;
      await this.tw({
        targets: fly,
        p: 1,
        duration: 900,
        ease: "Quad.easeOut",
        onUpdate: () => {
          loser.container.x = fromX + (endX - fromX) * fly.p;
          loser.container.y = GROUND - Math.sin(fly.p * Math.PI * 0.9) * 360 - fly.p * 120;
          loser.rig.angle = fly.p * 900 * -winner.dir;
          loser.container.setScale(loser.dir * (1 - fly.p * 0.55), 1 - fly.p * 0.55);
          if (Math.random() < 0.5) this.puff(loser.container.x, loser.container.y - 60, 0xffffff);
        },
      });
      this.slowMo = 1;
      this.applyTime();
      // the twinkle where it disappeared
      const sparkle = this.toWorld(this.add.star(loser.side === "left" ? 40 : W - 40, 120, 4, 6, 40, 0xffffff).setDepth(9));
      sfx("search");
      this.tweens.add({ targets: sparkle, scale: 2, angle: 180, alpha: 0, duration: 500, onComplete: () => sparkle.destroy() });
      loser.container.setVisible(false);

      // K.O.!
      const letters = ["K", ".", "O", "!"];
      const texts = letters.map((l, i) => this.toUi(this.text(W / 2 - 150 + i * 100, H / 2 - 40, l, 150, "#e84a4a", 18).setScale(4).setAlpha(0)));
      for (const t of texts) {
        await this.tw({ targets: t, scale: 1, alpha: 1, duration: 110, ease: "Quad.easeIn" });
        sfx("vsSlam");
        this.uiCam.shake(140, 0.012);
      }
      this.cheer(2);
      await this.wait(700);
      await this.tw({ targets: texts, alpha: 0, y: "-=40", duration: 250 });
      texts.forEach((t) => t.destroy());

      // winner celebrates in the middle
      const won = winnerId === data.you.id;
      sfx(won ? "victory" : "defeat");
      this.tweens.add({ targets: winner.container, x: W / 2, duration: 500, ease: "Quad.easeOut" });
      this.tweens.add({ targets: winner.rig, y: -60, duration: 260, yoyo: true, repeat: -1, ease: "Quad.easeOut", delay: 500 });
      if (winner.weapon) this.tweens.add({ targets: winner.weapon, angle: -60, duration: 260, yoyo: true, repeat: -1, delay: 500 });
      if (won) {
        const colors = [0xffd23f, 0xff6fa8, 0x34c6b8, 0x7b5cff, 0x4fbf5a, 0xe84a4a, 0xffffff];
        for (let i = 0; i < 120; i++) {
          const c = this.toUi(this.add.rectangle(Math.random() * W, -20 - Math.random() * 300, 8 + (i % 3) * 3, 6, colors[i % colors.length]));
          this.tweens.add({ targets: c, y: H + 30, x: c.x + (Math.random() - 0.5) * 160, angle: 720 * (i % 2 ? 1 : -1), duration: 1600 + Math.random() * 1400, delay: Math.random() * 600 });
        }
      } else {
        // losing is not a party: dim the stage a little and show a friendly nudge
        this.toUi(this.add.rectangle(0, 0, W, H, INK, 0.35).setOrigin(0));
        const tip = this.toUi(this.text(W / 2, H - 60, "Revanche? Teste outra combinação de itens!", 24, "#ffffff", 6).setAlpha(0));
        this.tweens.add({ targets: tip, alpha: 1, y: H - 70, duration: 400, delay: 500 });
      }
      const title = this.toUi(this.text(W / 2, 150, won ? "VITÓRIA!" : "DERROTA...", 96, won ? "#ffd23f" : "#c9c3d2", 14).setScale(0.2));
      await this.tw({ targets: title, scale: 1, duration: 300, ease: "Back.easeOut" });
      this.tweens.add({ targets: title, scale: 1.06, duration: 400, yoyo: true, repeat: -1 });
      await this.wait(1900);
      if (!destroyed) callbacks.onFinished(winnerId);
    }

    // ------------------------------------------------------------ frame loop
    update(_time: number, delta: number) {
      const dt = (delta / 1000) * this.time.timeScale;
      this.rays.angle += dt * 6;
      for (const c of this.clouds) {
        c.x -= dt * (12 + c.scale * 3);
        if (c.x < -140) c.x = W + 140;
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.age += dt;
        if (p.age >= p.life) {
          p.obj.destroy();
          this.particles.splice(i, 1);
          continue;
        }
        p.vy += p.gravity * dt;
        p.vx *= 1 - p.drag * dt;
        p.obj.x += (p.vx + (p.flutter ? Math.sin(p.age * p.flutter * 3) * 80 : 0)) * dt;
        p.obj.y += p.vy * dt;
        p.obj.angle += p.va * dt;
        if (p.grow) {
          const s = (p.obj as unknown as Phaser.GameObjects.Components.Transform).scale;
          (p.obj as unknown as Phaser.GameObjects.Components.Transform).setScale(s + p.grow * dt);
        }
        if (p.obj.y > GROUND + 40 && p.gravity > 0) {
          p.obj.y = GROUND + 40;
          p.vy *= -0.35;
          p.vx *= 0.6;
        }
        p.obj.setAlpha(Math.min(1, (p.life - p.age) / 0.3));
      }
    }
  }

  const game = new PhaserLib.Game({
    type: PhaserLib.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: "#231a2e",
    pixelArt: true,
    fps: data.forceTimeout ? { forceSetTimeOut: true, target: 30 } : undefined,
    scale: { mode: PhaserLib.Scale.FIT, autoCenter: PhaserLib.Scale.CENTER_BOTH },
    scene: DuelScene,
    banner: false,
  });

  return {
    setSpeed(value: number) {
      speed = value;
      const s = game.scene.getScene("duel") as InstanceType<typeof DuelScene> | null;
      s?.applyTime();
    },
    destroy() {
      destroyed = true;
      stopMusic();
      game.destroy(true);
    },
  };
}
