import Link from "next/link";
import { redirect } from "next/navigation";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSession } from "@/server/auth";
import { JoinForm } from "./JoinForm";

export const dynamic = "force-dynamic";

/** Public page: a student joins a class with the code the teacher shared. */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  if (await getSession()) redirect("/");
  const { codigo } = await searchParams;
  return (
    <main className="game-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center -mb-6 relative z-10">
          <PingoAvatar look={{ bodyColor: "menta", eyes: "brilho", mouth: "aberta", detail: "bochechas" }} size={150} />
        </div>
        <div className="pixel-panel p-6 pt-8">
          <h1 className="font-pixel text-3xl text-center leading-tight">Entrar numa turma</h1>
          <p className="text-center text-sm text-muted mt-1 mb-5">Use o código que o professor passou.</p>
          <JoinForm initialCode={codigo ?? ""} />
          <p className="text-center text-sm mt-4">
            Já tem conta?{" "}
            <Link href="/login" className="underline font-bold">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
