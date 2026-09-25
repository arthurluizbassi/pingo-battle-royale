import Link from "next/link";
import { ItemIcon } from "@/components/pingo/ItemIcon";
import { PingoAvatar } from "@/components/pingo/PingoAvatar";
import type { ParticipantRow, ProfileRow } from "@/lib/db-types";

const MEDAL = ["🥇", "🥈", "🥉"];

/** Post-battle stats. `showPower` is teacher-only (power score is an analysis tool, not a student stat). */
export function ResultsTable({
  rows,
  showPower = false,
}: {
  rows: Array<{ row: ParticipantRow; profile: Pick<ProfileRow, "username" | "display_name"> | null }>;
  showPower?: boolean;
}) {
  const sorted = [...rows].sort((a, b) => (a.row.placement ?? 999) - (b.row.placement ?? 999));
  const nameOf = (id: string | null) => rows.find((r) => r.row.profile_id === id)?.row.snapshot?.pingoName ?? "a zona";
  return (
    <div className="pixel-panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-sun font-pixel">
          <tr className="text-left">
            <th className="p-2">#</th>
            <th className="p-2">Pingo</th>
            <th className="p-2">Equipamentos</th>
            <th className="p-2 text-right" title="Eliminações">💀</th>
            <th className="p-2 text-right" title="Dano causado">Dano</th>
            <th className="p-2 text-right" title="Dano recebido">Recebido</th>
            <th className="p-2 text-right" title="Críticos">Crít.</th>
            <th className="p-2 text-right" title="Esquivas">Esq.</th>
            {showPower && <th className="p-2 text-right" title="Power score estimado antes da batalha">Power</th>}
            <th className="p-2">Eliminado por</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ row, profile }) => {
            const snap = row.snapshot;
            return (
              <tr key={row.profile_id} className={`border-t-2 border-ink/10 ${row.placement === 1 ? "bg-[#fff6c9]" : ""}`}>
                <td className="p-2 font-pixel text-lg">{MEDAL[(row.placement ?? 0) - 1] ?? `${row.placement}º`}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {snap && (
                      <PingoAvatar
                        look={snap.look}
                        gear={Object.fromEntries(snap.items.map((i) => [i.category, i.sprite]))}
                        size={44}
                        animated={false}
                        shadow={false}
                      />
                    )}
                    <div>
                      <div className="font-bold leading-tight">{snap?.pingoName}</div>
                      {profile && (
                        <Link href={`/perfil/${profile.username}`} className="text-xs text-muted underline">
                          {profile.display_name}
                        </Link>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex gap-1">
                    {snap?.items.map((i) => <ItemIcon key={i.id} category={i.category} sprite={i.sprite} size={24} name={i.name} />)}
                    {snap?.items.length === 0 && <span className="text-xs text-muted">nenhum</span>}
                  </div>
                </td>
                <td className="p-2 text-right font-pixel">{row.kills}</td>
                <td className="p-2 text-right tabular-nums">{row.damage_dealt}</td>
                <td className="p-2 text-right tabular-nums">{row.damage_taken}</td>
                <td className="p-2 text-right tabular-nums">{row.crits}</td>
                <td className="p-2 text-right tabular-nums">{row.dodges}</td>
                {showPower && <td className="p-2 text-right tabular-nums">{row.power_score}</td>}
                <td className="p-2 text-xs">{row.placement === 1 ? "—" : nameOf(row.eliminated_by)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
