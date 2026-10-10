"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { DUEL_BALANCE, generateSeed, simulateBattle, type BattleEvent } from "@/engine";
import type { DuelController } from "@/game/duel/DuelScene";
import { isMuted, setMuted, sfx, unlock } from "@/game/duel/sfx";
import type { DuelEntrant } from "@/lib/duel-roster";

/** Prototype numbers from the level simulations (not saved yet). */
const XP = { win: 30, loss: 20, toLevel2: 65, dailyDuels: 12 };

type Phase =
  | { name: "idle" }
  | { name: "searching"; foe: DuelEntrant }
  | { name: "found"; foe: DuelEntrant }
  | { name: "fighting"; foe: DuelEntrant; events: BattleEvent[] }
  | { name: "result"; foe: DuelEntrant; won: boolean };

export function DuelExperience({
  me,
  classmates,
  autoStart = false,
  backHref = "/pingo",
}: {
  me: DuelEntrant;
  classmates: DuelEntrant[];
  autoStart?: boolean;
  backHref?: string;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [muted, setMutedState] = useState(false);
  const [xp, setXp] = useState(0);
  const [duelsToday, setDuelsToday] = useState(0);
  const lastFoe = useRef<string | null>(null);
  const started = useRef(false);

  const findBattle = useCallback(() => {
    unlock();
    const pool = classmates.filter((c) => c.fighter.id !== me.fighter.id);
    if (pool.length === 0) return;
    const fresh = pool.filter((c) => c.fighter.id !== lastFoe.current);
    const list = fresh.length > 0 ? fresh : pool;
    const foe = list[Math.floor(Math.random() * list.length)];
    lastFoe.current = foe.fighter.id;
    setPhase({ name: "searching", foe });
  }, [classmates, me.fighter.id]);

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      findBattle();
    }
  }, [autoStart, findBattle]);

  const startFight = useCallback(
    (foe: DuelEntrant) => {
      const result = simulateBattle({
        seed: generateSeed(),
        participants: [
          { id: me.fighter.id, name: me.fighter.pingoName, stats: me.stats, effects: me.effects },
          { id: foe.fighter.id, name: foe.fighter.pingoName, stats: foe.stats, effects: foe.effects },
        ],
      }, DUEL_BALANCE);
      let events = result.events;
      // debug aid (?finalHit): skip straight to the knock-out to check its animation
      if (new URLSearchParams(window.location.search).has("finalHit")) {
        const lastAttack = events.findLast((e) => e.type === "attack");
        events = events.filter((e) => e.type === "spawn" || e === lastAttack || e.type === "eliminated" || e.type === "victory");
      }
      setPhase({ name: "fighting", foe, events });
    },
    [me],
  );

  const finish = useCallback((foe: DuelEntrant, winnerId: string) => {
    const won = winnerId !== foe.fighter.id;
    setDuelsToday((n) => n + 1);
    setPhase({ name: "result", foe, won });
  }, []);

  const toggleMute = () => {
    setMuted(!isMuted());
    setMutedState(isMuted());
  };

  return (
    <>
      <div className="pixel-panel p-6 flex flex-col items-center text-center gap-4">
        <h1 className="font-pixel text-4xl">Duelos</h1>
        <p className="max-w-md">
          Enfrente o Pingo de um colega da turma. Ganhou ou perdeu, você leva <b>XP</b> para subir de nível!
        </p>
        <PingoAvatar look={me.fighter.look} gear={me.fighter.gear} size={180} />
        <button className="pixel-btn btn-pink text-3xl px-8 py-4" onClick={findBattle}>
          ⚔️ Encontrar Batalha
        </button>
        <p className="text-sm text-muted">
          Duelos hoje: {duelsToday}/{XP.dailyDuels} · <i>protótipo: o XP ainda não é salvo</i>
        </p>
      </div>

      {phase.name !== "idle" && (
        <div className="fixed inset-0 z-50 bg-ink/95 flex flex-col items-center justify-center p-2 sm:p-6">
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            <button className="pixel-btn btn-small btn-white" onClick={toggleMute} aria-label={muted ? "Ligar som" : "Desligar som"}>
              {muted ? "🔇" : "🔊"}
            </button>
            {phase.name !== "fighting" && phase.name !== "result" && (
              <button className="pixel-btn btn-small btn-white" onClick={() => setPhase({ name: "idle" })}>
                Cancelar
              </button>
            )}
          </div>

          {(phase.name === "searching" || phase.name === "found") && (
            <Matchmaking
              me={me}
              pool={classmates.filter((c) => c.fighter.id !== me.fighter.id)}
              foe={phase.foe}
              found={phase.name === "found"}
              onFound={() => setPhase({ name: "found", foe: phase.foe })}
              onDone={() => startFight(phase.foe)}
            />
          )}

          {phase.name === "fighting" && (
            <DuelStage me={me} foe={phase.foe} events={phase.events} onFinished={(id) => finish(phase.foe, id)} />
          )}

          {phase.name === "result" && (
            <DuelResult
              won={phase.won}
              me={me}
              foe={phase.foe}
              xpBefore={xp}
              onXp={(v) => setXp(v)}
              duelsToday={duelsToday}
              onAgain={findBattle}
              backHref={backHref}
              onClose={() => setPhase({ name: "idle" })}
            />
          )}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ matchmaking roulette

function Matchmaking({
  me,
  pool,
  foe,
  found,
  onFound,
  onDone,
}: {
  me: DuelEntrant;
  pool: DuelEntrant[];
  foe: DuelEntrant;
  found: boolean;
  onFound: () => void;
  onDone: () => void;
}) {
  // a long strip of classmates that ends on the chosen foe, like a slot machine
  const strip = useMemo(() => {
    const items: DuelEntrant[] = [];
    for (let i = 0; i < 22; i++) items.push(pool[(i * 7 + 3) % pool.length]);
    items.push(foe, pool[0], pool[1 % pool.length]);
    return items;
  }, [pool, foe]);
  const CELL = 112;
  const [offset, setOffset] = useState(0);
  // callbacks change every render; keep the animation effect from restarting
  const cb = useRef({ onFound, onDone });
  cb.current = { onFound, onDone };

  useEffect(() => {
    if (found) {
      sfx("found");
      const t = setTimeout(() => cb.current.onDone(), 900);
      return () => clearTimeout(t);
    }
    const target = (strip.length - 3) * CELL;
    const duration = 2400;
    const start = performance.now();
    let raf = 0;
    let lastCell = -1;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3.2);
      const x = target * eased;
      setOffset(x);
      const cell = Math.floor(x / CELL);
      if (cell !== lastCell) {
        lastCell = cell;
        sfx("search");
      }
      if (p < 1) raf = requestAnimationFrame(tick);
      else cb.current.onFound();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [found, strip.length]);

  return (
    <div className="w-full max-w-3xl flex flex-col items-center gap-6 text-white">
      <div className="relative w-40 h-40">
        <div className="absolute inset-0 rounded-full border-4 border-mint/70" />
        <div className="absolute inset-6 rounded-full border-2 border-mint/40" />
        <div className="absolute inset-12 rounded-full border-2 border-mint/30" />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, rgba(52,198,184,0.55), rgba(52,198,184,0) 25%)",
            animation: found ? "none" : "radar-spin 0.9s linear infinite",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <PingoAvatar look={me.fighter.look} gear={me.fighter.gear} size={84} shadow={false} />
        </div>
      </div>

      <p className={`font-pixel text-3xl sm:text-4xl ${found ? "text-sun pop-in" : ""}`}>
        {found ? "ADVERSÁRIO ENCONTRADO!" : "Procurando adversário..."}
      </p>

      <div className="relative w-full overflow-hidden h-36 pixel-panel !bg-[#3a2a4a]">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[116px] border-4 border-sun rounded-md z-10 pointer-events-none" />
        <div
          className="absolute top-2 flex"
          style={{ transform: `translateX(calc(50% - ${offset + CELL / 2}px))`, left: 0, width: strip.length * CELL }}
        >
          {strip.map((c, i) => (
            <div key={i} className="flex flex-col items-center justify-center" style={{ width: CELL }}>
              <PingoAvatar look={c.fighter.look} gear={c.fighter.gear} size={84} animated={false} shadow={false} />
              <span className="font-pixel text-sm text-white truncate max-w-[100px]">{c.fighter.pingoName}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes radar-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ------------------------------------------------------------------ the Phaser stage

function DuelStage({
  me,
  foe,
  events,
  onFinished,
}: {
  me: DuelEntrant;
  foe: DuelEntrant;
  events: BattleEvent[];
  onFinished: (winnerId: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctrl = useRef<DuelController | null>(null);
  const [speed, setSpeed] = useState(1);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ default: Phaser }, { mountDuel }] = await Promise.all([import("phaser"), import("@/game/duel/DuelScene")]);
      if (cancelled || !hostRef.current) return;
      await document.fonts?.ready;
      const fontFamily = getComputedStyle(document.body).getPropertyValue("--font-game").trim();
      const forceTimeout = new URLSearchParams(window.location.search).has("forceTimeout");
      ctrl.current = mountDuel(
        Phaser,
        hostRef.current,
        { you: me.fighter, foe: foe.fighter, events, fontFamily, forceTimeout },
        { onFinished: (id) => finished.current(id) },
      );
      // debug aid (?slow): quarter speed to inspect animations frame by frame
      if (new URLSearchParams(window.location.search).has("slow")) ctrl.current.setSpeed(0.25);
    })();
    return () => {
      cancelled = true;
      ctrl.current?.destroy();
      ctrl.current = null;
    };
  }, [me, foe, events]);

  const winnerId = useMemo(() => events.find((e) => e.type === "victory")?.id ?? foe.fighter.id, [events, foe]);

  return (
    <div className="w-full max-w-6xl flex flex-col gap-3">
      <div ref={hostRef} className="w-full aspect-video border-[3px] border-ink rounded-md overflow-hidden bg-ink shadow-[0_0_0_3px_#fff4d6]" />
      <div className="flex justify-center gap-2">
        <button
          className="pixel-btn btn-small btn-white"
          onClick={() => {
            const next = speed === 1 ? 2 : 1;
            setSpeed(next);
            ctrl.current?.setSpeed(next);
          }}
        >
          {speed === 1 ? "⏩ 2×" : "▶ 1×"}
        </button>
        <button className="pixel-btn btn-small btn-white" onClick={() => onFinished(winnerId)}>
          ⏭ Pular
        </button>
      </div>
      <p className="sm:hidden text-center text-xs text-white/70">Dica: deite o celular para ver maior.</p>
    </div>
  );
}

// ------------------------------------------------------------------ result + XP

function DuelResult({
  won,
  me,
  foe,
  xpBefore,
  onXp,
  duelsToday,
  onAgain,
  onClose,
  backHref,
}: {
  won: boolean;
  me: DuelEntrant;
  foe: DuelEntrant;
  xpBefore: number;
  onXp: (xp: number) => void;
  duelsToday: number;
  onAgain: () => void;
  onClose: () => void;
  backHref: string;
}) {
  const gained = won ? XP.win : XP.loss;
  const [shown, setShown] = useState(xpBefore);
  const level = 1 + Math.floor(shown / XP.toLevel2);
  const inLevel = shown % XP.toLevel2;
  const [leveledUp, setLeveledUp] = useState(false);

  useEffect(() => {
    const target = xpBefore + gained;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1100);
      const v = Math.round(xpBefore + gained * (1 - Math.pow(1 - p, 2)));
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        onXp(target);
        if (Math.floor(target / XP.toLevel2) > Math.floor(xpBefore / XP.toLevel2)) {
          setLeveledUp(true);
          sfx("victory");
        }
      }
    };
    const t = setTimeout(() => {
      sfx("found");
      raf = requestAnimationFrame(tick);
    }, 350);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
    // run once per result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pixel-panel w-full max-w-md p-6 flex flex-col items-center gap-3 text-center pop-in">
      <p className={`font-pixel text-5xl ${won ? "text-sun-dark" : "text-muted"}`}>{won ? "VITÓRIA!" : "Foi por pouco!"}</p>
      <div className="flex items-end gap-4">
        <PingoAvatar look={me.fighter.look} gear={me.fighter.gear} size={110} celebrateKey={won ? 1 : undefined} />
        <span className="font-pixel text-2xl pb-8">vs</span>
        <PingoAvatar look={foe.fighter.look} gear={foe.fighter.gear} size={90} animated={false} />
      </div>
      <p className="text-sm">
        {won ? `${me.fighter.pingoName} venceu ${foe.fighter.pingoName}!` : `${foe.fighter.pingoName} venceu desta vez. Bora revanche?`}
      </p>
      <div className="w-full">
        <div className="flex justify-between font-pixel">
          <span>Nível {level}</span>
          <span className="text-leaf">+{gained} XP</span>
        </div>
        <div className="h-5 pixel-inset !bg-[#4d4658] overflow-hidden mt-1">
          <div className="h-full bg-mint transition-none" style={{ width: `${(inLevel / XP.toLevel2) * 100}%` }} />
        </div>
        <p className="text-xs text-muted mt-1">
          {inLevel}/{XP.toLevel2} XP para o próximo nível
        </p>
      </div>
      {leveledUp && <p className="font-pixel text-3xl text-grape pop-in">⬆ SUBIU DE NÍVEL!</p>}
      <p className="text-xs text-muted">
        Duelos hoje: {duelsToday}/{XP.dailyDuels} · protótipo: nada disso é salvo ainda
      </p>
      <div className="flex gap-2 mt-1">
        <button className="pixel-btn btn-pink text-lg" onClick={onAgain}>
          ⚔️ Batalhar de novo
        </button>
        <button className="pixel-btn btn-white" onClick={onClose}>
          Fechar
        </button>
      </div>
      <Link href={backHref} className="text-sm underline">
        Voltar para o meu Pingo
      </Link>
    </div>
  );
}
