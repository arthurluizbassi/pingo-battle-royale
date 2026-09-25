import { notFound } from "next/navigation";
import { InventoryView } from "@/app/(game)/inventario/InventoryView";
import { ShopView } from "@/app/(game)/loja/ShopView";
import { CustomizeForm } from "@/app/(game)/pingo/editar/CustomizeForm";
import { DashboardPingo } from "@/app/(game)/pingo/DashboardPingo";
import { StatTable } from "@/components/pingo/StatTable";
import { buildFromItems, getItem, loadoutItems, type Loadout } from "@/content/items";
import { pickRotation } from "@/lib/shop-rotation";
import { createRng } from "@/engine";
import type { PingoLook } from "@/sprites/compose";

/** Development-only: student screens with fake data (no database). ?tela=loja|inventario|editar|pingo */
export default async function DevUiPage({ searchParams }: { searchParams: Promise<{ tela?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { tela = "pingo" } = await searchParams;
  const look: PingoLook = { bodyColor: "rosa", eyes: "grande", mouth: "sorriso", detail: "bochechas" };
  const loadout: Loadout = { weapon: "wifi_hammer", helmet: "viking_helmet", outfit: "hacker_hoodie" };
  const owned = ["wifi_hammer", "viking_helmet", "hacker_hoodie", "cardboard_sword", "paper_crown", "ceo_suit", "pot_lid"];
  const rng = createRng(3);

  return (
    <div className="game-bg min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-5">
        {tela === "loja" && (
          <ShopView itemIds={pickRotation(5, [], rng.next)} balance={420} owned={owned} loadout={loadout} look={look} />
        )}
        {tela === "inventario" && <InventoryView owned={owned} loadout={loadout} look={look} />}
        {tela === "editar" && <CustomizeForm initialName="Gotinha" initialLook={look} gear={loadout} />}
        {tela === "pingo" && (
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="pixel-panel p-6 flex flex-col items-center">
              <DashboardPingo look={look} gear={loadout} inventoryCount={owned.length} />
              <h1 className="font-pixel text-4xl">Gotinha</h1>
            </section>
            <section className="pixel-panel p-4">
              <StatTable stats={buildFromItems(loadoutItems(loadout)).stats} compact />
              <p className="mt-2 text-sm">{getItem("wifi_hammer")?.description}</p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
