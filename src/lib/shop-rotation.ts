import { ALL_ITEMS, type ItemCategory } from "@/content/items";

const CATEGORIES: ItemCategory[] = ["weapon", "helmet", "outfit"];

/**
 * Picks `perCategory` items of each category. Prefers items that were NOT in the previous
 * rotation (variety), but anything can come back later — no artificial scarcity forever.
 * Also guarantees at least one cheap (tier 1-2) item per category so new players can always buy.
 */
export function pickRotation(
  perCategory: number,
  previous: string[] = [],
  random: () => number = Math.random,
): string[] {
  const shuffled = <T,>(list: T[]) =>
    list
      .map((value) => ({ value, key: random() }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.value);

  const chosen: string[] = [];
  for (const category of CATEGORIES) {
    const pool = ALL_ITEMS.filter((i) => i.category === category);
    const fresh = shuffled(pool.filter((i) => !previous.includes(i.id)));
    const repeat = shuffled(pool.filter((i) => previous.includes(i.id)));
    const ordered = [...fresh, ...repeat];

    const picks = ordered.slice(0, perCategory);
    if (!picks.some((i) => i.tier <= 2)) {
      const cheap = ordered.find((i) => i.tier <= 2 && !picks.includes(i));
      if (cheap) picks[picks.length - 1] = cheap;
    }
    chosen.push(...picks.map((i) => i.id));
  }
  return chosen;
}
