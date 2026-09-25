"use client";

import { useActionState } from "react";
import { changePassword, type LoginState } from "@/server/actions/auth";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(changePassword, {});
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1">
        <span className="font-pixel text-sm">Nova senha</span>
        <input name="password" type="password" autoComplete="new-password" minLength={6} required className="pixel-inset px-3 py-2 bg-white" />
      </label>
      <label className="grid gap-1">
        <span className="font-pixel text-sm">Repita a senha</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={6} required className="pixel-inset px-3 py-2 bg-white" />
      </label>
      {state.error && <p role="alert" className="text-tomato font-bold text-sm">{state.error}</p>}
      <button className="pixel-btn" disabled={pending}>
        {pending ? "Salvando..." : "Salvar senha"}
      </button>
    </form>
  );
}
