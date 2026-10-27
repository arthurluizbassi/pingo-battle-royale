"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { displayJoinCode } from "@/lib/join-code";

/** QR code of the join link: students scan it and land on /entrar with the code already filled in. */
export function JoinQr({ link, code }: { link: string; code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [big, setBig] = useState(false);

  useEffect(() => {
    QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1a1a2e", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [link]);

  useEffect(() => {
    if (!big) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [big]);

  if (!svg) return null;

  return (
    <>
      <div className="grid justify-items-center gap-1">
        <button
          className="w-36 h-36 rounded-md border-2 border-ink bg-white p-1 [&>svg]:w-full [&>svg]:h-full"
          onClick={() => setBig(true)}
          title="Mostrar QR Code grande"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <button className="text-xs underline font-bold" onClick={() => setBig(true)}>
          ampliar para projetar
        </button>
      </div>

      {big && (
        <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4" onClick={() => setBig(false)}>
          <div className="grid justify-items-center gap-3 rounded-lg border-4 border-ink bg-white p-6 max-w-[min(90vw,90vh)]">
            <p className="font-pixel text-2xl text-center">Escaneie para entrar na turma</p>
            <div className="w-[min(70vw,65vh)] aspect-square [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="font-pixel text-3xl tracking-wider">{displayJoinCode(code)}</p>
            <p className="text-xs text-muted">clique em qualquer lugar para fechar</p>
          </div>
        </div>
      )}
    </>
  );
}
