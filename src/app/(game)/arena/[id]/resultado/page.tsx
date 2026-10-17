import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultsTable } from "@/components/arena/ResultsTable";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { getBattle, getParticipants } from "@/server/battle-queries";
import { Icon, PixelText } from "@/components/pixel/Icon";

export default async function BattleResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const battle = await getBattle(id);
  if (!battle || battle.status !== "finished") notFound();
  const participants = await getParticipants(id);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <h1 className="font-pixel text-3xl"><Icon name="chart" /> {battle.name}</h1>
        <span className="text-sm text-muted">{formatDateTime(battle.finished_at)}</span>
        <Link href={`/arena/${battle.id}`} className="pixel-btn btn-small ml-auto">
          <Icon name="play" /> Ver replay
        </Link>
      </div>
      {battle.summary && (
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {battle.summary.funStats.map((s) => (
            <div key={s.title} className="pixel-panel p-3">
              <p className="font-pixel">
                <PixelText text={s.emoji} /> {s.title}
              </p>
              <p className="text-sm">{s.text}</p>
            </div>
          ))}
        </section>
      )}
      <ResultsTable rows={participants} showPower={session.profile.role === "teacher"} />
      {battle.summary && (
        <p className="text-sm text-muted">
          {battle.summary.participants} Pingos · {battle.summary.totalCrits} críticos · {battle.summary.totalDodges} esquivas
          {battle.summary.suddenDeath ? " · teve morte súbita!" : ""} · seed {battle.seed} · motor {battle.engine_version}
        </p>
      )}
    </div>
  );
}
