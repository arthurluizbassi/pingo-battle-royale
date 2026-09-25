"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSession, usernameToEmail } from "../auth";

export interface LoginState {
  error?: string;
}

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(32),
  password: z.string().min(1).max(200),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) return { error: "Preencha usuário e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(parsed.data.username),
    password: parsed.data.password,
  });
  if (error) return { error: "Usuário ou senha incorretos." };

  const session = await getSession();
  if (!session) {
    await supabase.auth.signOut();
    return { error: "Conta desativada. Fale com o professor." };
  }
  if (session.profile.must_change_password) redirect("/trocar-senha");
  redirect(session.profile.role === "teacher" ? "/professor" : "/pingo");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const passwordSchema = z
  .object({
    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

export async function changePassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const session = await getSession();
  if (!session) redirect("/login");
  const parsed = passwordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Senha inválida." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Não foi possível trocar a senha. Tente outra." };

  await createAdminClient().from("profiles").update({ must_change_password: false }).eq("id", session.userId);
  redirect(session.profile.role === "teacher" ? "/professor" : "/pingo");
}
