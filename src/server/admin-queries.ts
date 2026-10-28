import "server-only";
import type { ClassRow, ProfileRow } from "@/lib/db-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { schoolDay } from "@/server/duels";

/**
 * Reads for the general admin (/admin). They use the service-role client, which BYPASSES RLS
 * and sees every class: call them only after requireAdmin(). Nothing here writes.
 */

/** Supabase returns at most 1000 rows per request, so everything is read page by page. */
const PAGE = 1000;
const MAX_PAGES = 50;
const WEEKDAY = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" });

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function readAll<T>(page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE, i * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

type Person = Pick<ProfileRow, "id" | "class_id" | "display_name" | "username" | "role" | "active" | "pending">;
type Duel = { id: string; class_id: string; challenger_id: string; winner_id: string; created_at: string };

export interface DayBar {
  key: string;
  label: string;
  count: number;
  isToday: boolean;
}

/** Last 7 school days, oldest first, with how many duels each had. */
function perDay(duels: Duel[]): DayBar[] {
  const today = schoolDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 3600 * 1000);
    return { key: schoolDay(d), label: WEEKDAY.format(d).replace(".", ""), count: 0, isToday: false };
  });
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const d of duels) {
    const bar = byKey.get(schoolDay(d.created_at));
    if (bar) bar.count++;
  }
  for (const d of days) d.isToday = d.key === today;
  return days;
}

async function readSchool(classId?: string) {
  const db = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [classes, people, wallets, progress, duels] = await Promise.all([
    readAll<ClassRow>((a, b) => {
      const q = db.from("classes").select("*").order("created_at").order("id");
      return (classId ? q.eq("id", classId) : q).range(a, b);
    }),
    readAll<Person>((a, b) => {
      const q = db.from("profiles").select("id, class_id, display_name, username, role, active, pending").order("display_name").order("id");
      return (classId ? q.eq("class_id", classId) : q).range(a, b);
    }),
    readAll<{ owner_id: string; balance: number }>((a, b) => db.from("wallets").select("owner_id, balance").order("owner_id").range(a, b)),
    readAll<{ owner_id: string; level: number; xp: number }>((a, b) =>
      db.from("pingo_progress").select("owner_id, level, xp").order("owner_id").range(a, b),
    ),
    readAll<Duel>((a, b) => {
      const q = db
        .from("duels")
        .select("id, class_id, challenger_id, winner_id, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .order("id");
      return (classId ? q.eq("class_id", classId) : q).range(a, b);
    }),
  ]);
  return {
    classes,
    people,
    coins: new Map(wallets.map((w) => [w.owner_id, w.balance])),
    progress: new Map(progress.map((p) => [p.owner_id, p])),
    duels,
  };
}

const isStudent = (p: Person) => p.role === "student" && p.active && !p.pending;

export interface ClassSummary {
  id: string;
  name: string;
  teachers: string[];
  students: number;
  pending: number;
  playedWeek: number;
  duelsToday: number;
  duelsWeek: number;
  coins: number;
  avgLevel: number;
  lastDuel: string | null;
}

/** Every class side by side, plus school-wide totals. */
export async function getSchoolOverview() {
  const { classes, people, coins, progress, duels } = await readSchool();
  const today = schoolDay(new Date());

  const summaries: ClassSummary[] = classes.map((c) => {
    const mine = people.filter((p) => p.class_id === c.id);
    const students = mine.filter(isStudent);
    const classDuels = duels.filter((d) => d.class_id === c.id);
    const levels = students.map((s) => progress.get(s.id)?.level ?? 1);
    return {
      id: c.id,
      name: c.name,
      teachers: mine.filter((p) => p.role === "teacher").map((p) => p.display_name),
      students: students.length,
      pending: mine.filter((p) => p.pending).length,
      playedWeek: new Set(classDuels.map((d) => d.challenger_id)).size,
      duelsToday: classDuels.filter((d) => schoolDay(d.created_at) === today).length,
      duelsWeek: classDuels.length,
      coins: students.reduce((sum, s) => sum + (coins.get(s.id) ?? 0), 0),
      avgLevel: levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0,
      lastDuel: classDuels[0]?.created_at ?? null,
    };
  });

  return {
    classes: summaries,
    totals: {
      classes: summaries.length,
      teachers: people.filter((p) => p.role === "teacher" && p.active).length,
      students: summaries.reduce((s, c) => s + c.students, 0),
      playedWeek: summaries.reduce((s, c) => s + c.playedWeek, 0),
      duelsToday: summaries.reduce((s, c) => s + c.duelsToday, 0),
      duelsWeek: duels.length,
    },
    days: perDay(duels),
  };
}

/** One class in detail: the same numbers its teacher sees, student by student. */
export async function getClassDetail(classId: string) {
  const { classes, people, coins, progress, duels } = await readSchool(classId);
  const klass = classes[0];
  if (!klass) return null;
  const today = schoolDay(new Date());

  const students = people
    .filter(isStudent)
    .map((s) => {
      const mine = duels.filter((d) => d.challenger_id === s.id);
      const p = progress.get(s.id);
      return {
        id: s.id,
        name: s.display_name,
        username: s.username,
        level: p?.level ?? 1,
        xp: p?.xp ?? 0,
        coins: coins.get(s.id) ?? 0,
        today: mine.filter((d) => schoolDay(d.created_at) === today).length,
        week: mine.length,
        wins: mine.filter((d) => d.winner_id === s.id).length,
        last: mine[0]?.created_at ?? null,
      };
    })
    .sort((a, b) => b.level - a.level || b.xp - a.xp || b.week - a.week);

  return {
    klass,
    teachers: people.filter((p) => p.role === "teacher").map((p) => p.display_name),
    pending: people.filter((p) => p.pending).map((p) => p.display_name),
    inactive: people.filter((p) => p.role === "student" && !p.active && !p.pending).length,
    students,
    duelsToday: duels.filter((d) => schoolDay(d.created_at) === today).length,
    duelsWeek: duels.length,
    days: perDay(duels),
  };
}
