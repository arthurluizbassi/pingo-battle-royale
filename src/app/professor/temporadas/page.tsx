import { Card } from "@/components/ui/Card";
import type { SeasonRow } from "@/lib/db-types";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/server/auth";
import { SeasonControls } from "./SeasonControls";

export default async function SeasonsPage() {
  const session = await requireTeacher();
  const supabase = await createClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .eq("class_id", session.profile.class_id)
    .order("starts_at", { ascending: false })
    .returns<SeasonRow[]>();
  const active = (seasons ?? []).find((s) => s.active) ?? null;

  return (
    <div className="grid gap-4">
      <h1 className="font-pixel text-3xl">🏆 Temporadas</h1>
      <Card title="Temporada ativa">
        <SeasonControls active={active ? { id: active.id, name: active.name } : null} suggestedName={`Temporada ${(seasons?.length ?? 0) + 1}`} />
        <p className="text-xs text-muted mt-2">
          Cada Battle Royale criado entra na temporada ativa. Ao encerrar, o líder do ranking ganha um troféu 👑 (só cosmético).
        </p>
      </Card>
      <Card title="Todas as temporadas">
        <ul className="grid gap-1 text-sm">
          {(seasons ?? []).map((s) => (
            <li key={s.id} className="flex gap-2">
              <b>{s.name}</b>
              <span className="text-muted">
                {formatDateTime(s.starts_at)} → {s.ends_at ? formatDateTime(s.ends_at) : "em andamento"}
              </span>
              {s.active && <span className="pixel-chip bg-leaf text-white">ativa</span>}
            </li>
          ))}
          {(seasons ?? []).length === 0 && <li className="text-muted">Nenhuma temporada criada.</li>}
        </ul>
      </Card>
    </div>
  );
}
