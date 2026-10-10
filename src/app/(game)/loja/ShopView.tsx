"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ItemIcon } from "@/components/pingo/ItemIcon";
import { ItemDetails, ModifierList } from "@/components/pingo/ItemDetails";
import { Coins } from "@/components/ui/Coins";
import { CATEGORY_LABEL, getItem, type ItemCategory, type ItemDefinition, type Loadout } from "@/content/items";
import { useScrollIntoViewOnMobile } from "@/components/ui/useScrollIntoViewOnMobile";
import { buyItem, equipItem } from "@/server/actions/student";
import type { StatPoints } from "@/lib/levels";
import type { PingoLook } from "@/sprites/compose";

const TABS: Array<{ id: ItemCategory | "all"; label: string }> = [
  { id: "all", label: "Tudo" },
  { id: "weapon", label: "Armas" },
  { id: "helmet", label: "Capacetes" },
  { id: "outfit", label: "Roupas" },
];

export function ShopView({
  itemIds,
  balance,
  owned,
  loadout,
  look,
  statPoints = {},
}: {
  itemIds: string[];
  balance: number;
  owned: string[];
  loadout: Loadout;
  look: PingoLook;
  statPoints?: StatPoints;
}) {
  const items = itemIds.map((id) => getItem(id)).filter((i): i is ItemDefinition => i !== null);
  const [tab, setTab] = useState<ItemCategory | "all">("all");
  const [selected, setSelected] = useState<ItemDefinition | null>(items[0] ?? null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string; itemId?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const detailsRef = useScrollIntoViewOnMobile<HTMLElement>(selected?.id);

  const visible = items.filter((i) => tab === "all" || i.category === tab);

  const buy = (item: ItemDefinition) =>
    startTransition(async () => {
      const result = await buyItem(item.id);
      setFeedback(result.ok ? { ok: true, text: `${item.name} é seu!`, itemId: item.id } : { ok: false, text: result.error });
      router.refresh();
    });

  const equip = (item: ItemDefinition) =>
    startTransition(async () => {
      const result = await equipItem(item.category, item.id);
      setFeedback(result.ok ? { ok: true, text: `${item.name} equipado!` } : { ok: false, text: result.error });
      router.refresh();
    });

  const actionFor = (item: ItemDefinition) => {
    const isOwned = owned.includes(item.id);
    const isEquipped = loadout[item.category] === item.id;
    if (isEquipped) return <span className="pixel-chip bg-leaf text-white">Equipado</span>;
    if (isOwned)
      return (
        <button className="pixel-btn btn-mint btn-small" disabled={pending} onClick={() => equip(item)}>
          Equipar
        </button>
      );
    const cant = balance < item.price;
    return (
      <button className="pixel-btn btn-small" disabled={pending || cant} onClick={() => buy(item)} title={cant ? "Saldo insuficiente" : undefined}>
        {cant ? "Sem saldo" : "Comprar"}
      </button>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-3 content-start">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pixel-btn btn-small ${tab === t.id ? "" : "btn-white"}`}
              aria-pressed={tab === t.id}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto pixel-chip bg-sun">
            Saldo: <Coins amount={balance} size="sm" />
          </span>
        </div>

        {feedback && (
          <div className={`pixel-panel px-3 py-2 pop-in flex items-center gap-2 ${feedback.ok ? "bg-[#e5f8e2]" : "bg-[#fde0e0]"}`} role="status">
            <span className="font-bold">{feedback.ok ? "✅" : "⚠️"} {feedback.text}</span>
            {feedback.itemId && !Object.values(loadout).includes(feedback.itemId) && (
              <button className="pixel-btn btn-mint btn-small ml-auto" disabled={pending} onClick={() => equip(getItem(feedback.itemId)!)}>
                Equipar agora
              </button>
            )}
          </div>
        )}

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <li key={item.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelected(item)}
                onKeyDown={(e) => e.key === "Enter" && setSelected(item)}
                className={`pixel-panel p-3 h-full flex flex-col gap-2 cursor-pointer transition-transform hover:-translate-y-0.5 ${
                  selected?.id === item.id ? "ring-4 ring-bubble" : ""
                }`}
              >
                <div className="flex gap-3">
                  <ItemIcon category={item.category} sprite={item.sprite} tier={item.tier} size={60} name={item.name} />
                  <div className="min-w-0">
                    <p className="font-pixel text-[11px] text-muted">
                      {CATEGORY_LABEL[item.category]} · {"★".repeat(item.tier)}
                    </p>
                    <p className="font-bold leading-tight">{item.name}</p>
                    <Coins amount={item.price} size="sm" />
                  </div>
                </div>
                <ModifierList item={item} />
                <p className="text-xs italic text-muted line-clamp-2">“{item.description}”</p>
                <div className="mt-auto flex justify-end" onClick={(e) => e.stopPropagation()}>
                  {actionFor(item)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside ref={detailsRef} className="pixel-panel p-4 self-start lg:sticky lg:top-20 scroll-mt-16">
        {selected ? (
          <ItemDetails item={selected} look={look} loadout={loadout} statPoints={statPoints}>
            <div className="flex justify-end">{actionFor(selected)}</div>
          </ItemDetails>
        ) : (
          <p className="text-muted">Toque em um item para ver no seu Pingo.</p>
        )}
      </aside>
    </div>
  );
}
