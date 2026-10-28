import type { DayBar } from "@/server/admin-queries";

/** Bar chart of duels per day (same look as the teacher's /professor/duelos). */
export function DuelsPerDay({ days }: { days: DayBar[] }) {
  const busiest = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex items-end gap-2 h-36">
      {days.map((d) => (
        <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <span className="font-pixel text-sm">{d.count}</span>
          <div
            className={`w-full rounded-t-md border-2 border-ink ${d.isToday ? "bg-bubble" : "bg-mint"}`}
            style={{ height: `${Math.max(4, (d.count / busiest) * 100)}%` }}
          />
          <span className="text-xs text-muted capitalize">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
