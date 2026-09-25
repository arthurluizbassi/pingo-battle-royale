import "server-only";
import type { ClassRow, RotationRow } from "@/lib/db-types";
import { pickRotation } from "@/lib/shop-rotation";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncCatalogIfNeeded } from "./catalog";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the shop rotation active right now for a class.
 * With auto-rotation on, an expired (or missing) rotation is replaced lazily on first visit.
 */
export async function getCurrentRotation(classId: string): Promise<RotationRow | null> {
  await syncCatalogIfNeeded();
  const admin = createAdminClient();
  const now = new Date();

  const { data: current } = await admin
    .from("shop_rotations")
    .select("*")
    .eq("class_id", classId)
    .lte("starts_at", now.toISOString())
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle<RotationRow>();

  const expired = !current || (current.ends_at !== null && new Date(current.ends_at) <= now);
  if (!expired) return current;

  const { data: klass } = await admin.from("classes").select("*").eq("id", classId).single<ClassRow>();
  if (!klass) return null;
  if (current && !klass.shop_auto_rotate) {
    // auto-rotation was turned off: keep the last rotation open until the teacher changes it
    await admin.from("shop_rotations").update({ ends_at: null }).eq("id", current.id);
    return { ...current, ends_at: null };
  }
  return createRotation(klass, current?.item_ids ?? [], "auto", null);
}

export async function createRotation(
  klass: ClassRow,
  previous: string[],
  mode: "auto" | "manual",
  actorId: string | null,
  itemIds?: string[],
): Promise<RotationRow> {
  const admin = createAdminClient();
  const now = new Date();
  // close whatever is open
  await admin
    .from("shop_rotations")
    .update({ ends_at: now.toISOString() })
    .eq("class_id", klass.id)
    .or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`);

  const { data, error } = await admin
    .from("shop_rotations")
    .insert({
      class_id: klass.id,
      item_ids: itemIds ?? pickRotation(klass.shop_items_per_category, previous),
      mode,
      starts_at: now.toISOString(),
      ends_at: mode === "auto" ? new Date(now.getTime() + klass.shop_rotation_days * DAY_MS).toISOString() : null,
      created_by: actorId,
    })
    .select("*")
    .single<RotationRow>();
  if (error || !data) throw new Error(`Não foi possível criar a rotação: ${error?.message}`);
  return data;
}
