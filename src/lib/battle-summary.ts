import type { BattleResult } from "@/engine";
import type { BattleSummary, FunStat, ParticipantSnapshot } from "./db-types";

/** Fun facts shown on the victory screen and battle page. Pure function of the result. */
export function summarizeBattle(result: BattleResult, snapshots: ParticipantSnapshot[]): BattleSummary {
  const byId = new Map(snapshots.map((s) => [s.profileId, s]));
  const name = (id: string) => byId.get(id)?.pingoName ?? "?";
  const fighters = Object.entries(result.fighters).map(([id, f]) => ({ id, ...f }));
  const funStats: FunStat[] = [];

  const maxBy = <T,>(list: T[], score: (x: T) => number) =>
    list.reduce((best, x) => (score(x) > score(best) ? x : best), list[0]);

  const hardest = maxBy(fighters, (f) => f.biggestHit);
  if (hardest && hardest.biggestHit > 0) {
    funStats.push({
      emoji: "💥",
      title: "Pancada do dia",
      profileId: hardest.id,
      text: `${name(hardest.id)} acertou um golpe de ${hardest.biggestHit} de dano.`,
    });
  }

  const killer = maxBy(fighters, (f) => f.kills);
  if (killer && killer.kills >= 2) {
    funStats.push({
      emoji: "💀",
      title: "Exterminador",
      profileId: killer.id,
      text: `${name(killer.id)} eliminou ${killer.kills} Pingos.`,
    });
  }

  const dodger = maxBy(fighters, (f) => f.dodges);
  if (dodger && dodger.dodges >= 2) {
    funStats.push({
      emoji: "🌀",
      title: "Liso como sabão",
      profileId: dodger.id,
      text: `${name(dodger.id)} desviou de ${dodger.dodges} ataques.`,
    });
  }

  const punchingBag = maxBy(fighters, (f) => f.damageTaken);
  if (punchingBag && punchingBag.damageTaken > 0) {
    funStats.push({
      emoji: "🥊",
      title: "Saco de pancadas",
      profileId: punchingBag.id,
      text: `${name(punchingBag.id)} aguentou ${punchingBag.damageTaken} de dano.`,
    });
  }

  // underdog: lowest power among the top 3 (only if clearly below the average)
  const avgPower = snapshots.reduce((s, p) => s + p.powerScore, 0) / Math.max(1, snapshots.length);
  const podium = fighters.filter((f) => f.placement <= 3);
  const underdog = podium.reduce<(typeof fighters)[number] | null>((low, f) => {
    const p = byId.get(f.id)?.powerScore ?? 100;
    return !low || p < (byId.get(low.id)?.powerScore ?? 100) ? f : low;
  }, null);
  if (underdog && (byId.get(underdog.id)?.powerScore ?? 100) < avgPower - 5) {
    funStats.push({
      emoji: "🐣",
      title: "Zebra",
      profileId: underdog.id,
      text: `${name(underdog.id)} era um dos menos equipados e terminou em ${underdog.placement}º lugar.`,
    });
  }

  const firstOut = fighters.find((f) => f.placement === fighters.length);
  if (firstOut && fighters.length > 3) {
    funStats.push({
      emoji: "🍃",
      title: "Saiu cedo",
      profileId: firstOut.id,
      text: `${name(firstOut.id)} foi o primeiro a cair. Semana que vem é outra história.`,
    });
  }

  return {
    participants: fighters.length,
    ticks: result.ticks,
    suddenDeath: result.suddenDeathReached,
    totalCrits: fighters.reduce((s, f) => s + f.crits, 0),
    totalDodges: fighters.reduce((s, f) => s + f.dodges, 0),
    funStats,
  };
}

export interface TrophyGrant {
  profile_id: string;
  kind: "champion" | "runner_up" | "third" | "top_eliminator";
  label: string;
}

/** Cosmetic trophies only — they never change stats (anti-snowball). */
export function trophiesFor(result: BattleResult, battleName: string): TrophyGrant[] {
  const out: TrophyGrant[] = [];
  const fighters = Object.entries(result.fighters);
  const at = (place: number) => fighters.find(([, f]) => f.placement === place)?.[0];
  const first = at(1);
  const second = at(2);
  const third = fighters.length >= 4 ? at(3) : undefined;
  if (first) out.push({ profile_id: first, kind: "champion", label: `🏆 Campeão — ${battleName}` });
  if (second) out.push({ profile_id: second, kind: "runner_up", label: `🥈 Vice-campeão — ${battleName}` });
  if (third) out.push({ profile_id: third, kind: "third", label: `🥉 3º lugar — ${battleName}` });
  const [topId, top] = fighters.reduce((best, cur) => (cur[1].kills > best[1].kills ? cur : best), fighters[0]);
  if (top.kills >= 3) {
    out.push({ profile_id: topId, kind: "top_eliminator", label: `💀 ${top.kills} eliminações — ${battleName}` });
  }
  return out;
}
