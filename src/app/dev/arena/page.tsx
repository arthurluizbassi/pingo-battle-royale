import { notFound } from "next/navigation";
import { ArenaReplay } from "@/components/arena/ArenaReplay";
import { demoBattle } from "@/lib/demo-battle";

/** Development-only: a fake battle to test the arena visuals without a database. ?seed=27&n=20 */
export default async function DevArenaPage({ searchParams }: { searchParams: Promise<{ seed?: string; n?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { seed = "27", n = "14" } = await searchParams;
  const battle = demoBattle(Number(seed) || 27, Math.min(30, Math.max(2, Number(n) || 14)));
  return (
    <main className="game-bg min-h-screen p-4">
      <h1 className="font-pixel text-2xl mb-3">Arena de demonstração · seed {seed}</h1>
      <ArenaReplay
        title="Royale de Teste"
        participants={battle.participants}
        events={battle.result.events}
        results={battle.result.fighters}
        funStats={battle.summary.funStats}
      />
    </main>
  );
}
