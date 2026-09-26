/**
 * Quick connectivity check of the Supabase Data API (no data is written).
 *   npx tsx scripts/smoke-api.ts
 */
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./lib/env";

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const server = createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const browser = createClient(url, requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), { auth: { persistSession: false } });

  const s = await server.from("classes").select("id", { count: "exact", head: true });
  console.log(s.error ? `✖ servidor não lê tabelas: ${s.error.message}` : "✔ servidor (chave secreta) acessa as tabelas");

  const b = await browser.from("wallets").select("owner_id");
  console.log(b.error ? `✔ visitante anônimo bloqueado (${b.error.code})` : `✔ visitante anônimo não vê carteiras (${b.data?.length ?? 0} linhas)`);

  const rpc = await browser.rpc("buy_item", { p_item_id: "cardboard_sword" });
  console.log(rpc.error ? `✔ anônimo não consegue comprar (${rpc.error.message.slice(0, 60)})` : "✖ anônimo conseguiu chamar buy_item!");

  const admin = await server.auth.admin.listUsers({ page: 1, perPage: 1 });
  console.log(admin.error ? `✖ admin de autenticação falhou: ${admin.error.message}` : "✔ servidor pode administrar contas");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
