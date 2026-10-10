import { GAME } from "@/config/game";
import { STAT_KEYS, computeStats, type StatKey, type StatModifiers, type Stats } from "@/engine";

/** How many times each stat was upgraded (as stored in pingo_progress.stat_points). */
export type StatPoints = Partial<Record<StatKey, number>>;

export interface Progress {
  xp: number;
  level: number;
  statPoints: StatPoints;
  pointsSpent: number;
}

export const NEW_PROGRESS: Progress = { xp: 0, level: 1, statPoints: {}, pointsSpent: 0 };

const L = GAME.levels;

/** XP to go from `level` to `level + 1`: grows linearly, rounded to 5. */
export function xpToNext(level: number): number {
  const a = L.totalXp / ((L.max * (L.max - 1)) / 2);
  return Math.round((a * level) / 5) * 5;
}

/** LEVEL_THRESHOLDS[i] = total XP needed to reach level i + 2. Also sent to the database. */
export const LEVEL_THRESHOLDS: number[] = (() => {
  const out: number[] = [];
  let total = 0;
  for (let level = 1; level < L.max; level++) {
    total += xpToNext(level);
    out.push(total);
  }
  return out;
})();

export function levelFromXp(xp: number): number {
  return 1 + LEVEL_THRESHOLDS.filter((t) => t <= xp).length;
}

/** Progress inside the current level, for XP bars. */
export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  if (level >= L.max) return { level, inLevel: 0, needed: 0, max: true };
  const start = level === 1 ? 0 : LEVEL_THRESHOLDS[level - 2];
  return { level, inLevel: xp - start, needed: xpToNext(level), max: false };
}

export function totalPoints(level: number): number {
  return (Math.min(level, L.max) - 1) * L.pointsPerLevel;
}

export function availablePoints(p: Pick<Progress, "level" | "pointsSpent">): number {
  return Math.max(0, totalPoints(p.level) - p.pointsSpent);
}

/** The stat bonus that the level points give (added on top of the items, before the caps). */
export function levelBonus(points: StatPoints): StatModifiers {
  const bonus: StatModifiers = {};
  for (const key of STAT_KEYS) {
    const n = points[key] ?? 0;
    if (n > 0) bonus[key] = Math.round(n * L.upgrades[key].value * 1000) / 1000;
  }
  return bonus;
}

/** Final stats of a Pingo: base + items + level points, clamped to the caps. */
export function statsWithLevel(itemModifiers: StatModifiers[], points: StatPoints): Stats {
  return computeStats([...itemModifiers, levelBonus(points)]);
}

/** Parses the jsonb column defensively (unknown keys and bad values are ignored). */
export function parseStatPoints(raw: unknown): StatPoints {
  const out: StatPoints = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of STAT_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "number" && Number.isInteger(v) && v > 0) out[key] = v;
  }
  return out;
}

export function progressFromRow(row: { xp: number; level: number; stat_points: unknown; points_spent: number } | null | undefined): Progress {
  if (!row) return { ...NEW_PROGRESS };
  return { xp: row.xp, level: row.level, statPoints: parseStatPoints(row.stat_points), pointsSpent: row.points_spent };
}
