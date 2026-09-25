import { GAME } from "@/config/game";

export interface RankingInput {
  profile_id: string;
  placement: number | null;
  kills: number | null;
}

export interface RankingRow {
  profileId: string;
  points: number;
  battles: number;
  wins: number;
  podiums: number;
  kills: number;
  bestPlacement: number | null;
}

export function placementPoints(placement: number): number {
  const table = GAME.season.pointsByPlacement;
  return table[placement - 1] ?? GAME.season.participationPoints;
}

/** Season ranking: points for placement + a little per elimination. Ties: wins, then kills. */
export function computeRanking(results: RankingInput[]): RankingRow[] {
  const rows = new Map<string, RankingRow>();
  for (const r of results) {
    if (r.placement == null) continue;
    const row = rows.get(r.profile_id) ?? {
      profileId: r.profile_id,
      points: 0,
      battles: 0,
      wins: 0,
      podiums: 0,
      kills: 0,
      bestPlacement: null,
    };
    row.battles++;
    row.points += placementPoints(r.placement) + (r.kills ?? 0) * GAME.season.pointsPerKill;
    row.kills += r.kills ?? 0;
    if (r.placement === 1) row.wins++;
    if (r.placement <= 3) row.podiums++;
    row.bestPlacement = row.bestPlacement == null ? r.placement : Math.min(row.bestPlacement, r.placement);
    rows.set(r.profile_id, row);
  }
  return [...rows.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || b.kills - a.kills);
}
