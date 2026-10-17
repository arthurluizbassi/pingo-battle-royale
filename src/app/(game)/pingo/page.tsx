import Link from "next/link";
import { EmptySlotIcon, ItemIcon } from "@/components/pingo/ItemIcon";
import { StatTable } from "@/components/pingo/StatTable";
import { Coins } from "@/components/ui/Coins";
import { Countdown } from "@/components/ui/Countdown";
import { CATEGORY_LABEL, getItem, loadoutItems, type ItemCategory } from "@/content/items";
import { formatDateTime } from "@/lib/format";
import { lookFromPingo } from "@/lib/snapshot";
import { createClient } from "@/lib/supabase/server";
import type { TrophyRow } from "@/lib/db-types";
import { requireStudent } from "@/server/auth";
import { getActiveSeason, getNextBattle, getSeasonRanking, getStudentState } from "@/server/queries";
import { statsWithLevel } from "@/lib/levels";
import { DashboardPingo } from "./DashboardPingo";
import { LevelCard } from "./LevelCard";
import { Icon, PixelText } from "@/components/pixel/Icon";

const SLOTS: ItemCategory[] = ["weapon", "helmet", "outfit"];

export default async function MyPingoPage() {
  const session = await requireStudent();
  const classId = session.profile.class_id;
  const [state, nextBattle, season] = await Promise.all([
    getStudentState(session.userId),
    getNextBattle(classId),
    getActiveSeason(classId),
  ]);
  const progress = state.progress;
  const ranking = season ? await getSeasonRanking(season.id) : [];
  const myRank = ranking.findIndex((r) => r.profileId === session.userId);
  const supabase = await createClient();
  const { data: trophies } = await supabase
    .from("trophies")
    .select("*")
    .eq("profile_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(3)
    .returns<TrophyRow[]>();

  let enrolled = false;
  if (nextBattle) {
    const { data } = await supabase
      .from("battle_participants")
      .select("profile_id")
      .eq("battle_id", nextBattle.id)
      .eq("profile_id", session.userId)
      .maybeSingle();
    enrolled = Boolean(data);
  }

  const equippedItems = loadoutItems(state.loadout);
  // items + the points earned in duels
  const stats = statsWithLevel(equippedItems.map((i) => i.statModifiers), progress.statPoints);
  const look = lookFromPingo(state.pingo);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      {/* ---- the Pingo ---- */}
      <section className="pixel-panel p-4 sm:p-6 flex flex-col items-center text-center">
        <div className="flex w-full items-start justify-between gap-2">
          <span className="pixel-chip bg-sun">
            <Coins amount={state.balance} size="sm" showName />
          </span>
          <Link href="/pingo/editar" className="pixel-btn btn-small btn-white">
            <Icon name="pencil" /> Personalizar
          </Link>
        </div>
        <DashboardPingo
          look={look}
          gear={{ weapon: state.loadout.weapon, helmet: state.loadout.helmet, outfit: state.loadout.outfit }}
          inventoryCount={state.inventory.length}
        />
        <h1 className="font-pixel text-3xl sm:text-4xl leading-none">{state.pingo?.name ?? "Pingo"}</h1>
        <p className="text-muted mt-1">de {session.profile.display_name}</p>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-md">
          {SLOTS.map((slot) => {
            const item = getItem(state.loadout[slot]);
            return (
              <Link key={slot} href="/inventario" className="flex flex-col items-center gap-1 group">
                {item ? (
                  <ItemIcon category={slot} sprite={item.sprite} tier={item.tier} size={56} name={item.name} />
                ) : (
                  <EmptySlotIcon size={56} label="vazio" />
                )}
                <span className="font-pixel text-xs text-muted">{CATEGORY_LABEL[slot]}</span>
                <span className="text-xs font-bold leading-tight line-clamp-2 group-hover:underline">
                  {item?.name ?? "—"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---- side column ---- */}
      <div className="grid gap-5 content-start">
        <Link href="/arena/duelo?buscar" className="pixel-btn btn-pink text-2xl py-4">
          <Icon name="swords" /> Encontrar Batalha
        </Link>
        <LevelCard progress={progress} stats={stats} />
        <section className="pixel-panel p-4">
          <h2 className="font-pixel text-lg mb-2"><Icon name="swords" /> Próximo Battle Royale</h2>
          {nextBattle ? (
            <div className="grid gap-2">
              <p className="font-bold">{nextBattle.name}</p>
              {nextBattle.scheduled_at && (
                <>
                  <p className="text-sm text-muted">{formatDateTime(nextBattle.scheduled_at)}</p>
                  <Countdown to={nextBattle.scheduled_at} />
                </>
              )}
              {nextBattle.prize_text && <p className="pixel-inset bg-white px-2 py-1 text-sm"><Icon name="gift" /> <PixelText text={nextBattle.prize_text} /></p>}
              <p className="text-sm">
                {!enrolled
                  ? "Você não está inscrito nesta batalha."
                  : nextBattle.status === "locked"
                    ? <><Icon name="lock" /> Loadouts travados! Seu equipamento para esta batalha está definido.</>
                    : <><Icon name="check" /> Inscrito! Ajuste seus equipamentos antes do professor travar os loadouts.</>}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhuma batalha marcada ainda. Aproveite para juntar moedas!</p>
          )}
        </section>

        <section className="pixel-panel p-4">
          <h2 className="font-pixel text-lg mb-3"><Icon name="chart" /> Atributos</h2>
          <StatTable stats={stats} compact />
          <Link href="/inventario" className="text-sm underline mt-3 inline-block">
            Testar outras combinações →
          </Link>
        </section>

        <section className="pixel-panel p-4">
          <h2 className="font-pixel text-lg mb-2"><Icon name="trophy" /> {season?.name ?? "Temporada"}</h2>
          {season ? (
            myRank >= 0 ? (
              <p>
                Você está em <b className="font-pixel text-xl">{myRank + 1}º</b> com{" "}
                <b>{ranking[myRank].points} pontos</b> ({ranking[myRank].battles} batalhas, {ranking[myRank].wins} vitórias).
              </p>
            ) : (
              <p className="text-sm text-muted">Você ainda não pontuou nesta temporada.</p>
            )
          ) : (
            <p className="text-sm text-muted">Nenhuma temporada ativa.</p>
          )}
          {(trophies ?? []).length > 0 && (
            <ul className="mt-2 text-sm grid gap-1">
              {(trophies ?? []).map((t) => (
                <li key={t.id}><PixelText text={t.label} /></li>
              ))}
            </ul>
          )}
          <Link href="/ranking" className="text-sm underline mt-2 inline-block">
            Ver ranking →
          </Link>
        </section>
      </div>
    </div>
  );
}
