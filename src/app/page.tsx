import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSession } from "@/server/auth";

export default async function Home() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.must_change_password) redirect("/trocar-senha");
  redirect(session.profile.role === "teacher" ? "/professor" : "/pingo");
}
