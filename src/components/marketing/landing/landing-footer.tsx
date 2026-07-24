import {
  ArrowRight,
  Globe,
  GraduationCap,
  Heart,
  Rocket,
  Star,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export function LandingAboutFooter() {
  return (
    <section
      id="o-nas"
      className="scroll-mt-20 border-t border-white/5 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <div className="relative flex min-h-[320px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md sm:min-h-[360px] sm:p-8 lg:p-10">
          <div
            className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.18),transparent_70%)] blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -right-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.28),transparent_65%)] blur-3xl"
            aria-hidden
          />

          <div className="relative z-10 flex max-w-xl flex-col">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              O nás
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              DámMaturu vzniklo, protože věříme, že učení může být chytřejší,
              osobnější a méně chaosu. Spojujeme ověřené materiály, AI a jasný
              denní plán — tak, abys vždy věděl, co se učit dál a co už umíš.
            </p>
          </div>

          <div className="relative z-10 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden />
              <span className="font-bold text-emerald-300">12 500+</span>
              <span className="text-slate-300">studentů</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-400" aria-hidden />
              <span className="font-bold text-emerald-300">250 000+</span>
              <span className="text-slate-300">vyřešených testů</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-emerald-400" aria-hidden />
              <span className="font-bold text-emerald-300">4.9/5</span>
              <span className="text-slate-300">hodnocení</span>
            </div>
          </div>

          <div className="relative z-10 mt-auto flex items-end justify-between gap-4 pt-10">
            <Link
              href="/o-projektu"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 text-sm font-semibold text-white shadow-[0_0_28px_-6px_rgba(168,85,247,0.75)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            >
              Zjistit více o nás
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>

            <span
              className="pointer-events-none mb-1 mr-1 inline-flex h-20 w-20 shrink-0 items-center justify-center sm:h-24 sm:w-24"
              aria-hidden
            >
              <Heart
                className="h-14 w-14 fill-fuchsia-500/30 text-fuchsia-400 drop-shadow-[0_0_18px_rgba(232,121,249,0.95)] sm:h-16 sm:w-16"
                strokeWidth={1.5}
              />
            </span>
          </div>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-[#1a0b2e] via-[#2e1065] to-[#0f172a] p-6 shadow-[0_0_50px_-18px_rgba(139,92,246,0.55)] sm:p-8">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(232,121,249,0.4),rgba(139,92,246,0.15)_45%,transparent_70%)] blur-xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-2 right-2 flex h-36 w-36 items-center justify-center opacity-60 sm:h-48 sm:w-48"
            aria-hidden
          >
            <span className="absolute inset-2 rounded-full border border-white/15" />
            <span className="absolute inset-6 rounded-full border border-dashed border-violet-300/30" />
            <span className="absolute inset-10 rounded-full bg-gradient-to-br from-violet-400/30 to-cyan-400/15 blur-md" />
            <Globe
              className="relative h-16 w-16 text-violet-100 sm:h-20 sm:w-20"
              strokeWidth={1.1}
            />
            <GraduationCap className="absolute right-2 top-6 h-5 w-5 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <GraduationCap className="absolute left-4 top-10 h-4 w-4 rotate-12 text-amber-200/80" />
            <span className="absolute left-3 bottom-10 text-lg">✈️</span>
            <span className="absolute right-8 bottom-6 text-base">🗼</span>
            <span className="absolute left-10 top-4 text-sm">🗽</span>
            <span className="absolute right-4 bottom-14 text-sm">🎡</span>
          </div>

          <p className="relative inline-flex w-fit items-center rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            Dál po maturitě?
          </p>
          <h2 className="relative mt-3 bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            easy2school.com
          </h2>
          <p className="relative mt-3 max-w-sm text-sm leading-relaxed text-violet-100/75 sm:text-base">
            Pomůžeme ti najít tu pravou vysokou školu v Česku i v zahraničí — a
            dostan se tam, kam chceš.
          </p>

          <div className="relative mt-auto pt-8">
            <a
              href="https://easy2school.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-violet-700 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Přejít na easy2school.com
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFinalCta() {
  return (
    <section className="border-t border-white/5 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] px-6 py-10 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.65)] sm:px-10 sm:py-12 lg:px-12">
        <div
          className="pointer-events-none absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-fuchsia-300/20 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-64 rounded-full bg-violet-300/10 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="flex min-w-0 flex-1 items-start gap-5 sm:items-center sm:gap-6">
            <div
              className="relative flex h-20 w-20 shrink-0 items-center justify-center sm:h-24 sm:w-24"
              aria-hidden
            >
              <div className="absolute bottom-1 h-6 w-14 rounded-full bg-white/25 blur-md" />
              <div className="absolute bottom-0 left-1/2 h-8 w-4 -translate-x-1/2 rounded-full bg-gradient-to-t from-orange-500 via-amber-300 to-transparent opacity-80 blur-[1px]" />
              <Rocket className="relative h-12 w-12 -rotate-45 text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)] sm:h-14 sm:w-14" />
              <span className="absolute -bottom-0.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-orange-400 blur-[2px]" />
            </div>

            <div className="min-w-0 text-left">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                Připraven začít?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-violet-100/90 sm:text-base">
                Získej přístup ke všemu zdarma na 7 dní. Bez závazků. Zrušíš
                kdykoliv.
              </p>
            </div>
          </div>

          <div className="relative shrink-0 text-left lg:pl-4 lg:text-right">
            <svg
              className="pointer-events-none absolute -right-2 -top-8 hidden h-16 w-20 text-pink-200/80 lg:block"
              viewBox="0 0 80 64"
              fill="none"
              aria-hidden
            >
              <path
                d="M8 48 C 28 12, 52 8, 72 24"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 5"
                strokeLinecap="round"
              />
              <path
                d="M64 18 L74 26 L60 30"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <Link
              href="/app/learn"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-8 text-sm font-bold text-violet-700 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-600 sm:w-auto sm:min-h-14 sm:px-10 sm:text-base"
            >
              Začít se učit zdarma
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <p className="mt-3 flex items-center gap-2 text-sm text-violet-100/90 lg:justify-end">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs text-white">
                ✓
              </span>
              Nevyžadujeme platební kartu
            </p>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-7xl text-center text-xs text-slate-600">
        © {new Date().getFullYear()} DámMaturu.cz
      </p>
    </section>
  );
}
