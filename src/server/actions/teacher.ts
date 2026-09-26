"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GAME } from "@/config/game";
import { getItem } from "@/content/items";
import type { BattleRow, ClassRow, ParticipantSnapshot, RotationRow } from "@/lib/db-types";
import { generateJoinCode } from "@/lib/join-code";
import { generateTempPassword } from "@/lib/passwords";
import { computeRanking } from "@/lib/ranking";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertTeacher, usernameToEmail, type Session } from "../auth";
import { loadBattleEvents, lockBattle, startBattle, verifyBattle } from "../battles";
import { createRotation } from "../shop";
import { runAction, type ActionResult } from "./result";

export type ActionResultWithPassword = ActionResult & { password?: string };

const uuid = z.string().uuid();

/** Every student-targeted action must stay inside the teacher's class. */
async function assertStudentInClass(session: Session, profileId: string) {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("id", uuid.parse(profileId))
    .eq("class_id", session.profile.class_id)
    .eq("role", "student")
    .maybeSingle();
  if (!data) throw new Error("Aluno não encontrado nesta turma.");
}

// ------------------------------------------------------------------ students
const createStudentSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,32}$/, "Usuário: 3 a 32 caracteres (letras minúsculas, números, . _ -)."),
  displayName: z.string().trim().min(1, "Informe o nome do aluno.").max(60),
  pingoName: z.string().trim().max(24).optional(),
});

export async function createStudent(input: z.input<typeof createStudentSchema>): Promise<ActionResultWithPassword> {
  let password: string | undefined;
  const result = await runAction(async () => {
    const session = await assertTeacher();
    const data = createStudentSchema.parse(input);
    const admin = createAdminClient();
    password = generateTempPassword();

    const { data: created, error } = await admin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password,
      email_confirm: true,
      user_metadata: { username: data.username },
    });
    if (error || !created.user) {
      throw new Error(error?.message.includes("already") ? "Esse usuário já existe." : (error?.message ?? "Erro"));
    }
    const { error: setupError } = await admin.rpc("setup_profile", {
      p_user_id: created.user.id,
      p_class_id: session.profile.class_id,
      p_username: data.username,
      p_display_name: data.displayName,
      p_role: "student",
      p_pingo_name: data.pingoName || `Pingo de ${data.displayName.split(" ")[0]}`,
      p_must_change_password: true,
    });
    if (setupError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(setupError.message.includes("duplicate") ? "Esse usuário já existe." : setupError.message);
    }
    revalidatePath("/professor", "layout");
    return `Aluno criado! Usuário: ${data.username}`;
  });
  return result.ok ? { ...result, password } : result;
}

export async function setStudentActive(profileId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    await assertStudentInClass(session, profileId);
    const admin = createAdminClient();
    await admin.from("profiles").update({ active }).eq("id", profileId);
    // also blocks login at the auth level
    await admin.auth.admin.updateUserById(profileId, { ban_duration: active ? "none" : "876000h" });
    revalidatePath("/professor", "layout");
    return active ? "Aluno reativado." : "Aluno desativado.";
  });
}

export async function resetStudentPassword(profileId: string): Promise<ActionResultWithPassword> {
  const password = generateTempPassword();
  const result = await runAction(async () => {
    const session = await assertTeacher();
    await assertStudentInClass(session, profileId);
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(profileId, { password });
    if (error) throw new Error(error.message);
    await admin.from("profiles").update({ must_change_password: true }).eq("id", profileId);
    return "Senha temporária gerada.";
  });
  return result.ok ? { ...result, password } : result;
}

// ------------------------------------------------------------------ coins
const grantSchema = z
  .object({
    profileId: uuid,
    amount: z.coerce.number().int().refine((n) => n !== 0, "A quantidade não pode ser zero."),
    type: z.enum(["activity", "admin_adjustment", "special_reward"]),
    reason: z.string().trim().min(2, "Informe o motivo.").max(200),
  })
  .refine((v) => Math.abs(v.amount) <= GAME.rewards.maxSingleGrant, "Quantidade grande demais.")
  .refine((v) => v.amount > 0 || v.type === "admin_adjustment", "Retiradas só como ajuste administrativo.");

export async function grantCoins(input: z.input<typeof grantSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const data = grantSchema.parse(input);
    await assertStudentInClass(session, data.profileId);
    const { error } = await createAdminClient().rpc("grant_coins", {
      p_owner: data.profileId,
      p_amount: data.amount,
      p_type: data.type,
      p_reason: data.reason,
      p_actor: session.userId,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/professor", "layout");
    return data.amount > 0 ? `+${data.amount} ${GAME.currency.name}` : `${data.amount} ${GAME.currency.name}`;
  });
}

const batchSchema = z.object({
  profileIds: z.array(uuid).min(1, "Selecione pelo menos um aluno.").max(200),
  amount: z.coerce.number().int().min(1).max(GAME.rewards.maxSingleGrant),
  type: z.enum(["activity", "special_reward"]),
  reason: z.string().trim().min(2, "Informe a atividade/motivo.").max(200),
});

export async function grantCoinsBatch(input: z.input<typeof batchSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const data = batchSchema.parse(input);
    const { data: inClass } = await createAdminClient()
      .from("profiles")
      .select("id")
      .in("id", data.profileIds)
      .eq("class_id", session.profile.class_id)
      .eq("role", "student");
    if ((inClass ?? []).length !== new Set(data.profileIds).size) throw new Error("Há alunos fora desta turma.");

    const { error } = await createAdminClient().rpc("grant_coins_batch", {
      p_owners: [...new Set(data.profileIds)],
      p_amount: data.amount,
      p_type: data.type,
      p_reason: data.reason,
      p_actor: session.userId,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/professor", "layout");
    return `${data.amount} ${GAME.currency.name} para ${data.profileIds.length} aluno(s).`;
  });
}

// ------------------------------------------------------------------ shop
async function loadClass(session: Session): Promise<ClassRow> {
  const { data } = await createAdminClient().from("classes").select("*").eq("id", session.profile.class_id).single<ClassRow>();
  if (!data) throw new Error("Turma não encontrada.");
  return data;
}

async function lastRotationItems(classId: string): Promise<string[]> {
  const { data } = await createAdminClient()
    .from("shop_rotations")
    .select("item_ids")
    .eq("class_id", classId)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<RotationRow, "item_ids">>();
  return data?.item_ids ?? [];
}

const shopSettingsSchema = z.object({
  rotationDays: z.coerce.number().int().min(1).max(60),
  perCategory: z.coerce.number().int().min(1).max(30),
  autoRotate: z.boolean(),
});

export async function updateShopSettings(input: z.input<typeof shopSettingsSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const data = shopSettingsSchema.parse(input);
    await createAdminClient()
      .from("classes")
      .update({
        shop_rotation_days: data.rotationDays,
        shop_items_per_category: data.perCategory,
        shop_auto_rotate: data.autoRotate,
      })
      .eq("id", session.profile.class_id);
    revalidatePath("/professor/loja");
    return "Configurações da loja salvas.";
  });
}

export async function forceRotation(): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const klass = await loadClass(session);
    await createRotation(klass, await lastRotationItems(klass.id), klass.shop_auto_rotate ? "auto" : "manual", session.userId);
    revalidatePath("/", "layout");
    return "Nova rotação sorteada!";
  });
}

export async function setManualRotation(itemIds: string[]): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const ids = z.array(z.string()).min(1, "Escolha pelo menos um item.").max(90).parse(itemIds);
    if (ids.some((id) => !getItem(id))) throw new Error("Item desconhecido.");
    const klass = await loadClass(session);
    await createRotation(klass, [], "manual", session.userId, [...new Set(ids)]);
    revalidatePath("/", "layout");
    return "Loja atualizada com a sua seleção.";
  });
}

// ------------------------------------------------------------------ class join code
async function newUniqueJoinCode(): Promise<string> {
  const admin = createAdminClient();
  for (let i = 0; i < 10; i++) {
    const code = generateJoinCode(randomInt);
    const { data } = await admin.from("classes").select("id").eq("join_code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Não foi possível gerar um código. Tente de novo.");
}

export async function setJoinEnabled(enabled: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const klass = await loadClass(session);
    const update: Partial<ClassRow> = { join_enabled: enabled };
    if (enabled && !klass.join_code) update.join_code = await newUniqueJoinCode();
    const { error } = await createAdminClient().from("classes").update(update).eq("id", klass.id);
    if (error) throw new Error(error.message);
    revalidatePath("/professor", "layout");
    return enabled ? "Cadastro por código ligado." : "Cadastro por código desligado.";
  });
}

export async function regenerateJoinCode(): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const { error } = await createAdminClient()
      .from("classes")
      .update({ join_code: await newUniqueJoinCode() })
      .eq("id", session.profile.class_id);
    if (error) throw new Error(error.message);
    revalidatePath("/professor", "layout");
    return "Código novo gerado. O antigo parou de funcionar.";
  });
}

export async function approveStudents(profileIds: string[]): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const ids = z.array(uuid).min(1).max(200).parse(profileIds);
    const { data, error } = await createAdminClient()
      .from("profiles")
      .update({ pending: false, active: true })
      .in("id", ids)
      .eq("class_id", session.profile.class_id)
      .eq("pending", true)
      .select("id");
    if (error) throw new Error(error.message);
    revalidatePath("/professor", "layout");
    const n = data?.length ?? 0;
    return n === 1 ? "Aluno aprovado!" : `${n} alunos aprovados!`;
  });
}

export async function rejectStudent(profileId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("id", uuid.parse(profileId))
      .eq("class_id", session.profile.class_id)
      .eq("pending", true)
      .maybeSingle();
    if (!data) throw new Error("Pedido não encontrado.");
    // removes the auth account; profile, wallet and Pingo go with it (on delete cascade)
    const { error } = await admin.auth.admin.deleteUser(profileId);
    if (error) throw new Error(error.message);
    revalidatePath("/professor", "layout");
    return "Pedido recusado.";
  });
}

// ------------------------------------------------------------------ seasons
export async function createSeason(name: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const parsed = z.string().trim().min(1, "Dê um nome à temporada.").max(60).parse(name);
    const admin = createAdminClient();
    await admin
      .from("seasons")
      .update({ active: false, ends_at: new Date().toISOString() })
      .eq("class_id", session.profile.class_id)
      .eq("active", true);
    const { error } = await admin.from("seasons").insert({ class_id: session.profile.class_id, name: parsed });
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return `Temporada "${parsed}" iniciada!`;
  });
}

export async function endSeason(seasonId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const admin = createAdminClient();
    const { data: season } = await admin
      .from("seasons")
      .select("*")
      .eq("id", uuid.parse(seasonId))
      .eq("class_id", session.profile.class_id)
      .single();
    if (!season) throw new Error("Temporada não encontrada.");

    const { data: battles } = await admin.from("battles").select("id").eq("season_id", seasonId).eq("status", "finished");
    const ids = (battles ?? []).map((b) => b.id);
    if (ids.length) {
      const { data: results } = await admin
        .from("battle_participants")
        .select("profile_id, placement, kills")
        .in("battle_id", ids);
      const [champion] = computeRanking(results ?? []);
      if (champion) {
        await admin.from("trophies").insert({
          profile_id: champion.profileId,
          season_id: seasonId,
          kind: "season_champion",
          label: `👑 Campeão da ${season.name}`,
        });
      }
    }
    await admin.from("seasons").update({ active: false, ends_at: new Date().toISOString() }).eq("id", seasonId);
    revalidatePath("/", "layout");
    return "Temporada encerrada.";
  });
}

// ------------------------------------------------------------------ battles
const battleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scheduledAt: z.string().optional(),
  prizeText: z.string().trim().max(200).optional(),
  enrollAll: z.boolean().default(true),
});

export async function createBattle(input: z.input<typeof battleSchema>): Promise<ActionResult & { battleId?: string }> {
  let battleId: string | undefined;
  const result = await runAction(async () => {
    const session = await assertTeacher();
    const data = battleSchema.parse(input);
    const admin = createAdminClient();
    const { data: season } = await admin
      .from("seasons")
      .select("id")
      .eq("class_id", session.profile.class_id)
      .eq("active", true)
      .maybeSingle();
    const scheduled = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const { data: id, error } = await admin.rpc("create_battle", {
      p_class_id: session.profile.class_id,
      p_season_id: season?.id ?? null,
      p_name: data.name,
      p_scheduled_at: scheduled && !Number.isNaN(scheduled.getTime()) ? scheduled.toISOString() : null,
      p_prize_text: data.prizeText || null,
      p_actor: session.userId,
    });
    if (error) throw new Error(error.message);
    battleId = id as string;

    if (data.enrollAll) {
      const { data: students } = await admin
        .from("profiles")
        .select("id")
        .eq("class_id", session.profile.class_id)
        .eq("role", "student")
        .eq("active", true);
      if (students?.length) {
        await admin
          .from("battle_participants")
          .insert(students.map((s) => ({ battle_id: battleId, profile_id: s.id })));
      }
    }
    revalidatePath("/", "layout");
    return "Battle Royale criado!";
  });
  return result.ok ? { ...result, battleId } : result;
}

async function assertBattleScheduled(session: Session, battleId: string) {
  const { data } = await createAdminClient()
    .from("battles")
    .select("status")
    .eq("id", uuid.parse(battleId))
    .eq("class_id", session.profile.class_id)
    .single();
  if (!data) throw new Error("Batalha não encontrada.");
  if (data.status !== "scheduled") throw new Error("Depois de travar os loadouts não é possível mudar os participantes.");
}

export async function setParticipant(battleId: string, profileId: string, enrolled: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    await assertBattleScheduled(session, battleId);
    await assertStudentInClass(session, profileId);
    const admin = createAdminClient();
    if (enrolled) {
      await admin.from("battle_participants").upsert({ battle_id: battleId, profile_id: profileId });
    } else {
      await admin.from("battle_participants").delete().eq("battle_id", battleId).eq("profile_id", profileId);
    }
    revalidatePath(`/professor/batalhas/${battleId}`);
  });
}

export async function lockBattleAction(battleId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    await lockBattle(uuid.parse(battleId), session.profile.class_id);
    revalidatePath("/", "layout");
    return "Loadouts travados! Os equipamentos desta batalha estão congelados.";
  });
}

export async function startBattleAction(battleId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    await startBattle(uuid.parse(battleId), session.profile.class_id);
    revalidatePath("/", "layout");
    return "Batalha simulada! Abra a Arena para assistir.";
  });
}

/** Re-simulates a finished battle from seed + snapshots and compares with the stored log. */
export async function verifyReplay(battleId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const admin = createAdminClient();
    const { data: battle } = await admin
      .from("battles")
      .select("*")
      .eq("id", uuid.parse(battleId))
      .eq("class_id", session.profile.class_id)
      .single<BattleRow>();
    if (!battle || battle.status !== "finished") throw new Error("A batalha ainda não terminou.");
    const { data: rows } = await admin.from("battle_participants").select("snapshot").eq("battle_id", battleId);
    const snapshots = (rows ?? []).map((r) => r.snapshot as ParticipantSnapshot).filter(Boolean);
    const { identical } = await verifyBattle(battle, snapshots, await loadBattleEvents(battleId));
    if (!identical) throw new Error("A simulação refeita NÃO bate com o registro salvo. Verifique a versão do motor.");
    return `Reproduzida com sucesso: seed ${battle.seed} gera exatamente a mesma batalha (${battle.engine_version}).`;
  });
}

export async function cancelBattle(battleId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await assertTeacher();
    const { error } = await createAdminClient()
      .from("battles")
      .update({ status: "cancelled" })
      .eq("id", uuid.parse(battleId))
      .eq("class_id", session.profile.class_id)
      .in("status", ["scheduled", "locked"]);
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return "Batalha cancelada.";
  });
}
