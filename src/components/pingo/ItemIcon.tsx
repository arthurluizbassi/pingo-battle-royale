import { PixelGrid } from "@/components/pixel/PixelGrid";
import type { ItemCategory } from "@/content/items";
import { composeItemIcon } from "@/sprites/compose";
import { artFor } from "@/sprites/items";

const TIER_BG: Record<number, string> = {
  1: "#e9e4d6",
  2: "#cfeccb",
  3: "#cbe0fb",
  4: "#e6d4fb",
};

export function ItemIcon({
  category,
  sprite,
  tier,
  size = 64,
  name,
}: {
  category: ItemCategory;
  sprite: string;
  tier?: number;
  size?: number;
  name?: string;
}) {
  const art = artFor(category, sprite);
  return (
    <div
      className="pixel-inset flex items-center justify-center shrink-0"
      style={{ width: size + 8, height: size + 8, background: tier ? TIER_BG[tier] : undefined }}
    >
      {art ? <PixelGrid grid={composeItemIcon(category, art)} size={size} crop title={name} /> : "?"}
    </div>
  );
}

export function EmptySlotIcon({ size = 64, label }: { size?: number; label: string }) {
  return (
    <div
      className="pixel-inset flex items-center justify-center text-center font-pixel text-muted shrink-0"
      style={{ width: size + 8, height: size + 8, fontSize: Math.max(10, size / 6) }}
    >
      {label}
    </div>
  );
}
