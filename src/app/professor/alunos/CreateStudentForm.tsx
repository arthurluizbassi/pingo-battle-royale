"use client";

import { useState, useTransition } from "react";
import { Feedback, inputClass } from "@/components/ui/Card";
import { createStudent } from "@/server/actions/teacher";

export function CreateStudentForm() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [pingoName, setPingoName] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const suggestUsername = (name: string) =>
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ".")
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 32);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createStudent({ displayName, username, pingoName });
      if (res.ok) {
        setCreated({ username, password: res.password ?? "" });
        setResult({ ok: true, text: res.message ?? "Criado!" });
        setDisplayName("");
        setUsername("");
        setPingoName("");
      } else {
        setResult({ ok: false, text: res.error });
      }
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Nome do aluno
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (!username || username === suggestUsername(displayName)) setUsername(suggestUsername(e.target.value));
            }}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Usuário (login)
          <input className={`${inputClass} font-mono`} value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          Nome do Pingo (opcional)
          <input className={inputClass} value={pingoName} onChange={(e) => setPingoName(e.target.value)} maxLength={24} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button className="pixel-btn btn-small" disabled={pending}>
          {pending ? "Criando..." : "Criar aluno"}
        </button>
        <Feedback result={result} />
      </div>
      {created && (
        <div className="rounded-md border-2 border-dashed border-ink p-3 bg-[#fff6c9]">
          <p className="text-sm">
            Entregue ao aluno (a senha só aparece agora; ele troca no primeiro acesso):
          </p>
          <p className="font-mono text-lg">
            usuário: <b>{created.username}</b> · senha: <b>{created.password}</b>
          </p>
        </div>
      )}
    </form>
  );
}
