import { GAME } from "@/config/game";
import { formatCoins } from "@/lib/format";

/** 7x7 pixel coin, no asset needed. */
export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 7 7" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      <rect x="2" y="0" width="3" height="1" fill="#231a2e" />
      <rect x="1" y="1" width="1" height="1" fill="#231a2e" />
      <rect x="5" y="1" width="1" height="1" fill="#231a2e" />
      <rect x="0" y="2" width="1" height="3" fill="#231a2e" />
      <rect x="6" y="2" width="1" height="3" fill="#231a2e" />
      <rect x="1" y="5" width="1" height="1" fill="#231a2e" />
      <rect x="5" y="5" width="1" height="1" fill="#231a2e" />
      <rect x="2" y="6" width="3" height="1" fill="#231a2e" />
      <rect x="2" y="1" width="3" height="5" fill="#ffd23f" />
      <rect x="1" y="2" width="5" height="3" fill="#ffd23f" />
      <rect x="2" y="2" width="1" height="2" fill="#fff6c2" />
      <rect x="4" y="2" width="1" height="3" fill="#d99a1e" />
    </svg>
  );
}

export function Coins({ amount, size = "md", showName = false }: { amount: number; size?: "sm" | "md" | "lg"; showName?: boolean }) {
  const icon = size === "lg" ? 28 : size === "sm" ? 14 : 18;
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span className={`inline-flex items-center gap-1 font-pixel ${text}`}>
      <CoinIcon size={icon} />
      {formatCoins(amount)}
      {showName && <span className="opacity-70 text-[0.8em]">{GAME.currency.name}</span>}
    </span>
  );
}
