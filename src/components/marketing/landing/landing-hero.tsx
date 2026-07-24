import {
  ArrowRight,
  Brain,
  Check,
  Flame,
  Target,
} from "lucide-react";
import {
  GlassCard,
  GradientButton,
  OutlineButton,
  landingGradient,
  landingGradientText,
} from "./landing-ui";

function ProgressRing({ value }: { value: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88" aria-hidden>
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#40E0D0" />
            <stop offset="100%" stopColor="#8A2BE2" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{value}%</span>
      </div>
    </div>
  );
}

function SubjectBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-gray-300">{label}</span>
        <span className="shrink-0 font-semibold text-white">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${landingGradient}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div
        className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(64,224,208,0.18),transparent_60%)] blur-2xl"
        aria-hidden
      />

      {/* Floating streak widget */}
      <div className="absolute -right-1 -top-3 z-20 flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-[#0c1220]/95 px-3 py-1.5 text-xs font-semibold text-orange-300 shadow-[0_0_24px_-4px_rgba(249,115,22,0.45)] sm:-right-2 sm:-top-4">
        <Flame className="h-3.5 w-3.5" aria-hidden />
        Série 12 dní
      </div>

      <div className="relative grid gap-3 sm:grid-cols-2">
        <GlassCard className="sm:col-span-2">
          <div>
            <p className="text-lg font-semibold text-white">Ahoj, Karle!</p>
            <p className="mt-1 text-sm text-gray-400">
              Dnes máš 3 úkoly a 25 minut na učení.
            </p>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-gray-300">Daily Progress</span>
              <span className="text-gray-400">25/25 min</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full w-full rounded-full ${landingGradient}`} />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#40E0D0]">
              <Check className="h-3.5 w-3.5" aria-hidden />
              Skvělé! Cíl splněn
            </p>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col items-center justify-center text-center">
          <ProgressRing value={78} />
          <p className="mt-2 text-sm font-semibold text-white">Dobrá práce!</p>
        </GlassCard>

        <GlassCard>
          <div className="space-y-3">
            <SubjectBar label="Romantismus" value={42} />
            <SubjectBar label="Sloh - slohové útvary" value={55} />
            <SubjectBar label="Pravopis - i/y" value={63} />
          </div>
        </GlassCard>

        <GlassCard>
          <p className="mb-3 text-sm font-semibold text-white">Dnešní plán</p>
          <ul className="space-y-2.5 text-sm text-gray-300">
            {[
              ["5 min", "Opakování — romantismus"],
              ["12 min", "Nová látka — slohové útvary"],
              ["5 min", "Test — pravopis i/y"],
              ["3 min", "Kartičky — Máj"],
            ].map(([time, label]) => (
              <li key={label} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#40E0D0]">
                  {time}
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard>
          <p className="mb-3 text-sm font-semibold text-white">Moje odznaky</p>
          <div className="flex gap-3">
            {[
              {
                icon: Flame,
                label: "Série",
                color: "text-orange-400 bg-orange-500/15",
              },
              {
                icon: Brain,
                label: "Mozek",
                color: "text-cyan-300 bg-cyan-500/15",
              },
              {
                icon: Target,
                label: "Cíl",
                color: "text-purple-300 bg-purple-500/15",
              },
            ].map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-3"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-[10px] font-medium text-gray-400">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pt-20">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(138,43,226,0.22),transparent_65%)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-40 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(64,224,208,0.16),transparent_70%)] blur-2xl"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-[#40E0D0]">
            #1 AI studijní systém pro maturitu
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Maturita?{" "}
            <span className={landingGradientText}>Dám!</span>
          </h1>
          <p className="mt-4 text-xl font-medium text-white sm:text-2xl">
            Chytré učení, které se přizpůsobí tobě.
          </p>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-gray-400 sm:text-lg">
            Nahraj své materiály nebo použij naše a my tě dovedeme k úspěchu.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <GradientButton href="/app/learn" className="px-7">
              Začít se učit zdarma
              <ArrowRight className="h-4 w-4" aria-hidden />
            </GradientButton>
            <OutlineButton href="#ukazka">Vyzkoušet ukázku</OutlineButton>
          </div>

          <ul className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
            {[
              "Zdarma na vyzkoušení",
              "Bez závazků",
              "Funguje na webu i v mobilu",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-gray-300"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#40E0D0]/15 text-[#40E0D0]">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div id="ukazka">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
