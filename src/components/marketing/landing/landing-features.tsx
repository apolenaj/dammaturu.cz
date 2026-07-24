import {
  BookOpen,
  CheckCircle2,
  Gamepad2,
  Headphones,
  Layers,
  Star,
} from "lucide-react";
import { GlassCard, SectionHeading, landingGradient } from "./landing-ui";

export function LandingFeatures() {
  return (
    <section
      id="funkce"
      className="scroll-mt-20 border-t border-white/5 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading title="Uč se tak, jak ti to sedí" />

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Audio */}
          <GlassCard className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-[#40E0D0]">
                <Headphones className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold text-white">Audio</h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-400">
              Poslouchej výklad a shrnutí, když nemůžeš číst. Ideální cestou do
              školy nebo při učení večer.
            </p>
            <div className="mt-5 flex h-12 items-end justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
              {[4, 8, 5, 12, 7, 14, 9, 11, 6, 10, 5, 8, 4].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full ${landingGradient}`}
                  style={{ height: `${h * 2}px` }}
                  aria-hidden
                />
              ))}
            </div>
          </GlassCard>

          {/* Příběhy */}
          <GlassCard className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                <BookOpen className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold text-white">Příběhy</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Uč se přes příběh a dialog — fakta se lépe pamatují, když mají
              kontext.
            </p>
            <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-gray-400">Kdo napsal Máj?</p>
              <p className="text-sm font-semibold text-white">K. H. Mácha</p>
            </div>
          </GlassCard>

          {/* Kartičky */}
          <GlassCard className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-[#40E0D0]">
                <Layers className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold text-white">Kartičky</h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-400">
              Rychlé flashcards se spaced repetition — méně zapomínání, víc
              jistoty před ústní.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-center text-xs text-gray-300">
                Romantismus
              </div>
              <div className="rounded-lg border border-[#40E0D0]/30 bg-[#40E0D0]/10 p-3 text-center text-xs font-semibold text-[#40E0D0]">
                Umím
              </div>
            </div>
          </GlassCard>

          {/* Testy */}
          <GlassCard className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold text-white">Testy</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Otázky s okamžitou zpětnou vazbou — víš, co sedí a co ještě ne.
            </p>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Otázka 8/10
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {["A", "B", "C", "D"].map((opt, i) => (
                  <span
                    key={opt}
                    className={`rounded-md border px-2 py-1.5 text-center text-xs ${
                      i === 1
                        ? "border-[#40E0D0]/40 bg-[#40E0D0]/10 font-semibold text-[#40E0D0]"
                        : "border-white/10 text-gray-400"
                    }`}
                  >
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Hry */}
          <GlassCard className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
                <Gamepad2 className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold text-white">Hry</h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-400">
              Procvičování formou hry — motivace, tempo a body, které tě táhnou
              dál.
            </p>
            <div className="mt-5 inline-flex self-start items-center rounded-full bg-gradient-to-r from-[#40E0D0]/20 to-[#8A2BE2]/20 px-3 py-1.5 text-sm font-bold text-white">
              +250 XP
            </div>
          </GlassCard>

          {/* Opakovačka */}
          <GlassCard className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                <Star className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold text-white">Opakovačka</h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-400">
              Chytré připomenutí přesně ve chvíli, kdy látka začíná mizet z
              paměti.
            </p>
            <div className="mt-5 inline-flex self-start items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-200">
              <Star className="h-3.5 w-3.5" aria-hidden />
              Za 2 dny
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
