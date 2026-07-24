import {
  ArrowRight,
  FileText,
  Heart,
  Plane,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

function GlobeGraphic() {
  return (
    <div
      className="pointer-events-none absolute -bottom-6 -right-4 h-52 w-52 sm:-bottom-4 sm:right-2 sm:h-60 sm:w-60"
      aria-hidden
    >
      <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle_at_35%_30%,#67e8f9_0%,#3b82f6_35%,#1e3a8a_70%,#0f172a_100%)] opacity-90 shadow-[0_0_60px_rgba(59,130,246,0.45)]" />
      <div className="absolute inset-6 overflow-hidden rounded-full">
        <div className="absolute left-[18%] top-[28%] h-8 w-14 rounded-full bg-emerald-500/35 blur-[1px]" />
        <div className="absolute right-[22%] top-[42%] h-10 w-12 rounded-full bg-emerald-400/25 blur-[1px]" />
        <div className="absolute bottom-[22%] left-[30%] h-6 w-16 rounded-full bg-emerald-500/30 blur-[1px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.25),transparent_40%)]" />
      </div>
      <div className="absolute inset-6 rounded-full border border-white/20" />
      <div className="absolute inset-[1.35rem] rounded-full border border-dashed border-cyan-300/25" />

      <span className="absolute left-[18%] top-[12%] text-lg drop-shadow-md">🗽</span>
      <span className="absolute right-[10%] top-[22%] text-xl drop-shadow-md">🗼</span>
      <span className="absolute bottom-[18%] left-[8%] text-base drop-shadow-md">🕌</span>
      <span className="absolute bottom-[28%] right-[6%] text-lg drop-shadow-md">🏛️</span>
      <span className="absolute left-[42%] top-[6%] text-sm drop-shadow-md">🎓</span>

      <Plane className="absolute left-[8%] top-[38%] h-5 w-5 -rotate-12 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
    </div>
  );
}

function RocketIllustration() {
  return (
    <div
      className="relative flex h-28 w-24 shrink-0 items-center justify-center sm:h-32 sm:w-28"
      aria-hidden
    >
      <div className="absolute bottom-2 left-1/2 h-10 w-16 -translate-x-1/2 rounded-full bg-white/25 blur-md" />
      <div className="absolute bottom-0 left-1/2 h-14 w-10 -translate-x-1/2 bg-gradient-to-t from-orange-500 via-amber-300 to-transparent opacity-90 blur-[2px]" />
      <svg
        viewBox="0 0 96 120"
        className="relative h-24 w-20 drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] sm:h-28 sm:w-24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M48 8 C58 28 64 52 64 72 C64 88 58 98 48 104 C38 98 32 88 32 72 C32 52 38 28 48 8Z"
          fill="url(#rocketBody)"
        />
        <path
          d="M48 8 C54 24 58 44 58 64 C58 78 54 88 48 94 C42 88 38 78 38 64 C38 44 42 24 48 8Z"
          fill="white"
          fillOpacity="0.92"
        />
        <circle cx="48" cy="52" r="8" fill="#7C3AED" fillOpacity="0.85" />
        <circle cx="48" cy="52" r="4.5" fill="#C4B5FD" />
        <path d="M32 72 L18 88 L34 82 Z" fill="#A78BFA" />
        <path d="M64 72 L78 88 L62 82 Z" fill="#A78BFA" />
        <path
          d="M40 100 C42 110 46 116 48 118 C50 116 54 110 56 100 C52 104 44 104 40 100Z"
          fill="url(#rocketFlame)"
        />
        <defs>
          <linearGradient id="rocketBody" x1="32" y1="8" x2="64" y2="104">
            <stop stopColor="#F5F3FF" />
            <stop offset="1" stopColor="#DDD6FE" />
          </linearGradient>
          <linearGradient id="rocketFlame" x1="48" y1="100" x2="48" y2="118">
            <stop stopColor="#FDBA74" />
            <stop offset="0.55" stopColor="#F97316" />
            <stop offset="1" stopColor="#EF4444" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function LandingAboutFooter() {
  return (
    <section
      id="o-nas"
      className="scroll-mt-20 border-t border-white/5 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {/* O nás */}
        <div className="relative flex min-h-[340px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-7 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md sm:min-h-[380px] sm:p-8 lg:p-10">
          <div
            className="pointer-events-none absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.35),transparent_60%)] blur-2xl"
            aria-hidden
          />

          <h2 className="relative z-10 text-3xl font-bold tracking-tight text-white">
            O nás
          </h2>
          <p className="relative z-10 mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-[15px]">
            DámMaturu vzniklo, protože věříme, že učení může být chytřejší,
            osobnější a méně chaosu. Spojujeme ověřené materiály, AI a jasný
            denní plán — tak, abys vždy věděl, co se učit dál a co už umíš.
          </p>

          <div className="relative z-10 mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" aria-hidden />
              <span className="font-bold text-emerald-400">12 500+</span>
              <span className="text-slate-300">studentů</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" aria-hidden />
              <span className="font-bold text-emerald-400">250 000+</span>
              <span className="text-slate-300">vyřešených testů</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-emerald-400" aria-hidden />
              <span className="font-bold text-emerald-400">4.9/5</span>
              <span className="text-slate-300">hodnocení</span>
            </div>
          </div>

          <div className="relative z-10 mt-auto flex items-end justify-between gap-4 pt-12">
            <Link
              href="/o-projektu"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 text-sm font-semibold text-white shadow-[0_0_28px_-4px_rgba(168,85,247,0.8)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            >
              Zjistit více o nás
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>

            <span
              className="pointer-events-none relative mb-0 mr-1 inline-flex h-24 w-24 shrink-0 items-center justify-center sm:h-28 sm:w-28"
              aria-hidden
            >
              <span className="absolute inset-0 rounded-full bg-fuchsia-500/30 blur-2xl" />
              <Heart
                className="relative h-16 w-16 fill-fuchsia-500/40 text-fuchsia-400 drop-shadow-[0_0_22px_rgba(232,121,249,1)] sm:h-[4.5rem] sm:w-[4.5rem]"
                strokeWidth={1.75}
              />
            </span>
          </div>
        </div>

        {/* easy2school.com */}
        <div className="relative flex min-h-[340px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-7 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md sm:min-h-[380px] sm:p-8 lg:p-10">
          <div
            className="pointer-events-none absolute -right-10 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.35),transparent_65%)] blur-2xl"
            aria-hidden
          />
          <GlobeGraphic />

          <p className="relative z-10 inline-flex w-fit items-center rounded-full border border-violet-400/35 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200">
            Dál po maturitě?
          </p>
          <h2 className="relative z-10 mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            easy2school.com
          </h2>
          <p className="relative z-10 mt-3 max-w-sm text-sm leading-relaxed text-slate-300 sm:text-[15px]">
            Pomůžeme ti najít tu pravou vysokou školu v Česku i v zahraničí — a
            dostan se tam, kam chceš.
          </p>

          <div className="relative z-10 mt-auto pt-12">
            <a
              href="https://easy2school.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-7 text-sm font-bold text-white shadow-[0_0_28px_-4px_rgba(168,85,247,0.8)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
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
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-r from-[#5b21b6] via-[#7c3aed] to-[#a855f7] px-6 py-10 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.7)] sm:px-10 sm:py-12 lg:px-14">
        <div
          className="pointer-events-none absolute -left-8 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-300/25 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="flex min-w-0 flex-1 items-center gap-5 sm:gap-7">
            <RocketIllustration />
            <div className="min-w-0 text-left">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                Připraven začít?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-violet-100 sm:text-base">
                Získej přístup ke všemu zdarma na 7 dní. Bez závazků. Zrušíš
                kdykoliv.
              </p>
            </div>
          </div>

          <div className="relative shrink-0 text-left lg:text-right">
            <svg
              className="pointer-events-none absolute -right-1 -top-9 hidden h-14 w-16 text-pink-200/90 lg:block"
              viewBox="0 0 80 64"
              fill="none"
              aria-hidden
            >
              <path
                d="M8 48 C 28 12, 52 8, 72 24"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeDasharray="4 5"
                strokeLinecap="round"
              />
              <path
                d="M64 18 L74 26 L60 30"
                stroke="currentColor"
                strokeWidth="2.25"
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
            <p className="mt-3 flex items-center gap-2 text-sm text-violet-100 lg:justify-end">
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
