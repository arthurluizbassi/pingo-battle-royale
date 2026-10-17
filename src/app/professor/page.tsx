import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Coins } from "@/components/ui/Coins";
import { Ledger } from "@/components/ui/Ledger";
import type { ProfileRow, TransactionRow } from "@/lib/db-types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/server/auth";
import { getActiveSeason, getNextBattle } from "@/server/queries";
import { Icon } from "@/components/pixel/Icon";

export default async function TeacherHome() {
  const session = await requireTeacher();
  const classId = session.profile.class_id;
  const supabase = await createClient();
  const [{ data: students }, { data: wallets }, { data: txs }, nextBattle, season, { data: klass }] = await Promise.all([
    supabase.from("profiles").select("*").eq("class_id", classId).eq("role", "student").returns<ProfileRow[]>(),
    supabase.from("wallets").select("owner_id, balance"),
    supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(10).returns<TransactionRow[]>(),
    getNextBattle(classId),
    getActiveSeason(classId),
    supabase.from("classes").select("name").eq("id", classId).single(),
  ]);
  const active = (students ?? []).filter((s) => s.active);
  const pendingCount = (students ?? []).filter((s) => s.pending).length;
  const total = (wallets ?? []).reduce((s, w) => s + (w.balance as number), 0);
  const names = Object.fromEntries((students ?? []).map((s) => [s.id, s.display_name]));

  return (
    <div className="grid gap-4">
      <h1 className="font-pixel text-3xl">Olá, {session.profile.display_name}! <Icon name="wave" /></h1>
      <p className="text-muted -mt-2">Turma: {klass?.name}</p>
      {pendingCount > 0 && (
        <Link href="/professor/alunos" className="pixel-panel bg-[#fff6c9] px-4 py-3 font-bold hover:-translate-y-0.5 transition-transform">
          <Icon name="handRaised" /> {pendingCount} {pendingCount === 1 ? "aluno aguardando" : "alunos aguardando"} a sua aprovação →
        </Link>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="👩‍🎓 Alunos ativos">
          <p className="font-pixel text-4xl">{active.length}</p>
        </Card>
        <Card title="💰 Moedas em circulação">
          <Coins amount={total} size="lg" />
        </Card>
        <Card title="🏆 Temporada">
          <p className="font-bold">{season?.name ?? "Nenhuma ativa"}</p>
          {!season && (
            <Link href="/professor/temporadas" className="text-sm underline">
              Criar temporada
            </Link>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="⚔️ Próximo Battle Royale"
          actions={
            <Link href="/professor/batalhas" className="pixel-btn btn-small">
              + Novo
            </Link>
          }
        >
          {nextBattle ? (
            <div className="grid gap-1">
              <Link href={`/professor/batalhas/${nextBattle.id}`} className="font-bold underline">
                {nextBattle.name}
              </Link>
              <span className="text-sm text-muted">{formatDateTime(nextBattle.scheduled_at)}</span>
              <span className="text-sm">
                Status: {nextBattle.status === "locked" ? <><Icon name="lock" /> loadouts travados — pronto para START</> : "inscrições abertas"}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhuma batalha agendada.</p>
          )}
        </Card>
        <Card
          title="⚡ Ações rápidas"
        >
          <div className="flex flex-wrap gap-2">
            <Link href="/professor/moedas" className="pixel-btn btn-small">
              Distribuir recompensa
            </Link>
            <Link href="/professor/alunos" className="pixel-btn btn-small btn-white">
              Criar aluno
            </Link>
            <Link href="/professor/loja" className="pixel-btn btn-small btn-white">
              Rotação da loja
            </Link>
          </div>
        </Card>
      </div>

      <Card title="📒 Últimas movimentações">
        <Ledger rows={txs ?? []} names={names} />
      </Card>
    </div>
  );
}
