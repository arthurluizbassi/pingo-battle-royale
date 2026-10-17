import Link from "next/link";
import { logout } from "@/server/actions/auth";
import { requireTeacher } from "@/server/auth";
import { syncCatalogIfNeeded } from "@/server/catalog";
import { TeacherNav } from "./TeacherNav";
import { Icon } from "@/components/pixel/Icon";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireTeacher();
  await syncCatalogIfNeeded();
  return (
    <div className="min-h-screen bg-[#f6f3ec]">
      <header className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-3">
          <Link href="/professor" className="font-pixel text-lg whitespace-nowrap">
            Pingo <span className="text-sun">Royale</span> <span className="text-xs opacity-70">· Professor</span>
          </Link>
          <Link href="/arena" className="ml-auto pixel-btn btn-small">
            <Icon name="swords" /> Arena (projetor)
          </Link>
          <span className="hidden sm:inline text-sm opacity-80">{session.profile.display_name}</span>
          <form action={logout}>
            <button className="pixel-btn btn-small btn-white">Sair</button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-4 grid gap-4 md:grid-cols-[200px_1fr]">
        <TeacherNav />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
