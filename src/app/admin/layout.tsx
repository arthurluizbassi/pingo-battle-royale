import Link from "next/link";
import { logout } from "@/server/actions/auth";
import { requireAdmin } from "@/server/auth";
import { Icon } from "@/components/pixel/Icon";

/** General admin: sees every class, read-only. Only profiles with is_admin get past requireAdmin. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="min-h-screen bg-[#f6f3ec]">
      <header className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-3">
          <Link href="/admin" className="font-pixel text-lg whitespace-nowrap">
            Pingo <span className="text-sun">Royale</span> <span className="text-xs opacity-70">· Admin</span>
          </Link>
          {session.profile.role === "teacher" && (
            <Link href="/professor" className="ml-auto pixel-btn btn-small">
              <Icon name="student" /> Minha turma
            </Link>
          )}
          <span className={`${session.profile.role === "teacher" ? "" : "ml-auto "}hidden sm:inline text-sm opacity-80`}>
            {session.profile.display_name}
          </span>
          <form action={logout}>
            <button className="pixel-btn btn-small btn-white">Sair</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4 min-w-0">{children}</main>
    </div>
  );
}
