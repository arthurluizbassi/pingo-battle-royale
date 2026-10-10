"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Feedback, inputClass } from "@/components/ui/Card";
import { createSeason, endSeason, resetClassProgress } from "@/server/actions/teacher";

export function SeasonControls({ active, suggestedName }: { active: { id: string; name: string } | null; suggestedName: string }) {
  const [name, setName] = useState(suggestedName);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setResult(res.ok ? { ok: true, text: res.message ?? "Feito!" } : { ok: false, text: res.error });
      router.refresh();
    });

  return (
    <div className="grid gap-3">
      {active ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-pixel text-xl">{active.name}</span>
          <button
            className="pixel-btn btn-small btn-red"
            disabled={pending}
            onClick={() => confirm(`Encerrar "${active.name}"?`) && run(() => endSeason(active.id))}
          >
            Encerrar temporada
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">Nenhuma temporada ativa.</p>
      )}
      <form
        className="flex flex-wrap gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createSeason(name));
        }}
      >
        <label className="grid gap-1 text-sm">
          Nova temporada
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <button className="pixel-btn btn-small" disabled={pending}>
          {active ? "Encerrar atual e iniciar nova" : "Iniciar temporada"}
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2 border-t-2 border-dashed border-ink/20 pt-3">
        <button
          className="pixel-btn btn-small btn-white"
          disabled={pending}
          onClick={() =>
            confirm("Zerar o nível, o XP e os pontos de TODOS os alunos da turma? O histórico de duelos continua.") &&
            run(() => resetClassProgress())
          }
        >
          Zerar níveis dos duelos
        </button>
        <span className="text-xs text-muted">Útil ao começar uma temporada nova: todos voltam ao nível 1.</span>
      </div>
      <Feedback result={result} />
    </div>
  );
}
