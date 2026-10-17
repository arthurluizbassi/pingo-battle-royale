"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { suggestUsername } from "@/lib/join-code";
import { joinClass, type JoinState } from "@/server/actions/join";
import { Icon } from "@/components/pixel/Icon";

const input = "pixel-inset px-3 py-2 bg-white text-lg w-full";

export function JoinForm({ initialCode }: { initialCode: string }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinClass, {});
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [touchedUser, setTouchedUser] = useState(false);

  if (state.done) {
    return (
      <div className="grid gap-3 text-center pop-in">
        <p className="font-pixel text-2xl text-leaf">Pronto! <Icon name="party" /></p>
        <p>
          Seu pedido para entrar na turma <b>{state.done.className}</b> foi enviado.
        </p>
        <p className="pixel-inset bg-white px-3 py-2">
          Seu usuário: <b className="font-pixel text-lg">{state.done.username}</b>
        </p>
        <p className="text-sm text-muted">Agora é só esperar o professor aprovar. Depois é só fazer login com esse usuário e a senha que você escolheu.</p>
        <Link href="/login" className="pixel-btn">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1">
        <span className="font-pixel text-sm">Código da turma</span>
        <input name="code" defaultValue={initialCode} placeholder="PINGO-XXXXXX" autoCapitalize="characters" required className={`${input} uppercase font-pixel tracking-wider`} />
      </label>
      <label className="grid gap-1">
        <span className="font-pixel text-sm">Seu nome</span>
        <input
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!touchedUser) setUsername(suggestUsername(e.target.value));
          }}
          placeholder="Como o professor te chama"
          required
          className={input}
        />
      </label>
      <label className="grid gap-1">
        <span className="font-pixel text-sm">Escolha um usuário</span>
        <input
          name="username"
          value={username}
          onChange={(e) => {
            setTouchedUser(true);
            setUsername(e.target.value.toLowerCase());
          }}
          autoCapitalize="none"
          autoComplete="username"
          required
          className={`${input} font-mono`}
        />
        <span className="text-xs text-muted">É com ele que você vai fazer login. Letras minúsculas, sem espaço.</span>
      </label>
      <label className="grid gap-1">
        <span className="font-pixel text-sm">Crie uma senha</span>
        <input name="password" type="password" autoComplete="new-password" minLength={6} required className={input} />
      </label>
      <label className="grid gap-1">
        <span className="font-pixel text-sm">Repita a senha</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={6} required className={input} />
      </label>
      {state.error && (
        <p role="alert" className="text-tomato font-bold text-sm">
          {state.error}
        </p>
      )}
      <button className="pixel-btn btn-mint mt-1 text-lg" disabled={pending}>
        {pending ? "Enviando..." : "Pedir para entrar"}
      </button>
    </form>
  );
}
