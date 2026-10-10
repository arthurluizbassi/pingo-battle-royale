"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EmptySlotIcon, ItemIcon } from "@/components/pingo/ItemIcon";
import { ItemDetails } from "@/components/pingo/ItemDetails";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { StatTable } from "@/components/pingo/StatTable";
import {
  CATEGORY_LABEL,
  getItem,
  loadoutItems,
  type ItemCategory,
  type ItemDefinition,
  type Loadout,
} from "@/content/items";
import { useScrollIntoViewOnMobile } from "@/components/ui/useScrollIntoViewOnMobile";
import { equipItem } from "@/server/actions/student";
import { statsWithLevel, type StatPoints } from "@/lib/levels";
import type { PingoLook } from "@/sprites/compose";

const SLOTS: ItemCategory[] = ["weapon", "helmet", "outfit"];
const PLURAL: Record<ItemCategory, string> = { weapon: "Armas", helmet: "Capacetes", outfit: "Roupas" };

export function InventoryView({
  owned,
  loadout,
  look,
  statPoints = {},
}: {
  owned: string[];
  loadout: Loadout;
  look: PingoLook;
  statPoints?: StatPoints;
}) {
  const items = owned.map((id) => getItem(id)).filter((i): i is ItemDefinition => i !== null);
  const [selected, setSelected] = useState<ItemDefinition | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const detailsRef = useScrollIntoViewOnMobile<HTMLElement>(selected?.id);
  const stats = statsWithLevel(loadoutItems(loadout).map((i) => i.statModifiers), statPoints);

  const setSlot = (slot: ItemCategory, itemId: string | null) =>
    startTransition(async () => {
      const result = await equipItem(slot, itemId);
      setMessage(result.ok ? (result.message ?? null) : result.error);
      router.refresh();
    });

  if (items.length === 0) {
    return (
      <div className="pixel-panel p-6 text-center grid gap-3 justify-items-center">
        <PingoAvatar look={look} size={160} />
        <p>Seu inventário está vazio. Faça as atividades, ganhe moedas e visite a loja!</p>
        <Link href="/loja" className="pixel-btn">
          Ir à loja 🛒
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-4 content-start">
        {/* current loadout */}
        <section className="pixel-panel p-4 grid sm:grid-cols-[auto_1fr] gap-4 items-center">
          <div className="flex justify-center">
            <PingoAvatar look={look} gear={loadout} size={170} celebrateKey={`${loadout.weapon}${loadout.helmet}${loadout.outfit}`} />
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((slot) => {
                const item = getItem(loadout[slot]);
                return (
                  <div key={slot} className="flex flex-col items-center gap-1 text-center">
                    <span className="font-pixel text-xs">{CATEGORY_LABEL[slot]}</span>
                    {item ? (
                      <ItemIcon category={slot} sprite={item.sprite} tier={item.tier} size={48} name={item.name} />
                    ) : (
                      <EmptySlotIcon size={48} label="vazio" />
                    )}
                    {item && (
                      <button className="text-xs underline" disabled={pending} onClick={() => setSlot(slot, null)}>
                        desequipar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <StatTable stats={stats} compact />
          </div>
        </section>
        {message && <p className="pixel-panel px-3 py-2 pop-in font-bold" role="status">{message}</p>}

        {SLOTS.map((slot) => {
          const list = items.filter((i) => i.category === slot);
          return (
            <section key={slot}>
              <h2 className="font-pixel text-lg mb-2">
                {PLURAL[slot]} <span className="text-muted text-sm">({list.length})</span>
              </h2>
              {list.length === 0 ? (
                <p className="text-sm text-muted">Nenhum item desta categoria ainda.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {list.map((item) => {
                    const equipped = loadout[slot] === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setSelected(item)}
                          className={`pixel-panel p-2 flex flex-col items-center w-28 text-center transition-transform hover:-translate-y-0.5 ${
                            selected?.id === item.id ? "ring-4 ring-bubble" : ""
                          }`}
                        >
                          <ItemIcon category={slot} sprite={item.sprite} tier={item.tier} size={56} name={item.name} />
                          <span className="text-xs font-bold leading-tight mt-1 line-clamp-2">{item.name}</span>
                          {equipped && <span className="pixel-chip bg-leaf text-white mt-1">Equipado</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <aside ref={detailsRef} className="pixel-panel p-4 self-start lg:sticky lg:top-20 scroll-mt-16">
        {selected ? (
          <ItemDetails item={selected} look={look} loadout={loadout} statPoints={statPoints}>
            <div className="flex justify-end gap-2">
              {loadout[selected.category] === selected.id ? (
                <button className="pixel-btn btn-white" disabled={pending} onClick={() => setSlot(selected.category, null)}>
                  Desequipar
                </button>
              ) : (
                <button className="pixel-btn btn-mint" disabled={pending} onClick={() => setSlot(selected.category, selected.id)}>
                  Equipar
                </button>
              )}
            </div>
          </ItemDetails>
        ) : (
          <p className="text-muted">Escolha um item para ver como ele fica no seu Pingo e como muda os atributos.</p>
        )}
      </aside>
    </div>
  );
}
