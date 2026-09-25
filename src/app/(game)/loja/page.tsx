import { formatDateTime } from "@/lib/format";
import { lookFromPingo } from "@/lib/snapshot";
import { requireStudent } from "@/server/auth";
import { getStudentState } from "@/server/queries";
import { getCurrentRotation } from "@/server/shop";
import { ShopView } from "./ShopView";

export default async function ShopPage() {
  const session = await requireStudent();
  const [rotation, state] = await Promise.all([
    getCurrentRotation(session.profile.class_id),
    getStudentState(session.userId),
  ]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-pixel text-3xl">🛒 Loja</h1>
          <p className="text-sm text-muted">
            Compra direta, sem sorteio: você vê exatamente o que leva.
            {rotation?.ends_at && <> Estoque muda em {formatDateTime(rotation.ends_at)}.</>}
          </p>
        </div>
      </div>
      {rotation ? (
        <ShopView
          itemIds={rotation.item_ids}
          balance={state.balance}
          owned={state.inventory}
          loadout={state.loadout}
          look={lookFromPingo(state.pingo)}
        />
      ) : (
        <p className="pixel-panel p-4">A loja está fechada no momento. Aguarde o professor abrir uma nova rotação.</p>
      )}
    </div>
  );
}
