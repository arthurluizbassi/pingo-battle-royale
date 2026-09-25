"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, Feedback, inputClass } from "@/components/ui/Card";
import { GAME } from "@/config/game";
import { grantCoins, resetStudentPassword, setStudentActive } from "@/server/actions/teacher";

export function StudentActions({ profileId, active }: { profileId: string; active: boolean }) {
  const [amount, setAmount] = useState(String(GAME.rewards.defaultActivity));
  const [type, setType] = useState<"activity" | "admin_adjustment" | "special_reward">("activity");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string; password?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setResult(res.ok ? { ok: true, text: res.message ?? "Feito!" } : { ok: false, text: res.error ?? "Erro" });
      if (res.password) setPassword(res.password);
      router.refresh();
    });

  const submitCoins = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => grantCoins({ profileId, amount: Number(amount), type, reason }));
  };

  return (
    <Card title="Ações">
      <form onSubmit={submitCoins} className="grid gap-2 sm:grid-cols-[120px_180px_1fr_auto] items-end">
        <label className="grid gap-1 text-sm">
          Quantidade
          <input type="number" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          Tipo
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="activity">Atividade</option>
            <option value="special_reward">Prêmio especial</option>
            <option value="admin_adjustment">Ajuste administrativo</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Motivo (obrigatório)
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: Atividade 04" required />
        </label>
        <button className="pixel-btn btn-small" disabled={pending}>
          Lançar
        </button>
      </form>
      <p className="text-xs text-muted mt-1">Use valor negativo com “Ajuste administrativo” para retirar moedas. O saldo nunca fica negativo.</p>
      <div className="flex flex-wrap gap-2 mt-3">
        <button className="pixel-btn btn-small btn-white" disabled={pending} onClick={() => run(() => resetStudentPassword(profileId))}>
          🔑 Gerar senha temporária
        </button>
        <button
          className={`pixel-btn btn-small ${active ? "btn-red" : "btn-mint"}`}
          disabled={pending}
          onClick={() => {
            if (!active || confirm("Desativar este aluno? Ele não conseguirá mais entrar.")) run(() => setStudentActive(profileId, !active));
          }}
        >
          {active ? "Desativar aluno" : "Reativar aluno"}
        </button>
      </div>
      <div className="mt-2">
        <Feedback result={result} />
        {password && (
          <p className="font-mono mt-1 bg-[#fff6c9] border-2 border-dashed border-ink rounded p-2">
            Nova senha temporária: <b>{password}</b>
          </p>
        )}
      </div>
    </Card>
  );
}
