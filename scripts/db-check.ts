/**
 * Security & integrity checks against the real database, impersonating users the same way
 * Supabase does (role + JWT claims). Everything runs in ONE transaction that is rolled back.
 *   npm run db:check        (run after `npm run seed`)
 */
import pg from "pg";
import { requireEnv } from "./lib/env";

const client = new pg.Client({ connectionString: requireEnv("SUPABASE_DB_URL"), ssl: { rejectUnauthorized: false } });
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function as(role: "anon" | "authenticated" | "postgres", userId?: string) {
  await client.query("reset role");
  if (role === "postgres") return;
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify(userId ? { sub: userId, role } : { role }),
  ]);
  await client.query(`set local role ${role}`);
}

async function expectError(name: string, sql: string, params: unknown[], contains: string) {
  await client.query("savepoint s");
  try {
    await client.query(sql, params);
    check(name, false, "não deu erro");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(name, message.includes(contains), message);
  }
  await client.query("rollback to savepoint s");
}

async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await client.query(sql, params);
  return rows[0] as T;
}

async function main() {
  await client.connect();
  await client.query("begin");
  try {
    const rich = await one<{ id: string; class_id: string } | undefined>("select id, class_id from profiles where username = 'lari'");
    const poor = await one<{ id: string } | undefined>("select id from profiles where username = 'heitor'");
    const teacher = await one<{ id: string } | undefined>("select id from profiles where username = 'professor'");
    if (!rich || !poor || !teacher) {
      console.log("Rode `npm run seed` antes do db:check.");
      process.exit(1);
    }
    // same rule as buy_item: the rotation open right now (an expired one is only renewed when someone opens the shop)
    const rotation = (await one<{ item_ids: string[] } | undefined>(
      "select item_ids from shop_rotations where class_id = $1 and starts_at <= now() and (ends_at is null or ends_at > now()) order by starts_at desc limit 1",
      [rich.class_id],
    )) ?? { item_ids: [] as string[] };
    if (rotation.item_ids.length === 0) console.log("• (a loja não tem rotação aberta agora: testes de compra pulados — abra a Loja uma vez para renovar)");
    const studentsInClass = Number((await one<{ n: string }>("select count(*) n from profiles where class_id = $1 and role = 'student'", [rich.class_id])).n);

    // ---------- anonymous visitor
    await as("anon");
    await expectError("anônimo não lê carteiras", "select count(*) from wallets", [], "permission denied");
    await expectError("anônimo não lê perfis", "select count(*) from profiles", [], "permission denied");
    await expectError("anônimo não chama buy_item", "select buy_item('cardboard_sword')", [], "permission denied");

    // ---------- student
    await as("authenticated", rich.id);
    check("aluno vê só a própria carteira", Number((await one<{ n: string }>("select count(*) n from wallets")).n) === 1);
    check(
      "aluno não vê transações dos outros",
      Number((await one<{ n: string }>("select count(*) n from wallet_transactions where owner_id <> $1", [rich.id])).n) === 0,
    );
    check("aluno vê colegas da turma", Number((await one<{ n: string }>("select count(*) n from profiles")).n) > 1);
    await expectError("aluno não altera saldo direto", "update wallets set balance = 999999", [], "permission denied");
    await expectError("aluno não insere no inventário", "insert into inventories (owner_id, item_id) values ($1, 'wifi_hammer')", [rich.id], "permission denied");
    await expectError(
      "aluno não chama grant_coins",
      "select grant_coins($1, 5000, 'activity', 'hack', $1)",
      [rich.id],
      "permission denied",
    );
    if (rotation.item_ids.length) await expectError("aluno não compra fora da rotação", "select buy_item($1)", [
      (await one<{ id: string }>("select id from items where not (id = any($1)) limit 1", [rotation.item_ids])).id,
    ], "item_not_in_shop");

    const before = Number((await one<{ balance: number }>("select balance from wallets where owner_id = $1", [rich.id])).balance);
    const buyable = await one<{ id: string; price: number; category: string } | undefined>(
      `select i.id, i.price, i.category from items i
        where i.id = any($1) and i.price <= $2
          and not exists (select 1 from inventories v where v.owner_id = $3 and v.item_id = i.id)
        order by i.price limit 1`,
      [rotation.item_ids, before, rich.id],
    );
    if (buyable) {
      await client.query("select buy_item($1)", [buyable.id]);
      const after = Number((await one<{ balance: number }>("select balance from wallets where owner_id = $1", [rich.id])).balance);
      check("compra debita o preço exato", after === before - buyable.price, `${before} → ${after}`);
      const tx = await one<{ amount: number; balance_after: number; type: string }>(
        "select amount, balance_after, type from wallet_transactions where owner_id = $1 order by created_at desc limit 1",
        [rich.id],
      );
      check("compra gera transação no ledger", tx.type === "purchase" && tx.amount === -buyable.price && tx.balance_after === after);
      await expectError("não compra o mesmo item duas vezes", "select buy_item($1)", [buyable.id], "already_owned");
      await client.query("select equip_item($1::item_category, $2)", [buyable.category, buyable.id]);
      check(
        "equipar item comprado",
        Boolean(await one("select 1 from equipped_items where owner_id = $1 and item_id = $2", [rich.id, buyable.id])),
      );
      const wrongSlot = buyable.category === "weapon" ? "helmet" : "weapon";
      await expectError("não equipa no slot errado", "select equip_item($1::item_category, $2)", [wrongSlot, buyable.id], "wrong_slot");
    } else {
      console.log("• (nenhum item acessível na rotação para testar compra)");
    }
    const notOwned = await one<{ id: string }>(
      "select id from items where category = 'weapon' and id not in (select item_id from inventories where owner_id = $1) limit 1",
      [rich.id],
    );
    await expectError("não equipa item que não tem", "select equip_item('weapon', $1)", [notOwned.id], "not_owned");

    const finished = await one<{ id: string } | undefined>("select id from battles where status = 'finished' limit 1");
    if (finished) {
      check(
        "aluno lê eventos de batalha finalizada",
        Number((await one<{ n: string }>("select count(*) n from battle_events where battle_id = $1", [finished.id])).n) > 0,
      );
    }

    // ---------- poor student
    await as("authenticated", poor.id);
    const expensive = await one<{ id: string } | undefined>(
      "select id from items where id = any($1) and price > (select balance from wallets where owner_id = $2) limit 1",
      [rotation.item_ids, poor.id],
    );
    if (expensive) await expectError("saldo insuficiente bloqueia compra", "select buy_item($1)", [expensive.id], "insufficient_funds");

    // ---------- teacher (reads)
    await as("authenticated", teacher.id);
    check(
      "professor vê as carteiras da turma",
      Number((await one<{ n: string }>("select count(*) n from wallets")).n) === studentsInClass,
    );
    await expectError("professor também não altera saldo pelo navegador", "update wallets set balance = 1", [], "permission denied");

    // ---------- duels, XP and levels: students only read; the server writes through functions
    await as("authenticated", rich.id);
    await expectError("aluno não altera o próprio XP", "update pingo_progress set xp = 999999", [], "permission denied");
    await expectError(
      "aluno não insere duelo pelo navegador",
      "insert into duels (class_id, challenger_id, defender_id, winner_id, seed, engine_version, balance, snapshots, events, counted) values ($1, $2, $3, $2, 1, 'x', '{}', '[]', '[]', true)",
      [rich.class_id, rich.id, poor.id],
      "permission denied",
    );
    await expectError(
      "aluno não chama record_duel",
      "select record_duel($1, $2, $1, 1, 'x', '{}', '[]', '[]', 9999, 9999, 99, 0, array[1])",
      [rich.id, poor.id],
      "permission denied",
    );
    await expectError("aluno não chama spend_stat_point", "select spend_stat_point($1, 'atk', 1, 99)", [rich.id], "permission denied");

    await as("postgres");
    const duel = (interval: number) =>
      one<{ r: { xp_after: number; level_after: number; counted: boolean; xp_gained: number } }>(
        "select record_duel($1, $2, $1, 1, 'test', '{}', '[]', '[]', 30, 20, 12, $3, array[65, 190]) as r",
        [rich.id, poor.id, interval],
      );
    await client.query("delete from pingo_progress where owner_id = $1", [rich.id]);
    await client.query("delete from duels where challenger_id = $1", [rich.id]);
    const d1 = (await duel(0)).r;
    check("duelo vencido dá 30 XP", d1.xp_gained === 30 && d1.counted && d1.level_after === 1, JSON.stringify(d1));
    await duel(0);
    const d3 = (await duel(0)).r;
    check("sobe de nível ao passar do limite de XP", d3.xp_after === 90 && d3.level_after === 2, JSON.stringify(d3));
    await expectError("anti-spam: duelos em sequência rápida são bloqueados", "select record_duel($1, $2, $1, 1, 't', '{}', '[]', '[]', 30, 20, 12, 3600, array[65])", [rich.id, poor.id], "too_fast");
    await client.query("select spend_stat_point($1, 'hp', 1, 1)", [rich.id]);
    await expectError("não gasta mais pontos do que tem", "select spend_stat_point($1, 'hp', 1, 1)", [rich.id], "no_points");
    const limited = await one<{ r: { counted: boolean; xp_gained: number } }>(
      "select record_duel($1, $2, $1, 1, 'test', '{}', '[]', '[]', 30, 20, 3, 0, array[65]) as r",
      [rich.id, poor.id],
    );
    check("depois do limite diário o duelo é amistoso (0 XP)", !limited.r.counted && limited.r.xp_gained === 0, JSON.stringify(limited.r));

    const outsider = await one<{ id: string } | undefined>(
      "select id from profiles where class_id = $1 and role = 'student' and id not in ($2, $3) limit 1",
      [rich.class_id, rich.id, poor.id],
    );
    if (outsider) {
      await as("authenticated", outsider.id);
      check("colega não vê duelos dos outros", Number((await one<{ n: string }>("select count(*) n from duels")).n) === 0);
      check("colega vê o nível da turma", Number((await one<{ n: string }>("select count(*) n from pingo_progress")).n) >= 1);
    }
    await as("authenticated", rich.id);
    check("aluno vê os próprios duelos", Number((await one<{ n: string }>("select count(*) n from duels")).n) >= 4);
    await as("authenticated", teacher.id);
    check(
      "professor vê os duelos e níveis da turma",
      Number((await one<{ n: string }>("select count(*) n from duels where class_id = $1", [rich.class_id])).n) >= 4 &&
        Number((await one<{ n: string }>("select count(*) n from pingo_progress where owner_id = $1", [rich.id])).n) === 1,
    );

    // ---------- self sign-up: pending students see nothing of the class
    await as("authenticated", rich.id);
    await expectError(
      "aluno não cria contas pelo navegador (setup_profile)",
      "select setup_profile($1, $2, 'hacker', 'Hacker', 'teacher', 'x', false, false)",
      [rich.id, rich.class_id],
      "permission denied",
    );
    await as("postgres");
    await client.query("update profiles set pending = true, active = false where id = $1", [poor.id]);
    await as("authenticated", poor.id);
    const seen = Number((await one<{ n: string }>("select count(*) n from profiles")).n);
    check("aluno pendente só enxerga o próprio perfil", seen === 1, `${seen} perfil(is)`);
    check("aluno pendente não vê batalhas", Number((await one<{ n: string }>("select count(*) n from battles")).n) === 0);

    // ---------- server-only function (service role / postgres)
    await as("postgres");
    await expectError(
      "grant_coins não deixa saldo negativo",
      "select grant_coins($1, -999999, 'admin_adjustment', 'teste', $2)",
      [poor.id, teacher.id],
      "insufficient_funds",
    );
    const ledgerOk = await one<{ bad: string }>(
      `select count(*) bad from wallets w
        where w.balance <> coalesce((select sum(amount) from wallet_transactions t where t.owner_id = w.owner_id), 0)`,
    );
    check("saldo de todas as carteiras = soma do ledger", Number(ledgerOk.bad) === 0);
  } finally {
    await client.query("rollback");
    await client.end();
  }
  console.log(`\n${failed === 0 ? "✔" : "✖"} ${passed} ok, ${failed} falha(s). (Nenhuma alteração foi salva: rollback.)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
