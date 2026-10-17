"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Feedback, inputClass } from "@/components/ui/Card";
import { createBattle } from "@/server/actions/teacher";

/** Next Saturday at 10:00 local time, as a datetime-local value. */
function nextSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateBattleForm({ defaultName }: { defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [when, setWhen] = useState(nextSaturday);
  const [prize, setPrize] = useState("");
  const [enrollAll, setEnrollAll] = useState(true);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createBattle({ name, scheduledAt: when ? new Date(when).toISOString() : undefined, prizeText: prize, enrollAll });
      if (res.ok && res.battleId) router.push(`/professor/batalhas/${res.battleId}`);
      else setResult(res.ok ? { ok: true, text: "Criado!" } : { ok: false, text: res.error });
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Nome
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </label>
        <label className="grid gap-1 text-sm">
          Data e hora
          <input type="datetime-local" className={inputClass} value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          Prêmio da semana (opcional, só informativo)
          <input className={inputClass} value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Caixa de chocolate" maxLength={200} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="w-5 h-5" checked={enrollAll} onChange={(e) => setEnrollAll(e.target.checked)} />
        Inscrever automaticamente todos os alunos ativos
      </label>
      <div className="flex items-center gap-3">
        <button className="pixel-btn" disabled={pending}>
          {pending ? "Criando..." : "Criar Battle Royale"}
        </button>
        <Feedback result={result} />
      </div>
    </form>
  );
}
