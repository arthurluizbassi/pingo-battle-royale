import { gridBounds, gridToRuns, SPRITE_SIZE, type Grid } from "@/sprites/compose";

/** Renders a pixel grid as crisp SVG rects. Server- and client-safe. */
export function PixelGrid({
  grid,
  size = 160,
  crop = false,
  className,
  title,
}: {
  grid: Grid;
  size?: number;
  /** crop to the non-empty pixels (for item icons) */
  crop?: boolean;
  className?: string;
  title?: string;
}) {
  const box = crop ? gridBounds(grid) : { x: 0, y: 0, w: SPRITE_SIZE, h: SPRITE_SIZE };
  const side = Math.max(box.w, box.h);
  const offsetX = box.x - (side - box.w) / 2;
  const offsetY = box.y - (side - box.h) / 2;
  return (
    <svg
      viewBox={`${offsetX} ${offsetY} ${side} ${side}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      style={{ imageRendering: "pixelated" }}
    >
      {gridToRuns(grid).map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.w} height={1} fill={run.color} />
      ))}
    </svg>
  );
}
