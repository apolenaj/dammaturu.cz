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
        "flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md transition duration-300 hover:border-white/20 hover:shadow-[0_0_32px_-12px_rgba(96,165,250,0.35)] sm:p-6",
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
          {/* Audio */}
          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-cyan-500/15 text-cyan-300 ring-cyan-400/30 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
                <Headphones className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Audio
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Poslouchej výklad a shrnutí, když nemůžeš číst. Ideální cestou do
              školy nebo při učení večer.
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
                      ? "bg-gradient-to-t from-cyan-600 to-cyan-300"
                      : i % 3 === 1
                        ? "bg-gradient-to-t from-blue-600 to-sky-300"
                        : "bg-gradient-to-t from-violet-700 to-violet-400",
                  )}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
              </div>
              <span className="text-[10px] font-medium tabular-nums text-slate-500">
                1:24
              </span>
            </div>
          </FeatureCard>

          {/* Příběhy */}
          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-violet-500/15 text-violet-300 ring-violet-400/30 shadow-[0_0_18px_rgba(167,139,250,0.25)]">
                <BookOpen className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Příběhy
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Uč se přes příběh a dialog — fakta se lépe pamatují, když mají
              kontext.
            </p>
            <div className="mt-5 space-y-2.5 rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300">
                  ?
                </span>
                <p className="text-xs leading-snug text-slate-400">
                  Kdo napsal Máj?
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-violet-400/25 bg-violet-500/10 px-2.5 py-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/30 text-[10px] font-bold text-violet-200">
                  ✓
                </span>
                <p className="text-sm font-semibold text-white">K. H. Mácha</p>
              </div>
            </div>
          </FeatureCard>

          {/* Kartičky */}
          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-sky-500/15 text-sky-300 ring-sky-400/30 shadow-[0_0_18px_rgba(56,189,248,0.25)]">
                <Layers className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Kartičky
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Rychlé flashcards se spaced repetition — méně zapomínání, víc
              jistoty před ústní.
            </p>
            <div className="mt-5 space-y-2">
              <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-center text-xs font-medium text-slate-300">
                Romantismus
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-[11px] font-medium text-slate-300">
                  K. H. Mácha
                </div>
                <div className="rounded-lg border border-sky-400/35 bg-sky-500/15 px-2 py-2 text-center text-[11px] font-semibold text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
                  Umím
                </div>
              </div>
            </div>
          </FeatureCard>

          {/* Testy */}
          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-emerald-500/15 text-emerald-300 ring-emerald-400/30 shadow-[0_0_18px_rgba(52,211,153,0.25)]">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Testy
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Otázky s okamžitou zpětnou vazbou — víš, co sedí a co ještě ne.
            </p>
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Otázka 8/10
                </p>
                <span className="h-1.5 w-10 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full w-4/5 rounded-full bg-emerald-400" />
                </span>
              </div>
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

          {/* Hry */}
          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/30 shadow-[0_0_18px_rgba(232,121,249,0.25)]">
                <Gamepad2 className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Hry
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Procvičování formou hry — motivace, tempo a body, které tě táhnou
              dál.
            </p>
            <div className="mt-5 space-y-2.5 rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Level 7</span>
                <span className="font-semibold text-fuchsia-300">890 XP</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[55%] rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500" />
              </div>
              <div className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400/20 to-fuchsia-500/25 px-3 py-1.5 text-sm font-bold text-white shadow-[0_0_16px_rgba(217,70,239,0.25)]">
                +250 XP
              </div>
            </div>
          </FeatureCard>

          {/* Opakovačka */}
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
              Chytré připomenutí přesně ve chvíli, kdy látka začíná mizet z
              paměti.
            </p>
            <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Další opakování</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden />
                  Za 2 dny
                </span>
              </div>
              <div className="flex gap-1.5" aria-hidden>
                {[1, 1, 1, 0.45, 0.2].map((opacity, i) => (
                  <span
                    key={i}
                    className="h-1.5 flex-1 rounded-full bg-amber-400"
                    style={{ opacity }}
                  />
                ))}
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}
