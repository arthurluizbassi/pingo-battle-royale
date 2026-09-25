/**
 * Prints every item's strength when worn alone by a naked Pingo:
 * power score (formula) and real duel win rate vs a naked Pingo (simulated).
 * Run: npm run items:report   (optional: -- --duels 2000)
 */
import { ALL_ITEMS, buildFromItems } from "@/content/items";
import { BALANCE, powerScore, simulateBattle } from "@/engine";

const duelsArg = process.argv.indexOf("--duels");
const DUELS = duelsArg > 0 ? Number(process.argv[duelsArg + 1]) : 2000;

function winRateVsNaked(stats: ReturnType<typeof buildFromItems>): number {
  let wins = 0;
  for (let i = 0; i < DUELS; i++) {
    const result = simulateBattle({
      seed: 10_000 + i,
      participants: [
        { id: "item", name: "item", ...stats },
        { id: "naked", name: "naked", stats: BALANCE.base, effects: [] },
      ],
    });
    if (result.winnerId === "item") wins++;
  }
  return wins / DUELS;
}

const rows = ALL_ITEMS.map((item) => {
  const build = buildFromItems([item]);
  return {
    category: item.category,
    tier: item.tier,
    price: item.price,
    id: item.id,
    power: powerScore(build.stats, build.effects),
    winRate: winRateVsNaked(build),
  };
});

for (const category of ["weapon", "helmet", "outfit"] as const) {
  console.log(`\n=== ${category.toUpperCase()} ===`);
  console.log("tier  price  power  win%   id");
  for (const r of rows.filter((r) => r.category === category).sort((a, b) => a.tier - b.tier || b.power - a.power)) {
    console.log(
      `${String(r.tier).padEnd(6)}${String(r.price).padEnd(7)}${String(r.power).padEnd(7)}${(r.winRate * 100).toFixed(1).padEnd(7)}${r.id}`,
    );
  }
}

console.log("\n=== average by tier (all categories) ===");
for (const tier of [1, 2, 3, 4]) {
  const t = rows.filter((r) => r.tier === tier);
  const avgPower = t.reduce((s, r) => s + r.power, 0) / t.length;
  const avgWin = t.reduce((s, r) => s + r.winRate, 0) / t.length;
  console.log(`tier ${tier}: ${t.length} items, power ${avgPower.toFixed(1)}, win vs naked ${(avgWin * 100).toFixed(1)}%`);
}
