import Link from "next/link";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { GAME } from "@/config/game";
import type { SeasonRow } from "@/lib/db-types";
import { lookFromPingo } from "@/lib/snapshot";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { getClassmates, getSeasonRanking } from "@/server/queries";
import { DailyRanking } from "@/components/duel/DailyRanking";
import { getDailyPrizes, getRecentPodiums, getTodayRanking, nextMidnightBrasilia, settlePendingRankings } from "@/server/daily-ranking";
import { Icon } from "@/components/pixel/Icon";

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ temporada?: string }> }) {
  const session = await requireUser();
  const { temporada } = await searchParams;
  await settlePendingRankings(session.profile.class_id);
  const supabase = await createClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .eq("class_id", session.profile.class_id)
    .order("starts_at", { ascending: false })
    .returns<SeasonRow[]>();
  const season = (seasons ?? []).find((s) => s.id === temporada) ?? (seasons ?? []).find((s) => s.active) ?? seasons?.[0];
  const [ranking, classmates, todayRanking, prizes, podiums] = await Promise.all([
    season ? getSeasonRanking(season.id) : Promise.resolve([]),
    getClassmates(session.profile.class_id),
    getTodayRanking(),
    getDailyPrizes(session.profile.class_id),
    getRecentPodiums(session.profile.class_id, 1),
  ]);
  const byId = new Map(classmates.map((c) => [c.profile.id, c]));

  return (
    <div className="grid gap-4">
      <h1 className="font-pixel text-3xl"><Icon name="trophy" /> Ranking</h1>
      <DailyRanking
        rows={todayRanking}
        people={byId}
        meId={session.userId}
        prizes={prizes}
        resetsAt={nextMidnightBrasilia()}
        yesterday={podiums[0] ?? null}
      />
      <div className="flex flex-wrap items-end gap-3">
        <h2 className="font-pixel text-2xl">Temporada do Battle Royale</h2>
        <div className="flex flex-wrap gap-1 ml-auto">
          {(seasons ?? []).map((s) => (
            <Link key={s.id} href={`/ranking?temporada=${s.id}`} className={`pixel-btn btn-small ${s.id === season?.id ? "" : "btn-white"}`}>
              {s.name}
              {s.active ? " ●" : ""}
            </Link>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted">
        Pontos por colocação: {GAME.season.pointsByPlacement.map((p, i) => `${i + 1}º = ${p}`).join(", ")}, demais ={" "}
        {GAME.season.participationPoints}, +{GAME.season.pointsPerKill} por eliminação. Vencer dá glória e troféus — nunca atributos.
      </p>

      {!season || ranking.length === 0 ? (
        <p className="pixel-panel p-4">Ainda não há resultados nesta temporada.</p>
      ) : (
        <ol className="grid gap-2">
          {ranking.map((r, i) => {
            const mate = byId.get(r.profileId);
            const me = r.profileId === session.userId;
            return (
              <li key={r.profileId} className={`pixel-panel p-2 sm:p-3 flex items-center gap-3 ${me ? "ring-4 ring-bubble" : ""} ${i === 0 ? "bg-[#fff6c9]" : ""}`}>
                <span className="font-pixel text-2xl w-10 text-center">{i === 0 ? <Icon name="crown" /> : `${i + 1}º`}</span>
                {mate && (
                  <PingoAvatar look={lookFromPingo(mate.pingo)} gear={mate.loadout} size={56} animated={i === 0} shadow={false} />
                )}
                <div className="min-w-0">
                  <Link href={`/perfil/${mate?.profile.username}`} className="font-bold hover:underline">
                    {mate?.pingo?.name ?? "?"}
                  </Link>
                  <p className="text-xs text-muted">{mate?.profile.display_name}</p>
                </div>
                <div className="ml-auto grid grid-cols-2 sm:grid-cols-4 gap-x-4 text-right text-sm">
                  <span className="font-pixel text-lg sm:order-last">{r.points} pts</span>
                  <span title="Vitórias"><Icon name="trophy" /> {r.wins}</span>
                  <span title="Pódios" className="hidden sm:inline"><Icon name="medalBronze" /> {r.podiums}</span>
                  <span title="Eliminações" className="hidden sm:inline"><Icon name="skull" /> {r.kills}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
