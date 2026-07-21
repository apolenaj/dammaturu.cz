"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { NavLinkList } from "@/components/navigation/NavLinkList";
import { publicNav } from "@/lib/navigation";

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <>
      <nav className="hidden md:block" aria-label="Veřejná navigace">
        <NavLinkList items={publicNav} orientation="horizontal" variant="top" />
      </nav>

      <div className="md:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line px-3 text-sm font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
        {open ? (
          <div
            id={panelId}
            className="absolute inset-x-0 top-full border-b border-line bg-paper-raised px-4 py-3 shadow-soft"
          >
            <NavLinkList
              items={publicNav}
              variant="sidebar"
              onNavigate={() => setOpen(false)}
            />
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
              <Link
                href="/prihlaseni"
                className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted"
                onClick={() => setOpen(false)}
              >
                Přihlášení
              </Link>
              <Link
                href="/registrace"
                className="min-h-11 rounded-md bg-action px-3 py-2 text-center text-sm font-semibold text-fg-on-brand"
                onClick={() => setOpen(false)}
              >
                Registrace
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
