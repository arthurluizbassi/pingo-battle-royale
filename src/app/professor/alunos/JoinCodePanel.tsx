"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Feedback } from "@/components/ui/Card";
import { displayJoinCode } from "@/lib/join-code";
import { formatDateTime } from "@/lib/format";
import { approveStudents, regenerateJoinCode, rejectStudent, setJoinEnabled } from "@/server/actions/teacher";
import { JoinQr } from "./JoinQr";

type Result = { ok: true; message?: string } | { ok: false; error: string };

export function JoinCodePanel({
  code,
  enabled,
  joinUrl,
  pending,
}: {
  code: string | null;
  enabled: boolean;
  joinUrl: string;
  pending: Array<{ id: string; name: string; username: string; createdAt: string }>;
}) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<Result>) =>
    startTransition(async () => {
      const res = await fn();
      setResult(res.ok ? { ok: true, text: res.message ?? "Feito!" } : { ok: false, text: res.error });
      router.refresh();
    });

  const link = code ? `${joinUrl}?codigo=${code}` : joinUrl;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setResult({ ok: false, text: "Não consegui copiar. Selecione o link e copie manualmente." });
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] items-center">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`font-pixel text-4xl tracking-wider ${enabled ? "" : "opacity-40 line-through"}`}>{displayJoinCode(code)}</span>
            <span className={`pixel-chip ${enabled ? "bg-leaf text-white" : "bg-[#eee]"}`}>{enabled ? "cadastro aberto" : "cadastro fechado"}</span>
          </div>
          {enabled && code && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Os alunos entram em</span>
              <code className="bg-[#f3ead2] px-2 py-1 rounded break-all">{link}</code>
              <button className="underline font-bold" onClick={copy}>
                {copied ? "copiado!" : "copiar link"}
              </button>
            </div>
          )}
          <p className="text-xs text-muted">
            Escreva o código no quadro, mande o link ou projete o QR Code. Cada cadastro fica aguardando a sua aprovação aqui embaixo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {enabled && code && <JoinQr link={link} code={code} />}
          <div className="flex flex-col gap-2">
            <button className={`pixel-btn btn-small ${enabled ? "btn-white" : "btn-mint"}`} disabled={busy} onClick={() => run(() => setJoinEnabled(!enabled))}>
              {enabled ? "Fechar cadastro" : "Abrir cadastro"}
            </button>
            {code && (
              <button
                className="pixel-btn btn-small btn-white"
                disabled={busy}
                onClick={() => confirm("Gerar um código novo? O código atual para de funcionar.") && run(regenerateJoinCode)}
              >
                Gerar novo código
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t-2 border-ink/10 pt-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="font-pixel text-lg">Aguardando aprovação ({pending.length})</h3>
          {pending.length > 1 && (
            <button className="pixel-btn btn-small btn-mint ml-auto" disabled={busy} onClick={() => run(() => approveStudents(pending.map((p) => p.id)))}>
              Aprovar todos
            </button>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Nenhum pedido no momento.</p>
        ) : (
          <ul className="grid gap-2">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-md border-2 border-ink/20 px-3 py-2 bg-[#fffdf0]">
                <b>{p.name}</b>
                <span className="font-mono text-xs">{p.username}</span>
                <span className="text-xs text-muted">{formatDateTime(p.createdAt)}</span>
                <span className="ml-auto flex gap-2">
                  <button className="pixel-btn btn-small btn-mint" disabled={busy} onClick={() => run(() => approveStudents([p.id]))}>
                    Aprovar
                  </button>
                  <button
                    className="pixel-btn btn-small btn-white"
                    disabled={busy}
                    onClick={() => confirm(`Recusar o pedido de ${p.name}? A conta será apagada.`) && run(() => rejectStudent(p.id))}
                  >
                    Recusar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Feedback result={result} />
    </div>
  );
}
