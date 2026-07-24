"use client";

import Link from "next/link";
import { useState } from "react";
import { Globe, Menu, Rocket, X } from "lucide-react";
import { GradientButton, OutlineButton } from "./landing-ui";

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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070913]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-white"
          aria-label="DámMaturu — domů"
        >
          DámMaturu
        </Link>

        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Hlavní navigace"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-300 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <OutlineButton href="https://easy2school.com" external size="sm">
            <Globe className="h-3.5 w-3.5" aria-hidden />
            easy2school.com
          </OutlineButton>
          <Link
            href="/prihlaseni"
            className="px-2 text-sm font-medium text-gray-300 transition hover:text-white"
          >
            Přihlásit se
          </Link>
          <GradientButton href="/app/learn" className="min-h-10 px-4 text-xs">
            <Rocket className="h-3.5 w-3.5" aria-hidden />
            Začít zdarma
          </GradientButton>
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
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <OutlineButton href="https://easy2school.com" external>
              <Globe className="h-4 w-4" aria-hidden />
              easy2school.com
            </OutlineButton>
            <Link
              href="/prihlaseni"
              className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-gray-200 hover:bg-white/5"
            >
              Přihlásit se
            </Link>
            <GradientButton href="/app/learn">
              <Rocket className="h-4 w-4" aria-hidden />
              Začít zdarma
            </GradientButton>
          </div>
        </div>
      ) : null}
    </header>
  );
}
