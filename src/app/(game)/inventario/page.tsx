import { lookFromPingo } from "@/lib/snapshot";
import { requireStudent } from "@/server/auth";
import { getStudentState } from "@/server/queries";
import { InventoryView } from "./InventoryView";

export default async function InventoryPage() {
  const session = await requireStudent();
  const state = await getStudentState(session.userId);
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-pixel text-3xl">🎒 Inventário</h1>
        <p className="text-sm text-muted">
          Você pode ter quantos itens quiser, mas só entra na arena com 1 arma, 1 capacete e 1 roupa.
        </p>
      </div>
      <InventoryView owned={state.inventory} loadout={state.loadout} look={lookFromPingo(state.pingo)} />
    </div>
  );
}
