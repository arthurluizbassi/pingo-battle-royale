"use client";

import { useEffect, useState } from "react";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import type { PingoLook } from "@/sprites/compose";
import type { GearSprites } from "@/sprites/items";

/** Big Pingo; celebrates when the inventory grew since the last visit. */
export function DashboardPingo({ look, gear, inventoryCount }: { look: PingoLook; gear: GearSprites; inventoryCount: number }) {
  const [celebrate, setCelebrate] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);

  useEffect(() => {
    try {
      const key = "pingo:lastInventoryCount";
      const last = Number(localStorage.getItem(key) ?? inventoryCount);
      if (inventoryCount > last) {
        setTimeout(() => setCelebrate((c) => c + 1), 400);
        setBubble("Item novo! ✨");
      }
      localStorage.setItem(key, String(inventoryCount));
    } catch {
      // storage unavailable: no celebration, no problem
    }
  }, [inventoryCount]);

  return (
    <div className="relative flex flex-col items-center" onClick={() => setCelebrate((c) => c + 1)}>
      {bubble && (
        <div className="pop-in absolute top-0 right-2 sm:right-8 pixel-panel px-3 py-1 font-pixel text-sm z-10">{bubble}</div>
      )}
      <div className="hidden sm:block">
        <PingoAvatar look={look} gear={gear} size={300} celebrateKey={celebrate} />
      </div>
      <div className="sm:hidden">
        <PingoAvatar look={look} gear={gear} size={230} celebrateKey={celebrate} />
      </div>
    </div>
  );
}
