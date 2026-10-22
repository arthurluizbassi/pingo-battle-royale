"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/pixel/Icon";
import { Feedback, inputClass } from "@/components/ui/Card";
import { updateDailyPrizes } from "@/server/actions/teacher";

const PLACES = [
  { key: "first", label: "1º lugar", icon: "medalGold" },
  { key: "second", label: "2º lugar", icon: "medalSilver" },
  { key: "third", label: "3º lugar", icon: "medalBronze" },
] as const;

/** The teacher sets how many coins the top 3 of the daily duel ranking get (0 = none). */
export function DailyPrizesForm({ prizes }: { prizes: [number, number, number] }) {
  const [values, setValues] = useState({ first: String(prizes[0]), second: String(prizes[1]), third: String(prizes[2]) });
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updateDailyPrizes(values);
          setResult(res.ok ? { ok: true, text: res.message ?? "Salvo!" } : { ok: false, text: res.error });
          router.refresh();
        });
      }}
    >
      <div className="grid grid-cols-3 gap-2 max-w-md">
        {PLACES.map((p) => (
          <label key={p.key} className="grid gap-1 text-sm" htmlFor={`prize-${p.key}`}>
            <span>
              <Icon name={p.icon} /> {p.label}
            </span>
            <input
              id={`prize-${p.key}`}
              className={inputClass}
              type="number"
              min={0}
              max={1000}
              step={1}
              inputMode="numeric"
              value={values[p.key]}
              onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="pixel-btn btn-small" disabled={pending}>
          {pending ? "Salvando..." : "Salvar prêmios"}
        </button>
        <span className="text-xs text-muted">Use 0 para não dar moedas. O valor vale para o dia que estiver acontecendo quando a meia-noite chegar.</span>
      </div>
      <Feedback result={result} />
    </form>
  );
}
