"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <span className="font-pixel">…</span>;
  const diff = new Date(to).getTime() - now;
  if (diff <= 0) return <span className="font-pixel text-tomato">É hoje! A qualquer momento…</span>;
  const { d, h, m, s } = parts(diff);
  const cell = (value: number, label: string) => (
    <span className="pixel-inset bg-white px-2 py-1 text-center min-w-12">
      <span className="font-pixel text-xl tabular-nums block leading-none">{String(value).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase text-muted">{label}</span>
    </span>
  );
  return (
    <span className="inline-flex gap-1.5">
      {cell(d, "dias")}
      {cell(h, "horas")}
      {cell(m, "min")}
      {cell(s, "seg")}
    </span>
  );
}
