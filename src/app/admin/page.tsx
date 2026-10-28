import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Coins } from "@/components/ui/Coins";
import { formatDateTime } from "@/lib/format";
import { getSchoolOverview } from "@/server/admin-queries";
import { requireAdmin } from "@/server/auth";
import { Icon } from "@/components/pixel/Icon";
import { DuelsPerDay } from "./DuelsPerDay";

/** Admin home: every class side by side. */
export default async function AdminHome() {
  await requireAdmin();
  const { classes, totals, days } = await getSchoolOverview();

  return (
    <div className="grid gap-4">
      <h1 className="font-pixel text-3xl"><Icon name="crown" /> Visão geral de todas as turmas</h1>
      <p className="text-sm text-muted -mt-2">Só leitura: aqui você acompanha, quem mexe em cada turma é o professor dela.</p>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card title="Turmas">
          <p className="font-pixel text-4xl">{totals.classes}</p>
          <p className="text-xs text-muted">{totals.teachers} {totals.teachers === 1 ? "professor" : "professores"}</p>
        </Card>
        <Card title="Alunos ativos">
          <p className="font-pixel text-4xl">{totals.students}</p>
        </Card>
        <Card title="Jogaram na semana">
          <p className="font-pixel text-4xl">
            {totals.playedWeek}
            <span className="text-xl text-muted">/{totals.students}</span>
          </p>
        </Card>
        <Card title="Duelos">
          <p className="font-pixel text-4xl">{totals.duelsToday}</p>
          <p className="text-xs text-muted">hoje · {totals.duelsWeek} em 7 dias</p>
        </Card>
      </div>

      <Card title="📅 Duelos por dia (todas as turmas)">
        <DuelsPerDay days={days} />
      </Card>

      <Card title="🏫 Turmas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-pixel border-b-2 border-ink">
                <th className="p-2">Turma</th>
                <th className="p-2">Professor</th>
                <th className="p-2 text-right">Alunos</th>
                <th className="p-2 text-right">Jogaram (7 dias)</th>
                <th className="p-2 text-right">Duelos hoje</th>
                <th className="p-2 text-right">Duelos 7 dias</th>
                <th className="p-2 text-right">Nível médio</th>
                <th className="p-2 text-right">Moedas</th>
                <th className="p-2">Último duelo</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-b border-ink/10">
                  <td className="p-2">
                    <Link href={`/admin/turmas/${c.id}`} className="font-bold underline">
                      {c.name}
                    </Link>
                    {c.pending > 0 && (
                      <span className="block text-xs text-muted">
                        <Icon name="handRaised" /> {c.pending} aguardando aprovação
                      </span>
                    )}
                  </td>
                  <td className="p-2">{c.teachers.join(", ") || "—"}</td>
                  <td className="p-2 text-right tabular-nums">{c.students}</td>
                  <td className="p-2 text-right tabular-nums">
                    {c.playedWeek}
                    {c.students > 0 && <span className="text-muted"> ({Math.round((c.playedWeek / c.students) * 100)}%)</span>}
                  </td>
                  <td className="p-2 text-right tabular-nums">{c.duelsToday}</td>
                  <td className="p-2 text-right tabular-nums">{c.duelsWeek}</td>
                  <td className="p-2 text-right tabular-nums">{c.students ? c.avgLevel.toFixed(1) : "—"}</td>
                  <td className="p-2 text-right">
                    <Coins amount={c.coins} />
                  </td>
                  <td className="p-2 text-xs text-muted">{c.lastDuel ? formatDateTime(c.lastDuel) : "nenhum na semana"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-2">
          &quot;Jogaram&quot; = alunos que começaram pelo menos um duelo nos últimos 7 dias. Clique numa turma para ver aluno por aluno.
        </p>
      </Card>
    </div>
  );
}
