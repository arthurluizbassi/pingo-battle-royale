import { notFound } from "next/navigation";
import { ItemIcon } from "@/components/pingo/ItemIcon";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { StatTable } from "@/components/pingo/StatTable";
import { Card } from "@/components/ui/Card";
import { Coins } from "@/components/ui/Coins";
import { Ledger } from "@/components/ui/Ledger";
import { buildFromItems, CATEGORY_LABEL, getItem, loadoutItems } from "@/content/items";
import { statsWithLevel } from "@/lib/levels";
import { powerScore } from "@/engine";
import type { ProfileRow, TransactionRow } from "@/lib/db-types";
import { lookFromPingo } from "@/lib/snapshot";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/server/auth";
import { getStudentState } from "@/server/queries";
import { StudentActions } from "./StudentActions";
import { Icon } from "@/components/pixel/Icon";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireTeacher();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("class_id", session.profile.class_id)
    .eq("role", "student")
    .maybeSingle<ProfileRow>();
  if (!profile) notFound();

  const state = await getStudentState(profile.id);
  const { data: txs } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<TransactionRow[]>();
  const items = loadoutItems(state.loadout);
  const build = { stats: statsWithLevel(items.map((i) => i.statModifiers), state.progress.statPoints), effects: buildFromItems(items).effects };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <PingoAvatar look={lookFromPingo(state.pingo)} gear={state.loadout} size={96} />
        <div>
          <h1 className="font-pixel text-3xl leading-none">{profile.display_name}</h1>
          <p className="text-muted">
            <span className="font-mono">{profile.username}</span> · Pingo “{state.pingo?.name}” {profile.active ? "" : "· DESATIVADO"}
          </p>
        </div>
        <span className="ml-auto">
          <Coins amount={state.balance} size="lg" showName />
        </span>
      </div>

      <StudentActions profileId={profile.id} active={profile.active} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Loadout atual">
          <div className="grid gap-2 mb-3">
            {(["weapon", "helmet", "outfit"] as const).map((slot) => {
              const item = getItem(state.loadout[slot]);
              return (
                <div key={slot} className="flex items-center gap-2 text-sm">
                  <span className="w-20 text-muted">{CATEGORY_LABEL[slot]}</span>
                  {item ? <ItemIcon category={slot} sprite={item.sprite} tier={item.tier} size={28} /> : null}
                  <span>{item?.name ?? "vazio"}</span>
                </div>
              );
            })}
          </div>
          <p className="text-sm mb-2">
            <Icon name="star" /> <b>Nível {state.progress.level}</b> · {state.progress.xp} XP · pontos usados: {state.progress.pointsSpent}
          </p>
          <StatTable stats={build.stats} compact />
          <p className="text-xs text-muted mt-2">Power score estimado: {powerScore(build.stats, build.effects)} (Pingo pelado = 100)</p>
        </Card>
        <Card title={`Inventário (${state.inventory.length})`}>
          {state.inventory.length === 0 ? (
            <p className="text-sm text-muted">Nenhum item comprado.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {state.inventory.map((itemId) => {
                const item = getItem(itemId);
                return item ? (
                  <li key={itemId} className="flex flex-col items-center w-20 text-center text-[11px]">
                    <ItemIcon category={item.category} sprite={item.sprite} tier={item.tier} size={40} />
                    {item.name}
                  </li>
                ) : null;
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Histórico de moedas">
        <Ledger rows={txs ?? []} />
      </Card>
    </div>
  );
}
