import { BALANCE, STAT_KEYS, type Stats } from "@/engine";
import { STAT_LABEL, STAT_NAME, formatStat } from "@/lib/format";

const BAR_COLOR: Record<string, string> = {
  hp: "#4fbf5a",
  atk: "#e84a4a",
  def: "#5aa9f0",
  spd: "#34c6b8",
  crit: "#ffd23f",
  dodge: "#7b5cff",
};

/** Stats with bars; with `compare`, shows "before → after" and colors the difference. */
export function StatTable({ stats, compare, compact = false }: { stats: Stats; compare?: Stats; compact?: boolean }) {
  return (
    <div className="grid gap-1.5">
      {STAT_KEYS.map((key) => {
        const [min, max] = BALANCE.caps[key];
        const value = compare ? compare[key] : stats[key];
        const before = stats[key];
        const diff = compare ? value - before : 0;
        const width = Math.max(4, Math.min(100, ((value - min) / (max - min)) * 100));
        const diffColor = diff > 0.0001 ? "text-leaf" : diff < -0.0001 ? "text-tomato" : "text-muted";
        return (
          <div key={key} className="grid grid-cols-[3.2rem_1fr_auto] items-center gap-2" title={STAT_NAME[key]}>
            <span className="font-pixel text-sm">{STAT_LABEL[key]}</span>
            <div className="h-3 pixel-inset overflow-hidden" style={{ borderWidth: 2 }}>
              <div className="h-full" style={{ width: `${width}%`, background: BAR_COLOR[key] }} />
            </div>
            <span className={`font-pixel text-sm tabular-nums text-right ${compact ? "min-w-10" : "min-w-24"}`}>
              {compare && Math.abs(diff) > 0.0001 ? (
                <>
                  <span className="text-muted">{formatStat(key, before)}</span> →{" "}
                  <span className={diffColor}>{formatStat(key, value)}</span>
                </>
              ) : (
                formatStat(key, value)
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
