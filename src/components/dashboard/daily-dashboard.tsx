"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  completeDailyMissionAction,
  markDailyStepDoneAction,
} from "@/server/actions/daily-dashboard";
import { formatWeekDeltaCs } from "@/domain/learning/readiness";
import type { DailyDashboardView } from "@/domain/learning/daily-dashboard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/chart";
import { cn } from "@/lib/cn";

export function DailyDashboard({
  initialView,
}: {
  initialView: DailyDashboardView;
}) {
  const [view, setView] = useState(initialView);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function markStep(stepId: string) {
    setError(null);
    startTransition(async () => {
      const res = await markDailyStepDoneAction({ stepId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setView(res.view);
    });
  }

  function completeDay() {
    setError(null);
    startTransition(async () => {
      const res = await completeDailyMissionAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setView(res.view);
    });
  }

  const s = view.secondary;

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      {/* Hero — one job: orient + remove choice anxiety */}
      <header className="space-y-2">
        <h1 className="font-display text-display-md text-fg">
          {view.greetingCs}
        </h1>
        <p className="text-body-md text-fg-secondary">{view.daysRemainingCs}</p>
      </header>

      {view.completed && view.completionCs ? (
        <section className="space-y-4 rounded-2xl border border-success/30 bg-success-soft/30 px-5 py-6">
          <Badge tone="success">Hotovo</Badge>
          <p className="font-display text-xl text-fg">{view.completionCs}</p>
          <Link
            href="/app/progress"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold uppercase tracking-wide text-fg-on-brand shadow-xs transition hover:bg-action-hover"
          >
            Připravenost
          </Link>
        </section>
      ) : (
        <section className="space-y-5">
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.14em] text-fg-muted">
              {view.planTitleCs}
            </p>
            <ol className="mt-4 space-y-3">
              {view.steps.map((step, i) => (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-start gap-3 text-body-md",
                    step.done && "text-fg-muted line-through",
                  )}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-subtle text-caption font-semibold text-fg">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {step.done ? (
                      <p className="text-fg">{step.labelCs}</p>
                    ) : (
                      <Link
                        href={step.href}
                        className="font-semibold text-action hover:underline"
                      >
                        {step.labelCs}
                      </Link>
                    )}
                    {!step.done ? (
                      <p className="mt-1 text-caption text-fg-muted">
                        Po session se krok označí automaticky. Manuálně jen když
                        session doběhla offline:
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => markStep(step.id)}
                          className="ml-1 font-semibold text-action hover:underline"
                        >
                          Potvrdit hotové
                        </button>
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-body-sm text-fg-secondary">
              {view.totalMinutesCs}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href={view.ctaHref}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold uppercase tracking-wide text-fg-on-brand shadow-xs transition hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              {view.ctaLabelCs}
            </Link>
            {view.steps.every((s) => s.done) ? (
              <Button
                variant="ghost"
                fullWidth
                disabled={pending}
                onClick={completeDay}
              >
                Potvrdit dokončení dne
              </Button>
            ) : (
              <p className="text-center text-caption text-fg-muted">
                Kroky označ až po skutečné session — bez zkratky „celý den hotový“.
              </p>
            )}
          </div>
        </section>
      )}

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}

      {/* Secondary — compact signals, not a second dashboard */}
      <section
        aria-label="Přehled"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        <SignalCard
          href={s.readinessHref}
          title="Připravenost"
          value={s.readinessPct != null ? `${s.readinessPct} %` : "—"}
          hint={
            s.weekDeltaPct != null
              ? formatWeekDeltaCs(s.weekDeltaPct)
              : undefined
          }
        />
        <SignalCard
          href={s.weakHref ?? "/app/mistakes"}
          title="Slabá místa"
          value={s.weakLabelCs ?? "—"}
          hint="Cílená session"
        />
        <SignalCard
          href="/app/dashboard"
          title="Streak"
          value={s.streakDays > 0 ? `${s.streakDays} dní` : "0"}
          hint="Po sobě jdoucí dny"
        />
        <div className="col-span-2 rounded-xl border border-border bg-subtle/50 px-3 py-3 sm:col-span-2">
          <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Týdenní připravenost
          </p>
          <div className="mt-2 flex items-end justify-between gap-2">
            {s.weeklySpark.length >= 2 ? (
              <Sparkline
                values={s.weeklySpark}
                aria-label="Týdenní připravenost"
              />
            ) : (
              <p className="text-body-sm text-fg-secondary">
                Zatím málo dat — spark se objeví po cvičení.
              </p>
            )}
            {s.weekDeltaPct != null ? (
              <span className="text-body-sm font-semibold tabular-nums text-fg">
                {formatWeekDeltaCs(s.weekDeltaPct)}
              </span>
            ) : null}
          </div>
        </div>
        <SignalCard
          href="/app/review/mixed"
          title="Nadcházející review"
          value={String(s.upcomingReviews)}
          hint="Due položky"
        />
      </section>
    </div>
  );
}

function SignalCard({
  href,
  title,
  value,
  hint,
}: {
  href: string;
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-canvas px-3 py-3 transition hover:border-action/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
        {title}
      </p>
      <p className="mt-1 font-display text-lg text-fg">{value}</p>
      {hint ? (
        <p className="mt-0.5 text-caption text-fg-secondary">{hint}</p>
      ) : null}
    </Link>
  );
}
