"use client";

import { useState } from "react";
import { DuelStage } from "@/components/duel/DuelExperience";
import type { BattleEvent } from "@/engine";
import type { DuelFighter } from "@/game/duel/DuelScene";
import { unlock } from "@/game/duel/sfx";
import { Icon } from "@/components/pixel/Icon";

export function DuelReplay({ you, foe, events, winnerName }: { you: DuelFighter; foe: DuelFighter; events: BattleEvent[]; winnerName: string }) {
  // a fresh copy of the events restarts the Phaser stage
  const [run, setRun] = useState<BattleEvent[] | null>(null);
  const [done, setDone] = useState(false);

  if (!run) {
    return (
      <div className="pixel-panel p-8 flex flex-col items-center gap-3 text-center">
        <p>Aperte o play para assistir (com som!).</p>
        <button
          className="pixel-btn btn-pink text-2xl px-6 py-3"
          onClick={() => {
            unlock();
            setRun([...events]);
          }}
        >
          <Icon name="play" /> Assistir duelo
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 min-w-0 bg-ink p-2 sm:p-4 rounded-md">
      <DuelStage you={you} foe={foe} events={run} onFinished={() => setDone(true)} />
      {done && (
        <div className="flex flex-wrap justify-center items-center gap-3 text-white">
          <span className="font-pixel text-xl"><Icon name="trophy" /> {winnerName} venceu!</span>
          <button
            className="pixel-btn btn-small"
            onClick={() => {
              setDone(false);
              setRun([...events]);
            }}
          >
            <Icon name="repeat" /> Assistir de novo
          </button>
        </div>
      )}
    </div>
  );
}
