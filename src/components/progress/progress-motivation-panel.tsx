import Link from "next/link";
import type { ProgressMotivationView } from "@/domain/learning/progress-gamification";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

/**
 * Elegant progress strip — real progress first, XP as footnote.
 * No avatars / diamonds.
 */
export function ProgressMotivationPanel({
  view,
  compact = false,
}: {
  view: ProgressMotivationView;
  compact?: boolean;
}) {
  const unlockedCount = view.milestones.filter((m) => m.unlocked).length;

  return (
    <section
      aria-label="Postup k cíli"
      className={cn(
        "space-y-4 rounded-2xl border border-border bg-canvas px-4 py-4",
        compact && "space-y-3",
      )}
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">Postup</Badge>
          <span className="text-caption text-fg-muted">
            Primární = cíl · XP sekundární
          </span>
        </div>
        <p className="font-display text-lg text-fg">{view.primaryGoalCs}</p>
        {!compact ? (
          <p className="text-caption text-fg-secondary">{view.philosophyCs}</p>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label="Dnešní mise"
          value={
            view.dailyMission.completed
              ? "Hotovo"
              : `${view.dailyMission.stepsDone}/${view.dailyMission.stepsTotal}`
          }
          href={view.dailyMission.href}
        />
        <Metric
          label="Týdenní cíl"
          value={`${view.weeklyGoal.completedDays}/${view.weeklyGoal.targetDays}`}
          hint={view.weeklyGoal.remainingCs}
        />
        <Metric label="Série" value={view.streak.labelCs} />
        <Metric
          label="Zvládnutí"
          value={
            view.mastery.overallPct != null
              ? `${view.mastery.overallPct} %`
              : "—"
          }
          hint={
            view.mastery.masteredKuCount === 1
              ? "1 zvládnutý bod"
              : `${view.mastery.masteredKuCount} zvládnutých bodů`
          }
          href="/app/progress"
        />
      </div>

      {!compact ? (
        <>
          <div>
            <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Milníky ({unlockedCount}/{view.milestones.length})
            </p>
            <ul className="mt-2 space-y-2">
              {view.milestones.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "rounded-xl border px-3 py-2",
                    m.unlocked
                      ? "border-success/30 bg-success-soft/20"
                      : "border-border bg-subtle/40",
                  )}
                >
                  <p
                    className={cn(
                      "text-body-sm font-semibold",
                      m.unlocked ? "text-fg" : "text-fg-secondary",
                    )}
                  >
                    {m.unlocked ? "✓ " : "○ "}
                    {m.titleCs}
                  </p>
                  <p className="text-caption text-fg-muted">{m.descriptionCs}</p>
                  {m.unlocked ? (
                    <p className="mt-0.5 text-caption text-fg-secondary">
                      {m.studyWhyCs}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {view.topicCompletions.length > 0 ? (
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
                Zvládnutá témata
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {view.topicCompletions.map((t) => (
                  <li key={t.topicId}>
                    <Badge tone="success">
                      {t.labelCs} zvládnut · {Math.round(t.pct)} %
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Personal bests
            </p>
            <ul className="mt-1 space-y-1 text-body-sm text-fg-secondary">
              {view.personalBests.linesCs.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Link
              href="/app/simulation"
              className="mt-2 inline-block text-caption font-semibold text-action hover:underline"
            >
              Zkouška nanečisto →
            </Link>
          </div>
        </>
      ) : (
        <p className="text-caption text-fg-secondary">
          Milestones {unlockedCount}/{view.milestones.length}
          {view.topicCompletions.length > 0
            ? ` · ${view.topicCompletions.length} témat hotovo`
            : ""}
          {" · "}
          <Link href="/app/progress" className="font-semibold text-action hover:underline">
            detail
          </Link>
        </p>
      )}

      <p className="text-caption text-fg-muted">{view.secondaryXpNoteCs}</p>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-body-md text-fg">{value}</p>
      {hint ? (
        <p className="mt-0.5 line-clamp-2 text-caption text-fg-secondary">
          {hint}
        </p>
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-xl border border-border bg-subtle/40 px-3 py-2 transition hover:border-action/40"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-subtle/40 px-3 py-2">
      {inner}
    </div>
  );
}
