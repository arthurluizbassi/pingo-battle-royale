import Link from "next/link";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  return (
    <main className="game-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center -mb-6 relative z-10">
          <PingoAvatar
            look={{ bodyColor: "azul", eyes: "redondo", mouth: "sorriso", detail: "bochechas" }}
            gear={{ helmet: "paper_crown", weapon: "cardboard_sword" }}
            size={160}
          />
        </div>
        <div className="pixel-panel p-6 pt-8">
          <h1 className="font-pixel text-3xl text-center leading-tight">
            Pingo
            <br />
            <span className="text-bubble">Battle Royale</span>
          </h1>
          <p className="text-center text-sm text-muted mt-2 mb-5">Faça as atividades. Equipe seu Pingo. Vença na arena.</p>
          <LoginForm />
          <p className="text-center text-sm mt-4">
            Primeira vez?{" "}
            <Link href="/entrar" className="underline font-bold">
              Entrar numa turma com código
            </Link>
          </p>
        </div>
        <p className="text-center text-[11px] text-muted mt-3">
          Alguns ícones são baseados no{" "}
          <a href="https://github.com/microsoft/fluentui-emoji" className="underline" target="_blank" rel="noreferrer">
            Fluent Emoji
          </a>{" "}
          © Microsoft (licença MIT).
        </p>
      </div>
    </main>
  );
}
