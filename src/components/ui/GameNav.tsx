"use client";

import Link from "next/link";
import { Icon } from "@/components/pixel/Icon";
import type { IconName } from "@/sprites/icons";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/db-types";

const STUDENT_LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/pingo", label: "Meu Pingo", icon: "pingoFace" },
  { href: "/loja", label: "Loja", icon: "cart" },
  { href: "/inventario", label: "Inventário", icon: "backpack" },
  { href: "/arena", label: "Arena", icon: "swords" },
  { href: "/ranking", label: "Ranking", icon: "trophy" },
  { href: "/historico", label: "Histórico", icon: "scroll" },
];

const TEACHER_LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/arena", label: "Arena", icon: "swords" },
  { href: "/ranking", label: "Ranking", icon: "trophy" },
];

/** Top tabs on desktop, bottom tab bar on phones. */
export function GameNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = role === "teacher" ? TEACHER_LINKS : STUDENT_LINKS;
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Navegação principal">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`font-pixel text-sm px-3 py-1.5 rounded border-2 transition-colors ${
              active(l.href) ? "bg-white border-ink shadow-[0_2px_0_#231a2e]" : "border-transparent hover:bg-white/60"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sun border-t-[3px] border-ink grid"
        style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
        aria-label="Navegação principal"
      >
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center justify-center py-1.5 font-pixel text-[10px] leading-tight ${
              active(l.href) ? "bg-white" : ""
            }`}
          >
            <Icon name={l.icon} size={20} />
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
