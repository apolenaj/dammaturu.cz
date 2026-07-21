import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { NavLinkList } from "@/components/navigation/NavLinkList";
import { adminNav } from "@/lib/navigation";
import { adminLogoutAction } from "@/server/actions/admin-auth";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-paper-wash text-ink">
      <aside
        className="hidden w-56 shrink-0 flex-col border-r border-line bg-paper-raised/80 px-3 py-5 md:flex"
        aria-label="Admin navigace"
      >
        <div className="px-2 pb-5">
          <BrandMark href="/admin/content" size="sm" />
          <p className="mt-1 text-xs text-ink-muted">Administrace</p>
        </div>
        <nav aria-label="Admin">
          <NavLinkList items={adminNav} variant="admin" />
        </nav>
        <div className="mt-auto space-y-1">
          <Link
            href="/app/dashboard"
            className="block rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-ink-soft/60 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Zpět do appky
          </Link>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-muted hover:bg-ink-soft/60 hover:text-ink"
            >
              Odhlásit admin
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-paper-raised/90 px-4 py-3 md:hidden">
          <BrandMark href="/admin/content" size="sm" />
          <nav className="mt-3 overflow-x-auto" aria-label="Admin mobilní">
            <NavLinkList
              items={adminNav}
              orientation="horizontal"
              variant="top"
              className="min-w-max"
            />
          </nav>
        </header>
        <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
