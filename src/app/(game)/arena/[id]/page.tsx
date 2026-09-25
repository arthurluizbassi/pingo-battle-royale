import Link from "next/link";
import { notFound } from "next/navigation";
import { ArenaReplay } from "@/components/arena/ArenaReplay";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { formatDateTime } from "@/lib/format";
import { lookFromPingo } from "@/lib/snapshot";
import { requireUser } from "@/server/auth";
import { getBattle, getEvents, getParticipants, replayParticipant } from "@/server/battle-queries";

export default async function BattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const battle = await getBattle(id);
  if (!battle) notFound();
  const participants = await getParticipants(id);
  const isTeacher = session.profile.role === "teacher";

  if (battle.status !== "finished") {
    return (
      <div className="grid gap-4">
        <AutoRefresh seconds={8} />
        <div className="pixel-panel p-5 text-center grid gap-2 justify-items-center">
          <h1 className="font-pixel text-3xl">{battle.name}</h1>
          {battle.prize_text && <p className="pixel-inset bg-white px-3 py-1">🎁 {battle.prize_text}</p>}
          <p className="text-lg">
            {battle.status === "locked"
              ? "🔒 Loadouts travados! Aguardando o professor iniciar a batalha…"
              : "Inscrições abertas. Ajuste seus equipamentos antes do professor travar os loadouts!"}
          </p>
          {battle.scheduled_at && <p className="text-muted">Marcada para {formatDateTime(battle.scheduled_at)}</p>}
          {isTeacher && (
            <Link href={`/professor/batalhas/${battle.id}`} className="pixel-btn btn-grape">
              Gerenciar batalha
            </Link>
          )}
        </div>
        <section className="pixel-panel p-4">
          <h2 className="font-pixel text-lg mb-3">Participantes ({participants.length})</h2>
          <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3">
            {participants.map(({ row, profile, pingo, currentLoadout }) => {
              const snap = row.snapshot;
              const gear = snap ? Object.fromEntries(snap.items.map((i) => [i.category, i.sprite])) : currentLoadout;
              return (
                <li key={row.profile_id} className="flex flex-col items-center text-center">
                  <PingoAvatar look={snap?.look ?? lookFromPingo(pingo)} gear={gear} size={84} />
                  <span className="font-pixel text-sm leading-tight">{snap?.pingoName ?? pingo?.name}</span>
                  <span className="text-xs text-muted">{profile?.display_name}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    );
  }

  const events = await getEvents(id);
  const snapshots = participants.map((p) => p.row.snapshot).filter((s) => s !== null);
  const results = Object.fromEntries(
    participants.map(({ row }) => [
      row.profile_id,
      { kills: row.kills ?? 0, placement: row.placement ?? 0, damageDealt: row.damage_dealt ?? 0 },
    ]),
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <h1 className="font-pixel text-3xl">{battle.name}</h1>
        <span className="text-sm text-muted">
          {formatDateTime(battle.finished_at)} · seed {battle.seed}
        </span>
        <Link href={`/arena/${battle.id}/resultado`} className="pixel-btn btn-small btn-white ml-auto">
          📊 Resultado
        </Link>
      </div>
      <ArenaReplay
        title={battle.name}
        participants={snapshots.map(replayParticipant)}
        events={events}
        results={results}
        funStats={battle.summary?.funStats ?? []}
      />
    </div>
  );
}
