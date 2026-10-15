import { notFound } from "next/navigation";
import { DuelReplay } from "@/app/(game)/arena/duelo/[id]/DuelReplay";
import { DUEL_BALANCE, simulateBattle } from "@/engine";
import { demoRoster } from "@/lib/duel-roster";

/** Development-only: the replay page layout with a fake duel (no database, no login). ?seed=3 */
export default async function DevReplayPage({ searchParams }: { searchParams: Promise<{ seed?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { seed = "3" } = await searchParams;
  const [a, b] = demoRoster(Number(seed) || 3);
  const result = simulateBattle(
    {
      seed: Number(seed) || 3,
      participants: [
        { id: a.fighter.id, name: a.fighter.pingoName, stats: a.stats, effects: a.effects },
        { id: b.fighter.id, name: b.fighter.pingoName, stats: b.stats, effects: b.effects },
      ],
    },
    DUEL_BALANCE,
  );
  const winner = result.winnerId === a.fighter.id ? a : b;
  // same shell as the (game) layout + /arena/duelo/[id]
  return (
    <div className="game-bg min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-5">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="font-pixel text-3xl">
                {a.fighter.pingoName} × {b.fighter.pingoName}
              </h1>
              <p className="text-sm text-muted">replay de teste · seed {seed}</p>
            </div>
          </div>
          <DuelReplay you={a.fighter} foe={b.fighter} events={result.events} winnerName={winner.fighter.pingoName} />
        </div>
      </main>
    </div>
  );
}
