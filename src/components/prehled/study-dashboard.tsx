import Link from "next/link";
import {
  Brain,
  Check,
  Flame,
  Target,
} from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import { cn } from "@/lib/cn";

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
    <>
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
            href="/uceni"
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
    </>
  );
}
