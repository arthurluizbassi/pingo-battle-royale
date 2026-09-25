/** Plain admin card for the teacher panel (less "game", more legible). */
export function Card({ title, children, actions, className = "" }: { title?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-lg border-2 border-ink/80 shadow-[3px_3px_0_#231a2e] p-4 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {title && <h2 className="font-pixel text-lg">{title}</h2>}
          {actions && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Feedback({ result }: { result: { ok: boolean; text: string } | null }) {
  if (!result) return null;
  return (
    <p role="status" className={`text-sm font-bold ${result.ok ? "text-leaf" : "text-tomato"}`}>
      {result.ok ? "✅" : "⚠️"} {result.text}
    </p>
  );
}

export const inputClass = "border-2 border-ink/70 rounded-md px-2 py-1.5 bg-white w-full";
