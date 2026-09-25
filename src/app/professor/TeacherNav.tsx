"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/professor", label: "Visão geral", icon: "🏠" },
  { href: "/professor/alunos", label: "Alunos", icon: "👩‍🎓" },
  { href: "/professor/moedas", label: "Moedas", icon: "🪙" },
  { href: "/professor/loja", label: "Loja e catálogo", icon: "🛒" },
  { href: "/professor/batalhas", label: "Battle Royales", icon: "⚔️" },
  { href: "/professor/temporadas", label: "Temporadas", icon: "🏆" },
];

export function TeacherNav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/professor" ? pathname === href : pathname.startsWith(href));
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:sticky md:top-4 self-start" aria-label="Painel do professor">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold border-2 ${
            active(l.href) ? "bg-white border-ink shadow-[2px_2px_0_#231a2e]" : "border-transparent hover:bg-white"
          }`}
        >
          <span className="mr-1.5">{l.icon}</span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
