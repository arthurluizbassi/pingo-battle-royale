import type { BattleEvent } from "@/engine";

/**
 * Turns the saved event log into a paced animation timeline (milliseconds at 1× speed).
 * Pure function: it never recalculates combat, it only decides WHEN to show each event.
 *  - many Pingos alive  => attacks overlap (fast, chaotic)
 *  - few Pingos alive   => one at a time, slower (tension)
 *  - a Pingo never does two things at once, so its HP always changes in log order
 */

export type Step =
  | { kind: "attack"; at: number; duration: number; event: Extract<BattleEvent, { type: "attack" }> }
  | { kind: "eliminate"; at: number; event: Extract<BattleEvent, { type: "eliminated" }> }
  | { kind: "adrenaline"; at: number; id: string }
  | { kind: "zone"; at: number; hits: Array<Extract<BattleEvent, { type: "zone" }>> }
  | { kind: "banner"; at: number; duration: number; text: string; tone: "info" | "danger" | "final" }
  | { kind: "victory"; at: number; id: string };

export interface FeedEntry {
  at: number;
  text: string;
  tone: "normal" | "crit" | "kill" | "info" | "dodge";
}

export interface Timeline {
  steps: Step[];
  feed: FeedEntry[];
  /** time when the victory celebration starts */
  victoryAt: number;
  duration: number;
}

export const PACING = {
  intro: 2600,
  attack: 700,
  eliminate: 900,
  banner: 1700,
  finalSlowdown: 1.35,
  celebration: 6000,
};

const MILESTONES: Record<number, string> = {
  10: "10 PINGOS RESTANTES",
  5: "5 PINGOS RESTANTES",
  3: "FINAL 3",
  2: "DUELO FINAL!",
};

/** Delay between the starts of consecutive actions, by number of Pingos alive. */
export function gapFor(alive: number): number {
  const base = Math.max(240, Math.min(820, 900 - 36 * alive));
  return alive <= 3 ? base * PACING.finalSlowdown : base;
}

export function buildTimeline(events: BattleEvent[], names: Record<string, string>): Timeline {
  const steps: Step[] = [];
  const feed: FeedEntry[] = [];
  const name = (id: string | null) => (id ? (names[id] ?? "?") : "a zona");
  const busyUntil = new Map<string, number>();
  const busy = (id: string) => busyUntil.get(id) ?? 0;

  let alive = events.filter((e) => e.type === "spawn").length;
  let cursor = PACING.intro;
  steps.push({ kind: "banner", at: 900, duration: 1500, text: "3... 2... 1... LUTEM!", tone: "info" });
  feed.push({ at: 900, text: `${alive} Pingos entraram na arena!`, tone: "info" });

  let lastZoneTick = -1;
  let zoneStep: Extract<Step, { kind: "zone" }> | null = null;
  let victoryAt = cursor;

  for (const event of events) {
    switch (event.type) {
      case "spawn":
        break;

      case "attack": {
        const at = Math.max(cursor, busy(event.attacker), busy(event.target));
        const duration = PACING.attack * (alive <= 3 ? PACING.finalSlowdown : 1);
        steps.push({ kind: "attack", at, duration, event });
        busyUntil.set(event.attacker, at + duration);
        busyUntil.set(event.target, at + duration);
        cursor = at + gapFor(alive);

        const a = name(event.attacker);
        const t = name(event.target);
        if (event.dodged) feed.push({ at, text: `${t} desviou do ataque de ${a}!`, tone: "dodge" });
        else if (event.crit) feed.push({ at, text: `${a} acertou um CRÍTICO de ${event.damage} em ${t}!`, tone: "crit" });
        else if (event.tags.includes("firstStrike")) feed.push({ at, text: `${a} abriu a luta com um golpaço (${event.damage})!`, tone: "normal" });
        else if (event.tags.includes("chaosHigh")) feed.push({ at, text: `O caos favoreceu ${a}: ${event.damage} de dano!`, tone: "normal" });
        else if (event.blocked) feed.push({ at, text: `${t} bloqueou parte do golpe de ${a}.`, tone: "normal" });
        break;
      }

      case "zone": {
        if (event.t !== lastZoneTick || !zoneStep) {
          const at = Math.max(cursor, ...[...busyUntil.values()].map((v) => v - PACING.attack / 2));
          zoneStep = { kind: "zone", at, hits: [] };
          steps.push(zoneStep);
          lastZoneTick = event.t;
          cursor = at + 700;
        }
        zoneStep.hits.push(event);
        busyUntil.set(event.id, Math.max(busy(event.id), zoneStep.at + 500));
        break;
      }

      case "adrenaline": {
        const at = Math.max(cursor - gapFor(alive), busy(event.id) - 100);
        steps.push({ kind: "adrenaline", at, id: event.id });
        feed.push({ at, text: `${name(event.id)} entrou em modo ADRENALINA!`, tone: "info" });
        break;
      }

      case "eliminated": {
        const at = busy(event.id);
        steps.push({ kind: "eliminate", at, event });
        busyUntil.set(event.id, at + PACING.eliminate);
        alive = event.remaining;
        feed.push({
          at,
          text: event.by ? `${name(event.by)} eliminou ${name(event.id)}!` : `${name(event.id)} foi engolido pela zona!`,
          tone: "kill",
        });
        const milestone = MILESTONES[event.remaining];
        if (milestone) {
          const bannerAt = at + 350;
          steps.push({ kind: "banner", at: bannerAt, duration: PACING.banner, text: milestone, tone: event.remaining <= 3 ? "final" : "danger" });
          feed.push({ at: bannerAt, text: `Restam ${event.remaining} Pingos.`, tone: "info" });
          cursor = Math.max(cursor, bannerAt + 900);
        } else if (event.remaining > 1) {
          feed.push({ at, text: `Restam ${event.remaining} Pingos.`, tone: "info" });
        }
        break;
      }

      case "suddenDeath": {
        const at = cursor;
        steps.push({ kind: "banner", at, duration: PACING.banner, text: "MORTE SÚBITA! A ARENA ESTÁ FECHANDO", tone: "danger" });
        feed.push({ at, text: "Morte súbita: a zona começa a causar dano em todos!", tone: "info" });
        cursor = at + 1200;
        break;
      }

      case "victory": {
        const lastBusy = Math.max(cursor, ...busyUntil.values());
        victoryAt = lastBusy + 600;
        steps.push({ kind: "banner", at: victoryAt, duration: 2200, text: "ÚLTIMO PINGO!", tone: "final" });
        steps.push({ kind: "victory", at: victoryAt + 400, id: event.id });
        feed.push({ at: victoryAt, text: `🏆 ${name(event.id)} VENCEU O BATTLE ROYALE!`, tone: "kill" });
        break;
      }
    }
  }

  steps.sort((a, b) => a.at - b.at);
  feed.sort((a, b) => a.at - b.at);
  return { steps, feed, victoryAt, duration: victoryAt + PACING.celebration };
}
