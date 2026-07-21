import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { PublicNav } from "@/components/navigation/PublicNav";

export function PublicHeader() {
  return (
    <header className="relative sticky top-0 z-30 border-b border-line/80 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandMark size="sm" />
        <PublicNav />
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/prihlaseni"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ink-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Přihlášení
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex min-h-11 items-center rounded-lg bg-action px-3.5 text-sm font-semibold text-fg-on-brand transition hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Zjistit připravenost
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
              Víš přesně, co se naučit. A víš, kdy jsi připraven.
            </p>
          </div>
          <nav aria-label="Patička" className="flex flex-wrap gap-x-4 gap-y-2 text-body-sm">
            <Link href="/jak-to-funguje" className="text-fg-secondary hover:text-fg">
              Jak to funguje
            </Link>
            <Link href="/maturitni-priprava" className="text-fg-secondary hover:text-fg">
              Maturitní příprava
            </Link>
            <Link href="/#faq" className="text-fg-secondary hover:text-fg">
              FAQ
            </Link>
            <Link href="/onboarding" className="text-fg-secondary hover:text-fg">
              Začít
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
