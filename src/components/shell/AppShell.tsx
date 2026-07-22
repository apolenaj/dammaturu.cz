"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { NavLinkList } from "@/components/navigation/NavLinkList";
import {
  getVisiblePrimaryNav,
  getVisibleSecondaryNav,
} from "@/lib/navigation";

export function AppSidebar() {
  const primary = getVisiblePrimaryNav();
  const secondary = getVisibleSecondaryNav();

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
        <NavLinkList items={primary} variant="sidebar" />

        {secondary.length > 0 ? (
          <>
            <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Další
            </p>
            <NavLinkList items={secondary} variant="sidebar" />
          </>
        ) : null}
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
  const primary = getVisiblePrimaryNav();
  if (primary.length === 0) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgba(15,23,36,0.06)] backdrop-blur-xl lg:hidden"
      aria-label="Primární mobilní navigace"
    >
      <NavLinkList
        items={primary}
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
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const secondary = getVisibleSecondaryNav();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtnRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper-raised/95 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4">
        <BrandMark href="/app/dashboard" size="sm" />
        {secondary.length > 0 ? (
          <button
            ref={menuBtnRef}
            type="button"
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Zavřít" : "Víc"}
          </button>
        ) : null}
      </div>
      {open && secondary.length > 0 ? (
        <div
          id={panelId}
          className="border-t border-line bg-paper-raised px-3 py-3"
          role="region"
          aria-label="Další navigace"
        >
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Další
          </p>
          <NavLinkList
            items={secondary}
            variant="sidebar"
            onNavigate={() => setOpen(false)}
          />
        </div>
      ) : null}
    </header>
  );
}
