import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { BattleRow, ProfileRow } from "@/lib/db-types";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

const STATUS: Record<BattleRow["status"], { label: string; className: string }> = {
  scheduled: { label: "Inscrições abertas", className: "bg-mint" },
  locked: { label: "🔒 Loadouts travados", className: "bg-sun" },
  finished: { label: "Finalizada", className: "bg-white" },
  cancelled: { label: "Cancelada", className: "bg-[#eee]" },
};

export default async function ArenaListPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const { data: battles } = await supabase
    .from("battles")
    .select("*")
    .eq("class_id", session.profile.class_id)
    .neq("status", "cancelled")
    .order("number", { ascending: false })
    .returns<BattleRow[]>();
  const winnerIds = (battles ?? []).map((b) => b.winner_id).filter((id): id is string => Boolean(id));
  const { data: winners } = winnerIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", winnerIds).returns<Pick<ProfileRow, "id" | "display_name">[]>()
    : { data: [] as Pick<ProfileRow, "id" | "display_name">[] };

  const upcoming = (battles ?? []).filter((b) => b.status !== "finished");
  const past = (battles ?? []).filter((b) => b.status === "finished");

  return (
    <div className="grid gap-5">
      <h1 className="font-pixel text-3xl">⚔️ Arena</h1>

      <section className="grid gap-3">
        <h2 className="font-pixel text-xl">Próximas batalhas</h2>
        {upcoming.length === 0 && <p className="text-muted">Nenhuma batalha marcada.</p>}
        {upcoming.map((b) => (
          <Link key={b.id} href={`/arena/${b.id}`} className="pixel-panel p-4 flex flex-wrap items-center gap-3 hover:-translate-y-0.5 transition-transform">
            <span className="font-pixel text-xl">{b.name}</span>
            <span className={`pixel-chip ${STATUS[b.status].className}`}>{STATUS[b.status].label}</span>
            {b.scheduled_at && <span className="text-sm text-muted">{formatDateTime(b.scheduled_at)}</span>}
            {b.prize_text && <span className="text-sm">🎁 {b.prize_text}</span>}
            <span className="ml-auto font-pixel text-sm">Abrir →</span>
          </Link>
        ))}
      </section>

      <section className="grid gap-3">
        <h2 className="font-pixel text-xl">Batalhas anteriores</h2>
        {past.length === 0 && <p className="text-muted">Ainda não houve nenhum Battle Royale.</p>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {past.map((b) => (
            <li key={b.id}>
              <Link href={`/arena/${b.id}`} className="pixel-panel p-3 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
                <span className="text-2xl">🏆</span>
                <span className="min-w-0">
                  <span className="font-pixel block">{b.name}</span>
                  <span className="text-sm text-muted">
                    {formatDateTime(b.finished_at)} · vencedor:{" "}
                    <b>{(winners ?? []).find((w) => w.id === b.winner_id)?.display_name ?? "?"}</b>
                  </span>
                </span>
                <span className="ml-auto font-pixel text-sm whitespace-nowrap">▶ Replay</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
