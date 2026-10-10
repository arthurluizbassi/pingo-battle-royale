import { GAME } from "@/config/game";

export interface Candidate {
  id: string;
  level: number;
}

/**
 * "Encontrar Batalha": picks a classmate with a similar level ("meio" rule, see GAME_BALANCE.md).
 *  - never the same classmate more than `maxPerOpponentPerDay` times a day (if anyone else is left)
 *  - skips the last `avoidLastOpponents` opponents when possible
 *  - weight = exp(-|Δlevel| / levelWidth): similar levels are likely, anyone is possible
 * `random` returns [0, 1). Returns null only when there is nobody to fight.
 */
export function pickOpponent(
  me: Candidate,
  classmates: Candidate[],
  history: { recent: string[]; todayCounts: Record<string, number> },
  random: () => number,
  rules = GAME.duels,
): Candidate | null {
  const others = classmates.filter((c) => c.id !== me.id);
  if (others.length === 0) return null;

  let pool = others.filter((c) => (history.todayCounts[c.id] ?? 0) < rules.maxPerOpponentPerDay);
  if (pool.length === 0) pool = others;
  const recent = new Set(history.recent.slice(0, rules.avoidLastOpponents));
  const fresh = pool.filter((c) => !recent.has(c.id));
  if (fresh.length > 0) pool = fresh;

  const weights = pool.map((c) => Math.exp(-Math.abs(c.level - me.level) / rules.levelWidth));
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
