import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptySlotIcon, ItemIcon } from "@/components/pingo/ItemIcon";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { CATEGORY_LABEL, getItem, type ItemCategory } from "@/content/items";
import type { BattleRow, EquippedRow, ParticipantRow, PingoRow, ProfileRow, TrophyRow } from "@/lib/db-types";
import { formatDateTime } from "@/lib/format";
import { lookFromPingo } from "@/lib/snapshot";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { loadoutFromRows } from "@/server/queries";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", decodeURIComponent(username))
    .eq("role", "student")
    .maybeSingle<ProfileRow>();
  if (!profile) notFound();

  const [{ data: pingo }, { data: equipped }, { data: parts }, { data: trophies }] = await Promise.all([
    supabase.from("pingos").select("*").eq("owner_id", profile.id).maybeSingle<PingoRow>(),
    supabase.from("equipped_items").select("*").eq("owner_id", profile.id).returns<EquippedRow[]>(),
    supabase.from("battle_participants").select("*").eq("profile_id", profile.id).not("placement", "is", null).returns<ParticipantRow[]>(),
    supabase.from("trophies").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }).returns<TrophyRow[]>(),
  ]);
  const loadout = loadoutFromRows(equipped ?? []);
  const results = parts ?? [];
  const wins = results.filter((p) => p.placement === 1).length;
  const best = results.reduce<number | null>((b, p) => (p.placement && (b === null || p.placement < b) ? p.placement : b), null);
  const kills = results.reduce((s, p) => s + (p.kills ?? 0), 0);
  const { data: battles } = results.length
    ? await supabase.from("battles").select("*").in("id", results.map((p) => p.battle_id)).order("number", { ascending: false }).limit(8).returns<BattleRow[]>()
    : { data: [] as BattleRow[] };

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <section className="pixel-panel p-4 flex flex-col items-center text-center self-start">
        <PingoAvatar look={lookFromPingo(pingo)} gear={loadout} size={220} />
        <h1 className="font-pixel text-3xl leading-none">{pingo?.name}</h1>
        <p className="text-muted">de {profile.display_name}</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {(["weapon", "helmet", "outfit"] as ItemCategory[]).map((slot) => {
            const item = getItem(loadout[slot]);
            return (
              <div key={slot} className="flex flex-col items-center gap-1">
                {item ? <ItemIcon category={slot} sprite={item.sprite} tier={item.tier} size={44} name={item.name} /> : <EmptySlotIcon size={44} label="—" />}
                <span className="text-[11px] leading-tight">{item?.name ?? CATEGORY_LABEL[slot]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 content-start">
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ["🏆", "Vitórias", wins],
            ["🎯", "Melhor colocação", best ? `${best}º` : "—"],
            ["💀", "Eliminações", kills],
            ["⚔️", "Batalhas", results.length],
          ].map(([icon, label, value]) => (
            <div key={String(label)} className="pixel-panel p-3 text-center">
              <p className="text-2xl">{icon}</p>
              <p className="font-pixel text-2xl">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </section>

        <section className="pixel-panel p-4">
          <h2 className="font-pixel text-xl mb-2">Troféus</h2>
          {(trophies ?? []).length === 0 ? (
            <p className="text-sm text-muted">Nenhum troféu ainda. O próximo Royale pode mudar isso!</p>
          ) : (
            <ul className="grid gap-1">
              {(trophies ?? []).map((t) => (
                <li key={t.id} className="pixel-inset bg-white px-2 py-1">
                  {t.label}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pixel-panel p-4">
          <h2 className="font-pixel text-xl mb-2">Histórico recente</h2>
          {(battles ?? []).length === 0 ? (
            <p className="text-sm text-muted">Nenhuma batalha ainda.</p>
          ) : (
            <ul className="grid gap-1">
              {(battles ?? []).map((b) => {
                const r = results.find((p) => p.battle_id === b.id);
                return (
                  <li key={b.id} className="flex items-center gap-3 text-sm">
                    <span className="font-pixel w-10">{r?.placement === 1 ? "🏆" : `${r?.placement}º`}</span>
                    <Link href={`/arena/${b.id}`} className="underline">
                      {b.name}
                    </Link>
                    <span className="text-muted">{formatDateTime(b.finished_at)}</span>
                    <span className="ml-auto">💀 {r?.kills}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
