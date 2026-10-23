import { Card } from "@/components/ui/Card";
import { Ledger } from "@/components/ui/Ledger";
import type { ProfileRow, TransactionRow } from "@/lib/db-types";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/server/auth";
import { BatchRewardForm } from "./BatchRewardForm";
import { DailyPrizesForm } from "./DailyPrizesForm";
import { DailyRanking } from "@/components/duel/DailyRanking";
import { getClassmates } from "@/server/queries";
import { getDailyPrizes, getRecentPodiums, getTodayRanking, nextMidnightBrasilia, settlePendingRankings } from "@/server/daily-ranking";
import { Icon } from "@/components/pixel/Icon";

export default async function CoinsPage() {
  const session = await requireTeacher();
  const supabase = await createClient();
  await settlePendingRankings(session.profile.class_id);
  const [classmates, todayRanking, prizes, podiums] = await Promise.all([
    getClassmates(session.profile.class_id),
    getTodayRanking(),
    getDailyPrizes(session.profile.class_id),
    getRecentPodiums(session.profile.class_id, 7),
  ]);
  const people = new Map(classmates.map((c) => [c.profile.id, c]));
  const [{ data: students }, { data: wallets }, { data: txs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("class_id", session.profile.class_id)
      .eq("role", "student")
      .eq("active", true)
      .order("display_name")
      .returns<ProfileRow[]>(),
    supabase.from("wallets").select("owner_id, balance"),
    supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(150).returns<TransactionRow[]>(),
  ]);
  const names = Object.fromEntries((students ?? []).map((s) => [s.id, s.display_name]));

  return (
    <div className="grid gap-4">
      <h1 className="font-pixel text-3xl"><Icon name="coinBag" /> Moedas</h1>
      <Card title="Distribuir recompensa de atividade">
        <BatchRewardForm
          students={(students ?? []).map((s) => ({
            id: s.id,
            name: s.display_name,
            balance: (wallets ?? []).find((w) => w.owner_id === s.id)?.balance ?? 0,
          }))}
        />
      </Card>
      <Card title="🥊 Ranking diário de duelos">
        <div className="grid gap-4">
          <p className="text-sm max-w-2xl">
            Todo dia, à meia-noite (horário de Brasília), os 3 alunos com mais vitórias nos duelos do dia ganham as moedas abaixo.
            Contam todos os duelos do dia, inclusive os amistosos (sem limite): quem joga mais pode ganhar. Empate fica com quem chegou primeiro naquele número de vitórias.
          </p>
          <DailyPrizesForm prizes={prizes} />
          <DailyRanking rows={todayRanking} people={people} prizes={prizes} resetsAt={nextMidnightBrasilia()} />
          <div>
            <h3 className="font-pixel text-base mb-2">Pódios dos últimos dias</h3>
            {podiums.length === 0 ? (
              <p className="text-sm text-muted">Nenhum dia encerrado ainda.</p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {podiums.map((d) => (
                  <li key={d.day} className="flex flex-wrap gap-x-3">
                    <b className="w-14">{d.day.split("-").reverse().slice(0, 2).join("/")}</b>
                    {d.podium.length === 0 && <span className="text-muted">ninguém venceu duelos</span>}
                    {d.podium.map((p) => (
                      <span key={p.profile_id}>
                        {p.place}º {people.get(p.profile_id)?.profile.display_name ?? "?"} ({p.wins} vit.)
                        {p.prize > 0 && <span className="text-leaf font-bold"> +{p.prize}</span>}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
      <Card title="Livro-caixa da turma (todas as movimentações)">
        <Ledger rows={txs ?? []} names={names} />
      </Card>
    </div>
  );
}
