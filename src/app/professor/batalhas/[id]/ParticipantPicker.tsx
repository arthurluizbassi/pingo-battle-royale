"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { setParticipant } from "@/server/actions/teacher";

export function ParticipantPicker({
  battleId,
  students,
  enrolled,
}: {
  battleId: string;
  students: Array<{ id: string; name: string; pingo: string }>;
  enrolled: string[];
}) {
  const [optimistic, setOptimistic] = useOptimistic(new Set(enrolled), (state, change: { id: string; on: boolean }) => {
    const next = new Set(state);
    if (change.on) next.add(change.id);
    else next.delete(change.id);
    return next;
  });
  const [, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (id: string) =>
    startTransition(async () => {
      const on = !optimistic.has(id);
      setOptimistic({ id, on });
      await setParticipant(battleId, id, on);
      router.refresh();
    });

  return (
    <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
      {students.map((s) => (
        <li key={s.id}>
          <label
            className={`flex items-center gap-2 rounded-md border-2 px-2 py-1.5 cursor-pointer ${
              optimistic.has(s.id) ? "border-ink bg-[#e5f8e2]" : "border-ink/20 bg-white"
            }`}
          >
            <input type="checkbox" className="w-5 h-5" checked={optimistic.has(s.id)} onChange={() => toggle(s.id)} />
            <span className="font-semibold">{s.name}</span>
            <span className="text-xs text-muted ml-auto">{s.pingo}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
