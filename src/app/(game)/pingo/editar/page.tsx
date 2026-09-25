import { lookFromPingo } from "@/lib/snapshot";
import { requireStudent } from "@/server/auth";
import { getStudentState } from "@/server/queries";
import { CustomizeForm } from "./CustomizeForm";

export default async function CustomizePage() {
  const session = await requireStudent();
  const state = await getStudentState(session.userId);
  return (
    <CustomizeForm
      initialName={state.pingo?.name ?? "Pingo"}
      initialLook={lookFromPingo(state.pingo)}
      gear={{ weapon: state.loadout.weapon, helmet: state.loadout.helmet, outfit: state.loadout.outfit }}
    />
  );
}
