"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GAME } from "@/config/game";
import { BALANCE, STAT_KEYS, type StatKey, type Stats } from "@/engine";
import { STAT_LABEL, STAT_NAME } from "@/lib/format";
import { availablePoints, levelProgress, type Progress } from "@/lib/levels";
import { resetStatPoints, spendStatPoint } from "@/server/actions/duel";

const UPGRADE_TEXT: Record<StatKey, string> = {
  hp: "+2 de vida",
  atk: "+1 de ataque",
  def: "+1 de defesa",
  spd: "+1 de velocidade",
  crit: "+1,5% de crítico",
  dodge: "+1,5% de esquiva",
};

/** Level, XP bar and the stat points earned in duels. */
export function LevelCard({ progress, stats }: { progress: Progress; stats: Stats }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const bar = levelProgress(progress.xp);
  const points = availablePoints(progress);

  const run = (fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? { ok: true, text: res.message ?? "Feito!" } : { ok: false, text: res.error });
      router.refresh();
    });

  return (
    <section id="nivel" className="pixel-panel p-4 scroll-mt-20">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-pixel text-lg">⭐ Nível {progress.level}</h2>
        {points > 0 && <span className="pixel-chip bg-grape text-white pop-in">{points} {points === 1 ? "ponto" : "pontos"} para usar!</span>}
      </div>
      <div className="h-4 pixel-inset !bg-[#4d4658] overflow-hidden mt-2">
        <div className="h-full bg-mint" style={{ width: bar.max ? "100%" : `${(bar.inLevel / bar.needed) * 100}%` }} />
      </div>
      <p className="text-xs text-muted mt-1">
        {bar.max ? "Nível máximo! 🏅" : `${bar.inLevel}/${bar.needed} XP para o nível ${bar.level + 1} · vença duelos para ganhar XP`}
      </p>

      <ul className="grid gap-1.5 mt-3">
        {STAT_KEYS.map((key) => {
          const upgrade = GAME.levels.upgrades[key];
          const capped = stats[key] >= BALANCE.caps[key][1] - 1e-9;
          const count = progress.statPoints[key] ?? 0;
          return (
            <li key={key} className="grid grid-cols-[3.2rem_1fr_auto] items-center gap-2" title={STAT_NAME[key]}>
              <span className="font-pixel text-sm">{STAT_LABEL[key]}</span>
              <span className="text-xs leading-tight">
                {UPGRADE_TEXT[key]}
                {upgrade.cost > 1 && <span className="text-muted"> · custa {upgrade.cost} pontos</span>}
                {count > 0 && <b className="ml-1 text-grape">×{count}</b>}
              </span>
              <button
                className="pixel-btn btn-small btn-grape min-w-9"
                disabled={pending || points < upgrade.cost || capped}
                title={capped ? "Já está no máximo" : points < upgrade.cost ? "Sem pontos suficientes" : `Melhorar ${STAT_NAME[key]}`}
                onClick={() => run(() => spendStatPoint(key))}
              >
                {capped ? "máx" : "+"}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Link href="/arena/duelo?buscar" className="pixel-btn btn-small btn-pink">
          ⚔️ Duelar
        </Link>
        {progress.pointsSpent > 0 && (
          <button
            className="pixel-btn btn-small btn-white"
            disabled={pending}
            onClick={() => confirm("Devolver todos os pontos para distribuir de novo?") && run(() => resetStatPoints())}
          >
            ↺ Redistribuir pontos
          </button>
        )}
      </div>
      {message && (
        <p role="status" className={`text-sm font-bold mt-2 ${message.ok ? "text-leaf" : "text-tomato"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
