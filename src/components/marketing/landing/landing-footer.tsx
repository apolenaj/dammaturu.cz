import {
  ArrowRight,
  Building2,
  Globe,
  Heart,
  Landmark,
  Rocket,
} from "lucide-react";
import {
  GlassCard,
  GradientButton,
  OutlineButton,
  landingGradientText,
} from "./landing-ui";

export function LandingAboutFooter() {
  return (
    <section
      id="o-nas"
      className="scroll-mt-20 border-t border-white/5 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
        <GlassCard className="flex flex-col p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">O nás</h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-400 sm:text-base">
            DámMaturu vzniká, aby maturita z češtiny nebyla chaosem. Spojujeme
            ověřené materiály, chytré opakování a jasný denní plán — tak, abys
            vždy věděl, co se učit dál a co už umíš.
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-3">
            {[
              ["12 500+", "studentů"],
              ["250 000+", "vyřešených testů"],
              ["4.9/5", "hodnocení"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center"
              >
                <dt className="text-lg font-bold text-white sm:text-xl">
                  {value}
                </dt>
                <dd className="mt-1 text-[11px] text-gray-400 sm:text-xs">
                  {label}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <OutlineButton href="/o-projektu">
              Zjistit více o nás
              <ArrowRight className="h-4 w-4" aria-hidden />
            </OutlineButton>
            <span
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-pink-400/30 bg-pink-500/10 text-pink-300"
              aria-hidden
            >
              <Heart className="h-5 w-5" fill="currentColor" />
            </span>
          </div>
        </GlassCard>

        <GlassCard className="relative overflow-hidden p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(64,224,208,0.25),transparent_70%)] blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(138,43,226,0.25),transparent_70%)] blur-2xl"
            aria-hidden
          />

          {/* Landmarks silhouette */}
          <div
            className="pointer-events-none absolute bottom-0 right-0 flex h-28 items-end gap-1.5 pr-4 opacity-30"
            aria-hidden
          >
            <Building2 className="h-10 w-10 text-gray-300" />
            <Landmark className="mb-1 h-16 w-16 text-gray-200" />
            <Building2 className="h-12 w-12 text-gray-300" />
            <Globe className="mb-6 h-8 w-8 text-[#40E0D0]" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#40E0D0]">
            easy2school.com
          </p>
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            Dál po maturitě?
          </h2>
          <p className="relative mt-3 max-w-md text-sm leading-relaxed text-gray-400 sm:text-base">
            Až maturitu zvládneš, easy2school ti pomůže s dalším krokem —
            studiem, praxí a cestou dál. Jeden ekosystém, který tě nepustí.
          </p>

          <div className="relative mt-8 flex flex-wrap items-center gap-3">
            <GradientButton href="https://easy2school.com" external>
              Přejít na easy2school.com
              <ArrowRight className="h-4 w-4" aria-hidden />
            </GradientButton>
            <span
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#40E0D0]"
              aria-hidden
            >
              <Globe className="h-5 w-5" />
            </span>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

export function LandingFinalCta() {
  return (
    <section className="border-t border-white/5 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0e1c] px-6 py-14 sm:px-12 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(138,43,226,0.2),transparent_55%),radial-gradient(ellipse_at_20%_80%,rgba(64,224,208,0.12),transparent_50%)]"
          aria-hidden
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Připraven začít?
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-400 sm:text-lg">
              Začni zdarma, bez závazků. Nahraj materiály nebo použij naše — a
              uvidíš první pokrok ještě dnes. Maturita?{" "}
              <span className={landingGradientText}>Dám!</span>
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <GradientButton href="/app/learn" className="px-8">
                Začít se učit zdarma
                <ArrowRight className="h-4 w-4" aria-hidden />
              </GradientButton>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-gray-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#40E0D0]/15 text-[#40E0D0]">
                ✓
              </span>
              Nevyžadujeme platební kartu
            </p>
          </div>

          <div className="relative mx-auto flex h-48 w-full max-w-xs items-center justify-center lg:mx-0 lg:justify-end">
            <svg
              className="absolute right-8 top-2 h-28 w-40 text-[#40E0D0]/40"
              viewBox="0 0 160 100"
              fill="none"
              aria-hidden
            >
              <path
                d="M10 80 C 40 10, 100 10, 140 40"
                stroke="url(#ctaCurve)"
                strokeWidth="2"
                strokeDasharray="6 6"
                strokeLinecap="round"
              />
              <path
                d="M132 32 L145 42 L128 48"
                stroke="#8A2BE2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="ctaCurve" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#40E0D0" />
                  <stop offset="100%" stopColor="#8A2BE2" />
                </linearGradient>
              </defs>
            </svg>
            <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-[#40E0D0]/20 to-[#8A2BE2]/30 shadow-[0_0_40px_-8px_rgba(64,224,208,0.5)]">
              <Rocket className="h-10 w-10 text-white" aria-hidden />
            </div>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-7xl text-center text-xs text-gray-600">
        © {new Date().getFullYear()} DámMaturu.cz
      </p>
    </section>
  );
}
