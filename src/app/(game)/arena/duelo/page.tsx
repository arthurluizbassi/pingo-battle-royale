import Link from "next/link";
import { redirect } from "next/navigation";
import { DuelExperience } from "@/components/duel/DuelExperience";
import { entrantFrom } from "@/lib/duel-roster";
import { formatDateTime } from "@/lib/format";
import { NEW_PROGRESS } from "@/lib/levels";
import { requireUser } from "@/server/auth";
import { schoolDay } from "@/server/duels";
import { getClassProgress, getClassmates, getMyDuels } from "@/server/queries";
import { DailyRanking } from "@/components/duel/DailyRanking";
import { getDailyPrizes, getTodayRanking, nextMidnightBrasilia, settlePendingRankings } from "@/server/daily-ranking";
import { Icon } from "@/components/pixel/Icon";

/** Duels against classmates: the server picks the opponent and saves the XP. */
export default async function DuelPage({ searchParams }: { searchParams: Promise<{ buscar?: string }> }) {
  const session = await requireUser();
  if (session.profile.role !== "student") redirect("/arena");
  const { buscar } = await searchParams;
  await settlePendingRankings(session.profile.class_id);
  const [classmates, progress, duels, todayRanking, prizes] = await Promise.all([
    getClassmates(session.profile.class_id),
    getClassProgress(),
    getMyDuels(session.userId, 40),
    getTodayRanking(),
    getDailyPrizes(session.profile.class_id),
  ]);
  const active = classmates.filter((c) => c.profile.active && !c.profile.pending);
  const roster = active.map((c) => entrantFrom(c.profile, c.pingo, c.loadout, progress.get(c.profile.id) ?? NEW_PROGRESS));
  const me = roster.find((r) => r.fighter.id === session.userId);
  if (!me) redirect("/pingo");

  const today = schoolDay(new Date());
  const duelsToday = duels.filter((d) => d.challenger_id === session.userId && d.counted && schoolDay(d.created_at) === today).length;
  const nameOf = new Map(classmates.map((c) => [c.profile.id, c.pingo?.name ?? c.profile.display_name]));

  return (
    <div className="mx-auto max-w-xl grid gap-5">
      {roster.length < 2 ? (
        <p className="pixel-panel p-6 text-center">Ainda não há colegas na turma para duelar.</p>
      ) : (
        <DuelExperience
          me={me}
          classmates={roster}
          autoStart={buscar !== undefined}
          initial={{ xp: (progress.get(session.userId) ?? NEW_PROGRESS).xp, duelsToday }}        />
      )}

      <DailyRanking
        compact
        rows={todayRanking}
        people={new Map(classmates.map((c) => [c.profile.id, c]))}
        meId={session.userId}
        prizes={prizes}
        resetsAt={nextMidnightBrasilia()}
      />

      <section className="pixel-panel p-4">
        <h2 className="font-pixel text-lg mb-2"><Icon name="scroll" /> Últimos duelos</h2>
        {duels.length === 0 ? (
          <p className="text-sm text-muted">Nenhum duelo ainda. Que tal o primeiro?</p>
        ) : (
          <ul className="grid gap-2">
            {duels.slice(0, 12).map((d) => {
              const iChallenged = d.challenger_id === session.userId;
              const other = nameOf.get(iChallenged ? d.defender_id : d.challenger_id) ?? "um colega";
              const won = d.winner_id === session.userId;
              return (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <span className={`pixel-chip ${won ? "bg-leaf text-white" : "bg-white"}`}>{won ? "Venceu" : "Perdeu"}</span>
                  <span className="flex-1 min-w-0">
                    {iChallenged ? (
                      <>
                        Você desafiou <b>{other}</b>
                        {d.trophy_delta != null && (
                          <span className={`font-bold ${d.trophy_delta > 0 ? "text-leaf" : "text-muted"}`}>
                            {" "}
                            {d.trophy_delta > 0 ? "+" : "−"}
                            {Math.abs(d.trophy_delta)} <Icon name="trophy" />
                          </span>
                        )}
                        {d.xp_gained > 0 && <span className="text-leaf font-bold"> +{d.xp_gained} XP</span>}
                      </>
                    ) : (
                      <>
                        <Icon name="shield" /> <b>{other}</b> desafiou você
                      </>
                    )}
                    <span className="block text-xs text-muted">{formatDateTime(d.created_at)}</span>
                  </span>
                  <Link href={`/arena/duelo/${d.id}`} className="pixel-btn btn-small btn-white">
                    <Icon name="play" /> Assistir
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
