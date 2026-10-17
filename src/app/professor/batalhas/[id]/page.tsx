import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultsTable } from "@/components/arena/ResultsTable";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";
import { lookFromPingo } from "@/lib/snapshot";
import { requireTeacher } from "@/server/auth";
import { getBattle, getParticipants } from "@/server/battle-queries";
import { getClassmates } from "@/server/queries";
import { BattleControls } from "./BattleControls";
import { ParticipantPicker } from "./ParticipantPicker";
import { Icon, PixelText } from "@/components/pixel/Icon";

export default async function ManageBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireTeacher();
  const battle = await getBattle(id);
  if (!battle || battle.class_id !== session.profile.class_id) notFound();
  const [participants, classmates] = await Promise.all([getParticipants(id), getClassmates(session.profile.class_id)]);
  const enrolled = new Set(participants.map((p) => p.row.profile_id));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="font-pixel text-3xl leading-none">{battle.name}</h1>
          <p className="text-muted text-sm mt-1">
            {formatDateTime(battle.scheduled_at)} {battle.prize_text && <> · <Icon name="gift" /> <PixelText text={battle.prize_text} /></>}
          </p>
        </div>
        <Link href={`/arena/${battle.id}`} className="pixel-btn btn-small ml-auto">
          <Icon name="swords" /> Abrir na Arena (projetor)
        </Link>
      </div>

      <BattleControls battleId={battle.id} status={battle.status} participantCount={participants.length} />

      {battle.status === "scheduled" && (
        <Card title={`Participantes (${enrolled.size})`}>
          <ParticipantPicker
            battleId={battle.id}
            students={classmates
              .filter((c) => c.profile.active)
              .map((c) => ({ id: c.profile.id, name: c.profile.display_name, pingo: c.pingo?.name ?? "" }))}
            enrolled={[...enrolled]}
          />
        </Card>
      )}

      {battle.status === "locked" && (
        <Card title={`Snapshot travado (${participants.length} Pingos)`}>
          <p className="text-sm text-muted mb-3">
            Estes são os equipamentos que valem para esta batalha. Os alunos podem trocar de item agora — isso só vale para as próximas.
          </p>
          <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3">
            {participants
              .sort((a, b) => (b.row.power_score ?? 0) - (a.row.power_score ?? 0))
              .map(({ row, pingo }) => {
                const snap = row.snapshot;
                return (
                  <li key={row.profile_id} className="flex flex-col items-center text-center text-xs">
                    <PingoAvatar
                      look={snap?.look ?? lookFromPingo(pingo)}
                      gear={Object.fromEntries((snap?.items ?? []).map((i) => [i.category, i.sprite]))}
                      size={72}
                      animated={false}
                    />
                    <b>{snap?.pingoName}</b>
                    <span className="text-muted">{snap?.displayName}</span>
                    <span title="Power score estimado"><Icon name="bolt" /> {row.power_score}</span>
                  </li>
                );
              })}
          </ul>
        </Card>
      )}

      {battle.status === "finished" && (
        <>
          {battle.summary && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {battle.summary.funStats.map((s) => (
                <Card key={s.title}>
                  <p className="font-pixel">
                    <PixelText text={s.emoji} /> {s.title}
                  </p>
                  <p className="text-sm">{s.text}</p>
                </Card>
              ))}
            </div>
          )}
          <ResultsTable rows={participants} showPower />
          <p className="text-xs text-muted">
            seed {battle.seed} · motor {battle.engine_version} · {battle.summary?.totalCrits} críticos · {battle.summary?.totalDodges} esquivas
            {battle.summary?.suddenDeath ? " · morte súbita" : ""}. Power score: estimativa de força ANTES da batalha (pelado = 100) — use
            para achar itens desbalanceados, não decide nada.
          </p>
        </>
      )}
    </div>
  );
}
