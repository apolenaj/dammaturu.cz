"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ExternalLink, Menu, X } from "lucide-react";

const navLinks = [
  { href: "#jak-to-funguje", label: "Jak to funguje" },
  { href: "#materialy", label: "Materiály" },
  { href: "#funkce", label: "Funkce" },
  { href: "/cenik", label: "Ceník" },
  { href: "#o-nas", label: "O nás" },
] as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070913]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1.5 text-lg font-bold tracking-tight text-white"
          aria-label="DámMaturu — domů"
        >
          DámMaturu
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.6)]">
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          </span>
        </Link>

        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Hlavní navigace"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="https://easy2school.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs font-medium text-slate-200 transition hover:border-white/30 hover:bg-white/5"
          >
            easy2school.com
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <Link
            href="/prihlaseni"
            className="px-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Přihlásit se
          </Link>
          <Link
            href="/app/learn"
            className="inline-flex min-h-9 items-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-xs font-semibold text-white shadow-[0_0_20px_-4px_rgba(168,85,247,0.7)] transition hover:brightness-110"
          >
            Začít zdarma
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white lg:hidden"
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          aria-label={open ? "Zavřít menu" : "Otevřít menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div
          id="landing-mobile-nav"
          className="border-t border-white/10 bg-[#070913] px-4 py-4 lg:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobilní navigace">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href="https://easy2school.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-medium text-white"
            >
              easy2school.com
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            <Link
              href="/prihlaseni"
              className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-slate-200 hover:bg-white/5"
            >
              Přihlásit se
            </Link>
            <Link
              href="/app/learn"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-semibold text-white"
            >
              Začít zdarma
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
