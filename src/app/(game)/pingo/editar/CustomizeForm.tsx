"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { PixelGrid } from "@/components/pixel/PixelGrid";
import { updatePingo } from "@/server/actions/student";
import { composePingo, type PingoLook } from "@/sprites/compose";
import { DETAIL_STYLES, EYE_STYLES, MOUTH_STYLES } from "@/sprites/data/face";
import type { GearSprites } from "@/sprites/items";
import { BODY_COLORS, type BodyColor } from "@/sprites/palette";

function Option({ selected, onClick, children, label }: { selected: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={label}
      className={`pixel-inset flex flex-col items-center p-1 text-[11px] font-bold transition-transform ${
        selected ? "bg-sun ring-2 ring-ink -translate-y-0.5" : "bg-white hover:-translate-y-0.5"
      }`}
    >
      {children}
      <span className="leading-tight">{label}</span>
    </button>
  );
}

export function CustomizeForm({ initialName, initialLook, gear }: { initialName: string; initialLook: PingoLook; gear: GearSprites }) {
  const [name, setName] = useState(initialName);
  const [look, setLook] = useState<PingoLook>(initialLook);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const set = <K extends keyof PingoLook>(key: K, value: PingoLook[K]) => {
    setLook((l) => ({ ...l, [key]: value }));
    setCelebrate((c) => c + 1);
  };

  // small face previews (no gear, so the face is visible)
  const facePreview = useMemo(
    () => (patch: Partial<PingoLook>) => composePingo({ ...look, ...patch, detail: patch.detail ?? look.detail }),
    [look],
  );

  const save = () =>
    startTransition(async () => {
      const result = await updatePingo({ name, ...look });
      setMessage(result.ok ? { ok: true, text: result.message ?? "Salvo!" } : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    });

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <section className="pixel-panel p-4 flex flex-col items-center lg:sticky lg:top-20 self-start">
        <PingoAvatar look={look} gear={gear} size={260} celebrateKey={celebrate} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          aria-label="Nome do Pingo"
          className="pixel-inset bg-white font-pixel text-2xl text-center w-full mt-2 px-2 py-1"
        />
        <p className="text-xs text-muted mt-2 text-center">A aparência é só estilo: não muda nenhum atributo.</p>
        <button className="pixel-btn btn-mint mt-3 w-full" onClick={save} disabled={pending || !name.trim()}>
          {pending ? "Salvando..." : "💾 Salvar meu Pingo"}
        </button>
        {message && (
          <p className={`mt-2 text-sm font-bold ${message.ok ? "text-leaf" : "text-tomato"}`} role="status">
            {message.text}
          </p>
        )}
      </section>

      <section className="pixel-panel p-4 grid gap-5">
        <div>
          <h2 className="font-pixel text-lg mb-2">Cor</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BODY_COLORS) as BodyColor[]).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => set("bodyColor", color)}
                aria-pressed={look.bodyColor === color}
                title={BODY_COLORS[color].name}
                className={`w-11 h-11 rounded-md border-[3px] border-ink transition-transform ${
                  look.bodyColor === color ? "scale-110 shadow-[0_3px_0_#231a2e]" : "hover:scale-105"
                }`}
                style={{ background: BODY_COLORS[color].main }}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-pixel text-lg mb-2">Olhos</h2>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {(Object.keys(EYE_STYLES) as PingoLook["eyes"][]).map((eyes) => (
              <Option key={eyes} selected={look.eyes === eyes} onClick={() => set("eyes", eyes)} label={EYE_STYLES[eyes].label}>
                <PixelGrid grid={facePreview({ eyes })} size={64} />
              </Option>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-pixel text-lg mb-2">Boca</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {(Object.keys(MOUTH_STYLES) as PingoLook["mouth"][]).map((mouth) => (
              <Option key={mouth} selected={look.mouth === mouth} onClick={() => set("mouth", mouth)} label={MOUTH_STYLES[mouth].label}>
                <PixelGrid grid={facePreview({ mouth })} size={64} />
              </Option>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-pixel text-lg mb-2">Detalhe</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {(Object.keys(DETAIL_STYLES) as PingoLook["detail"][]).map((detail) => (
              <Option key={detail} selected={look.detail === detail} onClick={() => set("detail", detail)} label={DETAIL_STYLES[detail].label}>
                <PixelGrid grid={facePreview({ detail })} size={64} />
              </Option>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
