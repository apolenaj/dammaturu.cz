import {
  BookOpen,
  Gamepad2,
  Headphones,
  Layers,
  Play,
  Star,
  Target,
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
        "flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md transition duration-300 hover:border-white/20 hover:shadow-[0_0_40px_-14px_rgba(59,130,246,0.35)] sm:p-6",
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

function AudioWaveformPreview() {
  const bars = [
    8, 14, 10, 22, 16, 28, 18, 32, 20, 26, 14, 30, 24, 18, 12, 22, 16, 28, 20,
    14, 10, 18, 12, 8,
  ];

  return (
    <div
      className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f111a]/90 px-3 py-3"
      aria-hidden
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_0_18px_rgba(56,189,248,0.45)]">
        <Play className="h-4 w-4 fill-current" />
      </span>
      <div className="flex h-10 flex-1 items-end justify-between gap-[2px]">
        {bars.map((h, i) => (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full sm:w-1",
              i < 10
                ? "bg-gradient-to-t from-blue-600 to-sky-300"
                : i < 16
                  ? "bg-gradient-to-t from-cyan-700 to-cyan-300"
                  : "bg-white/20",
            )}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <span className="shrink-0 text-[10px] font-medium tabular-nums text-slate-500">
        1:24
      </span>
    </div>
  );
}

function StoryScenePreview() {
  return (
    <div
      className="relative mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#0a0c14]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(56,189,248,0.35),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(99,102,241,0.2),transparent_50%)]" />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 18% 22%, white, transparent), radial-gradient(1px 1px at 42% 14%, white, transparent), radial-gradient(1px 1px at 68% 28%, #93c5fd, transparent), radial-gradient(1.5px 1.5px at 82% 18%, white, transparent), radial-gradient(1px 1px at 55% 55%, #a78bfa, transparent), radial-gradient(1px 1px at 25% 60%, white, transparent)",
        }}
      />
      <div className="relative flex h-28 items-end justify-center px-4 pb-3 pt-6">
        <div className="absolute left-1/2 top-5 h-16 w-16 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.85),rgba(59,130,246,0.35)_45%,transparent_70%)] blur-[1px]" />
        <div className="absolute left-1/2 top-8 h-10 w-10 -translate-x-1/2 rounded-full border border-cyan-200/40 bg-sky-300/20 shadow-[0_0_24px_rgba(56,189,248,0.7)]" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="h-7 w-5 rounded-t-full bg-gradient-to-b from-slate-300 to-slate-700 shadow-[0_0_12px_rgba(0,0,0,0.5)]" />
          <div className="h-8 w-8 rounded-t-[40%] bg-gradient-to-b from-slate-400 to-slate-900" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#05060a] to-transparent" />
      </div>
      <div className="relative border-t border-white/5 bg-[#0f111a]/80 px-3 py-2">
        <p className="text-[11px] leading-snug text-slate-400">
          Kdo napsal Máj?
        </p>
        <p className="mt-0.5 text-xs font-semibold text-cyan-200">
          K. H. Mácha
        </p>
      </div>
    </div>
  );
}

function FlashcardsPreview() {
  return (
    <div className="relative mt-5" aria-hidden>
      <div className="absolute inset-x-3 top-0 h-full translate-y-2 rounded-xl border border-white/5 bg-slate-800/40" />
      <div className="absolute inset-x-1.5 top-0 h-full translate-y-1 rounded-xl border border-white/10 bg-slate-900/70" />
      <div className="relative space-y-3 rounded-xl border border-white/10 bg-[#0f111a] p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
        <p className="text-center text-sm font-medium text-white">
          Kdo napsal Máj?
        </p>
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2.5 text-center text-sm font-semibold text-emerald-200 shadow-[0_0_16px_rgba(52,211,153,0.2)]">
          K. H. Mácha
        </div>
      </div>
    </div>
  );
}

function TestsPreview() {
  return (
    <div
      className="mt-5 rounded-xl border border-white/10 bg-[#0f111a]/90 p-3.5"
      aria-hidden
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Otázka 8/10
      </p>
      <div className="grid grid-cols-2 gap-2">
        {["A", "B", "C", "D"].map((opt, i) => (
          <span
            key={opt}
            className={cn(
              "rounded-lg border px-2 py-2.5 text-center text-sm font-bold",
              i === 1
                ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.35)]"
                : "border-white/10 bg-white/[0.03] text-slate-400",
            )}
          >
            {opt}
          </span>
        ))}
      </div>
    </div>
  );
}

function GamesPreview() {
  return (
    <div
      className="relative mt-5 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0f111a] via-[#12101f] to-[#1a1030] p-4"
      aria-hidden
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-fuchsia-500/25 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 left-4 h-20 w-20 rounded-full bg-violet-500/20 blur-xl" />
      <span className="pointer-events-none absolute left-[12%] top-[18%] h-1.5 w-1.5 rounded-full bg-violet-300/80 shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
      <span className="pointer-events-none absolute left-[28%] top-[55%] h-1 w-1 rounded-full bg-fuchsia-300/70" />
      <span className="pointer-events-none absolute right-[22%] top-[28%] h-2 w-2 rounded-full bg-violet-400/60 shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
      <span className="pointer-events-none absolute right-[38%] top-[62%] h-1 w-1 rounded-full bg-pink-300/60" />
      <span className="pointer-events-none absolute left-[55%] top-[15%] h-1 w-1 rounded-full bg-cyan-300/50" />

      <div className="relative">
        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500/40 to-fuchsia-500/40 px-3.5 py-1.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(217,70,239,0.4)] ring-1 ring-fuchsia-400/30">
          +250 XP
        </span>
      </div>

      <div className="relative mt-3.5">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-400 shadow-[0_0_12px_rgba(217,70,239,0.55)]"
            style={{ width: "92%" }}
          />
        </div>
      </div>
    </div>
  );
}

function SpacedRepetitionPreview() {
  return (
    <div
      className="mt-5 flex items-center justify-center rounded-xl border border-white/10 bg-[#0f111a]/90 py-5"
      aria-hidden
    >
      <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88">
          <circle
            cx="44"
            cy="44"
            r="34"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="7"
          />
          <circle
            cx="44"
            cy="44"
            r="34"
            fill="none"
            stroke="url(#opakovacka-ring)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${0.72 * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
          />
          <defs>
            <linearGradient
              id="opakovacka-ring"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
        <span className="relative text-center text-xs font-bold text-cyan-300">
          Za 2 dny
        </span>
      </div>
    </div>
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
            <AudioWaveformPreview />
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
            <StoryScenePreview />
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
            <FlashcardsPreview />
          </FeatureCard>

          <FeatureCard>
            <div className="flex items-center gap-3">
              <FeatureIcon className="bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/30 shadow-[0_0_18px_rgba(232,121,249,0.25)]">
                <Target className="h-5 w-5" aria-hidden />
              </FeatureIcon>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Testy
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
              Procvičuj, testuj se a sleduj, jak se tvoje znalosti zlepšují.
            </p>
            <TestsPreview />
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
            <GamesPreview />
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
            <SpacedRepetitionPreview />
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}
