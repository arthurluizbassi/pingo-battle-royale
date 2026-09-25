"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DETAIL_STYLES, EYE_STYLES, MOUTH_STYLES } from "@/sprites/data/face";
import { BODY_COLORS } from "@/sprites/palette";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertStudent } from "../auth";
import { getCurrentRotation } from "../shop";
import { runAction, type ActionResult } from "./result";

const itemId = z.string().regex(/^[a-z0-9_]{1,64}$/);

export async function buyItem(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertStudent();
    const parsed = itemId.parse(id);
    await getCurrentRotation(session.profile.class_id); // make sure the rotation is fresh
    // runs AS the student: the SQL function checks balance, rotation and ownership atomically
    const supabase = await createClient();
    const { error } = await supabase.rpc("buy_item", { p_item_id: parsed });
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return "Item comprado!";
  });
}

export async function equipItem(slot: "weapon" | "helmet" | "outfit", id: string | null): Promise<ActionResult> {
  return runAction(async () => {
    await assertStudent();
    const parsedSlot = z.enum(["weapon", "helmet", "outfit"]).parse(slot);
    const parsedId = id === null ? null : itemId.parse(id);
    const supabase = await createClient();
    const { error } = await supabase.rpc("equip_item", { p_slot: parsedSlot, p_item_id: parsedId });
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return parsedId ? "Equipado!" : "Espaço liberado.";
  });
}

const keysOf = (o: object) => Object.keys(o) as [string, ...string[]];
const pingoSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao seu Pingo.").max(24, "Nome muito longo (máx. 24)."),
  bodyColor: z.enum(keysOf(BODY_COLORS)),
  eyes: z.enum(keysOf(EYE_STYLES)),
  mouth: z.enum(keysOf(MOUTH_STYLES)),
  detail: z.enum(keysOf(DETAIL_STYLES)),
});

/** Cosmetics only — never touches stats. */
export async function updatePingo(input: z.input<typeof pingoSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertStudent();
    const data = pingoSchema.parse(input);
    const { error } = await createAdminClient()
      .from("pingos")
      .update({
        name: data.name,
        body_color: data.bodyColor,
        eyes: data.eyes,
        mouth: data.mouth,
        detail: data.detail,
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", session.userId);
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return "Pingo atualizado!";
  });
}
