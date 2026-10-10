import { notFound } from "next/navigation";
import { DuelExperience } from "@/components/duel/DuelExperience";
import { demoRoster } from "@/lib/duel-roster";

/** Development-only: duel prototype with a fake class (no database). ?seed=3&arma=mechanical_keyboard|none */
export default async function DevDuelPage({ searchParams }: { searchParams: Promise<{ seed?: string; arma?: string; buscar?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { seed = "3", arma, buscar } = await searchParams;
  const roster = demoRoster(Number(seed) || 3, arma);
  return (
    <main className="game-bg min-h-screen p-4">
      <div className="mx-auto max-w-xl">
        <DuelExperience me={roster[0]} classmates={roster} autoStart={buscar !== undefined} backHref="/dev/duelo" mode="demo" />
      </div>
    </main>
  );
}
