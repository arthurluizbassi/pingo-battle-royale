import { PixelText } from "@/components/pixel/Icon";
import { Coins } from "@/components/ui/Coins";
import { formatDateTime } from "@/lib/format";
import type { TransactionRow } from "@/lib/db-types";

const TYPE_LABEL: Record<TransactionRow["type"], string> = {
  activity: "📚 Atividade",
  admin_adjustment: "🛠️ Ajuste",
  purchase: "🛒 Compra",
  special_reward: "⭐ Prêmio especial",
};

/** Wallet ledger: every balance change with its reason. */
export function Ledger({ rows, names }: { rows: TransactionRow[]; names?: Record<string, string> }) {
  if (rows.length === 0) return <p className="text-muted text-sm">Nenhuma movimentação ainda.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-pixel border-b-2 border-ink">
            <th className="p-2">Data</th>
            {names && <th className="p-2">Aluno</th>}
            <th className="p-2">Tipo</th>
            <th className="p-2">Motivo</th>
            <th className="p-2 text-right">Valor</th>
            <th className="p-2 text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-ink/10">
              <td className="p-2 whitespace-nowrap text-muted">{formatDateTime(t.created_at)}</td>
              {names && <td className="p-2">{names[t.owner_id] ?? "?"}</td>}
              <td className="p-2 whitespace-nowrap"><PixelText text={TYPE_LABEL[t.type]} /></td>
              <td className="p-2">{t.reason}</td>
              <td className={`p-2 text-right font-pixel ${t.amount > 0 ? "text-leaf" : "text-tomato"}`}>
                {t.amount > 0 ? "+" : ""}
                {t.amount}
              </td>
              <td className="p-2 text-right">
                <Coins amount={t.balance_after} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
