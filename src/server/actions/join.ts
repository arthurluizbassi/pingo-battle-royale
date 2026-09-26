"use server";

import { z } from "zod";
import type { ClassRow } from "@/lib/db-types";
import { normalizeJoinCode } from "@/lib/join-code";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "../auth";

export interface JoinState {
  error?: string;
  done?: { username: string; className: string };
}

/** Max sign-ups waiting for approval per class (keeps a leaked code from flooding the class). */
const MAX_PENDING = 60;

const joinSchema = z
  .object({
    code: z.string().trim().min(4, "Digite o código da turma.").max(30),
    name: z.string().trim().min(2, "Digite seu nome.").max(60, "Nome muito longo."),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._-]{3,32}$/, "Usuário: 3 a 32 caracteres, só letras minúsculas, números, ponto, - ou _."),
    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

/**
 * Public action (the student has no account yet): join a class with its code.
 * The account is created as PENDING — it can't see anything until the teacher approves.
 */
export async function joinClass(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const parsed = joinSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const data = parsed.data;
  const admin = createAdminClient();

  const { data: klass } = await admin
    .from("classes")
    .select("*")
    .eq("join_code", normalizeJoinCode(data.code))
    .eq("join_enabled", true)
    .maybeSingle<ClassRow>();
  if (!klass) return { error: "Código inválido ou cadastro fechado. Confira com o professor." };

  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("class_id", klass.id)
    .eq("pending", true);
  if ((count ?? 0) >= MAX_PENDING) return { error: "Muitos cadastros aguardando aprovação. Peça ao professor para aprovar e tente depois." };

  const { data: taken } = await admin.from("profiles").select("id").eq("username", data.username).maybeSingle();
  if (taken) return { error: "Esse usuário já existe. Escolha outro (ex.: acrescente um número)." };

  const { data: created, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(data.username),
    password: data.password,
    email_confirm: true,
    user_metadata: { username: data.username, self_signup: true },
  });
  if (error || !created.user) {
    return { error: error?.message.includes("already") ? "Esse usuário já existe. Escolha outro." : "Não foi possível criar a conta. Tente de novo." };
  }

  const { error: setupError } = await admin.rpc("setup_profile", {
    p_user_id: created.user.id,
    p_class_id: klass.id,
    p_username: data.username,
    p_display_name: data.name,
    p_role: "student",
    p_pingo_name: `Pingo de ${data.name.split(" ")[0]}`.slice(0, 24),
    p_must_change_password: false,
    p_pending: true,
  });
  if (setupError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: setupError.message.includes("duplicate") ? "Esse usuário já existe. Escolha outro." : "Não foi possível criar a conta. Tente de novo." };
  }
  return { done: { username: data.username, className: klass.name } };
}
