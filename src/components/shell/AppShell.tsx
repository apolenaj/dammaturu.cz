"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { NavLinkList } from "@/components/navigation/NavLinkList";
import {
  appPrimaryNav,
  appSecondaryNav,
} from "@/lib/navigation";

export function AppSidebar() {
  return (
    <aside
      className="hidden w-60 shrink-0 flex-col border-r border-line bg-paper-raised/70 px-3 py-5 lg:flex"
      aria-label="Hlavní navigace"
    >
      <div className="px-2 pb-6">
        <BrandMark href="/app/dashboard" size="sm" />
        <p className="mt-1 text-xs text-ink-muted">Studijní prostor</p>
      </div>

      <nav aria-label="Primární" className="flex-1">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Hlavní
        </p>
        <NavLinkList items={appPrimaryNav} variant="sidebar" />

        <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Další
        </p>
        <NavLinkList items={appSecondaryNav} variant="sidebar" />
      </nav>

      <div className="mt-auto border-t border-line px-2 pt-4">
        <Link
          href="/"
          className="block rounded-lg px-3 py-2 text-sm text-ink-muted transition hover:bg-ink-soft/60 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Veřejný web
        </Link>
      </div>
    </aside>
  );
}

export function AppBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Primární mobilní navigace"
    >
      <NavLinkList
        items={appPrimaryNav}
        variant="bottom"
        showShortLabel
        className="px-1 pt-1"
      />
    </nav>
  );
}

export function AppMobileHeader() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper-raised/90 backdrop-blur-md lg:hidden">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4">
        <BrandMark href="/app/dashboard" size="sm" />
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line text-sm font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Zavřít" : "Víc"}
        </button>
      </div>
      {open ? (
        <div
          id={panelId}
          className="border-t border-line bg-paper-raised px-3 py-3"
        >
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Další sekce
          </p>
          <NavLinkList
            items={appSecondaryNav}
            variant="sidebar"
            onNavigate={() => setOpen(false)}
          />
        </div>
      ) : null}
    </header>
  );
}
