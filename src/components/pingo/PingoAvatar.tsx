"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PixelGrid } from "@/components/pixel/PixelGrid";
import { composePingo, type PingoLook } from "@/sprites/compose";
import { gearFromSprites, type GearSprites } from "@/sprites/items";
import { Icon } from "@/components/pixel/Icon";

/**
 * The Pingo, alive: blinks, looks around, bobs, hops now and then,
 * and celebrates whenever `celebrateKey` changes (e.g. a new item equipped).
 */
export function PingoAvatar({
  look,
  gear = {},
  size = 256,
  animated = true,
  celebrateKey,
  shadow = true,
}: {
  look: PingoLook;
  gear?: GearSprites;
  size?: number;
  animated?: boolean;
  celebrateKey?: string | number;
  shadow?: boolean;
}) {
  const [blink, setBlink] = useState(false);
  const [lookDx, setLookDx] = useState<-1 | 0 | 1>(0);
  const [hop, setHop] = useState(0);
  const [sparkles, setSparkles] = useState(0);
  const firstCelebrate = useRef(true);

  useEffect(() => {
    if (!animated) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loop = (fn: () => void, min: number, max: number) => {
      const tick = () => {
        fn();
        timers.push(setTimeout(tick, min + Math.random() * (max - min)));
      };
      timers.push(setTimeout(tick, min + Math.random() * (max - min)));
    };
    loop(() => {
      setBlink(true);
      timers.push(setTimeout(() => setBlink(false), 140));
    }, 2200, 5200);
    loop(() => {
      setLookDx(Math.random() < 0.5 ? -1 : 1);
      timers.push(setTimeout(() => setLookDx(0), 900 + Math.random() * 700));
    }, 4000, 9000);
    loop(() => setHop((h) => h + 1), 7000, 14000);
    return () => timers.forEach(clearTimeout);
  }, [animated]);

  useEffect(() => {
    if (celebrateKey === undefined) return;
    if (firstCelebrate.current) {
      firstCelebrate.current = false;
      return;
    }
    setHop((h) => h + 1);
    setSparkles((s) => s + 1);
  }, [celebrateKey]);

  const grid = useMemo(
    () => composePingo(look, gearFromSprites(gear), { blink, lookDx }),
    [look, gear, blink, lookDx],
  );

  return (
    <div className="relative inline-block select-none" style={{ width: size, height: size }}>
      {shadow && (
        <div
          className={`absolute left-1/2 rounded-[50%] bg-ink ${animated ? "pingo-shadow" : ""}`}
          style={{ width: size * 0.45, height: size * 0.06, bottom: size * 0.04, marginLeft: -size * 0.225, opacity: 0.2 }}
        />
      )}
      <div className={animated ? "pingo-bob" : undefined}>
        <div key={hop} className={hop > 0 && animated ? "pingo-hop" : undefined}>
          <PixelGrid grid={grid} size={size} title="Pingo" />
        </div>
      </div>
      {sparkles > 0 && (
        <div key={`s${sparkles}`} className="pointer-events-none absolute inset-0">
          {[...Array(7)].map((_, i) => (
            <span
              key={i}
              className="sparkle absolute font-pixel text-sun-dark"
              style={{
                left: `${15 + ((i * 37) % 70)}%`,
                top: `${20 + ((i * 23) % 40)}%`,
                fontSize: size / 10,
                animationDelay: `${i * 60}ms`,
              }}
            >
              <Icon name="sparkle" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
