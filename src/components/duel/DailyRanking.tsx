import Link from "next/link";
import { Icon } from "@/components/pixel/Icon";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { Coins } from "@/components/ui/Coins";
import { Countdown } from "@/components/ui/Countdown";
import { GAME } from "@/config/game";
import type { DailyPodium, DailyRankingRow, PingoRow, ProfileRow } from "@/lib/db-types";
import type { Loadout } from "@/content/items";
import { lookFromPingo } from "@/lib/snapshot";
import type { IconName } from "@/sprites/icons";

export interface RankingPerson {
  profile: ProfileRow;
  pingo: PingoRow | null;
  loadout: Loadout;
}

const MEDAL: IconName[] = ["medalGold", "medalSilver", "medalBronze"];
const MIN_DUELS = GAME.duels.trophies.minDuelsForPodium;

function Place({ place, qualified }: { place: number; qualified: boolean }) {
  return (
    <span className="w-9 shrink-0 text-center">
      {!qualified ? <span className="font-bold text-lg text-muted">–</span> : place <= 3 ? <Icon name={MEDAL[place - 1]} size={28} title={`${place}º lugar`} /> : <span className="font-bold text-lg">{place}º</span>}
    </span>
  );
}

/**
 * Today's duel ranking (trophies won and lost in the duels of the day). `compact` shows the top 3 and the
 * viewer's own place; the full version lists everyone and yesterday's podium.
 */
export function DailyRanking({
  rows,
  people,
  meId,
  prizes,
  resetsAt,
  yesterday,
  compact = false,
}: {
  rows: DailyRankingRow[];
  people: Map<string, RankingPerson>;
  meId?: string;
  prizes: [number, number, number];
  resetsAt: string;
  yesterday?: DailyPodium | null;
  compact?: boolean;
}) {
  const ranked = rows.filter((r) => r.duels > 0);
  const mine = ranked.find((r) => r.profile_id === meId);
  const shown = compact ? ranked.slice(0, 3) : ranked;
  const mineListed = !!mine && shown.includes(mine);
  const hasPrize = prizes.some((p) => p > 0);

  return (
    <section className="pixel-panel p-4 grid gap-3 content-start self-start">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-pixel text-lg">
          <Icon name="boxingGlove" /> Ranking de hoje
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Recomeça à meia-noite em</span>
          <Countdown to={resetsAt} />
        </div>
      </div>

      {hasPrize ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-bold">Prêmio no fim do dia:</span>
          {prizes.map((p, i) =>
            p > 0 ? (
              <span key={i} className="inline-flex items-center gap-1">
                <Icon name={MEDAL[i]} /> <Coins amount={p} size="sm" />
              </span>
            ) : null,
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">Hoje o pódio vale a glória (sem prêmio em moedas).</p>
      )}

      {ranked.length === 0 ? (
        <p className="text-sm text-muted">
          Ninguém duelou hoje ainda. Todo mundo começa o dia com {GAME.duels.trophies.start} troféus!
        </p>
      ) : (
        <ol className="grid gap-1.5">
          {shown.map((r) => (
            <Row key={r.profile_id} row={r} person={people.get(r.profile_id)} me={r.profile_id === meId} prize={r.qualified ? prizes[r.place - 1] : 0} />
          ))}
          {compact && mine && !mineListed && (
            <>
              <li className="text-center text-muted leading-none">⋮</li>
              <Row row={mine} person={people.get(mine.profile_id)} me prize={0} />
            </>
          )}
        </ol>
      )}

      {compact ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          {!mine && meId && <span>Você ainda não duelou hoje.</span>}
          {mine && !mine.qualified && (
            <span>
              Faltam {MIN_DUELS - mine.duels} {MIN_DUELS - mine.duels === 1 ? "duelo" : "duelos"} para você entrar no pódio.
            </span>
          )}
          <Link href="/ranking" className="underline ml-auto">
            Ver ranking completo →
          </Link>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Todo mundo começa o dia com {GAME.duels.trophies.start} troféus. Cada duelo que você inicia vale troféus (os
          amistosos também): vencer quem tem mais troféus dá mais, perder para quem tem menos tira mais. Ser desafiado não
          muda os seus troféus. Para entrar no pódio, faça pelo menos {MIN_DUELS} duelos no dia.
        </p>
      )}

      {!compact && yesterday && yesterday.podium.length > 0 && (
        <div className="pixel-inset bg-white p-3 grid gap-2">
          <p className="font-pixel text-sm">Campeões do dia {yesterday.day.split("-").reverse().slice(0, 2).join("/")}</p>
          <ul className="flex flex-wrap gap-3">
            {yesterday.podium.map((p) => {
              const person = people.get(p.profile_id);
              return (
                <li key={p.profile_id} className="flex items-center gap-2 text-sm">
                  <Icon name={MEDAL[p.place - 1]} size={22} />
                  {person && <PingoAvatar look={lookFromPingo(person.pingo)} gear={person.loadout} size={36} animated={false} shadow={false} />}
                  <span>
                    <b>{person?.pingo?.name ?? person?.profile.display_name ?? "?"}</b> ·{" "}
                    {p.trophies != null ? `${p.trophies} troféus` : `${p.wins} ${p.wins === 1 ? "vitória" : "vitórias"}`}
                    {p.prize > 0 && <span className="text-leaf font-bold"> +{p.prize}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function Row({ row, person, me, prize }: { row: DailyRankingRow; person?: RankingPerson; me: boolean; prize: number }) {
  return (
    <li className={`flex items-center gap-2 rounded-md px-2 py-1 ${me ? "bg-[#ffe3ef] ring-2 ring-bubble" : row.place === 1 && row.qualified ? "bg-[#fff6c9]" : ""}`}>
      <Place place={row.place} qualified={row.qualified} />
      {person && <PingoAvatar look={lookFromPingo(person.pingo)} gear={person.loadout} size={40} animated={false} shadow={false} />}
      <span className="min-w-0 flex-1">
        <span className="font-bold block truncate">
          {person?.pingo?.name ?? "?"}
          {me && <span className="text-bubble"> (você)</span>}
        </span>
        <span className="text-xs text-muted block truncate">{person?.profile.display_name}</span>
      </span>
      <span className="text-right shrink-0">
        <span className="font-pixel text-lg block leading-none">
          <Icon name="trophy" /> {row.trophies}
        </span>
        <span className="text-[11px] text-muted">
          {row.qualified
            ? `${row.wins} ${row.wins === 1 ? "vitória" : "vitórias"} em ${row.duels}`
            : `${row.duels}/${MIN_DUELS} duelos para o pódio`}
          {prize > 0 && row.qualified && row.place <= 3 && <span className="text-leaf font-bold"> · +{prize}</span>}
        </span>
      </span>
    </li>
  );
}
