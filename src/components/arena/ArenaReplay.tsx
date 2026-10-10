"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ItemIcon } from "@/components/pingo/ItemIcon";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import type { ItemCategory } from "@/content/items";
import type { BattleEvent, FighterStats } from "@/engine";
import type { ArenaController, ArenaParticipant } from "@/game/ArenaScene";
import type { FeedEntry } from "@/game/timeline";
import type { FunStat } from "@/lib/db-types";

export interface ReplayParticipant extends ArenaParticipant {
  displayName: string;
  items: Array<{ id: string; name: string; category: ItemCategory; sprite: string }>;
}

const TONE_CLASS: Record<FeedEntry["tone"], string> = {
  normal: "",
  crit: "text-[#b7791f] font-bold",
  kill: "text-tomato font-bold",
  info: "text-muted italic",
  dodge: "text-[#1f8a95]",
};

export function ArenaReplay({
  title,
  participants,
  events,
  results,
  funStats = [],
}: {
  title: string;
  participants: ReplayParticipant[];
  events: BattleEvent[];
  results: Record<string, Pick<FighterStats, "kills" | "placement" | "damageDealt">>;
  funStats?: FunStat[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const controller = useRef<ArenaController | null>(null);
  const feedRef = useRef<HTMLOListElement>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let ctrl: ArenaController | null = null;
    (async () => {
      const [{ default: Phaser }, { mountArena }] = await Promise.all([import("phaser"), import("@/game/ArenaScene")]);
      if (cancelled || !hostRef.current) return;
      await document.fonts?.ready;
      const fontFamily = getComputedStyle(document.body).getPropertyValue("--font-game").trim();
      const forceTimeout = new URLSearchParams(window.location.search).has("forceTimeout");
      ctrl = mountArena(
        Phaser,
        hostRef.current,
        { participants, events, fontFamily, forceTimeout },
        {
          onFeed: (entry) => setFeed((f) => [...f, entry]),
          onVictory: (id) => {
            setWinnerId(id);
            setTimeout(() => setShowWinner(true), 1400);
          },
          onReset: () => {
            setFeed([]);
            setWinnerId(null);
            setShowWinner(false);
          },
          onProgress: (elapsed, total) => setProgress(elapsed / total),
        },
      );
      controller.current = ctrl;
    })();
    return () => {
      cancelled = true;
      ctrl?.destroy();
      controller.current = null;
    };
  }, [participants, events]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [feed]);

  const togglePlay = () => {
    if (playing) controller.current?.pause();
    else controller.current?.play();
    setPlaying(!playing);
  };
  const changeSpeed = (s: number) => {
    controller.current?.setSpeed(s);
    setSpeed(s);
  };
  const restart = () => {
    controller.current?.restart();
    setPlaying(true);
  };
  const fullscreen = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  const winner = participants.find((p) => p.id === winnerId);

  return (
    <div ref={frameRef} className="grid gap-3 lg:grid-cols-[1fr_300px] bg-cream [&:fullscreen]:p-4 [&:fullscreen]:content-center">
      <div className="grid gap-2 content-start">
        <div className="relative pixel-panel overflow-hidden bg-[#3a2a4a]" style={{ padding: 0 }}>
          <div ref={hostRef} className="w-full aspect-[720/440]" />
          {showWinner && winner && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/55 p-3 pop-in">
              <div className="pixel-panel p-4 max-w-md w-full text-center grid gap-2 justify-items-center">
                <p className="font-pixel text-bubble text-sm">🏆 CAMPEÃO DO {title.toUpperCase()}</p>
                <PingoAvatar look={winner.look} gear={winner.gear} size={120} celebrateKey={winner.id} />
                <p className="font-pixel text-2xl leading-none">{winner.pingoName}</p>
                <p className="text-sm">de <b>{winner.displayName}</b></p>
                <div className="flex gap-2">
                  {winner.items.map((it) => (
                    <ItemIcon key={it.id} category={it.category} sprite={it.sprite} size={36} name={it.name} />
                  ))}
                  {winner.items.length === 0 && <span className="text-sm text-muted">Venceu sem nenhum equipamento! 😱</span>}
                </div>
                <p className="font-pixel">💀 {results[winner.id]?.kills ?? 0} eliminações · 💥 {results[winner.id]?.damageDealt ?? 0} de dano</p>
                {funStats.length > 0 && (
                  <ul className="text-left text-sm grid gap-1 w-full">
                    {funStats.slice(0, 4).map((s) => (
                      <li key={s.title}>
                        {s.emoji} <b>{s.title}:</b> {s.text}
                      </li>
                    ))}
                  </ul>
                )}
                <button className="pixel-btn btn-small btn-white" onClick={() => setShowWinner(false)}>
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="h-2 pixel-inset overflow-hidden" style={{ borderWidth: 2 }} aria-hidden>
          <div className="h-full bg-bubble transition-[width]" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="pixel-btn btn-small" onClick={togglePlay}>
            {playing ? "⏸ Pausar" : "▶ Play"}
          </button>
          {[1, 2, 4].map((s) => (
            <button key={s} className={`pixel-btn btn-small ${speed === s ? "btn-grape" : "btn-white"}`} onClick={() => changeSpeed(s)}>
              {s}×
            </button>
          ))}
          <button className="pixel-btn btn-small btn-white" onClick={restart}>
            ↺ Reiniciar
          </button>
          <button className="pixel-btn btn-small btn-white" onClick={() => controller.current?.skipToEnd()}>
            ⏭ Pular para o fim
          </button>
          <button className="pixel-btn btn-small btn-white ml-auto" onClick={fullscreen}>
            ⛶ Tela cheia
          </button>
        </div>
      </div>

      <aside className="pixel-panel p-3 flex flex-col min-h-0 max-h-[70vh] lg:max-h-none">
        <h2 className="font-pixel text-lg mb-2">📣 Narração</h2>
        <ol ref={feedRef} className="text-sm grid gap-1.5 overflow-y-auto pr-1 content-start" style={{ maxHeight: 460 }} aria-live="polite">
          {feed.map((entry, i) => (
            <li key={i} className={`pop-in ${TONE_CLASS[entry.tone]}`}>
              {entry.text}
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
