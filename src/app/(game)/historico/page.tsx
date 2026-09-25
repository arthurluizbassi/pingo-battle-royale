import Link from "next/link";
import { Ledger } from "@/components/ui/Ledger";
import type { BattleRow, ParticipantRow, TransactionRow } from "@/lib/db-types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/server/auth";

export default async function HistoryPage() {
  const session = await requireStudent();
  const supabase = await createClient();
  const [{ data: txs }, { data: parts }] = await Promise.all([
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("owner_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<TransactionRow[]>(),
    supabase.from("battle_participants").select("*").eq("profile_id", session.userId).returns<ParticipantRow[]>(),
  ]);
  const battleIds = (parts ?? []).map((p) => p.battle_id);
  const { data: battles } = battleIds.length
    ? await supabase.from("battles").select("*").in("id", battleIds).eq("status", "finished").order("number", { ascending: false }).returns<BattleRow[]>()
    : { data: [] as BattleRow[] };

  return (
    <div className="grid gap-5">
      <h1 className="font-pixel text-3xl">📜 Histórico</h1>
      <section className="pixel-panel p-4">
        <h2 className="font-pixel text-xl mb-2">Minhas batalhas</h2>
        {(battles ?? []).length === 0 ? (
          <p className="text-sm text-muted">Você ainda não participou de nenhum Battle Royale.</p>
        ) : (
          <ul className="grid gap-2">
            {(battles ?? []).map((b) => {
              const me = (parts ?? []).find((p) => p.battle_id === b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 pixel-inset bg-white px-3 py-2">
                  <span className="font-pixel text-xl w-12">{me?.placement === 1 ? "🏆" : `${me?.placement}º`}</span>
                  <span className="font-bold">{b.name}</span>
                  <span className="text-sm text-muted">{formatDateTime(b.finished_at)}</span>
                  <span className="text-sm">💀 {me?.kills} · 💥 {me?.damage_dealt}</span>
                  <Link href={`/arena/${b.id}`} className="ml-auto text-sm underline">
                    Replay
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="pixel-panel p-4">
        <h2 className="font-pixel text-xl mb-2">Minhas moedas</h2>
        <Ledger rows={txs ?? []} />
      </section>
    </div>
  );
}
