import { Card } from "@/components/ui/Card";
import { Ledger } from "@/components/ui/Ledger";
import type { ProfileRow, TransactionRow } from "@/lib/db-types";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/server/auth";
import { BatchRewardForm } from "./BatchRewardForm";

export default async function CoinsPage() {
  const session = await requireTeacher();
  const supabase = await createClient();
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
      <h1 className="font-pixel text-3xl">💰 Moedas</h1>
      <Card title="Distribuir recompensa de atividade">
        <BatchRewardForm
          students={(students ?? []).map((s) => ({
            id: s.id,
            name: s.display_name,
            balance: (wallets ?? []).find((w) => w.owner_id === s.id)?.balance ?? 0,
          }))}
        />
      </Card>
      <Card title="Livro-caixa da turma (todas as movimentações)">
        <Ledger rows={txs ?? []} names={names} />
      </Card>
    </div>
  );
}
