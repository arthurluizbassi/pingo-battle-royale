import { Fragment } from "react";
import { ICONS, splitEmoji, type IconName } from "@/sprites/icons";
import { PALETTE } from "@/sprites/palette";

/** Horizontal runs of the same color: far fewer <rect>s than one per pixel. */
const RUNS = new Map<IconName, Array<{ x: number; y: number; w: number; color: string }>>();
function runsOf(name: IconName) {
  let runs = RUNS.get(name);
  if (!runs) {
    runs = [];
    ICONS[name].rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        let w = 1;
        while (x + w < row.length && row[x + w] === ch) w++;
        if (ch !== ".") runs!.push({ x, y, w, color: PALETTE[ch] });
        x += w;
      }
    });
    RUNS.set(name, runs);
  }
  return runs;
}

/**
 * 16x16 pixel icon that replaces an emoji. By default it follows the size of the text
 * around it (1.15em), so it fits headings, buttons and small labels alike.
 */
export function Icon({ name, size = "1.15em", title, className = "" }: { name: IconName; size?: number | string; title?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`inline-block shrink-0 align-[-0.2em] ${className}`}
      style={{ imageRendering: "pixelated" }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {runsOf(name).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
      ))}
    </svg>
  );
}

/** Shows a text with its emojis swapped for pixel icons (works for texts saved in the database too). */
export function PixelText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <>
      {splitEmoji(text).map((part, i) =>
        typeof part === "string" ? <Fragment key={i}>{part}</Fragment> : <Icon key={i} name={part.icon} />,
      )}
    </>
  );
}

/** Item rarity: one small star per tier. */
export function Stars({ n, size = "0.95em" }: { n: number; size?: number | string }) {
  return (
    <span className="inline-flex gap-px align-[-0.15em]" title={`${n} ${n === 1 ? "estrela" : "estrelas"}`}>
      {Array.from({ length: n }, (_, i) => (
        <Icon key={i} name="star" size={size} />
      ))}
    </span>
  );
}
