"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { GAME } from "@/config/game";
import { DUEL_BALANCE, generateSeed, simulateBattle, type BattleEvent } from "@/engine";
import type { DuelController, DuelFighter } from "@/game/duel/DuelScene";
import { isMuted, setMuted, sfx, unlock } from "@/game/duel/sfx";
import type { DuelEntrant } from "@/lib/duel-roster";
import { levelFromXp, levelProgress } from "@/lib/levels";
import { findDuel } from "@/server/actions/duel";

/** What the server (or the demo) says happened. */
interface DuelReport {
  foeId: string;
  events: BattleEvent[];
  won: boolean;
  counted: boolean;
  xpGained: number;
  xpBefore: number;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
  duelsToday: number;
}

type Phase =
  | { name: "idle" }
  | { name: "waiting" }
  | { name: "rolling"; foe: DuelEntrant; report: DuelReport }
  | { name: "found"; foe: DuelEntrant; report: DuelReport }
  | { name: "fighting"; foe: DuelEntrant; report: DuelReport }
  | { name: "result"; foe: DuelEntrant; report: DuelReport }
  | { name: "error"; message: string };

/**
 * "Encontrar Batalha" → radar → roulette → VS → fight → XP.
 * mode "live": the server picks the opponent, runs the duel and saves the XP.
 * mode "demo": everything local (dev page, no database).
 */
export function DuelExperience({
  me,
  classmates,
  autoStart = false,
  backHref = "/pingo",
  mode = "live",
  initial = { xp: 0, duelsToday: 0 },
}: {
  me: DuelEntrant;
  classmates: DuelEntrant[];
  autoStart?: boolean;
  backHref?: string;
  mode?: "live" | "demo";
  initial?: { xp: number; duelsToday: number };
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [muted, setMutedState] = useState(false);
  const [demo, setDemo] = useState(initial);
  const started = useRef(false);
  const busy = useRef(false);
  const duelsToday = mode === "demo" ? demo.duelsToday : initial.duelsToday;

  const runDemo = useCallback((): DuelReport => {
    const pool = classmates.filter((c) => c.fighter.id !== me.fighter.id);
    const foe = pool[Math.floor(Math.random() * pool.length)];
    const result = simulateBattle(
      {
        seed: generateSeed(),
        participants: [
          { id: me.fighter.id, name: me.fighter.pingoName, stats: me.stats, effects: me.effects },
          { id: foe.fighter.id, name: foe.fighter.pingoName, stats: foe.stats, effects: foe.effects },
        ],
      },
      DUEL_BALANCE,
    );
    const won = result.winnerId === me.fighter.id;
    const counted = demo.duelsToday < GAME.duels.dailyXpDuels;
    const xpGained = counted ? (won ? GAME.duels.xpWin : GAME.duels.xpLoss) : 0;
    const xpAfter = demo.xp + xpGained;
    setDemo({ xp: xpAfter, duelsToday: demo.duelsToday + (counted ? 1 : 0) });
    return {
      foeId: foe.fighter.id,
      events: result.events,
      won,
      counted,
      xpGained,
      xpBefore: demo.xp,
      xpAfter,
      levelBefore: levelFromXp(demo.xp),
      levelAfter: levelFromXp(xpAfter),
      duelsToday: demo.duelsToday + (counted ? 1 : 0),
    };
  }, [classmates, me, demo]);

  const findBattle = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    unlock();
    setPhase({ name: "waiting" });
    const minWait = new Promise((r) => setTimeout(r, 900)); // let the radar spin a little
    try {
      let report: DuelReport;
      if (mode === "demo") report = runDemo();
      else {
        const res = await findDuel();
        if (!res.ok) {
          setPhase({ name: "error", message: res.error });
          return;
        }
        report = res.duel;
      }
      await minWait;
      const foe = classmates.find((c) => c.fighter.id === report.foeId);
      if (!foe) {
        setPhase({ name: "error", message: "Não encontramos o adversário. Tente de novo." });
        return;
      }
      let events = report.events;
      // debug aid (?finalHit): skip straight to the knock-out to check its animation
      if (new URLSearchParams(window.location.search).has("finalHit")) {
        const lastAttack = events.findLast((e) => e.type === "attack");
        events = events.filter((e) => e.type === "spawn" || e === lastAttack || e.type === "eliminated" || e.type === "victory");
      }
      setPhase({ name: "rolling", foe, report: { ...report, events } });
    } catch {
      setPhase({ name: "error", message: "A conexão falhou. Tente de novo." });
    } finally {
      busy.current = false;
    }
  }, [mode, runDemo, classmates]);

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void findBattle();
    }
  }, [autoStart, findBattle]);

  const toggleMute = () => {
    setMuted(!isMuted());
    setMutedState(isMuted());
  };

  const close = () => setPhase({ name: "idle" });

  return (
    <>
      <div className="pixel-panel p-6 flex flex-col items-center text-center gap-4">
        <h1 className="font-pixel text-4xl">Duelos</h1>
        <p className="max-w-md">
          Enfrente o Pingo de um colega da turma. Ganhou ou perdeu, você leva <b>XP</b> para subir de nível!
        </p>
        <PingoAvatar look={me.fighter.look} gear={me.fighter.gear} size={180} />
        <button className="pixel-btn btn-pink text-3xl px-8 py-4" onClick={() => void findBattle()}>
          ⚔️ Encontrar Batalha
        </button>
        <p className="text-sm text-muted">
          Duelos com XP hoje: {Math.min(duelsToday, GAME.duels.dailyXpDuels)}/{GAME.duels.dailyXpDuels}
          {duelsToday >= GAME.duels.dailyXpDuels && " · os próximos são amistosos (sem XP)"}
        </p>
      </div>

      {phase.name !== "idle" && (
        <div className="fixed inset-0 z-50 bg-ink/95 flex flex-col items-center justify-center p-2 sm:p-6">
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            <button className="pixel-btn btn-small btn-white" onClick={toggleMute} aria-label={muted ? "Ligar som" : "Desligar som"}>
              {muted ? "🔇" : "🔊"}
            </button>
            {(phase.name === "waiting" || phase.name === "rolling" || phase.name === "found") && (
              <button className="pixel-btn btn-small btn-white" onClick={close}>
                Cancelar
              </button>
            )}
          </div>

          {(phase.name === "waiting" || phase.name === "rolling" || phase.name === "found") && (
            <Matchmaking
              me={me}
              pool={classmates.filter((c) => c.fighter.id !== me.fighter.id)}
              foe={phase.name === "waiting" ? null : phase.foe}
              found={phase.name === "found"}
              onFound={() => phase.name === "rolling" && setPhase({ ...phase, name: "found" })}
              onDone={() => phase.name === "found" && setPhase({ ...phase, name: "fighting" })}
            />
          )}

          {phase.name === "fighting" && (
            <DuelStage
              you={me.fighter}
              foe={phase.foe.fighter}
              events={phase.report.events}
              onFinished={() => {
                setPhase({ ...phase, name: "result" });
                // update the HUD / level card now that the duel has been watched
                if (mode === "live") router.refresh();
              }}
            />
          )}

          {phase.name === "result" && (
            <DuelResult
              me={me}
              foe={phase.foe}
              report={phase.report}
              onAgain={() => void findBattle()}
              backHref={backHref}
              onClose={close}
            />
          )}

          {phase.name === "error" && (
            <div className="pixel-panel p-6 max-w-sm text-center grid gap-3">
              <p className="font-pixel text-2xl">Ops!</p>
              <p>{phase.message}</p>
              <button className="pixel-btn" onClick={close}>
                Voltar
              </button>
            </div>
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
  /** null while the server is still picking */
  foe: DuelEntrant | null;
  found: boolean;
  onFound: () => void;
  onDone: () => void;
}) {
  // a long strip of classmates that ends on the chosen foe, like a slot machine
  const strip = useMemo(() => {
    if (!foe || pool.length === 0) return [];
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
    if (strip.length === 0) return;
    if (found) {
      sfx("found");
      const t = setTimeout(() => cb.current.onDone(), 900);
      return () => clearTimeout(t);
    }
    const target = (strip.length - 3) * CELL;
    const duration = 2200;
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

      <div className="relative w-full overflow-hidden h-40 pixel-panel !bg-[#3a2a4a]">
        {strip.length > 0 && (
          <>
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[116px] border-4 border-sun rounded-md z-10 pointer-events-none" />
            <div
              className="absolute top-2 flex"
              style={{ transform: `translateX(calc(50% - ${offset + CELL / 2}px))`, left: 0, width: strip.length * CELL }}
            >
              {strip.map((c, i) => (
                <div key={i} className="flex flex-col items-center justify-center" style={{ width: CELL }}>
                  <PingoAvatar look={c.fighter.look} gear={c.fighter.gear} size={84} animated={false} shadow={false} />
                  <span className="font-pixel text-sm text-white truncate max-w-[100px]">{c.fighter.pingoName}</span>
                  <span className="font-pixel text-xs text-sun">Nv {c.fighter.level ?? 1}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes radar-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ------------------------------------------------------------------ the Phaser stage

/** Plays a duel event log. Also used by the replay page. */
export function DuelStage({
  you,
  foe,
  events,
  onFinished,
}: {
  you: DuelFighter;
  foe: DuelFighter;
  events: BattleEvent[];
  onFinished: (winnerId: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ctrl = useRef<DuelController | null>(null);
  const [speed, setSpeed] = useState(1);
  /** native fullscreen (Android, desktop) or a CSS stand-in where the browser has none (iPhone) */
  const [nativeFull, setNativeFull] = useState(false);
  const [cssFull, setCssFull] = useState(false);
  const expanded = nativeFull || cssFull;
  const finished = useRef(onFinished);
  finished.current = onFinished;

  useEffect(() => {
    const sync = () => setNativeFull(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFull = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (cssFull) {
      setCssFull(false);
      return;
    }
    const el = stageRef.current;
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
        // phones: turn the screen sideways when the browser allows it (Android Chrome)
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        await orientation.lock?.("landscape").catch(() => {});
        return;
      } catch {
        // fall through to the CSS version
      }
    }
    setCssFull(true);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ default: Phaser }, { mountDuel }] = await Promise.all([import("phaser"), import("@/game/duel/DuelScene")]);
      if (cancelled || !hostRef.current) return;
      await document.fonts?.ready;
      const fontFamily = getComputedStyle(document.body).getPropertyValue("--font-game").trim();
      const params = new URLSearchParams(window.location.search);
      ctrl.current = mountDuel(
        Phaser,
        hostRef.current,
        { you, foe, events, fontFamily, forceTimeout: params.has("forceTimeout") },
        { onFinished: (id) => finished.current(id) },
      );
      // debug aid (?slow): quarter speed to inspect animations frame by frame
      if (params.has("slow")) ctrl.current.setSpeed(0.25);
    })();
    return () => {
      cancelled = true;
      ctrl.current?.destroy();
      ctrl.current = null;
    };
    // mount once per duel: new props from a page refresh must not restart the fight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const winnerId = useMemo(() => events.find((e) => e.type === "victory")?.id ?? foe.id, [events, foe]);

  return (
    <div
      ref={stageRef}
      className={
        expanded
          ? "fixed inset-0 z-[60] bg-ink flex flex-col items-center justify-center gap-2 p-2"
          : "w-full min-w-0 max-w-6xl flex flex-col gap-3"
      }
    >
      {/* the canvas is taken out of the layout flow (absolute): otherwise the box and Phaser keep
          resizing each other and the stage grows wider than a phone screen */}
      <div
        ref={hostRef}
        className="relative min-w-0 aspect-video border-[3px] border-ink rounded-md overflow-hidden bg-ink shadow-[0_0_0_3px_#fff4d6] [&>canvas]:absolute [&>canvas]:left-0 [&>canvas]:top-0"
        style={{ width: expanded ? "min(100%, calc((100dvh - 64px) * 16 / 9))" : "100%" }}
      />
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
        <button className="pixel-btn btn-small btn-white" onClick={() => void toggleFull()}>
          {expanded ? "✕ Sair da tela cheia" : "⛶ Tela cheia"}
        </button>
      </div>
      {!expanded && <p className="sm:hidden text-center text-xs text-white/70">Dica: toque em Tela cheia e deite o celular.</p>}
    </div>
  );
}

// ------------------------------------------------------------------ result + XP

function DuelResult({
  me,
  foe,
  report,
  onAgain,
  onClose,
  backHref,
}: {
  me: DuelEntrant;
  foe: DuelEntrant;
  report: DuelReport;
  onAgain: () => void;
  onClose: () => void;
  backHref: string;
}) {
  const { won, xpBefore, xpGained } = report;
  const [shown, setShown] = useState(xpBefore);
  const bar = levelProgress(shown);
  const [leveledUp, setLeveledUp] = useState(false);

  useEffect(() => {
    if (xpGained === 0) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1100);
      setShown(Math.round(xpBefore + xpGained * (1 - Math.pow(1 - p, 2))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else if (report.levelAfter > report.levelBefore) {
        setLeveledUp(true);
        sfx("victory");
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
  }, [xpBefore, xpGained, report.levelAfter, report.levelBefore]);

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
          <span>Nível {bar.level}</span>
          <span className={xpGained ? "text-leaf" : "text-muted"}>+{xpGained} XP</span>
        </div>
        <div className="h-5 pixel-inset !bg-[#4d4658] overflow-hidden mt-1">
          <div className="h-full bg-mint" style={{ width: bar.max ? "100%" : `${(bar.inLevel / bar.needed) * 100}%` }} />
        </div>
        <p className="text-xs text-muted mt-1">
          {bar.max ? "Nível máximo!" : `${bar.inLevel}/${bar.needed} XP para o nível ${bar.level + 1}`}
        </p>
      </div>
      {leveledUp && (
        <div className="pop-in grid gap-1">
          <p className="font-pixel text-3xl text-grape">⬆ NÍVEL {report.levelAfter}!</p>
          <Link href="/pingo#nivel" className="pixel-btn btn-grape btn-small">
            Distribuir meu novo ponto
          </Link>
        </div>
      )}
      {!report.counted && (
        <p className="text-sm pixel-inset bg-white px-2 py-1">
          Você já fez {GAME.duels.dailyXpDuels} duelos com XP hoje. Este foi um amistoso, sem XP. Volte amanhã!
        </p>
      )}
      <p className="text-xs text-muted">
        Duelos com XP hoje: {Math.min(report.duelsToday, GAME.duels.dailyXpDuels)}/{GAME.duels.dailyXpDuels}
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
