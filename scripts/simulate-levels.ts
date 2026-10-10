/**
 * Level-system exploration (proposal, not wired into the game yet). No browser, no database.
 *
 *   npx tsx scripts/simulate-levels.ts calib      # how much one point should be worth in each stat
 *   npx tsx scripts/simulate-levels.ts strength   # how strong a max-level Pingo gets with a given point table
 *   npx tsx scripts/simulate-levels.ts season     # XP curves over a simulated season of 20 students
 */
import { ALL_ITEMS, buildFromItems, getItem, type ItemDefinition } from "@/content/items";
import {
  BALANCE,
  type BalanceConfig,
  STAT_KEYS,
  computeStats,
  createRng,
  powerScore,
  simulateBattle,
  type CombatantInput,
  type StatKey,
  type StatModifiers,
  type Rng,
} from "@/engine";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const N = Number(arg("n") ?? 4000);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

// ---------------------------------------------------------------- building blocks

type Points = Partial<Record<StatKey, number>>;

/** Candidate value of ONE level point in each stat (percent stats as fractions). */
let POINT_VALUE: Record<StatKey, number> = { hp: 5, atk: 2, def: 2, spd: 1, crit: 0.01, dodge: 0.01 };

function itemsOf(ids: string[]): ItemDefinition[] {
  return ids.map((id) => {
    const item = getItem(id);
    if (!item) throw new Error(`Unknown item ${id}`);
    return item;
  });
}

function pingo(id: string, itemIds: string[], points: Points = {}, values = POINT_VALUE): CombatantInput {
  const items = itemsOf(itemIds);
  const levelMod: StatModifiers = {};
  for (const key of STAT_KEYS) levelMod[key] = (points[key] ?? 0) * values[key];
  return {
    id,
    name: id,
    stats: computeStats([...items.map((i) => i.statModifiers), levelMod]),
    effects: buildFromItems(items).effects,
  };
}

/** Win rate of A over B with common random numbers (same seeds every call → stable comparisons). */
function duel(a: CombatantInput, b: CombatantInput, n = N): number {
  let win = 0;
  for (let i = 0; i < n; i++) {
    const r = simulateBattle({ seed: 1 + i, participants: i % 2 === 0 ? [a, b] : [b, a] });
    if (r.winnerId === a.id) win++;
  }
  return win / n;
}

const GEAR = {
  naked: [] as string[],
  medium: ["mechanical_keyboard", "construction_helmet", "puffer_jacket"],
  strong: ["aquarium_anchor", "astronaut_helmet", "ceo_suit"],
  tank: ["door_shield", "knight_bucket", "turtle_shell"],
  glass: ["prompt_wand", "wizard_hat", "shadow_cloak"],
};

const STAT_PT: Record<StatKey, string> = { hp: "HP", atk: "ATK", def: "DEF", spd: "VEL", crit: "CRIT", dodge: "ESQ" };
const fmtValue = (key: StatKey, v: number) => (key === "crit" || key === "dodge" ? `${(v * 100).toFixed(2)}%` : v.toFixed(2));

// ---------------------------------------------------------------- 1) calibration

/** For each stat: the per-point value at which `points` points give the same duel edge as `points` HP points. */
function calibrate(points: number) {
  console.log(`\n▶ Calibração: quanto vale 1 ponto para que ${points} pontos em cada atributo deem a MESMA vantagem`);
  for (const gearName of ["naked", "strong"] as const) {
    const gear = GEAR[gearName];
    const base = pingo("B", gear);
    const target = duel(pingo("A", gear, { hp: points }), base);
    const line: string[] = [`HP=${POINT_VALUE.hp} → ${pct(target)}`];
    for (const key of STAT_KEYS.filter((k) => k !== "hp")) {
      let lo = 0;
      let hi = POINT_VALUE[key] * 4;
      for (let it = 0; it < 14; it++) {
        const mid = (lo + hi) / 2;
        const w = duel(pingo("A", gear, { [key]: points }, { ...POINT_VALUE, [key]: mid }), base, 3000);
        if (w < target) lo = mid;
        else hi = mid;
      }
      line.push(`${STAT_PT[key]}=${fmtValue(key, (lo + hi) / 2)}`);
    }
    console.log(`  equipamento ${gearName.padEnd(6)}: ${line.join(" | ")}`);
  }
}

/** Every stat alone with `points` points vs the same gear without points: is any stat a no-brainer? */
function perStatEdge(points: number) {
  console.log(`\n▶ Vantagem de ${points} pontos num atributo só (vs mesmo Pingo sem pontos) — tabela atual`);
  console.log(`  valores: ${STAT_KEYS.map((k) => `${STAT_PT[k]} ${fmtValue(k, POINT_VALUE[k])}`).join(" | ")}`);
  for (const gearName of Object.keys(GEAR) as (keyof typeof GEAR)[]) {
    const gear = GEAR[gearName];
    const base = pingo("B", gear);
    const cells = STAT_KEYS.map((k) => `${STAT_PT[k]} ${pct(duel(pingo("A", gear, { [k]: points }), base))}`);
    const balanced = spread(points, ["hp", "atk", "def", "spd", "crit", "dodge"]);
    cells.push(`misto ${pct(duel(pingo("A", gear, balanced), base))}`);
    console.log(`  ${gearName.padEnd(7)} ${cells.join(" | ")}`);
  }
}

function spread(points: number, keys: StatKey[]): Points {
  const out: Points = {};
  for (let i = 0; i < points; i++) out[keys[i % keys.length]] = (out[keys[i % keys.length]] ?? 0) + 1;
  return out;
}

// ---------------------------------------------------------------- 2) strength at max level

function strength(maxPoints: number) {
  console.log(`\n▶ Força com ${maxPoints} pontos (nível máximo)`);
  console.log(`  valores: ${STAT_KEYS.map((k) => `${STAT_PT[k]} ${fmtValue(k, POINT_VALUE[k])}`).join(" | ")}`);
  const balanced = spread(maxPoints, ["hp", "atk", "def", "spd", "crit", "dodge"]);
  const naked1 = pingo("B", []);
  const rows: Array<[string, CombatantInput, CombatantInput]> = [
    ["só nível (misto) vs pelado nível 1", pingo("A", [], balanced), naked1],
    ["médio equipado, sem nível vs pelado nível 1", pingo("A", GEAR.medium), naked1],
    ["forte equipado, sem nível vs pelado nível 1", pingo("A", GEAR.strong), naked1],
    ["forte + nível máx vs pelado nível 1", pingo("A", GEAR.strong, balanced), naked1],
    ["forte + nível máx vs forte sem nível", pingo("A", GEAR.strong, balanced), pingo("B", GEAR.strong)],
    ["pelado + nível máx vs forte sem nível", pingo("A", [], balanced), pingo("B", GEAR.strong)],
    ["forte + metade vs forte sem nível", pingo("A", GEAR.strong, spread(Math.round(maxPoints / 2), ["hp", "atk", "def", "spd", "crit", "dodge"])), pingo("B", GEAR.strong)],
  ];
  for (const [label, a, b] of rows) {
    console.log(`  ${label.padEnd(44)} ${pct(duel(a, b)).padStart(6)}   (power ${powerScore(a.stats, a.effects)} vs ${powerScore(b.stats, b.effects)})`);
  }
  // all-in builds: does dumping everything in one stat beat a mixed build?
  const mixed = pingo("B", GEAR.strong, balanced);
  const allIn = STAT_KEYS.map((k) => `${STAT_PT[k]} ${pct(duel(pingo("A", GEAR.strong, { [k]: maxPoints }), mixed))}`);
  console.log(`  tudo num atributo vs misto (ambos forte+nível máx): ${allIn.join(" | ")}`);
}

// ---------------------------------------------------------------- 3) season

interface Curve {
  name: string;
  /** XP needed to go from level L to L+1 */
  toNext: (level: number) => number;
}

interface Profile {
  name: string;
  duelsPerDay: number;
  daysPerWeek: number;
  /** share of the class */
  share: number;
  /** coins earned in class activities (loosely correlated with how much they play) */
  budget: [number, number];
}

const CLASS: Profile[] = [
  { name: "viciado", duelsPerDay: 12, daysPerWeek: 6, share: 0.15, budget: [900, 1500] },
  { name: "ativo", duelsPerDay: 8, daysPerWeek: 4, share: 0.3, budget: [450, 1350] },
  { name: "moderado", duelsPerDay: 4, daysPerWeek: 3, share: 0.3, budget: [150, 1200] },
  { name: "casual", duelsPerDay: 2, daysPerWeek: 1, share: 0.15, budget: [0, 600] },
  { name: "parado", duelsPerDay: 0, daysPerWeek: 0, share: 0.1, budget: [0, 150] },
];
const CLASS_SIZE = Number(arg("size") ?? 20);

/** How "Encontrar batalha" picks an opponent. */
interface Matchmaking {
  name: string;
  /** level distance scale: weight = exp(-|Δlevel| / width). Infinity = anyone in the class */
  width: number;
  /** never the same opponent more than this many times per day (0 = no rule) */
  maxPerPairPerDay: number;
  /** skip the last N opponents when possible */
  avoidRecent: number;
}
const MM_DEFAULT: Matchmaking = { name: "padrão", width: 2.5, maxPerPairPerDay: 0, avoidRecent: 1 };

interface Student {
  id: string;
  profile: Profile;
  items: ItemDefinition[];
  weights: number[];
  xp: number;
  level: number;
  points: Points;
  recent: string[];
  today: Map<string, number>;
  opponents: Map<string, number>;
  duels: number;
  wins: number;
  /** duels against someone already faced 3+ times that same day */
  repeatDuels: number;
}

function buyGear(rng: Rng, budget: number): ItemDefinition[] {
  const chosen: ItemDefinition[] = [];
  let money = budget;
  for (const cat of rng.shuffle(["weapon", "helmet", "outfit"] as const)) {
    const affordable = ALL_ITEMS.filter((i) => i.category === cat && i.price <= money);
    if (affordable.length === 0) continue;
    const maxTier = Math.max(...affordable.map((i) => i.tier));
    const pick = rng.pick(affordable.filter((i) => i.tier >= maxTier - 1));
    chosen.push(pick);
    money -= pick.price;
  }
  return chosen;
}

function studentCombatant(s: Student): CombatantInput {
  const levelMod: StatModifiers = {};
  for (const key of STAT_KEYS) levelMod[key] = (s.points[key] ?? 0) * POINT_VALUE[key];
  return {
    id: s.id,
    name: s.id,
    stats: computeStats([...s.items.map((i) => i.statModifiers), levelMod]),
    effects: buildFromItems(s.items).effects,
  };
}

function spendPoint(rng: Rng, s: Student) {
  // kids pick a favourite style; skip a stat once it is capped
  for (let tries = 0; tries < 10; tries++) {
    const key = STAT_KEYS[rng.weightedIndex(s.weights)];
    const stats = studentCombatant(s).stats;
    if (stats[key] + POINT_VALUE[key] <= BALANCE.caps[key][1] + 1e-9) {
      s.points[key] = (s.points[key] ?? 0) + 1;
      return;
    }
  }
  s.points.hp = (s.points.hp ?? 0) + 1;
}

interface SeasonOpts {
  win: number;
  loss: number;
  maxLevel: number;
  weeks: number;
  mm?: Matchmaking;
}

function season(curve: Curve, opts: SeasonOpts & { seed: number }) {
  const rng = createRng(opts.seed);
  const mm = opts.mm ?? MM_DEFAULT;
  const students: Student[] = [];
  for (const p of CLASS) {
    const count = Math.round(p.share * CLASS_SIZE);
    for (let i = 0; i < count; i++) {
      const style = rng.int(0, 2);
      const weights =
        style === 0
          ? [1, 1, 1, 1, 1, 1] // balanced
          : STAT_KEYS.map(() => (rng.chance(0.35) ? 4 : 0.3)); // a favourite stat or two
      students.push({
        id: `${p.name}${i}`,
        profile: p,
        items: buyGear(rng, Math.round(rng.range(p.budget[0], p.budget[1]) / 150) * 150),
        weights,
        xp: 0,
        level: 1,
        points: {},
        recent: [],
        today: new Map(),
        opponents: new Map(),
        duels: 0,
        wins: 0,
        repeatDuels: 0,
      });
    }
  }

  const snapshots: Record<number, Record<string, number>> = {};
  let firstMaxDay: number | null = null;
  let seed = opts.seed * 100_000;

  for (let day = 0; day < opts.weeks * 7; day++) {
    for (const s of students) s.today.clear();
    for (const s of students) {
      if (!rng.chance(s.profile.daysPerWeek / 7)) continue;
      for (let d = 0; d < s.profile.duelsPerDay; d++) {
        // matchmaking: prefer similar levels; daily cap per pair; skip recent opponents when possible
        let others = students.filter((o) => o !== s && (!mm.maxPerPairPerDay || (s.today.get(o.id) ?? 0) < mm.maxPerPairPerDay));
        const fresh = others.filter((o) => !s.recent.includes(o.id));
        if (fresh.length > 0) others = fresh;
        if (others.length === 0) break;
        const weights = others.map((o) => (Number.isFinite(mm.width) ? Math.exp(-Math.abs(o.level - s.level) / mm.width) : 1));
        const opp = others[rng.weightedIndex(weights)];
        s.recent = [opp.id, ...s.recent].slice(0, mm.avoidRecent);
        const already = s.today.get(opp.id) ?? 0;
        if (already >= 3) s.repeatDuels++;
        s.today.set(opp.id, already + 1);
        s.opponents.set(opp.id, (s.opponents.get(opp.id) ?? 0) + 1);
        const r = simulateBattle({ seed: seed++, participants: [studentCombatant(s), studentCombatant(opp)] });
        const won = r.winnerId === s.id;
        s.duels++;
        if (won) s.wins++;
        if (s.level < opts.maxLevel) {
          s.xp += won ? opts.win : opts.loss;
          while (s.level < opts.maxLevel && s.xp >= curve.toNext(s.level)) {
            s.xp -= curve.toNext(s.level);
            s.level++;
            spendPoint(rng, s);
          }
          if (s.level === opts.maxLevel && firstMaxDay === null) firstMaxDay = day + 1;
        }
      }
    }
    if ((day + 1) % 7 === 0) {
      const week = (day + 1) / 7;
      snapshots[week] = {};
      for (const p of CLASS) {
        const group = students.filter((s) => s.profile === p);
        snapshots[week][p.name] = group.reduce((sum, s) => sum + s.level, 0) / group.length;
      }
    }
  }
  return { students, snapshots, firstMaxDay };
}

function totalXp(curve: Curve, maxLevel: number) {
  let t = 0;
  for (let l = 1; l < maxLevel; l++) t += curve.toNext(l);
  return t;
}

function printSeason(curve: Curve, opts: SeasonOpts) {
  const runs = [1, 2, 3].map((seed) => season(curve, { ...opts, seed }));
  const weeks = [1, 2, 4, 6, 8, 10].filter((w) => w <= opts.weeks);
  console.log(
    `\n▶ Curva "${curve.name}" — XP total até o ${opts.maxLevel}: ${totalXp(curve, opts.maxLevel)} | nível 2 com ${curve.toNext(1)} XP | vitória ${opts.win} / derrota ${opts.loss}`,
  );
  console.log(`  nível médio  ${weeks.map((w) => `sem ${w}`.padStart(6)).join(" ")}`);
  for (const p of CLASS) {
    const cells = weeks.map((w) => (runs.reduce((s, r) => s + r.snapshots[w][p.name], 0) / runs.length).toFixed(1).padStart(6));
    const group = runs.flatMap((r) => r.students.filter((s) => s.profile === p));
    const duels = group.reduce((s, x) => s + x.duels, 0);
    const wr = duels ? group.reduce((s, x) => s + x.wins, 0) / duels : 0;
    console.log(`  ${p.name.padEnd(10)} ${cells.join(" ")}   vence ${duels ? pct(wr) : "  —  "} dos duelos`);
  }
  const players = runs.flatMap((r) => r.students.filter((s) => s.duels > 0));
  for (const name of ["viciado", "ativo"]) {
    const g = players.filter((s) => s.profile.name === name);
    const distinct = g.reduce((sum, s) => sum + s.opponents.size, 0) / g.length;
    const topShare = g.reduce((sum, s) => sum + Math.max(...s.opponents.values()) / s.duels, 0) / g.length;
    const repeat = g.reduce((sum, s) => sum + s.repeatDuels, 0) / g.reduce((sum, s) => sum + s.duels, 0);
    console.log(
      `  ${name}: enfrentou ${distinct.toFixed(0)} colegas diferentes | adversário mais frequente = ${pct(topShare)} dos duelos | 4º+ duelo seguido contra o mesmo no dia: ${pct(repeat)}`,
    );
  }
  const days = runs.map((r) => r.firstMaxDay ?? Infinity);
  console.log(`  primeiro aluno no nível ${opts.maxLevel}: dia ${days.map((d) => (Number.isFinite(d) ? d : "nunca")).join(" / ")}`);
  return runs[0];
}

/** End of season: 20-Pingo royales and a few duels with the levels the class actually reached. */
function endOfSeasonBattles(students: Student[], royales = 1500, config: BalanceConfig = BALANCE) {
  const wins = new Map<string, number>();
  const participants = students.map(studentCombatant);
  for (let r = 0; r < royales; r++) {
    const res = simulateBattle({ seed: 70_000 + r, participants }, config);
    wins.set(res.winnerId, (wins.get(res.winnerId) ?? 0) + 1);
  }
  console.log(`  Battle Royale no fim da temporada (${royales} batalhas) — chance de vitória por perfil:`);
  for (const p of CLASS) {
    const group = students.filter((s) => s.profile === p);
    const w = group.reduce((s, x) => s + (wins.get(x.id) ?? 0), 0) / royales / group.length;
    const lvl = group.reduce((s, x) => s + x.level, 0) / group.length;
    console.log(`    ${p.name.padEnd(10)} nível ${lvl.toFixed(1).padStart(4)}  vitória ${pct(w).padStart(6)}`);
  }
}

// ---------------------------------------------------------------- main
const mode = process.argv[2] ?? "strength";
const MAX_LEVEL = Number(arg("max") ?? 20);
const PTS_PER_LEVEL = Number(arg("ppl") ?? 1);
const MAX_POINTS = (MAX_LEVEL - 1) * PTS_PER_LEVEL;

if (arg("values")) {
  // --values hp,atk,def,spd,crit,dodge   e.g. 5,2,2,1,0.01,0.01
  const v = arg("values")!.split(",").map(Number);
  POINT_VALUE = { hp: v[0], atk: v[1], def: v[2], spd: v[3], crit: v[4], dodge: v[5] };
}

console.log(`Pingo — simulação do sistema de níveis (${N} duelos por linha)`);
if (mode === "calib") {
  calibrate(Number(arg("points") ?? 10));
} else if (mode === "edge") {
  perStatEdge(Number(arg("points") ?? MAX_POINTS));
} else if (mode === "strength") {
  strength(MAX_POINTS);
} else if (mode === "season") {
  const win = Number(arg("win") ?? 30);
  const loss = Number(arg("loss") ?? 20);
  const weeks = Number(arg("weeks") ?? 10);
  const total = Number(arg("total") ?? 10_000);
  const L = MAX_LEVEL - 1;
  const sumPow = (p: number) => Array.from({ length: L }, (_, i) => (i + 1) ** p).reduce((s, x) => s + x, 0);
  const shaped = (name: string, p: number): Curve => {
    const a = total / sumPow(p);
    return { name, toNext: (l) => Math.round((a * l ** p) / 5) * 5 };
  };
  const curves: Curve[] = [
    { name: "plana (todo nível custa igual)", toNext: () => Math.round(total / L / 5) * 5 },
    shaped("linear (cada nível um pouco mais caro)", 1),
    shaped("suave (raiz: começo rápido, meio estável)", 0.5),
    shaped("íngreme (quadrática: fim muito lento)", 2),
  ];
  const only = arg("curve");
  for (const c of curves.filter((c) => !only || c.name.startsWith(only))) {
    const mmName = arg("mm");
    const mms: Matchmaking[] = [
      MM_DEFAULT,
      { name: "nível largo", width: 5, maxPerPairPerDay: 0, avoidRecent: 1 },
      { name: "nível largo + limites", width: 5, maxPerPairPerDay: 2, avoidRecent: 5 },
      { name: "nível + limites", width: 2.5, maxPerPairPerDay: 2, avoidRecent: 5 },
      { name: "aberto (qualquer um)", width: Infinity, maxPerPairPerDay: 2, avoidRecent: 5 },
    ];
    let run!: ReturnType<typeof season>;
    for (const mm of mms.filter((m) => !mmName || mmName === "all" || m.name.startsWith(mmName))) {
      if (mmName) console.log(`
######## matchmaking: ${mm.name} (largura ${mm.width}, máx ${mm.maxPerPairPerDay || "∞"}/dia por par, evita últimos ${mm.avoidRecent}) — turma de ${CLASS_SIZE}`);
      run = printSeason(c, { win, loss, maxLevel: MAX_LEVEL, weeks, mm });
    }
    if (process.argv.includes("--royale")) endOfSeasonBattles(run.students);
    if (process.argv.includes("--knobs")) royaleKnobs(run.students);
  }
}

/** Which arena rules flatten the royale? Same end-of-season class, different rule tweaks. */
function royaleKnobs(students: Student[]) {
  const variants: Array<[string, BalanceConfig]> = [
    ["regras atuais", BALANCE],
    ["anti-gangue mais fraco (heat 1.5→0.5)", { ...BALANCE, targeting: { ...BALANCE.targeting, heatPenalty: 0.5 } }],
    ["sem anti-gangue (heat 0)", { ...BALANCE, targeting: { ...BALANCE.targeting, heatPenalty: 0 } }],
    ["menos sorte no dano (80–120%)", { ...BALANCE, damage: { ...BALANCE.damage, varianceMin: 0.8, varianceMax: 1.2 } }],
    ["os dois (heat 0.5 + dano 80–120%)", { ...BALANCE, targeting: { ...BALANCE.targeting, heatPenalty: 0.5 }, damage: { ...BALANCE.damage, varianceMin: 0.8, varianceMax: 1.2 } }],
  ];
  for (const [name, config] of variants) {
    console.log(`
  ### ${name}`);
    endOfSeasonBattles(students, 1500, config);
  }
}
