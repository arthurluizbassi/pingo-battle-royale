"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, Feedback } from "@/components/ui/Card";
import type { BattleStatus } from "@/lib/db-types";
import { cancelBattle, lockBattleAction, startBattleAction, verifyReplay } from "@/server/actions/teacher";
import { Icon } from "@/components/pixel/Icon";

const STEPS: Array<{ status: BattleStatus; label: string }> = [
  { status: "scheduled", label: "1. Inscrições" },
  { status: "locked", label: "2. Loadouts travados" },
  { status: "finished", label: "3. Batalha simulada" },
];

export function BattleControls({ battleId, status, participantCount }: { battleId: string; status: BattleStatus; participantCount: number }) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setResult(res.ok ? { ok: true, text: res.message ?? "Feito!" } : { ok: false, text: res.error });
      router.refresh();
    });

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <Card>
      <ol className="flex flex-wrap gap-2 mb-4">
        {STEPS.map((s, i) => (
          <li
            key={s.status}
            className={`pixel-chip ${i < currentIndex ? "bg-leaf text-white" : i === currentIndex ? "bg-sun" : "bg-white opacity-60"}`}
          >
            {s.label}
          </li>
        ))}
        {status === "cancelled" && <li className="pixel-chip bg-tomato text-white">Cancelada</li>}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        {status === "scheduled" && (
          <button
            className="pixel-btn text-lg"
            disabled={pending || participantCount < 2}
            onClick={() =>
              confirm("Travar os loadouts? Os equipamentos atuais de cada participante serão congelados para esta batalha.") &&
              run(() => lockBattleAction(battleId))
            }
          >
            <Icon name="lock" /> LOCK LOADOUTS
          </button>
        )}
        {status === "locked" && (
          <button
            className="pixel-btn btn-pink text-xl px-6"
            disabled={pending}
            onClick={() => confirm("Iniciar a batalha? O servidor vai gerar a seed e simular tudo agora.") && run(() => startBattleAction(battleId))}
          >
            {pending ? "Simulando..." : <><Icon name="play" /> START BATTLE</>}
          </button>
        )}
        {status === "finished" && (
          <>
            <Link href={`/arena/${battleId}`} className="pixel-btn btn-pink text-lg">
              <Icon name="play" /> Assistir replay
            </Link>
            <button className="pixel-btn btn-small btn-white" disabled={pending} onClick={() => run(() => verifyReplay(battleId))}>
              <Icon name="repeat" /> Verificar reprodutibilidade
            </button>
          </>
        )}
        {(status === "scheduled" || status === "locked") && (
          <button
            className="pixel-btn btn-small btn-white ml-auto"
            disabled={pending}
            onClick={() => confirm("Cancelar esta batalha?") && run(() => cancelBattle(battleId))}
          >
            Cancelar batalha
          </button>
        )}
      </div>
      <div className="mt-2">
        <Feedback result={result} />
        {status === "scheduled" && participantCount < 2 && (
          <p className="text-sm text-muted">Inscreva pelo menos 2 alunos para travar os loadouts.</p>
        )}
      </div>
    </Card>
  );
}
