"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Feedback, inputClass } from "@/components/ui/Card";
import { Coins } from "@/components/ui/Coins";
import { GAME } from "@/config/game";
import { grantCoinsBatch } from "@/server/actions/teacher";

export function BatchRewardForm({ students }: { students: Array<{ id: string; name: string; balance: number }> }) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(String(GAME.rewards.defaultActivity));
  const [type, setType] = useState<"activity" | "special_reward">("activity");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.size === 0) return setResult({ ok: false, text: "Marque pelo menos um aluno." });
    if (!confirm(`Dar ${amount} ${GAME.currency.name} para ${selected.size} aluno(s) por "${reason}"?`)) return;
    startTransition(async () => {
      const res = await grantCoinsBatch({ profileIds: [...selected], amount: Number(amount), type, reason });
      setResult(res.ok ? { ok: true, text: res.message ?? "Distribuído!" } : { ok: false, text: res.error });
      if (res.ok) setSelected(new Set());
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_140px_180px]">
        <label className="grid gap-1 text-sm">
          Atividade / motivo
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Atividade 04 — Frações" required />
        </label>
        <label className="grid gap-1 text-sm">
          Recompensa
          <input type="number" min={1} className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          Tipo
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="activity">Atividade</option>
            <option value="special_reward">Prêmio especial</option>
          </select>
        </label>
      </div>

      <div className="flex gap-2 text-sm">
        <button type="button" className="underline" onClick={() => setSelected(new Set(students.map((s) => s.id)))}>
          Marcar todos
        </button>
        <button type="button" className="underline" onClick={() => setSelected(new Set())}>
          Desmarcar todos
        </button>
        <span className="ml-auto text-muted">{selected.size} selecionado(s)</span>
      </div>

      <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => (
          <li key={s.id}>
            <label
              className={`flex items-center gap-2 rounded-md border-2 px-2 py-1.5 cursor-pointer ${
                selected.has(s.id) ? "border-ink bg-[#e5f8e2]" : "border-ink/20 bg-white"
              }`}
            >
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="w-5 h-5 accent-[#4fbf5a]" />
              <span className="font-semibold">{s.name}</span>
              <span className="ml-auto">
                <Coins amount={s.balance} size="sm" />
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <button className="pixel-btn" disabled={pending}>
          {pending ? "Distribuindo..." : `Distribuir +${amount || 0} para ${selected.size}`}
        </button>
        <Feedback result={result} />
      </div>
    </form>
  );
}
