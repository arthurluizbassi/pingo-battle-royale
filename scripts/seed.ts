/**
 * Development/demo seed. Creates (idempotently):
 *   1 teacher, 12 students with Pingos, coins from "activities", purchases and loadouts,
 *   an active season, a shop rotation, one finished Battle Royale (with replay) and one scheduled.
 *
 *   npm run seed
 *
 * Passwords: SEED_DEFAULT_PASSWORD from .env.local, or random ones. They are written ONLY to
 * .seed-credentials.local.txt (git-ignored). Never use seed accounts in production.
 */
import { writeFileSync } from "node:fs";
import { GAME } from "@/config/game";
import { ALL_ITEMS, type ItemCategory, type ItemDefinition } from "@/content/items";
import { BALANCE, createRng, ENGINE_VERSION, generateSeed, simulateBattle } from "@/engine";
import { summarizeBattle, trophiesFor } from "@/lib/battle-summary";
import { CATALOG_HASH, catalogRows } from "@/lib/catalog-rows";
import type { PingoRow, ProfileRow } from "@/lib/db-types";
import { generateTempPassword } from "@/lib/passwords";
import { pickRotation } from "@/lib/shop-rotation";
import { buildSnapshot, combatantFromSnapshot } from "@/lib/snapshot";
import { scriptAdminClient } from "./lib/admin";

const admin = scriptAdminClient();
const rng = createRng(2026);
const credentials: string[] = [];

const STUDENTS = [
  { username: "ana", name: "Ana Souza", pingo: "Gotinha", look: ["rosa", "grande", "sorriso", "bochechas"], activities: 10 },
  { username: "bruno", name: "Bruno Lima", pingo: "Trovão", look: ["azul", "bravo", "reta", "nenhum"], activities: 8 },
  { username: "carlos", name: "Carlos Mendes", pingo: "Pudim", look: ["amarelo", "sono", "aberta", "sardas"], activities: 1 },
  { username: "daniel", name: "Daniel Rocha", pingo: "Faísca", look: ["laranja", "redondo", "dentes", "estrela"], activities: 6 },
  { username: "duda", name: "Eduarda Alves", pingo: "Jujuba", look: ["roxo", "brilho", "gato", "bochechas"], activities: 9 },
  { username: "felipe", name: "Felipe Costa", pingo: "Tsunami", look: ["ciano", "ponto", "sorriso", "curativo"], activities: 3 },
  { username: "gabi", name: "Gabriela Dias", pingo: "Paçoca", look: ["menta", "feliz", "lingua", "broto"], activities: 7 },
  { username: "heitor", name: "Heitor Nunes", pingo: "Rex", look: ["verde", "bravo", "dentes", "nenhum"], activities: 0 },
  { username: "isa", name: "Isabela Ramos", pingo: "Nuvem", look: ["cinza", "grande", "sorriso", "estrela"], activities: 5 },
  { username: "joao", name: "João Pedro", pingo: "Biscoito", look: ["vermelho", "redondo", "aberta", "sardas"], activities: 4 },
  { username: "lari", name: "Larissa Melo", pingo: "Cometa", look: ["rosa", "brilho", "gato", "broto"], activities: 10 },
  { username: "miguel", name: "Miguel Torres", pingo: "Mingau", look: ["amarelo", "ponto", "reta", "bochechas"], activities: 2 },
];

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function ensureUser(
  classId: string,
  username: string,
  displayName: string,
  role: "student" | "teacher",
  pingoName: string | null,
): Promise<{ id: string; created: boolean }> {
  const { data: existing } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (existing) return { id: existing.id, created: false };

  const password = process.env.SEED_DEFAULT_PASSWORD || generateTempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: `${username}@${GAME.auth.usernameEmailDomain}`,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) fail(`Não consegui criar ${username}: ${error?.message}`);
  const { error: setupError } = await admin.rpc("setup_profile", {
    p_user_id: data.user.id,
    p_class_id: classId,
    p_username: username,
    p_display_name: displayName,
    p_role: role,
    p_pingo_name: pingoName ?? displayName,
    p_must_change_password: false,
  });
  if (setupError) fail(`Perfil de ${username}: ${setupError.message}`);
  credentials.push(`${role === "teacher" ? "PROFESSOR" : "aluno    "}  usuário: ${username.padEnd(10)} senha: ${password}`);
  return { id: data.user.id, created: true };
}

async function seedPurchase(ownerId: string, item: ItemDefinition, balance: number): Promise<number> {
  const after = balance - item.price;
  await admin.from("wallets").update({ balance: after }).eq("owner_id", ownerId);
  await admin.from("wallet_transactions").insert({
    owner_id: ownerId,
    amount: -item.price,
    type: "purchase",
    reason: `Compra: ${item.name}`,
    balance_after: after,
    item_id: item.id,
    created_by: ownerId,
  });
  await admin.from("inventories").insert({ owner_id: ownerId, item_id: item.id });
  return after;
}

async function main() {
  const { error: schemaError } = await admin.from("classes").select("id").limit(1);
  if (schemaError) fail(`Banco sem as tabelas do Pingo (${schemaError.message}). Rode "npm run db:migrate" primeiro.`);

  // ---- catalog
  const { error: catalogError } = await admin.from("items").upsert(catalogRows());
  if (catalogError) fail(`Catálogo: ${catalogError.message}`);
  await admin.from("app_meta").upsert({ key: "catalog_hash", value: CATALOG_HASH });
  console.log(`✔ catálogo: ${ALL_ITEMS.length} itens`);

  // ---- class
  let { data: klass } = await admin.from("classes").select("*").eq("name", "Turma Demo").maybeSingle();
  if (!klass) {
    ({ data: klass } = await admin.from("classes").insert({ name: "Turma Demo" }).select("*").single());
  }
  if (!klass) fail("Não consegui criar a turma.");
  console.log(`✔ turma: ${klass.name}`);

  // ---- people
  const teacher = await ensureUser(klass.id, "professor", "Professor(a) Demo", "teacher", null);
  const students: Array<{ id: string; created: boolean; spec: (typeof STUDENTS)[number] }> = [];
  for (const spec of STUDENTS) {
    const user = await ensureUser(klass.id, spec.username, spec.name, "student", spec.pingo);
    students.push({ ...user, spec });
    if (user.created) {
      const [body_color, eyes, mouth, detail] = spec.look;
      await admin.from("pingos").update({ body_color, eyes, mouth, detail }).eq("owner_id", user.id);
    }
  }
  console.log(`✔ professor + ${students.length} alunos`);

  // ---- season
  let { data: season } = await admin.from("seasons").select("*").eq("class_id", klass.id).eq("active", true).maybeSingle();
  if (!season) {
    ({ data: season } = await admin.from("seasons").insert({ class_id: klass.id, name: "Temporada 1" }).select("*").single());
  }
  console.log(`✔ temporada ativa: ${season?.name}`);

  // ---- economy for newly created students: activities -> coins -> purchases -> loadout
  for (const s of students.filter((x) => x.created)) {
    for (let i = 1; i <= s.spec.activities; i++) {
      const { error } = await admin.rpc("grant_coins", {
        p_owner: s.id,
        p_amount: GAME.rewards.defaultActivity,
        p_type: "activity",
        p_reason: `Atividade ${String(i).padStart(2, "0")}`,
        p_actor: teacher.id,
      });
      if (error) fail(`Moedas: ${error.message}`);
    }
    let balance = s.spec.activities * GAME.rewards.defaultActivity;
    const owned: ItemDefinition[] = [];
    // buy one item per slot, the best tier affordable, then maybe an extra option
    for (const cat of rng.shuffle(["weapon", "helmet", "outfit"] as ItemCategory[])) {
      const affordable = ALL_ITEMS.filter((it) => it.category === cat && it.price <= balance * 0.6 + 1);
      if (!affordable.length) continue;
      const maxTier = Math.max(...affordable.map((it) => it.tier));
      const item = rng.pick(affordable.filter((it) => it.tier === maxTier));
      balance = await seedPurchase(s.id, item, balance);
      owned.push(item);
    }
    const extra = ALL_ITEMS.filter((it) => it.price <= balance && !owned.includes(it));
    if (extra.length && rng.chance(0.5)) {
      const item = rng.pick(extra);
      balance = await seedPurchase(s.id, item, balance);
      owned.push(item);
    }
    for (const cat of ["weapon", "helmet", "outfit"] as ItemCategory[]) {
      const item = owned.filter((it) => it.category === cat).sort((a, b) => b.tier - a.tier)[0];
      if (item) await admin.from("equipped_items").insert({ owner_id: s.id, slot: cat, item_id: item.id });
    }
  }
  console.log("✔ moedas, compras e loadouts");

  // ---- shop
  const { data: rotation } = await admin.from("shop_rotations").select("id").eq("class_id", klass.id).limit(1).maybeSingle();
  if (!rotation) {
    await admin.from("shop_rotations").insert({
      class_id: klass.id,
      item_ids: pickRotation(klass.shop_items_per_category, [], rng.next),
      mode: "auto",
      ends_at: new Date(Date.now() + klass.shop_rotation_days * 86_400_000).toISOString(),
      created_by: teacher.id,
    });
  }
  console.log("✔ loja com rotação ativa");

  // ---- battles
  const { data: anyBattle } = await admin.from("battles").select("id").eq("class_id", klass.id).limit(1).maybeSingle();
  if (!anyBattle) {
    const lastSaturday = new Date();
    lastSaturday.setDate(lastSaturday.getDate() - ((lastSaturday.getDay() + 1) % 7 || 7));
    lastSaturday.setHours(10, 0, 0, 0);
    const { data: battleId, error } = await admin.rpc("create_battle", {
      p_class_id: klass.id,
      p_season_id: season?.id ?? null,
      p_name: "Pingo Royale #N",
      p_scheduled_at: lastSaturday.toISOString(),
      p_prize_text: "Caixa de chocolate 🍫",
      p_actor: teacher.id,
    });
    if (error) fail(`Batalha: ${error.message}`);
    await admin.from("battle_participants").insert(students.map((s) => ({ battle_id: battleId, profile_id: s.id })));

    // LOCK: snapshot current equipment
    const ids = students.map((s) => s.id);
    const [{ data: profiles }, { data: pingos }, { data: equipped }] = await Promise.all([
      admin.from("profiles").select("*").in("id", ids),
      admin.from("pingos").select("*").in("owner_id", ids),
      admin.from("equipped_items").select("*").in("owner_id", ids),
    ]);
    const snapshots = (profiles as ProfileRow[]).map((p) =>
      buildSnapshot(
        p,
        (pingos as PingoRow[]).find((x) => x.owner_id === p.id) ?? null,
        (equipped ?? []).filter((e) => e.owner_id === p.id).map((e) => e.item_id as string),
      ),
    );
    const lock = await admin.rpc("lock_battle", {
      p_battle_id: battleId,
      p_snapshots: snapshots.map((s) => ({ profile_id: s.profileId, power_score: s.powerScore, snapshot: s })),
    });
    if (lock.error) fail(`Lock: ${lock.error.message}`);

    // START: same code path as the teacher button (seed + simulate + one transaction)
    snapshots.sort((a, b) => a.profileId.localeCompare(b.profileId));
    const seed = generateSeed();
    const result = simulateBattle({ seed, participants: snapshots.map(combatantFromSnapshot) }, BALANCE);
    const finish = await admin.rpc("finish_battle", {
      p_battle_id: battleId,
      p_seed: seed,
      p_engine_version: ENGINE_VERSION,
      p_balance: BALANCE,
      p_winner: result.winnerId,
      p_summary: summarizeBattle(result, snapshots),
      p_results: Object.entries(result.fighters).map(([profileId, f]) => ({ profile_id: profileId, ...f, eliminatedBy: f.eliminatedBy ?? "" })),
      p_events: result.events,
      p_trophies: trophiesFor(result, "Pingo Royale #1"),
    });
    if (finish.error) fail(`Finish: ${finish.error.message}`);
    const winner = snapshots.find((s) => s.profileId === result.winnerId);
    console.log(`✔ Pingo Royale #1 disputado (seed ${seed}) — vencedor: ${winner?.pingoName} de ${winner?.displayName}`);

    const nextSaturday = new Date(lastSaturday.getTime() + 7 * 86_400_000);
    const { data: nextId } = await admin.rpc("create_battle", {
      p_class_id: klass.id,
      p_season_id: season?.id ?? null,
      p_name: "Pingo Royale #N",
      p_scheduled_at: nextSaturday.toISOString(),
      p_prize_text: "Pirulito gigante 🍭",
      p_actor: teacher.id,
    });
    await admin.from("battle_participants").insert(students.map((s) => ({ battle_id: nextId, profile_id: s.id })));
    console.log("✔ Pingo Royale #2 agendado");
  } else {
    console.log("• batalhas já existem — nada a fazer");
  }

  if (credentials.length) {
    writeFileSync(
      ".seed-credentials.local.txt",
      `Pingo Battle Royale — contas de DEMONSTRAÇÃO (não use em produção)\n\n${credentials.join("\n")}\n`,
    );
    console.log(`\n🔑 ${credentials.length} conta(s) criada(s). Usuários e senhas em .seed-credentials.local.txt (ignorado pelo git).`);
  } else {
    console.log("\n• Nenhuma conta nova (todas já existiam).");
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
