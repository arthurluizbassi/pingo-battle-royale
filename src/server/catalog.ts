import "server-only";
import { ALL_ITEMS } from "@/content/items";
import { CATALOG_HASH, catalogRows } from "@/lib/catalog-rows";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const { error } = await admin.from("items").upsert(catalogRows());
    if (error) throw new Error(`Catalog sync failed: ${error.message}`);

    // items removed from code stay in the DB (history/inventories) but can't be sold anymore
    const ids = ALL_ITEMS.map((i) => `"${i.id}"`).join(",");
    await admin.from("items").update({ active: false }).not("id", "in", `(${ids})`);
    await admin.from("app_meta").upsert({ key: "catalog_hash", value: CATALOG_HASH, updated_at: new Date().toISOString() });
  }
  syncedThisProcess = true;
}
