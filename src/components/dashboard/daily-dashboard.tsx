"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  completeDailyMissionAction,
  markDailyStepDoneAction,
} from "@/server/actions/daily-dashboard";
import type { DailyDashboardView } from "@/domain/learning/daily-dashboard";
import type {
  LearningCelebration,
  ProgressMotivationView,
} from "@/domain/learning/progress-gamification";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CelebrateMoment,
  ProgressSteps,
  StreakPill,
} from "@/components/ui/celebrate";
import { Progress } from "@/components/ui/progress";
import { ProgressMotivationPanel } from "@/components/progress/progress-motivation-panel";
import { LearningCelebrationQueue } from "@/components/progress/learning-celebration-queue";
import { cn } from "@/lib/cn";

export function DailyDashboard({
  initialView,
  initialMotivation,
  initialCelebrations = [],
}: {
  initialView: DailyDashboardView;
  initialMotivation?: ProgressMotivationView | null;
  initialCelebrations?: LearningCelebration[];
}) {
  const [view, setView] = useState(initialView);
  const [motivation, setMotivation] = useState(initialMotivation ?? null);
  const [celebrations, setCelebrations] =
    useState<LearningCelebration[]>(initialCelebrations);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const doneCount = view.steps.filter((s) => s.done).length;
  const progressPct =
    view.steps.length === 0
      ? 0
      : Math.round((doneCount / view.steps.length) * 100);

  function markStep(stepId: string) {
    setError(null);
    startTransition(async () => {
      const res = await markDailyStepDoneAction({ stepId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setView(res.view);
      if (res.celebrations.length) setCelebrations(res.celebrations);
      if (res.motivation) setMotivation(res.motivation);
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
      if (res.celebrations.length) setCelebrations(res.celebrations);
      if (res.motivation) setMotivation(res.motivation);
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 sm:space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {view.secondary.streakDays > 0 ? (
            <StreakPill days={view.secondary.streakDays} />
          ) : null}
        </div>
        <h1 className="font-display text-display-md tracking-tight text-fg text-balance">
          {view.greetingCs}
        </h1>
        <p className="text-body-md text-fg-secondary">{view.daysRemainingCs}</p>
        <p className="font-display text-title-md tracking-tight text-fg text-balance">
          {view.questionCs}
        </p>
      </header>

      {celebrations.length > 0 ? (
        <LearningCelebrationQueue
          key={celebrations.map((c) => c.id).join("|")}
          initial={celebrations}
        />
      ) : null}

      {motivation ? (
        <ProgressMotivationPanel view={motivation} compact />
      ) : null}

      {!view.completed ? (
        <Link
          href="/app/minute"
          className="flex min-h-14 touch-manipulation items-center justify-between gap-3 rounded-2xl border border-action/25 bg-action-soft/50 px-4 py-3 shadow-xs transition hover:border-action/40 hover:bg-action-soft active:scale-[0.99]"
        >
          <span>
            <span className="block text-body-md font-semibold text-fg">
              1 minuta učení
            </span>
            <span className="block text-caption text-fg-secondary">
              Autobus? Spusť hned — bez rozhodování.
            </span>
          </span>
          <span className="shrink-0 text-body-sm font-semibold text-action">
            Start →
          </span>
        </Link>
      ) : null}

      {view.completed && view.completionCs && celebrations.length === 0 ? (
        <CelebrateMoment
          title={view.completionCs}
          description={
            view.secondary.streakDays > 0
              ? `${view.secondary.streakDays} dní v řadě — drž tempo.`
              : "Dnes je hotovo. Zítra pokračuj od mise."
          }
          actionLabel="Podívat se na pokrok"
          actionHref="/app/progress"
        />
      ) : null}

      {!view.completed ? (
        <section className="space-y-6 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-overline text-action">{view.planTitleCs}</p>
              <span className="text-caption font-semibold tabular-nums text-fg-muted">
                {doneCount}/{view.steps.length}
              </span>
            </div>
            <Progress
              value={progressPct}
              label="Dnešní postup"
              showValue
              size="md"
              celebrate={progressPct >= 100}
            />
            <ProgressSteps
              steps={view.steps.map((step, i) => ({
                id: step.id,
                label: `Krok ${i + 1}`,
                done: step.done,
                current: !step.done && view.steps.slice(0, i).every((s) => s.done),
              }))}
            />
          </div>

          <ol className="space-y-3">
            {view.steps.map((step, i) => (
              <li
                key={step.id}
                className={cn(
                  "rounded-xl border px-3.5 py-3 transition duration-fast",
                  step.done
                    ? "border-success/25 bg-success-soft/40"
                    : "border-border bg-canvas",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-bold",
                      step.done
                        ? "bg-success text-fg-on-brand"
                        : "bg-subtle text-fg",
                    )}
                  >
                    {step.done ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {step.done ? (
                      <p className="text-body-md text-fg-muted line-through">
                        {step.labelCs}
                      </p>
                    ) : (
                      <Link
                        href={step.href}
                        className="text-body-md font-semibold text-action transition hover:underline"
                      >
                        {step.labelCs}
                      </Link>
                    )}
                    {!step.done && step.reasonCs ? (
                      <p className="mt-1 text-caption text-fg-secondary">
                        {step.reasonCs}
                      </p>
                    ) : null}
                    {!step.done ? (
                      <p className="mt-1.5 text-caption text-fg-muted">
                        Po session se krok označí automaticky.{" "}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => markStep(step.id)}
                          className="font-semibold text-action hover:underline"
                        >
                          Potvrdit hotové
                        </button>
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <p className="text-body-sm text-fg-secondary">{view.totalMinutesCs}</p>

          <div className="flex flex-col gap-2">
            <Link
              href={view.ctaHref}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-action px-5 text-body-sm font-semibold tracking-wide text-fg-on-brand shadow-xs transition duration-fast ease-out hover:bg-action-hover hover:shadow-sm active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
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
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
