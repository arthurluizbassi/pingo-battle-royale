import Link from "next/link";
import { GameNav } from "@/components/ui/GameNav";
import { Coins } from "@/components/ui/Coins";
import { requireUser } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/server/actions/auth";
import type { ProgressRow } from "@/lib/db-types";
import { NEW_PROGRESS, availablePoints, progressFromRow } from "@/lib/levels";
import { Icon } from "@/components/pixel/Icon";

/** Game shell: used by students (and by the teacher when opening the Arena/Ranking on the projector). */
export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const isTeacher = session.profile.role === "teacher";
  let balance = 0;
  let progress = NEW_PROGRESS;
  if (!isTeacher) {
    const supabase = await createClient();
    const [{ data }, { data: row }] = await Promise.all([
      supabase.from("wallets").select("balance").eq("owner_id", session.userId).maybeSingle(),
      supabase.from("pingo_progress").select("*").eq("owner_id", session.userId).maybeSingle<ProgressRow>(),
    ]);
    balance = data?.balance ?? 0;
    progress = progressFromRow(row);
  }
  const freePoints = availablePoints(progress);

  return (
    <div className="game-bg min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-30 bg-sun border-b-[3px] border-ink">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
          <a href={isTeacher ? "/professor" : "/pingo"} className="font-pixel text-lg sm:text-xl whitespace-nowrap">
            Pingo <span className="text-bubble [text-shadow:1px_1px_0_#231a2e]">Royale</span>
          </a>
          <GameNav role={session.profile.role} />
          <div className="ml-auto flex items-center gap-2">
            {!isTeacher && (
              // client-side navigation keeps the click's "user gesture", so the duel can play sound
              <Link href="/arena/duelo?buscar" className="pixel-btn btn-small btn-pink whitespace-nowrap">
                <Icon name="swords" /> <span className="hidden sm:inline">Encontrar Batalha</span>
                <span className="sm:hidden">Batalhar</span>
              </Link>
            )}
            {!isTeacher && (
              <Link
                href="/pingo#nivel"
                className={`pixel-chip whitespace-nowrap ${freePoints > 0 ? "bg-grape text-white" : "bg-white"}`}
                title={freePoints > 0 ? "Você tem pontos para distribuir!" : "Seu nível"}
              >
                <Icon name="star" /> Nv {progress.level}
                {freePoints > 0 && <b>+{freePoints}</b>}
              </Link>
            )}
            {!isTeacher && (
              <span className="pixel-chip bg-white">
                <Coins amount={balance} size="sm" />
              </span>
            )}
            {isTeacher && (
              <a href="/professor" className="pixel-btn btn-small btn-white">
                Painel
              </a>
            )}
            <form action={logout}>
              <button className="pixel-btn btn-small btn-white" title="Sair">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    </div>
  );
}
