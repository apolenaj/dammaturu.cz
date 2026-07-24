import {
  ArrowRight,
  Globe,
  Heart,
  Rocket,
} from "lucide-react";
import Link from "next/link";

export function LandingAboutFooter() {
  return (
    <section
      id="o-nas"
      className="scroll-mt-20 border-t border-white/5 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {/* O nás */}
        <div className="relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:p-8">
          <div
            className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.18),transparent_70%)] blur-2xl"
            aria-hidden
          />

          <div className="relative flex items-start justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              O nás
            </h2>
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/40 shadow-[0_0_24px_rgba(167,139,250,0.65),0_0_48px_rgba(139,92,246,0.35)]"
              aria-hidden
            >
              <Heart
                className="h-6 w-6 fill-violet-400 text-violet-300 drop-shadow-[0_0_10px_rgba(167,139,250,0.9)]"
              />
            </span>
          </div>

          <p className="relative mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
            DámMaturu vzniká, aby maturita z češtiny nebyla chaosem. Spojujeme
            ověřené materiály, chytré opakování a jasný denní plán — tak, abys
            vždy věděl, co se učit dál a co už umíš.
          </p>

          <dl className="relative mt-8 grid grid-cols-3 gap-3">
            {[
              ["12 500+", "studentů"],
              ["250 000+", "vyřešených testů"],
              ["4.9/5", "hodnocení"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3.5 text-center backdrop-blur-sm"
              >
                <dt className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
                  {value}
                </dt>
                <dd className="mt-1 text-[11px] text-slate-400 sm:text-xs">
                  {label}
                </dd>
              </div>
            ))}
          </dl>

          <div className="relative mt-auto pt-8">
            <Link
              href="/o-projektu"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-slate-950/60 px-6 text-sm font-semibold text-white transition hover:border-violet-400/40 hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            >
              Zjistit více o nás
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        {/* easy2school.com */}
        <div className="relative flex flex-col overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-[#2a0a4a] via-[#4c1d95] to-[#1e1b4b] p-6 shadow-[0_0_50px_-18px_rgba(139,92,246,0.55)] sm:p-8">
          {/* Globe / purple atmosphere */}
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(232,121,249,0.45),rgba(139,92,246,0.2)_45%,transparent_70%)] blur-xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.35),transparent_65%)] blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-4 right-4 flex h-32 w-32 items-center justify-center opacity-40"
            aria-hidden
          >
            <span className="absolute inset-0 rounded-full border border-white/20" />
            <span className="absolute inset-3 rounded-full border border-dashed border-white/15" />
            <span className="absolute inset-8 rounded-full bg-gradient-to-br from-violet-300/30 to-fuchsia-500/20 blur-sm" />
            <Globe className="relative h-14 w-14 text-violet-100" strokeWidth={1.25} />
          </div>

          <p className="relative text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
            easy2school.com
          </p>
          <h2 className="relative mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dál po maturitě?
          </h2>
          <p className="relative mt-3 max-w-md text-sm leading-relaxed text-violet-100/75 sm:text-base">
            Až maturitu zvládneš, easy2school ti pomůže s dalším krokem —
            studiem, praxí a cestou dál. Jeden ekosystém, který tě nepustí.
          </p>

          <div className="relative mt-auto pt-8">
            <a
              href="https://easy2school.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-violet-700 shadow-[0_10px_30px_-8px_rgba(255,255,255,0.35)] transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-r from-[#5b21b6] via-[#7c3aed] to-[#a855f7] px-6 py-10 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.65)] sm:px-10 sm:py-12 lg:px-12">
        <div
          className="pointer-events-none absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-fuchsia-300/20 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="flex min-w-0 flex-1 items-start gap-5 sm:items-center sm:gap-6">
            <div
              className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 shadow-[0_0_30px_rgba(255,255,255,0.2)] sm:h-20 sm:w-20"
              aria-hidden
            >
              <Rocket className="h-8 w-8 -rotate-45 text-white sm:h-10 sm:w-10" />
              <svg
                className="absolute -right-6 -top-4 hidden h-16 w-20 text-white/50 sm:block"
                viewBox="0 0 80 64"
                fill="none"
              >
                <path
                  d="M8 48 C 24 16, 48 8, 72 20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                />
                <path
                  d="M64 14 L74 22 L62 28"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0 text-left">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                Připraven začít?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-violet-100/90 sm:text-base">
                Začni zdarma, bez závazků. Nahraj materiály nebo použij naše — a
                uvidíš první pokrok ještě dnes. Maturita? Dám!
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm text-violet-100/85">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs text-white">
                  ✓
                </span>
                Nevyžadujeme platební kartu
              </p>
            </div>
          </div>

          <div className="shrink-0 lg:pl-4">
            <Link
              href="/app/learn"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-8 text-sm font-bold text-violet-700 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-600 sm:w-auto sm:min-h-14 sm:px-10 sm:text-base"
            >
              Začít se učit zdarma
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-7xl text-center text-xs text-slate-600">
        © {new Date().getFullYear()} DámMaturu.cz
      </p>
    </section>
  );
}
