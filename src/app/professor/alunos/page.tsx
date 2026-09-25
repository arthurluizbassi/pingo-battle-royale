import Link from "next/link";
import { ItemIcon } from "@/components/pingo/ItemIcon";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { Card } from "@/components/ui/Card";
import { Coins } from "@/components/ui/Coins";
import { getItem } from "@/content/items";
import { lookFromPingo } from "@/lib/snapshot";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/server/auth";
import { getClassmates } from "@/server/queries";
import { CreateStudentForm } from "./CreateStudentForm";

export default async function StudentsPage() {
  const session = await requireTeacher();
  const students = await getClassmates(session.profile.class_id);
  const supabase = await createClient();
  const { data: wallets } = await supabase.from("wallets").select("owner_id, balance");
  const balance = (id: string) => (wallets ?? []).find((w) => w.owner_id === id)?.balance ?? 0;

  return (
    <div className="grid gap-4">
      <h1 className="font-pixel text-3xl">👩‍🎓 Alunos</h1>
      <Card title="Novo aluno">
        <CreateStudentForm />
      </Card>
      <Card title={`Turma (${students.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b-2 border-ink font-pixel">
                <th className="p-2">Pingo</th>
                <th className="p-2">Aluno</th>
                <th className="p-2">Usuário</th>
                <th className="p-2 text-right">Saldo</th>
                <th className="p-2">Loadout</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(({ profile, pingo, loadout }) => (
                <tr key={profile.id} className={`border-b border-ink/10 ${profile.active ? "" : "opacity-50"}`}>
                  <td className="p-1">
                    <PingoAvatar look={lookFromPingo(pingo)} gear={loadout} size={44} animated={false} shadow={false} />
                  </td>
                  <td className="p-2">
                    <Link href={`/professor/alunos/${profile.id}`} className="font-bold underline">
                      {profile.display_name}
                    </Link>
                    <div className="text-xs text-muted">{pingo?.name}</div>
                  </td>
                  <td className="p-2 font-mono text-xs">{profile.username}</td>
                  <td className="p-2 text-right">
                    <Coins amount={balance(profile.id)} size="sm" />
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      {(["weapon", "helmet", "outfit"] as const).map((slot) => {
                        const item = getItem(loadout[slot]);
                        return item ? <ItemIcon key={slot} category={slot} sprite={item.sprite} size={22} name={item.name} /> : null;
                      })}
                    </div>
                  </td>
                  <td className="p-2 text-xs">
                    {!profile.active ? "desativado" : profile.must_change_password ? "senha temporária" : "ativo"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
