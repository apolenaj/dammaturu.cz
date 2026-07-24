import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Target,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";

function ProgressRing({ value }: { value: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div className="relative flex h-[7.25rem] w-[7.25rem] items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#heroRingGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="heroRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight text-white">
          {value}%
        </span>
      </div>
    </div>
  );
}

function SubjectBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-slate-300">{label}</span>
        <span className="shrink-0 font-semibold text-white">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function MockGlass({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-slate-900/50 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md sm:rounded-3xl sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Přehled", active: true },
  { icon: GraduationCap, label: "Učení", active: false },
  { icon: AlertCircle, label: "Moje chyby", active: false },
  { icon: BookOpen, label: "Materiály", active: false },
  { icon: CalendarDays, label: "Plán", active: false },
  { icon: BarChart3, label: "Statistiky", active: false },
] as const;

function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.22),transparent_62%)] blur-2xl"
        aria-hidden
      />

      {/* Floating streak */}
      <div className="absolute -right-1 -top-3 z-20 flex items-center gap-1.5 rounded-full border border-orange-400/35 bg-slate-950/95 px-3 py-1.5 text-xs font-semibold text-orange-300 shadow-[0_8px_28px_-6px_rgba(249,115,22,0.55)] sm:-right-3 sm:-top-4">
        <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-400" aria-hidden />
        Série 12 dní
      </div>

      {/* App shell frame */}
      <div className="relative flex overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/80 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl sm:rounded-[2rem]">
        {/* Left sidebar */}
        <aside className="flex w-[4.5rem] shrink-0 flex-col border-r border-white/10 bg-slate-950/90 px-1.5 py-4 sm:w-44 sm:px-3 sm:py-5">
          <div className="mb-5 hidden items-center gap-2 px-2 sm:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-[10px] font-bold text-white">
              DM
            </span>
            <span className="truncate text-xs font-semibold text-white">
              DámMaturu
            </span>
          </div>
          <div className="mb-5 flex justify-center sm:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-[10px] font-bold text-white">
              DM
            </span>
          </div>

          <nav className="flex flex-1 flex-col gap-1" aria-hidden>
            {sidebarItems.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2 py-2 text-[11px] font-medium transition sm:px-2.5 sm:py-2.5 sm:text-xs",
                  active
                    ? "bg-blue-500/15 text-blue-300 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.25)]"
                    : "text-slate-400",
                )}
              >
                <Icon
                  className={cn(
                    "mx-auto h-4 w-4 shrink-0 sm:mx-0",
                    active ? "text-blue-400" : "text-slate-500",
                  )}
                />
                <span className="hidden truncate sm:inline">{label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-3 bg-gradient-to-br from-slate-900/40 via-slate-950/20 to-blue-950/20 p-3 sm:space-y-3.5 sm:p-4">
          <MockGlass>
            <div>
              <p className="text-base font-semibold text-white sm:text-lg">
                Ahoj, Karle!
              </p>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Dnes máš 3 úkoly a 25 minut na učení.
              </p>
            </div>
            <div className="mt-3.5">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-300">Daily Progress</span>
                <span className="text-slate-400">25/25 min</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600" />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-blue-300">
                <Check className="h-3.5 w-3.5" aria-hidden />
                Skvělé! Cíl splněn
              </p>
            </div>
          </MockGlass>

          <div className="grid gap-3 sm:grid-cols-2">
            <MockGlass className="flex flex-col items-center justify-center text-center">
              <ProgressRing value={78} />
              <p className="mt-2 text-sm font-semibold text-white">
                Dobrá práce!
              </p>
            </MockGlass>

            <MockGlass>
              <div className="space-y-3">
                <SubjectBar label="Romantismus" value={42} />
                <SubjectBar label="Sloh - slohové útvary" value={55} />
                <SubjectBar label="Pravopis - i/y" value={63} />
              </div>
            </MockGlass>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MockGlass>
              <p className="mb-3 text-sm font-semibold text-white">Dnešní plán</p>
              <ul className="space-y-2 text-xs text-slate-300 sm:text-[13px]">
                {[
                  ["5 min", "Opakování — romantismus"],
                  ["12 min", "Nová látka — slohové útvary"],
                  ["5 min", "Test — pravopis i/y"],
                  ["3 min", "Kartičky — Máj"],
                ].map(([time, label]) => (
                  <li key={label} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                      {time}
                    </span>
                    <span className="leading-snug">{label}</span>
                  </li>
                ))}
              </ul>
            </MockGlass>

            <MockGlass>
              <p className="mb-3 text-sm font-semibold text-white">Moje odznaky</p>
              <div className="flex gap-2.5">
                {[
                  {
                    icon: Flame,
                    label: "Série",
                    color: "text-orange-400 bg-orange-500/15",
                  },
                  {
                    icon: Brain,
                    label: "Mozek",
                    color: "text-sky-300 bg-sky-500/15",
                  },
                  {
                    icon: Target,
                    label: "Cíl",
                    color: "text-violet-300 bg-violet-500/15",
                  },
                ].map(({ icon: Icon, label, color }) => (
                  <div
                    key={label}
                    className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-white/[0.03] py-3"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        color,
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </MockGlass>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pt-20">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.28),transparent_65%)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.18),transparent_70%)] blur-2xl"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-12 xl:gap-16">
        <div>
          <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-blue-300">
            #1 AI studijní systém pro maturitu
          </p>

          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Maturita?{" "}
            <span className="inline-flex items-center gap-2 sm:gap-3">
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Dám!
              </span>
              <Zap
                className="h-8 w-8 shrink-0 fill-orange-400 text-orange-400 drop-shadow-[0_0_18px_rgba(251,146,60,0.75)] sm:h-10 sm:w-10 lg:h-12 lg:w-12"
                aria-hidden
              />
            </span>
          </h1>

          <p className="mt-5 text-xl font-medium text-white sm:text-2xl">
            Chytré učení, které se přizpůsobí tobě.
          </p>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
            Nahraj své materiály nebo použij naše a my tě dovedeme k úspěchu.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/app/learn"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 px-7 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(37,99,235,0.75),0_4px_12px_-4px_rgba(37,99,235,0.45)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070913]"
            >
              Začít se učit zdarma
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="#ukazka"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-slate-950/80 px-7 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070913]"
            >
              Vyzkoušet ukázku
            </Link>
          </div>

          <ul className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
            {[
              "Zdarma na vyzkoušení",
              "Bez závazků",
              "Funguje na webu i v mobilu",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-slate-300"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
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
