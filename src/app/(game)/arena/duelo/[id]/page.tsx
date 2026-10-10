import Link from "next/link";
import { notFound } from "next/navigation";
import type { DuelRow } from "@/lib/db-types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { DuelReplay } from "./DuelReplay";

/** Replay of a saved duel (RLS: only the two students in it and the teacher can open it). */
export default async function DuelReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: duel } = await supabase.from("duels").select("*").eq("id", id).maybeSingle<DuelRow>();
  if (!duel) notFound();

  const [challenger, defender] = duel.snapshots;
  // the viewer is always on the left when they took part
  const youAreDefender = session.userId === duel.defender_id;
  const [left, right] = youAreDefender ? [defender, challenger] : [challenger, defender];
  const toFighter = (s: typeof challenger) => ({
    id: s.profileId,
    pingoName: s.pingoName,
    displayName: s.displayName,
    look: s.look,
    gear: {
      weapon: s.items.find((i) => i.category === "weapon")?.sprite ?? null,
      helmet: s.items.find((i) => i.category === "helmet")?.sprite ?? null,
      outfit: s.items.find((i) => i.category === "outfit")?.sprite ?? null,
    },
    level: s.level ?? 1,
  });
  const winner = duel.winner_id === challenger.profileId ? challenger : defender;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-pixel text-3xl">
            {challenger.pingoName} × {defender.pingoName}
          </h1>
          <p className="text-sm text-muted">
            {formatDateTime(duel.created_at)} · {challenger.displayName} desafiou {defender.displayName}
          </p>
        </div>
        <Link href="/arena/duelo" className="pixel-btn btn-small btn-white">
          ← Duelos
        </Link>
      </div>
      <DuelReplay you={toFighter(left)} foe={toFighter(right)} events={duel.events} winnerName={winner.pingoName} />
    </div>
  );
}
