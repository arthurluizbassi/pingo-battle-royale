"use client";

import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { StatTable } from "@/components/pingo/StatTable";
import { Coins } from "@/components/ui/Coins";
import {
  buildFromItems,
  CATEGORY_LABEL,
  loadoutItems,
  TAG_LABEL,
  type ItemDefinition,
  type Loadout,
} from "@/content/items";
import { STAT_KEYS } from "@/engine";
import { EFFECT_NAME, effectDescription, formatModifier } from "@/lib/format";
import type { PingoLook } from "@/sprites/compose";

export function ModifierList({ item }: { item: ItemDefinition }) {
  const mods = STAT_KEYS.filter((k) => item.statModifiers[k]);
  return (
    <ul className="flex flex-wrap gap-1">
      {mods.map((k) => {
        const v = item.statModifiers[k]!;
        return (
          <li key={k} className={`pixel-chip ${v > 0 ? "bg-[#dff5dc] text-[#1f6b2a]" : "bg-[#fde0e0] text-[#9e2a3a]"}`}>
            {formatModifier(k, v)}
          </li>
        );
      })}
      {item.specialEffect && <li className="pixel-chip bg-[#ece4ff] text-[#4b2fa8]">★ {EFFECT_NAME[item.specialEffect.type]}</li>}
    </ul>
  );
}

/** Preview of the item ON the player's Pingo + stat comparison with the current loadout. */
export function ItemDetails({
  item,
  look,
  loadout,
  children,
}: {
  item: ItemDefinition;
  look: PingoLook;
  loadout: Loadout;
  children?: React.ReactNode;
}) {
  const tried: Loadout = { ...loadout, [item.category]: item.id };
  const current = buildFromItems(loadoutItems(loadout)).stats;
  const next = buildFromItems(loadoutItems(tried)).stats;
  const replacing = loadout[item.category] && loadout[item.category] !== item.id;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <PingoAvatar look={look} gear={tried} size={150} celebrateKey={item.id} />
        <div className="min-w-0">
          <p className="font-pixel text-xs text-muted">
            {CATEGORY_LABEL[item.category]} · {"★".repeat(item.tier)}
          </p>
          <h3 className="font-pixel text-xl leading-tight">{item.name}</h3>
          <p className="text-sm italic text-muted mt-1">“{item.description}”</p>
          <p className="mt-1">
            <Coins amount={item.price} />
          </p>
        </div>
      </div>
      <ModifierList item={item} />
      {item.specialEffect && (
        <p className="pixel-inset bg-[#f4efff] px-2 py-1 text-sm">
          <b>★ {EFFECT_NAME[item.specialEffect.type]}:</b> {effectDescription(item.specialEffect)}
        </p>
      )}
      <p className="text-xs text-muted">Estilo: {item.tags.map((t) => TAG_LABEL[t]).join(" · ")}</p>
      <div>
        <p className="font-pixel text-sm mb-1">{replacing ? "Se você equipar (troca o atual):" : "Com este item:"}</p>
        <StatTable stats={current} compare={next} />
      </div>
      {children}
    </div>
  );
}
