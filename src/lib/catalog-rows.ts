import { createHash } from "node:crypto";
import { ALL_ITEMS } from "@/content/items";

/** Pure helpers shared by the server (auto-sync) and the CLI scripts (seed). */
export const CATALOG_HASH = createHash("sha1").update(JSON.stringify(ALL_ITEMS)).digest("hex");

export function catalogRows() {
  const now = new Date().toISOString();
  return ALL_ITEMS.map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    tier: item.tier,
    price: item.price,
    data: item,
    active: true,
    updated_at: now,
  }));
}
