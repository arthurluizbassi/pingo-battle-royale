import { GAME } from "@/config/game";

/**
 * How many trophies the challenger wins or loses in a duel. The database decides the real value
 * (`record_duel`, same formula); this copy is for the demo mode, the tests and explaining the rule.
 *
 * The duel is worth `k` trophies, split by how likely the challenger was to win judging by the
 * trophy gap: beating someone with more trophies pays more, losing to someone with fewer costs more.
 */
export function trophyDelta(mine: number, foe: number, won: boolean, cfg: { k: number; scale: number } = GAME.duels.trophies): number {
  const expected = 1 / (1 + Math.pow(10, (foe - mine) / cfg.scale));
  if (won) return Math.max(1, Math.round(cfg.k * (1 - expected)));
  const loss = Math.min(mine, Math.max(1, Math.round(cfg.k * expected)));
  return loss === 0 ? 0 : -loss;
}
