import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Coins } from "@/components/ui/Coins";
import { GAME } from "@/config/game";
import { formatDateTime } from "@/lib/format";
import { getClassDetail } from "@/server/admin-queries";
import { requireAdmin } from "@/server/auth";
import { Icon } from "@/components/pixel/Icon";
import { DuelsPerDay } from "../../DuelsPerDay";

const UUID = /^[0-9a-f-]{36}$/i;

/** One class as the admin sees it: engagement and progress, student by student (read-only). */
export default async function AdminClassPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const detail = await getClassDetail(id);
  if (!detail) notFound();
  const { klass, teachers, pending, inactive, students, duelsToday, duelsWeek, days } = detail;
  const playedWeek = students.filter((s) => s.week > 0).length;
  const coins = students.reduce((sum, s) => sum + s.coins, 0);

  return (
    <div className="grid gap-4">
      <Link href="/admin" className="text-sm underline">← Todas as turmas</Link>
      <h1 className="font-pixel text-3xl -mt-2">{klass.name}</h1>
      <p className="text-muted -mt-3">
        Professor: {teachers.join(", ") || "—"}
        {inactive > 0 && ` · ${inactive} ${inactive === 1 ? "aluno desativado" : "alunos desativados"}`}
      </p>
      {pending.length > 0 && (
        <p className="pixel-panel bg-[#fff6c9] px-4 py-3 text-sm">
          <Icon name="handRaised" /> Aguardando aprovação do professor: {pending.join(", ")}
        </p>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card title="Alunos ativos">
          <p className="font-pixel text-4xl">{students.length}</p>
        </Card>
        <Card title="Jogaram na semana">
          <p className="font-pixel text-4xl">
            {playedWeek}
            <span className="text-xl text-muted">/{students.length}</span>
          </p>
        </Card>
        <Card title="Duelos">
          <p className="font-pixel text-4xl">{duelsToday}</p>
          <p className="text-xs text-muted">hoje · {duelsWeek} em 7 dias</p>
        </Card>
        <Card title="Moedas">
          <Coins amount={coins} size="lg" />
        </Card>
      </div>

      <Card title="📅 Duelos por dia">
        <DuelsPerDay days={days} />
      </Card>

      <Card title="⭐ Alunos">
        {students.length === 0 ? (
          <p className="text-sm text-muted">Nenhum aluno ativo ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-pixel border-b-2 border-ink">
                  <th className="p-2">#</th>
                  <th className="p-2">Aluno</th>
                  <th className="p-2 text-right">Nível</th>
                  <th className="p-2 text-right">XP</th>
                  <th className="p-2 text-right">Moedas</th>
                  <th className="p-2 text-right">Hoje</th>
                  <th className="p-2 text-right">7 dias</th>
                  <th className="p-2 text-right">Vitórias</th>
                  <th className="p-2">Último duelo</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className="border-b border-ink/10">
                    <td className="p-2 font-pixel">{i + 1}</td>
                    <td className="p-2">
                      <b>{s.name}</b>
                      <span className="block text-xs text-muted">{s.username}</span>
                    </td>
                    <td className="p-2 text-right font-pixel text-lg">{s.level}</td>
                    <td className="p-2 text-right tabular-nums">{s.xp}</td>
                    <td className="p-2 text-right">
                      <Coins amount={s.coins} />
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {s.today}
                      {s.today >= GAME.duels.dailyXpDuels && <span title="Chegou ao limite de XP do dia"> <Icon name="check" /></span>}
                    </td>
                    <td className="p-2 text-right tabular-nums">{s.week}</td>
                    <td className="p-2 text-right tabular-nums">{s.week ? `${Math.round((s.wins / s.week) * 100)}%` : "—"}</td>
                    <td className="p-2 text-xs text-muted">{s.last ? formatDateTime(s.last) : "sem duelos na semana"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted mt-2">
          &quot;Hoje&quot; e &quot;7 dias&quot; contam os duelos que o aluno começou. Vitórias = % desses duelos que ele venceu.
        </p>
      </Card>
    </div>
  );
}
