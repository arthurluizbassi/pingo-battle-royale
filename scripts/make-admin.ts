/**
 * Turns an existing account into a general admin (sees every class at /admin, read-only).
 *
 *   npm run make-admin -- --username prof.arthur
 *   npm run make-admin -- --username prof.arthur --remove
 */
import { scriptAdminClient } from "./lib/admin";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const username = arg("username")?.trim().toLowerCase();
  const remove = process.argv.includes("--remove");
  if (!username) {
    console.error("Uso: npm run make-admin -- --username prof.arthur [--remove]");
    process.exit(1);
  }
  const admin = scriptAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ is_admin: !remove })
    .eq("username", username)
    .select("display_name, role")
    .maybeSingle();
  if (error) throw new Error(`${error.message} (rodou npm run db:migrate?)`);
  if (!data) throw new Error(`Nenhuma conta com o usuário "${username}".`);
  console.log(remove ? `\n✔ ${data.display_name} não é mais admin.\n` : `\n✔ ${data.display_name} agora é admin geral. Entre em /admin.\n`);
}

main().catch((e) => {
  console.error(`✖ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
