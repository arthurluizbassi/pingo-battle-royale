import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { GAME } from "@/config/game";
import type { ProfileRow } from "@/lib/db-types";
import { createClient } from "@/lib/supabase/server";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${GAME.auth.usernameEmailDomain}`;
}

export interface Session {
  userId: string;
  profile: ProfileRow;
}

/** Current user + profile, verified against Supabase Auth (not just the cookie). Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<ProfileRow>();
  if (!profile || !profile.active) return null;
  return { userId: user.id, profile };
});

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.must_change_password) redirect("/trocar-senha");
  return session;
}

export async function requireStudent(): Promise<Session> {
  const session = await requireUser();
  if (session.profile.role !== "student") redirect("/professor");
  return session;
}

export async function requireTeacher(): Promise<Session> {
  const session = await requireUser();
  if (session.profile.role !== "teacher") redirect("/pingo");
  return session;
}

/** General admin (profiles.is_admin): may read every class through the service-role client. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (session.profile.is_admin !== true) redirect(session.profile.role === "teacher" ? "/professor" : "/pingo");
  return session;
}

/**
 * For server actions: never redirect silently, throw instead.
 * This is the backend authorization — hiding buttons in the UI is not enough.
 */
export async function assertTeacher(): Promise<Session> {
  const session = await getSession();
  if (!session || session.profile.role !== "teacher") throw new Error("Apenas o professor pode fazer isso.");
  return session;
}

export async function assertStudent(): Promise<Session> {
  const session = await getSession();
  if (!session || session.profile.role !== "student") throw new Error("Apenas alunos podem fazer isso.");
  return session;
}
