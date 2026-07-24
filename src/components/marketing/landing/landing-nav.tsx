"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Menu, X } from "lucide-react";

const navLinks = [
  { href: "#jak-to-funguje", label: "Jak to funguje" },
  { href: "#materialy", label: "Materiály" },
  { href: "#funkce", label: "Funkce" },
  { href: "/cenik", label: "Ceník" },
  { href: "#o-nas", label: "O nás" },
] as const;

/** Logo mark from design: rounded square, gradient stroke, checkmark inside. */
function DamMaturuLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient
          id="dmLogoBorder"
          x1="2"
          y1="2"
          x2="30"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#60A5FA" />
          <stop offset="0.55" stopColor="#818CF8" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient
          id="dmLogoCheck"
          x1="8"
          y1="10"
          x2="24"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
        <filter
          id="dmLogoGlow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Soft fill */}
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="8"
        fill="rgba(99,102,241,0.12)"
      />
      {/* Gradient border */}
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="8"
        stroke="url(#dmLogoBorder)"
        strokeWidth="1.75"
        filter="url(#dmLogoGlow)"
      />
      {/* Checkmark */}
      <path
        d="M9.5 16.2 L13.8 20.4 L22.5 11.5"
        stroke="url(#dmLogoCheck)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070913]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2.5"
          aria-label="DámMaturu — domů"
        >
          <DamMaturuLogoMark className="h-8 w-8 shrink-0 drop-shadow-[0_0_10px_rgba(96,165,250,0.35)]" />
          <span className="text-lg font-bold tracking-tight text-white">
            DámMaturu
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
            className="inline-flex min-h-9 items-center rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-4 text-xs font-semibold text-white shadow-[0_0_22px_-4px_rgba(59,130,246,0.75)] transition hover:brightness-110"
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
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-sm font-semibold text-white"
            >
              Začít zdarma
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
