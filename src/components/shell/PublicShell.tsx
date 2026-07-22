import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { PublicNav } from "@/components/navigation/PublicNav";

export function PublicHeader() {
  return (
    <header className="relative sticky top-0 z-30 overflow-x-clip border-b border-line/80 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 shrink-0">
          <BrandMark size="sm" />
        </div>
        <PublicNav />
        {/* lg+: full auth; below that auth lives in the mobile/tablet menu */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Link
            href="/prihlaseni"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Přihlášení
          </Link>
          <Link
            href="/registrace"
            className="inline-flex min-h-11 items-center rounded-lg bg-action px-3.5 text-sm font-semibold text-fg-on-brand transition hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Registrace
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <BrandMark size="sm" />
            <p className="mt-2 max-w-sm text-body-sm text-fg-muted">
              Víš, co se naučit. Víš, co už umíš.
            </p>
          </div>
          <nav aria-label="Patička" className="flex flex-wrap gap-x-4 gap-y-2 text-body-sm">
            <Link href="/priprava" className="text-fg-secondary hover:text-fg">
              Příprava k maturitě
            </Link>
            <Link href="/priprava/narodni-obrozeni" className="text-fg-secondary hover:text-fg">
              Národní obrození
            </Link>
            <Link href="/priprava/romantismus" className="text-fg-secondary hover:text-fg">
              Romantismus
            </Link>
            <Link href="/jak-to-funguje" className="text-fg-secondary hover:text-fg">
              Jak to funguje
            </Link>
            <Link href="/maturitni-priprava" className="text-fg-secondary hover:text-fg">
              Maturitní příprava
            </Link>
            <Link href="/cenik" className="text-fg-secondary hover:text-fg">
              Ceník
            </Link>
            <Link href="/#faq" className="text-fg-secondary hover:text-fg">
              FAQ
            </Link>
            <Link href="/app/learn" className="text-fg-secondary hover:text-fg">
              Začít se učit
            </Link>
          </nav>
        </div>
        <p className="text-caption text-fg-muted">
          © {new Date().getFullYear()} DámMaturu.cz
        </p>
      </div>
    </footer>
  );
}
