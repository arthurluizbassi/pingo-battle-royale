import { notFound } from "next/navigation";
import { PixelGrid } from "@/components/pixel/PixelGrid";
import { ALL_ITEMS } from "@/content/items";
import { composeItemIcon, composePingo, DEFAULT_LOOK } from "@/sprites/compose";
import { artFor, gearFromSprites } from "@/sprites/items";

/** Development-only contact sheet of every sprite. ?icons=1 shows the standalone icons too. */
export default async function SpritesDevPage({ searchParams }: { searchParams: Promise<{ icons?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { icons } = await searchParams;
  return (
    <main className="p-2 text-black" style={{ background: "#efe7d6", minHeight: "100vh" }}>
      <div className="flex flex-wrap gap-1">
        {ALL_ITEMS.map((item) => (
          <figure key={item.id} className="bg-white border border-black text-center" style={{ width: icons ? 190 : 96, fontSize: 9 }}>
            <div className="flex justify-center">
              {icons && <PixelGrid grid={composeItemIcon(item.category, artFor(item.category, item.sprite)!)} size={92} crop />}
              <PixelGrid grid={composePingo(DEFAULT_LOOK, gearFromSprites({ [item.category]: item.sprite }))} size={92} />
            </div>
            <figcaption className="truncate px-0.5">{item.name}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
