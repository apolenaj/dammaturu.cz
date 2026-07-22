"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const studyPhases = [
  "question",
  "answer",
  "feedback",
  "explanation",
  "source",
  "next",
] as const;

export type StudyPhase = (typeof studyPhases)[number];

export const studyPhaseLabelsCs: Record<StudyPhase, string> = {
  question: "Otázka",
  answer: "Tvoje odpověď",
  feedback: "Zpětná vazba",
  explanation: "Vysvětlení",
  source: "Zdroj",
  next: "Další",
};

const phaseShell: Record<StudyPhase, string> = {
  question: "border-border bg-surface shadow-xs",
  answer: "border-action/25 bg-action-soft/30",
  feedback: "border-border bg-subtle/80",
  explanation: "border-border-subtle bg-canvas",
  source: "border-border-subtle bg-surface-muted/80",
  next: "border-transparent bg-transparent shadow-none",
};

/**
 * Visual frame for focused study session phases.
 * Keeps question → answer → feedback → explanation → source distinct.
 */
export function StudyPhaseFrame({
  phase,
  children,
  className,
  showLabel = true,
}: {
  phase: StudyPhase;
  children: ReactNode;
  className?: string;
  showLabel?: boolean;
}) {
  const labelId = useId();
  return (
    <section
      data-study-phase={phase}
      aria-labelledby={showLabel ? labelId : undefined}
      aria-label={!showLabel ? studyPhaseLabelsCs[phase] : undefined}
      className={cn(
        "rounded-2xl border px-4 py-4 transition duration-base ease-out animate-in-rise sm:px-5 sm:py-5",
        phaseShell[phase],
        className,
      )}
    >
      {showLabel ? (
        <p
          id={labelId}
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted"
        >
          {studyPhaseLabelsCs[phase]}
        </p>
      ) : null}
      {children}
    </section>
  );
}

/** Compact session chrome: progress + calm title. One-handed mobile friendly. */
export function StudySessionChrome({
  title,
  progressLabel,
  children,
  className,
}: {
  title: string;
  progressLabel: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-lg space-y-5",
        className,
      )}
      role="region"
      aria-label={title}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="min-w-0 font-display text-title-md tracking-tight text-fg text-balance">
          {title}
        </h1>
        <p
          className="shrink-0 text-caption font-semibold tabular-nums text-fg-muted"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="sr-only">Postup: </span>
          {progressLabel}
        </p>
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  );
}
