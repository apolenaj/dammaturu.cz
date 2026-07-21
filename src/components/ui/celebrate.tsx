import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export type CelebrateMomentProps = {
  title: string;
  description?: string;
  /** Optional primary follow-up. */
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Calm celebratory moment — motivating, not childish.
 * Use after mission complete, streak, mastery bump.
 */
export function CelebrateMoment({
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
  children,
}: CelebrateMomentProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-action/25 bg-gradient-to-br from-action-soft/70 via-surface to-accent-soft/30 px-5 py-6 shadow-lift animate-in-pop",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-action/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-action text-fg-on-brand shadow-sm"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-check-draw"
                style={{ strokeDasharray: 24 }}
              />
            </svg>
          </span>
          <div className="space-y-1">
            <p className="font-display text-title-sm tracking-tight text-fg text-balance">
              {title}
            </p>
            {description ? (
              <p className="max-w-md text-body-sm text-fg-secondary">
                {description}
              </p>
            ) : null}
            {children}
          </div>
        </div>
        {actionLabel && (onAction || actionHref) ? (
          actionHref ? (
            <a
              href={actionHref}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-action px-4 text-body-sm font-semibold text-fg-on-brand transition duration-fast ease-out hover:bg-action-hover active:scale-[0.985]"
            >
              {actionLabel}
            </a>
          ) : (
            <Button type="button" onClick={onAction} className="shrink-0">
              {actionLabel}
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}

export type StreakPillProps = HTMLAttributes<HTMLSpanElement> & {
  days: number;
  label?: string;
};

/** Compact streak / consistency signal. */
export function StreakPill({
  days,
  label = "dní v řadě",
  className,
  ...props
}: StreakPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-caption font-semibold text-accent-hover",
        className,
      )}
      {...props}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-accent animate-celebrate"
        aria-hidden
      />
      <span className="tabular-nums">{days}</span>
      <span>{label}</span>
    </span>
  );
}

export type ProgressStepsProps = {
  steps: Array<{ id: string; label: string; done?: boolean; current?: boolean }>;
  className?: string;
};

/** Horizontal step progress for missions / sessions. */
export function ProgressSteps({ steps, className }: ProgressStepsProps) {
  return (
    <ol
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label="Postup"
    >
      {steps.map((step, i) => (
        <li key={step.id} className="flex items-center gap-2">
          {i > 0 ? (
            <span className="h-px w-3 bg-border" aria-hidden />
          ) : null}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold transition duration-fast",
              step.done && "bg-success-soft text-success",
              step.current && !step.done && "bg-action-soft text-action",
              !step.done && !step.current && "bg-subtle text-fg-muted",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                step.done && "bg-success text-fg-on-brand",
                step.current && !step.done && "bg-action text-fg-on-brand",
                !step.done && !step.current && "bg-border text-fg-muted",
              )}
              aria-hidden
            >
              {step.done ? "✓" : i + 1}
            </span>
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
