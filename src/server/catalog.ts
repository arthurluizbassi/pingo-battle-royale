import "server-only";
import { createHash } from "node:crypto";
import { ALL_ITEMS } from "@/content/items";
import { createAdminClient } from "@/lib/supabase/admin";

const CATALOG_HASH = createHash("sha1").update(JSON.stringify(ALL_ITEMS)).digest("hex");
let syncedThisProcess = false;

/**
 * The item catalog lives in code (src/content/items). The DB keeps a mirror so purchases can
 * reference items with foreign keys and read trusted prices. Runs a real sync only when the
 * catalog changed (hash stored in app_meta), so it is cheap to call often.
 */
export async function syncCatalogIfNeeded(): Promise<void> {
  if (syncedThisProcess) return;
  const admin = createAdminClient();
  const { data: meta } = await admin.from("app_meta").select("value").eq("key", "catalog_hash").maybeSingle();
  if (meta?.value !== CATALOG_HASH) {
    const rows = ALL_ITEMS.map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      tier: item.tier,
      price: item.price,
      data: item,
      active: true,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await admin.from("items").upsert(rows);
    if (error) throw new Error(`Catalog sync failed: ${error.message}`);

    // items removed from code stay in the DB (history/inventories) but can't be sold anymore
    const ids = ALL_ITEMS.map((i) => i.id);
    await admin.from("items").update({ active: false }).not("id", "in", `(${ids.map((id) => `"${id}"`).join(",")})`);
    await admin.from("app_meta").upsert({ key: "catalog_hash", value: CATALOG_HASH, updated_at: new Date().toISOString() });
  }
  syncedThisProcess = true;
}
