import {
  BookOpen,
  CheckCircle2,
  Gamepad2,
  Headphones,
  Layers,
  Star,
} from "lucide-react";
import { SectionHeading } from "./landing-ui";
import { cn } from "@/lib/cn";

function FeatureCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md transition duration-300 hover:border-white/20 hover:shadow-[0_0_32px_-12px_rgba(139,92,246,0.35)] sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function FeatureIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LandingFeatures() {
  return (
    <section
      id="funkce"
      className="scroll-mt-20 border-t border-white/5 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading title="Uč se tak, jak ti to sedí" />

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-violet-500/15 text-violet-300 ring-violet-400/30 shadow-[0_0_18px_rgba(167,139,250,0.25)]">
                <Headphones className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Audio
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Poslouchej kdykoliv a kdekoliv. Ideální na cestu nebo při sportu.
            </p>
            <div
              className="mt-5 flex h-14 items-end justify-between gap-0.5 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5"
              aria-hidden
            >
              {[
                10, 18, 12, 26, 16, 30, 20, 28, 14, 24, 18, 32, 22, 16, 12, 20,
                14, 10,
              ].map((h, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-[3px] rounded-full sm:w-1",
                    i % 3 === 0
                      ? "bg-gradient-to-t from-violet-600 to-violet-300"
                      : i % 3 === 1
                        ? "bg-gradient-to-t from-fuchsia-600 to-pink-300"
                        : "bg-gradient-to-t from-cyan-700 to-cyan-400",
                  )}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </FeatureCard>

          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-cyan-500/15 text-cyan-300 ring-cyan-400/30 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
                <BookOpen className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Příběhy
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Zapamatuj si víc díky příběhům a souvislostem, ne suchému
              biflování.
            </p>
            <div className="relative mt-5 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-950 to-[#0b1229] p-3">
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                aria-hidden
                style={{
                  backgroundImage:
                    "radial-gradient(1px 1px at 20% 30%, white, transparent), radial-gradient(1px 1px at 60% 20%, white, transparent), radial-gradient(1px 1px at 80% 50%, white, transparent), radial-gradient(1.5px 1.5px at 40% 70%, #a78bfa, transparent)",
                }}
              />
              <div className="relative space-y-2">
                <p className="text-xs text-slate-400">Kdo napsal Máj?</p>
                <p className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1.5 text-sm font-semibold text-white">
                  K. H. Mácha
                </p>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-emerald-500/15 text-emerald-300 ring-emerald-400/30 shadow-[0_0_18px_rgba(52,211,153,0.25)]">
                <Layers className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Kartičky
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Chytré kartičky ti pomůžou zapamatovat si důležité pojmy.
            </p>
            <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <p className="text-center text-xs text-slate-400">
                Kdo napsal Máj?
              </p>
              <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-center text-sm font-semibold text-emerald-200">
                K. H. Mácha
              </div>
            </div>
          </FeatureCard>

          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/30 shadow-[0_0_18px_rgba(232,121,249,0.25)]">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Testy
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Procvičuj, testuj se a sleduj, jak se tvoje znalosti zlepšují.
            </p>
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Otázka 8/10
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {["A", "B", "C", "D"].map((opt, i) => (
                  <span
                    key={opt}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-center text-xs font-semibold",
                      i === 1
                        ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                        : "border-white/10 bg-white/[0.03] text-slate-400",
                    )}
                  >
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          </FeatureCard>

          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-emerald-500/15 text-emerald-300 ring-emerald-400/30 shadow-[0_0_18px_rgba(52,211,153,0.25)]">
                <Gamepad2 className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Hry
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Učení, které baví! Získávej body, plň výzvy a porážej své rekordy.
            </p>
            <div className="relative mt-5 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-emerald-950/80 via-slate-950 to-violet-950/60 p-4">
              <div
                className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-fuchsia-500/20 blur-xl"
                aria-hidden
              />
              <div className="relative inline-flex items-center rounded-full bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 px-3 py-1.5 text-sm font-bold text-white shadow-[0_0_16px_rgba(217,70,239,0.35)]">
                +250 XP
              </div>
            </div>
          </FeatureCard>

          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-amber-500/15 text-amber-300 ring-amber-400/30 shadow-[0_0_18px_rgba(251,191,36,0.25)]">
                <Star className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Opakovačka
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Na základě tvých chyb ti látku připomínáme ve správný čas.
            </p>
            <div className="mt-5 flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/50 py-4">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80" aria-hidden>
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${0.72 * 2 * Math.PI * 30} ${2 * Math.PI * 30}`}
                  />
                </svg>
                <span className="relative text-center text-xs font-semibold text-emerald-300">
                  Za 2 dny
                </span>
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}
