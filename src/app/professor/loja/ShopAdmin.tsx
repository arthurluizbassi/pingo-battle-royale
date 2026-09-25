"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ItemIcon } from "@/components/pingo/ItemIcon";
import { ModifierList } from "@/components/pingo/ItemDetails";
import { Feedback, inputClass } from "@/components/ui/Card";
import { Coins } from "@/components/ui/Coins";
import { ALL_ITEMS, CATEGORY_LABEL, type ItemCategory } from "@/content/items";
import { EFFECT_NAME } from "@/lib/format";
import { forceRotation, setManualRotation, updateShopSettings } from "@/server/actions/teacher";

export function ShopAdmin({
  settings,
  currentIds,
  powers,
}: {
  settings: { rotationDays: number; perCategory: number; autoRotate: boolean };
  currentIds: string[];
  powers: Record<string, number>;
}) {
  const [form, setForm] = useState(settings);
  const [selection, setSelection] = useState<Set<string>>(new Set(currentIds));
  const [filter, setFilter] = useState<ItemCategory | "all">("all");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setResult(res.ok ? { ok: true, text: res.message ?? "Feito!" } : { ok: false, text: res.error });
      router.refresh();
    });

  const toggle = (id: string) =>
    setSelection((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const items = ALL_ITEMS.filter((i) => filter === "all" || i.category === filter);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-[140px_160px_auto_auto] items-end">
        <label className="grid gap-1 text-sm">
          Trocar a cada (dias)
          <input type="number" min={1} max={60} className={inputClass} value={form.rotationDays} onChange={(e) => setForm({ ...form, rotationDays: Number(e.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm">
          Itens por categoria
          <input type="number" min={1} max={30} className={inputClass} value={form.perCategory} onChange={(e) => setForm({ ...form, perCategory: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" className="w-5 h-5" checked={form.autoRotate} onChange={(e) => setForm({ ...form, autoRotate: e.target.checked })} />
          Rotação automática
        </label>
        <button className="pixel-btn btn-small btn-white" disabled={pending} onClick={() => run(() => updateShopSettings(form))}>
          Salvar configurações
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="pixel-btn btn-small" disabled={pending} onClick={() => run(forceRotation)}>
          🎲 Sortear nova rotação agora
        </button>
        <button
          className="pixel-btn btn-small btn-grape"
          disabled={pending || selection.size === 0}
          onClick={() => run(() => setManualRotation([...selection]))}
        >
          📌 Publicar seleção manual ({selection.size})
        </button>
        <Feedback result={result} />
      </div>

      <div className="flex flex-wrap gap-1">
        {(["all", "weapon", "helmet", "outfit"] as const).map((f) => (
          <button key={f} className={`pixel-btn btn-small ${filter === f ? "" : "btn-white"}`} onClick={() => setFilter(f)}>
            {f === "all" ? "Todos (90)" : CATEGORY_LABEL[f]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted self-center">
          Marque itens para montar uma loja manual. Power = força do item sozinho num Pingo pelado (pelado = 100).
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b-2 border-ink font-pixel">
              <th className="p-2">Loja</th>
              <th className="p-2">Item</th>
              <th className="p-2">Tier</th>
              <th className="p-2">Preço</th>
              <th className="p-2">Efeitos</th>
              <th className="p-2 text-right">Power</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={`border-b border-ink/10 ${currentIds.includes(item.id) ? "bg-[#fff6c9]" : ""}`}>
                <td className="p-2">
                  <input type="checkbox" className="w-5 h-5" checked={selection.has(item.id)} onChange={() => toggle(item.id)} aria-label={`Selecionar ${item.name}`} />
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <ItemIcon category={item.category} sprite={item.sprite} tier={item.tier} size={32} />
                    <div>
                      <div className="font-bold">{item.name}</div>
                      <div className="text-xs text-muted">
                        {CATEGORY_LABEL[item.category]}
                        {currentIds.includes(item.id) && " · na loja agora"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-2">{"★".repeat(item.tier)}</td>
                <td className="p-2">
                  <Coins amount={item.price} size="sm" />
                </td>
                <td className="p-2">
                  <ModifierList item={item} />
                  {item.specialEffect && <span className="sr-only">{EFFECT_NAME[item.specialEffect.type]}</span>}
                </td>
                <td className="p-2 text-right font-pixel">{powers[item.id]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
