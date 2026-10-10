import { redirect } from "next/navigation";
import { DuelExperience } from "@/components/duel/DuelExperience";
import { entrantFrom } from "@/lib/duel-roster";
import { requireUser } from "@/server/auth";
import { getClassmates } from "@/server/queries";

/** Duels against classmates (prototype: the result and the XP are not saved yet). */
export default async function DuelPage({ searchParams }: { searchParams: Promise<{ buscar?: string }> }) {
  const session = await requireUser();
  if (session.profile.role !== "student") redirect("/arena");
  const { buscar } = await searchParams;
  const classmates = (await getClassmates(session.profile.class_id)).filter((c) => c.profile.active && !c.profile.pending);
  const roster = classmates.map((c) => entrantFrom(c.profile, c.pingo, c.loadout));
  const me = roster.find((r) => r.fighter.id === session.userId);
  if (!me) redirect("/pingo");

  return (
    <div className="mx-auto max-w-xl">
      {roster.length < 2 ? (
        <p className="pixel-panel p-6 text-center">Ainda não há colegas na turma para duelar.</p>
      ) : (
        <DuelExperience me={me} classmates={roster} autoStart={buscar !== undefined} />
      )}
    </div>
  );
}
