import Link from "next/link";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import { Card } from "@/components/ui/Card";
import { GAME } from "@/config/game";
import type { DuelRow } from "@/lib/db-types";
import { formatDateTime } from "@/lib/format";
import { NEW_PROGRESS } from "@/lib/levels";
import { lookFromPingo } from "@/lib/snapshot";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/server/auth";
import { schoolDay } from "@/server/duels";
import { getClassProgress, getClassmates } from "@/server/queries";

const MAX_ROWS = 1000;
const WEEKDAY = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" });

type Row = Pick<DuelRow, "id" | "challenger_id" | "defender_id" | "winner_id" | "xp_gained" | "counted" | "created_at">;

/** Teacher view of the 1v1 duels: is the class playing? who levels up? watch any duel. */
export default async function TeacherDuelsPage() {
  const session = await requireTeacher();
  const classId = session.profile.class_id;
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const supabase = await createClient();
  const [everyone, progress, { data }] = await Promise.all([
    getClassmates(classId),
    getClassProgress(),
    supabase
      .from("duels")
      .select("id, challenger_id, defender_id, winner_id, xp_gained, counted, created_at")
      .eq("class_id", classId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS)
      .returns<Row[]>(),
  ]);
  const duels = data ?? [];
  const students = everyone.filter((s) => s.profile.active && !s.profile.pending);
  const nameOf = new Map(everyone.map((s) => [s.profile.id, s.profile.display_name]));
  const today = schoolDay(new Date());

  // last 7 school days, oldest first
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 3600 * 1000);
    return { key: schoolDay(d), label: WEEKDAY.format(d).replace(".", "") };
  });
  const perDay = new Map(days.map((d) => [d.key, 0]));
  for (const d of duels) {
    const key = schoolDay(d.created_at);
    if (perDay.has(key)) perDay.set(key, perDay.get(key)! + 1);
  }
  const busiest = Math.max(1, ...perDay.values());

  const stats = students
    .map((s) => {
      const mine = duels.filter((d) => d.challenger_id === s.profile.id);
      const p = progress.get(s.profile.id) ?? NEW_PROGRESS;
      return {
        s,
        level: p.level,
        xp: p.xp,
        today: mine.filter((d) => schoolDay(d.created_at) === today).length,
        week: mine.length,
        wins: mine.filter((d) => d.winner_id === s.profile.id).length,
        last: mine[0]?.created_at ?? null,
      };
    })
    .sort((a, b) => b.level - a.level || b.xp - a.xp || b.week - a.week);
  const playedThisWeek = stats.filter((r) => r.week > 0).length;
  const duelsToday = perDay.get(today) ?? 0;

  return (
    <div className="grid gap-4">
      <h1 className="font-pixel text-3xl">🥊 Duelos</h1>
      <p className="text-sm text-muted -mt-2">
        Duelos 1 contra 1 que os alunos fazem sozinhos com &quot;Encontrar Batalha&quot;. Cada um ganha XP em até{" "}
        {GAME.duels.dailyXpDuels} duelos por dia.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="Duelos hoje">
          <p className="font-pixel text-4xl">{duelsToday}</p>
        </Card>
        <Card title="Últimos 7 dias">
          <p className="font-pixel text-4xl">{duels.length >= MAX_ROWS ? `${MAX_ROWS}+` : duels.length}</p>
        </Card>
        <Card title="Alunos que jogaram na semana">
          <p className="font-pixel text-4xl">
            {playedThisWeek}
            <span className="text-xl text-muted">/{students.length}</span>
          </p>
        </Card>
      </div>

      <Card title="📅 Duelos por dia">
        <div className="flex items-end gap-2 h-36">
          {days.map((d) => {
            const n = perDay.get(d.key) ?? 0;
            return (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="font-pixel text-sm">{n}</span>
                <div
                  className={`w-full rounded-t-md border-2 border-ink ${d.key === today ? "bg-bubble" : "bg-mint"}`}
                  style={{ height: `${Math.max(4, (n / busiest) * 100)}%` }}
                />
                <span className="text-xs text-muted capitalize">{d.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="⭐ Nível e engajamento por aluno">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-pixel border-b-2 border-ink">
                <th className="p-2">#</th>
                <th className="p-2">Aluno</th>
                <th className="p-2 text-right">Nível</th>
                <th className="p-2 text-right">XP</th>
                <th className="p-2 text-right">Hoje</th>
                <th className="p-2 text-right">7 dias</th>
                <th className="p-2 text-right">Vitórias</th>
                <th className="p-2">Último duelo</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((r, i) => (
                <tr key={r.s.profile.id} className="border-b border-ink/10">
                  <td className="p-2 font-pixel">{i + 1}</td>
                  <td className="p-2">
                    <Link href={`/professor/alunos/${r.s.profile.id}`} className="flex items-center gap-2 hover:underline">
                      <PingoAvatar look={lookFromPingo(r.s.pingo)} gear={r.s.loadout} size={32} animated={false} shadow={false} />
                      <span>
                        <b>{r.s.profile.display_name}</b>
                        <span className="block text-xs text-muted">{r.s.pingo?.name}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-2 text-right font-pixel text-lg">{r.level}</td>
                  <td className="p-2 text-right tabular-nums">{r.xp}</td>
                  <td className="p-2 text-right tabular-nums">
                    {r.today}
                    {r.today >= GAME.duels.dailyXpDuels && <span title="Chegou ao limite de XP do dia"> ✅</span>}
                  </td>
                  <td className="p-2 text-right tabular-nums">{r.week}</td>
                  <td className="p-2 text-right tabular-nums">{r.week ? `${Math.round((r.wins / r.week) * 100)}%` : "—"}</td>
                  <td className="p-2 text-xs text-muted">{r.last ? formatDateTime(r.last) : "nunca"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-2">
          &quot;Hoje&quot; e &quot;7 dias&quot; contam os duelos que o aluno começou. Vitórias = % desses duelos que ele venceu.
        </p>
      </Card>

      <Card title="🎬 Duelos recentes">
        {duels.length === 0 ? (
          <p className="text-sm text-muted">Nenhum duelo nos últimos 7 dias.</p>
        ) : (
          <ul className="grid gap-2">
            {duels.slice(0, 40).map((d) => {
              const challenger = nameOf.get(d.challenger_id) ?? "?";
              const defender = nameOf.get(d.defender_id) ?? "?";
              const winner = nameOf.get(d.winner_id) ?? "?";
              return (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 min-w-0">
                    <b>{challenger}</b> desafiou <b>{defender}</b> · 🏆 {winner}
                    {d.xp_gained > 0 ? (
                      <span className="text-leaf font-bold"> +{d.xp_gained} XP</span>
                    ) : (
                      !d.counted && <span className="text-muted"> (amistoso)</span>
                    )}
                    <span className="block text-xs text-muted">{formatDateTime(d.created_at)}</span>
                  </span>
                  <Link href={`/arena/duelo/${d.id}`} className="pixel-btn btn-small btn-white">
                    ▶ Assistir
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
