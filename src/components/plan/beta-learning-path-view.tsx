import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import type { BetaLearningPath } from "@/domain/learning/beta-learning-path";
import { cn } from "@/lib/cn";

/**
 * Renders generated path only — no curriculum topic lists hardcoded here.
 */
export function BetaLearningPathView({ path }: { path: BetaLearningPath }) {
  return (
    <section className="space-y-5" aria-label="Beta learning path">
      <div className="space-y-2">
        <Badge tone="brand">Beta path · z kurikula</Badge>
        <h2 className="font-display text-xl text-fg">
          Learning path do {formatDateCs(path.targetDate)}
        </h2>
        <p className="text-body-sm text-fg-secondary">
          {path.curriculumTitle} · zbývá {path.daysRemaining} dní ·{" "}
          {path.studyDays} studijních (+ {path.bufferDays} buffer)
        </p>
      </div>

      <Alert
        title={path.diagnosticApplied ? "Přizpůsobeno diagnostice" : "Čeká na diagnostiku"}
        tone={path.diagnosticApplied ? "success" : "info"}
      >
        {path.adaptationNoteCs}
      </Alert>

      {path.nextTopic ? (
        <div className="rounded-xl border border-action/40 bg-action/5 px-4 py-3">
          <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Další krok
          </p>
          <p className="mt-1 font-display text-lg text-fg">
            {path.nextTopic.title}
          </p>
          <p className="text-body-sm text-fg-secondary">
            {path.nextTopic.moduleTitle}
          </p>
          <Link
            href={path.nextTopic.href}
            className="mt-2 inline-flex text-body-sm font-semibold text-action hover:underline"
          >
            Otevřít téma
          </Link>
        </div>
      ) : null}

      <ol className="space-y-4">
        {path.phases.map((phase, i) => {
          const active = phase.id === path.currentPhaseId;
          return (
            <li
              key={phase.id}
              className={cn(
                "rounded-xl border px-4 py-3",
                active ? "border-action bg-action/5" : "border-border bg-canvas",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-body-md text-fg">
                  Fáze {i + 1}: {phase.labelCs}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {active ? <Badge tone="brand">Teď</Badge> : null}
                  {phase.adaptedOrder ? (
                    <Badge tone="accent">Upraveno</Badge>
                  ) : null}
                  <Badge tone="neutral">{phase.dayCount} dní</Badge>
                </div>
              </div>
              <p className="mt-1 text-body-sm text-fg-secondary">{phase.focusCs}</p>
              <p className="mt-0.5 text-caption text-fg-muted">
                {formatDateCs(phase.startDate)} – {formatDateCs(phase.endDate)}
              </p>

              {phase.kind === "diagnostics" ? (
                <Link
                  href={phase.href ?? "/app/tests?intent=diagnostic"}
                  className="mt-3 inline-flex min-h-10 items-center rounded-md bg-action px-3 text-caption font-semibold uppercase tracking-wide text-fg-on-brand"
                >
                  Spustit diagnostiku
                </Link>
              ) : phase.topics.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {phase.topics.map((t) => (
                    <li key={t.topicId}>
                      <Link
                        href={t.href}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-body-sm text-fg hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <span>
                          <span className="font-medium">{t.title}</span>
                          <span className="text-fg-muted"> · {t.moduleTitle}</span>
                        </span>
                        {t.score != null ? (
                          <span className="tabular-nums text-caption text-fg-muted">
                            {t.score}%
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function formatDateCs(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d}. ${m}. ${y}`;
}
