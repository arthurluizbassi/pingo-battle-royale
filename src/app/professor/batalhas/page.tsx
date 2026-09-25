import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { BattleRow } from "@/lib/db-types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/server/auth";
import { CreateBattleForm } from "./CreateBattleForm";

const STATUS_LABEL: Record<BattleRow["status"], string> = {
  scheduled: "📝 inscrições abertas",
  locked: "🔒 loadouts travados",
  finished: "🏁 finalizada",
  cancelled: "✖ cancelada",
};

export default async function BattlesPage() {
  const session = await requireTeacher();
  const supabase = await createClient();
  const { data: battles } = await supabase
    .from("battles")
    .select("*")
    .eq("class_id", session.profile.class_id)
    .order("number", { ascending: false })
    .returns<BattleRow[]>();
  const nextNumber = (battles?.[0]?.number ?? 0) + 1;

  return (
    <div className="grid gap-4">
      <h1 className="font-pixel text-3xl">⚔️ Battle Royales</h1>
      <Card title="Criar Battle Royale">
        <CreateBattleForm defaultName={`Pingo Royale #${nextNumber}`} />
      </Card>
      <Card title="Batalhas">
        <ul className="grid gap-2">
          {(battles ?? []).map((b) => (
            <li key={b.id}>
              <Link href={`/professor/batalhas/${b.id}`} className="flex flex-wrap items-center gap-3 rounded-md border-2 border-ink/20 hover:border-ink px-3 py-2">
                <b>{b.name}</b>
                <span className="text-sm">{STATUS_LABEL[b.status]}</span>
                <span className="text-sm text-muted">{formatDateTime(b.scheduled_at ?? b.created_at)}</span>
                {b.prize_text && <span className="text-sm">🎁 {b.prize_text}</span>}
                <span className="ml-auto text-sm underline">Gerenciar →</span>
              </Link>
            </li>
          ))}
          {(battles ?? []).length === 0 && <li className="text-muted text-sm">Nenhuma batalha ainda.</li>}
        </ul>
      </Card>
    </div>
  );
}
