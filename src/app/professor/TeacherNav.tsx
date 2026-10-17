"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/pixel/Icon";
import type { IconName } from "@/sprites/icons";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/professor", label: "Visão geral", icon: "house" },
  { href: "/professor/alunos", label: "Alunos", icon: "student" },
  { href: "/professor/moedas", label: "Moedas", icon: "coinBag" },
  { href: "/professor/loja", label: "Loja e catálogo", icon: "cart" },
  { href: "/professor/batalhas", label: "Battle Royales", icon: "swords" },
  { href: "/professor/duelos", label: "Duelos", icon: "boxingGlove" },
  { href: "/professor/temporadas", label: "Temporadas", icon: "trophy" },
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
          <Icon name={l.icon} className="mr-1.5" />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
