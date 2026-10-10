"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GAME } from "@/config/game";
import { BALANCE, STAT_KEYS, type StatKey } from "@/engine";
import type { ProgressRow } from "@/lib/db-types";
import { availablePoints, progressFromRow, statsWithLevel } from "@/lib/levels";
import { getItem } from "@/content/items";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertStudent } from "../auth";
import { runDuel, type DuelOutcome } from "../duels";
import { friendlyError, runAction, type ActionResult } from "./result";

export type DuelActionResult = { ok: true; duel: DuelOutcome } | { ok: false; error: string };

/** "Encontrar Batalha": the server picks the opponent, runs the duel and saves the XP. */
export async function findDuel(): Promise<DuelActionResult> {
  try {
    const session = await assertStudent();
    const duel = await runDuel(session.userId, session.profile.class_id);
    // no revalidatePath here: refreshing the page mid-fight would restart the animation.
    // The client calls router.refresh() once the duel has been watched.
    return { ok: true, duel };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

const statKey = z.enum(STAT_KEYS as unknown as [StatKey, ...StatKey[]]);

/** Spends level points on one stat (validated against the caps with the real equipment). */
export async function spendStatPoint(stat: StatKey): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertStudent();
    const key = statKey.parse(stat);
    const admin = createAdminClient();
    const [{ data: row }, { data: equipped }] = await Promise.all([
      admin.from("pingo_progress").select("*").eq("owner_id", session.userId).maybeSingle<ProgressRow>(),
      admin.from("equipped_items").select("item_id").eq("owner_id", session.userId),
    ]);
    const progress = progressFromRow(row);
    const upgrade = GAME.levels.upgrades[key];
    if (availablePoints(progress) < upgrade.cost) throw new Error("no_points");

    const items = (equipped ?? []).map((e) => getItem(e.item_id as string)).filter((i) => i !== null);
    const now = statsWithLevel(items.map((i) => i.statModifiers), progress.statPoints);
    if (now[key] >= BALANCE.caps[key][1] - 1e-9) throw new Error("stat_capped");

    const { error } = await admin.rpc("spend_stat_point", {
      p_owner: session.userId,
      p_stat: key,
      p_cost: upgrade.cost,
      p_points_per_level: GAME.levels.pointsPerLevel,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return "Ponto aplicado!";
  });
}

/** Takes every point back so the student can rebuild the Pingo (free: it is strategy, not progress). */
export async function resetStatPoints(): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertStudent();
    const { error } = await createAdminClient().rpc("reset_stat_points", { p_owner: session.userId });
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return "Pontos devolvidos. Distribua de novo!";
  });
}
