/**
 * Monte Carlo balance report. No browser, no database.
 *
 *   npm run simulate                       # all scenarios, 10 000 duels each
 *   npm run simulate -- --n 2000           # fewer duels (faster)
 *   npm run simulate -- --a tank --b glass # a single matchup
 *   npm run simulate -- --royale-only
 */
import { ALL_ITEMS, buildFromItems, getItem, type ItemDefinition } from "@/content/items";
import {
  createRng,
  powerScore,
  simulateBattle,
  type BattleResult,
  type CombatantInput,
} from "@/engine";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const N = Number(arg("n") ?? 10_000);

/** Named builds (item ids). Edit freely while balancing. */
const BUILDS: Record<string, string[]> = {
  naked: [],
  medium: ["mechanical_keyboard", "construction_helmet", "puffer_jacket"],
  medium2: ["ruler_katana", "chef_hat", "lab_coat"],
  strong: ["aquarium_anchor", "astronaut_helmet", "ceo_suit"],
  tank: ["door_shield", "knight_bucket", "turtle_shell"],
  glass: ["prompt_wand", "wizard_hat", "shadow_cloak"],
  speed: ["bbq_skewer", "propeller_cap", "racing_suit"],
  heavy: ["wifi_hammer", "pumpkin_head", "tin_armor"],
  crit: ["party_laser_sword", "wizard_hat", "wizard_robe"],
  antiCrit: ["thick_book", "fencing_mask", "tin_armor"],
  dodge: ["ninja_chopsticks", "ninja_headband", "bush_camouflage"],
  chickenUnderdog: ["rubber_chicken"],
};

const SCENARIOS: Array<[string, string, string]> = [
  ["Naked vs naked (sanity: ~50%)", "naked", "naked"],
  ["Build média vs naked", "medium", "naked"],
  ["Build forte vs naked (meta: 70-80%)", "strong", "naked"],
  ["Build forte vs build média", "strong", "medium"],
  ["Tank vs glass cannon", "tank", "glass"],
  ["Speed vs heavy", "speed", "heavy"],
  ["Crit vs anti-crit", "crit", "antiCrit"],
  ["Dodge vs heavy", "dodge", "heavy"],
  ["Duas builds semelhantes", "medium", "medium2"],
  ["Galinha caótica vs build forte", "chickenUnderdog", "strong"],
];

function combatant(id: string, itemIds: string[]): CombatantInput {
  const items = itemIds.map((itemId) => {
    const item = getItem(itemId);
    if (!item) throw new Error(`Unknown item ${itemId}`);
    return item;
  });
  return { id, name: id, ...buildFromItems(items) };
}

interface DuelStats {
  winA: number;
  ticks: number;
  crits: number;
  dodges: number;
  attacks: number;
  suddenDeath: number;
}

function runDuels(a: CombatantInput, b: CombatantInput, n: number): DuelStats {
  const s: DuelStats = { winA: 0, ticks: 0, crits: 0, dodges: 0, attacks: 0, suddenDeath: 0 };
  for (let i = 0; i < n; i++) {
    // alternate list order so neither side benefits from tie-breaking
    const participants = i % 2 === 0 ? [a, b] : [b, a];
    const r = simulateBattle({ seed: 1 + i, participants });
    if (r.winnerId === "A") s.winA++;
    s.ticks += r.ticks;
    if (r.suddenDeathReached) s.suddenDeath++;
    for (const f of Object.values(r.fighters)) {
      s.crits += f.crits;
      s.dodges += f.dodges;
      s.attacks += f.attacks;
    }
  }
  return s;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function printDuel(title: string, aName: string, bName: string) {
  const a = { ...combatant("A", BUILDS[aName]) };
  const b = { ...combatant("B", BUILDS[bName]) };
  const s = runDuels(a, b, N);
  console.log(`\n▶ ${title}`);
  console.log(`  A=${aName} (power ${powerScore(a.stats, a.effects)})  vs  B=${bName} (power ${powerScore(b.stats, b.effects)})`);
  console.log(
    `  win A ${pct(s.winA / N)} | win B ${pct(1 - s.winA / N)} | duração média ${(s.ticks / N).toFixed(1)} ticks` +
      ` | ataques ${(s.attacks / N).toFixed(1)} | críticos ${(s.crits / N).toFixed(2)} | esquivas ${(s.dodges / N).toFixed(2)}` +
      ` | sudden death ${pct(s.suddenDeath / N)}`,
  );
}

/**
 * "Realistic class": 20 students with different coin budgets buy random items they can afford.
 * Shows how much doing activities (budget) moves the royale win rate.
 */
function realisticClass(royales: number) {
  const rng = createRng(4242);
  const budgets = [0, 0, 150, 300, 300, 450, 450, 600, 600, 750, 750, 900, 900, 1050, 1200, 1200, 1350, 1500, 1500, 1800];
  const byCategory = (c: ItemDefinition["category"]) => ALL_ITEMS.filter((i) => i.category === c);

  const makeLoadout = (budget: number): ItemDefinition[] => {
    const chosen: ItemDefinition[] = [];
    let money = budget;
    for (const cat of rng.shuffle(["weapon", "helmet", "outfit"] as const)) {
      const affordable = byCategory(cat).filter((i) => i.price <= money);
      if (affordable.length === 0) continue;
      // students tend to buy the best thing they can afford
      const maxTier = Math.max(...affordable.map((i) => i.tier));
      const pick = rng.pick(affordable.filter((i) => i.tier >= maxTier - 1));
      chosen.push(pick);
      money -= pick.price;
    }
    return chosen;
  };

  const wins = new Array(budgets.length).fill(0);
  const podium = new Array(budgets.length).fill(0);
  const powers = new Array(budgets.length).fill(0);
  let totalEvents = 0;
  let sd = 0;
  for (let r = 0; r < royales; r++) {
    const participants = budgets.map((budget, i) => {
      const build = buildFromItems(makeLoadout(budget));
      powers[i] += powerScore(build.stats, build.effects);
      return { id: String(i), name: `aluno${i}`, ...build };
    });
    const result: BattleResult = simulateBattle({ seed: 90_000 + r, participants });
    wins[Number(result.winnerId)]++;
    for (const [id, f] of Object.entries(result.fighters)) if (f.placement <= 3) podium[Number(id)]++;
    totalEvents += result.events.length;
    if (result.suddenDeathReached) sd++;
  }

  console.log(`\n▶ Turma realista: 20 Pingos, ${royales} Battle Royales, orçamentos variados`);
  console.log("  orçamento  power médio  vitória  pódio (top 3)");
  budgets.forEach((b, i) => {
    console.log(
      `  ${String(b).padStart(5)} PC   ${(powers[i] / royales).toFixed(0).padStart(5)}      ${pct(wins[i] / royales).padStart(6)}  ${pct(podium[i] / royales).padStart(6)}`,
    );
  });
  const group = (from: number, to: number) => wins.slice(from, to).reduce((s, w) => s + w, 0) / royales / (to - from);
  console.log(`  média por aluno: 5 mais pobres ${pct(group(0, 5))} | 5 mais ricos ${pct(group(15, 20))} | chance uniforme ${pct(1 / 20)}`);
  console.log(`  eventos por batalha ${(totalEvents / royales).toFixed(0)} | sudden death em ${pct(sd / royales)}`);
}

/** Random "well equipped" builds (tier 3-4 in every slot) vs a naked Pingo. */
function topBuildDistribution(builds: number, duels: number) {
  const rng = createRng(7);
  const pick = (cat: ItemDefinition["category"]) =>
    rng.pick(ALL_ITEMS.filter((i) => i.category === cat && i.tier >= 3));
  const naked: CombatantInput = combatant("B", []);
  const results: { ids: string; win: number }[] = [];
  for (let b = 0; b < builds; b++) {
    const items = [pick("weapon"), pick("helmet"), pick("outfit")];
    const s = runDuels({ id: "A", name: "A", ...buildFromItems(items) }, naked, duels);
    results.push({ ids: items.map((i) => i.id).join(" + "), win: s.winA / duels });
  }
  results.sort((a, b) => a.win - b.win);
  const q = (p: number) => pct(results[Math.floor(p * (results.length - 1))].win);
  console.log(`\n▶ ${builds} builds aleatórias só com itens T3/T4 vs naked (${duels} duelos cada)`);
  console.log(`  mín ${q(0)} | p25 ${q(0.25)} | mediana ${q(0.5)} | p75 ${q(0.75)} | máx ${q(1)}`);
  console.log(`  mais forte: ${results[results.length - 1].ids}`);
  console.log(`  mais fraca: ${results[0].ids}`);
}

// ---------- main ----------
const onlyA = arg("a");
const onlyB = arg("b");
console.log(`Pingo Battle Royale — simulação de balanceamento (${N} duelos por cenário)`);

if (onlyA && onlyB) {
  printDuel(`${onlyA} vs ${onlyB}`, onlyA, onlyB);
} else {
  if (!process.argv.includes("--royale-only")) {
    for (const [title, a, b] of SCENARIOS) printDuel(title, a, b);
    topBuildDistribution(100, Math.min(N, 1000));
  }
  realisticClass(Number(arg("royales") ?? 2000));
}
