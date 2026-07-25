import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Target,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { logoutLearnerAction } from "@/server/actions/auth";

function ProgressRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#prehledRingGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="prehledRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight text-white">{value}%</span>
      </div>
    </div>
  );
}

function SubjectBar({
  label,
  value,
  barClassName,
}: {
  label: string;
  value: number;
  barClassName: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="truncate text-slate-300">{label}</span>
        <span className="shrink-0 font-semibold text-white">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full", barClassName)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

const navItems = [
  { href: "/prehled", label: "Přehled", icon: LayoutDashboard },
  { href: "/app/learn", label: "Učení", icon: GraduationCap },
  { href: "/app/mistakes", label: "Moje chyby", icon: AlertCircle },
  { href: "/app/materials", label: "Materiály", icon: BookOpen },
  { href: "/app/plan", label: "Plán", icon: CalendarDays },
  { href: "/app/progress", label: "Statistiky", icon: BarChart3 },
] as const;

const planItems = [
  ["5 min", "Opakování – co si zapomněl"],
  ["12 min", "Nová látka – Karel Hynek Mácha"],
  ["5 min", "Test – ověření znalostí"],
  ["3 min", "Kartičky – rychlé upevnění"],
] as const;

const badges = [
  {
    icon: Flame,
    color: "text-orange-400 bg-orange-500/15 ring-orange-400/30",
    label: "Série",
  },
  {
    icon: Brain,
    color: "text-blue-300 bg-blue-500/15 ring-blue-400/30",
    label: "Učení",
  },
  {
    icon: Target,
    color: "text-sky-300 bg-sky-500/15 ring-sky-400/30",
    label: "Cíl",
  },
] as const;

export function StudyDashboard({ email }: { email: string }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-[#070913] font-sans text-white antialiased">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.2),transparent_60%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-dvh max-w-7xl">
        <aside className="sticky top-0 flex h-dvh w-[4.5rem] shrink-0 flex-col border-r border-white/10 bg-[#0c0e16]/95 px-2 py-5 backdrop-blur-xl sm:w-56 sm:px-3 lg:w-64 lg:px-4">
          <div className="mb-6 flex items-center justify-center gap-2.5 sm:justify-start sm:px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.45)]">
              DM
            </span>
            <span className="hidden text-base font-bold tracking-tight text-white sm:inline">
              DámMaturu
            </span>
          </div>

          <nav className="flex flex-1 flex-col gap-1" aria-label="Studijní navigace">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === "/prehled";
              return (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-blue-500/20 text-blue-100 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.35)]"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "mx-auto h-5 w-5 shrink-0 sm:mx-0",
                      active ? "text-blue-400" : "text-slate-500",
                    )}
                    aria-hidden
                  />
                  <span className="hidden truncate sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <form action={logoutLearnerAction} className="mt-4 border-t border-white/10 pt-4">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <LogOut className="mx-auto h-5 w-5 sm:mx-0" aria-hidden />
              <span className="hidden sm:inline">Odhlásit se</span>
            </button>
          </form>
        </aside>

        <main className="min-w-0 flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6 lg:p-8">
          <GlassCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
                  Ahoj, {email}! <span aria-hidden>👋</span>
                </h1>
                <p className="mt-2 text-sm text-slate-300 sm:text-base">
                  Dnes máš 3 úkoly a 25 minut na učení.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1.5 text-sm font-semibold text-orange-300">
                <Flame
                  className="h-4 w-4 fill-orange-400 text-orange-400"
                  aria-hidden
                />
                12 dní
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-300">Dnešní pokrok</span>
                <span className="text-slate-400">25 / 25 min</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 shadow-[0_0_16px_rgba(59,130,246,0.45)]" />
              </div>
              <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-blue-300">
                <Check className="h-4 w-4" aria-hidden />
                Skvělé! Cíl splněn
              </p>
            </div>
          </GlassCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard className="flex flex-col items-center justify-center text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Celková připravenost
              </p>
              <ProgressRing value={78} />
              <p className="mt-3 text-base font-semibold text-white">Dobrá práce!</p>
            </GlassCard>

            <GlassCard>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Nejslabší oblasti
              </p>
              <div className="space-y-4">
                <SubjectBar
                  label="Romantismus"
                  value={42}
                  barClassName="bg-gradient-to-r from-blue-400 to-blue-600"
                />
                <SubjectBar
                  label="Sloh - slohové útvary"
                  value={55}
                  barClassName="bg-gradient-to-r from-sky-400 to-blue-500"
                />
                <SubjectBar
                  label="Pravopis - i/y"
                  value={63}
                  barClassName="bg-gradient-to-r from-amber-400 to-orange-500"
                />
              </div>
            </GlassCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard>
              <p className="mb-4 text-base font-semibold text-white">Dnešní plán</p>
              <ul className="space-y-3">
                {planItems.map(([time, label]) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 rounded-lg bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-300">
                      {time}
                    </span>
                    <span className="text-sm leading-snug text-slate-300">{label}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/app/learn"
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)] transition hover:brightness-110"
              >
                Pokračovat v učení
              </Link>
            </GlassCard>

            <GlassCard>
              <p className="mb-4 text-base font-semibold text-white">Moje odznaky</p>
              <div className="flex gap-3">
                {badges.map(({ icon: Icon, color, label }) => (
                  <div
                    key={label}
                    className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] py-4"
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full ring-1",
                        color,
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-xs font-medium text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-sm font-medium text-slate-500">
                Zobrazit všechny
              </p>
            </GlassCard>
          </div>
        </main>
      </div>
    </div>
  );
}
