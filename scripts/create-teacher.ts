/**
 * Creates a teacher account (and its class if needed). Use this in production.
 *
 *   npm run create-teacher -- --username prof.ana --name "Prof. Ana" --class "7º Ano B"
 *
 * The temporary password is printed ONCE; the teacher must change it at first login.
 */
import { GAME } from "@/config/game";
import { generateTempPassword } from "@/lib/passwords";
import { scriptAdminClient } from "./lib/admin";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const username = arg("username")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const className = arg("class")?.trim() || "Minha Turma";
  if (!username || !name || !/^[a-z0-9._-]{3,32}$/.test(username)) {
    console.error('Uso: npm run create-teacher -- --username prof.ana --name "Prof. Ana" [--class "7º Ano B"]');
    process.exit(1);
  }
  const admin = scriptAdminClient();

  let { data: klass } = await admin.from("classes").select("*").eq("name", className).maybeSingle();
  if (!klass) ({ data: klass } = await admin.from("classes").insert({ name: className }).select("*").single());
  if (!klass) throw new Error("Não consegui criar a turma. Rodou npm run db:migrate?");

  const password = generateTempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: `${username}@${GAME.auth.usernameEmailDomain}`,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Falha ao criar usuário");
  const { error: setupError } = await admin.rpc("setup_profile", {
    p_user_id: data.user.id,
    p_class_id: klass.id,
    p_username: username,
    p_display_name: name,
    p_role: "teacher",
    p_pingo_name: name,
    p_must_change_password: true,
  });
  if (setupError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(setupError.message);
  }
  await admin.from("seasons").insert({ class_id: klass.id, name: "Temporada 1" }).then(() => undefined, () => undefined);

  console.log(`\n✔ Professor criado na turma "${klass.name}".`);
  console.log(`  usuário: ${username}`);
  console.log(`  senha temporária: ${password}   (troca obrigatória no primeiro acesso)\n`);
}

main().catch((e) => {
  console.error(`✖ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
