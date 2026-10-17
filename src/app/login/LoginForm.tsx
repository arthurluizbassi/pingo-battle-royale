"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/server/actions/auth";
import { Icon } from "@/components/pixel/Icon";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1">
        <span className="font-pixel text-sm">Usuário</span>
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          className="pixel-inset px-3 py-2 bg-white text-lg"
        />
      </label>
      <label className="grid gap-1">
        <span className="font-pixel text-sm">Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="pixel-inset px-3 py-2 bg-white text-lg"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-tomato font-bold text-sm">
          {state.error}
        </p>
      )}
      <button className="pixel-btn mt-2 text-lg" disabled={pending}>
        {pending ? "Entrando..." : <>Entrar na arena <Icon name="play" /></>}
      </button>
    </form>
  );
}
