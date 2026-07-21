import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import type { AdminBetaDashboard } from "@/domain/learning/beta-profile";
import { cn } from "@/lib/cn";

export function AdminBetaDashboardView({ dash }: { dash: AdminBetaDashboard }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-1 pb-12">
      <header className="space-y-2">
        <Badge tone="brand">Private BETA · PO</Badge>
        <h1 className="font-display text-display-md text-fg">
          Beta learning loop
        </h1>
        <p className="text-body-md text-fg-secondary">
          Cíl {dash.targetDateLabelCs} · zbývá {dash.daysRemaining} dní ·{" "}
          {dash.learnerCount} learner
          {dash.learnerCount === 1 ? "" : "s"} (opaque keys only)
        </p>
      </header>

      <Alert title="Privacy" tone="info">
        {dash.privacyNoteCs}
      </Alert>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Product insights</h2>
        <p className="text-body-sm text-fg-secondary">
          Co dělat dál — ne vanity grafy.
        </p>
        <ul className="space-y-3">
          {dash.insights.map((insight) => (
            <li
              key={insight.id}
              className={cn(
                "rounded-xl border px-4 py-3",
                insight.severity === "act" &&
                  "border-danger/40 bg-danger-soft/20",
                insight.severity === "watch" &&
                  "border-warning/40 bg-warning-soft/20",
                insight.severity === "info" && "border-border bg-subtle/40",
              )}
            >
              <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
                {insight.severity === "act"
                  ? "Jednej"
                  : insight.severity === "watch"
                    ? "Sleduj"
                    : "OK"}
              </p>
              <p className="mt-1 font-display text-lg text-fg">
                {insight.titleCs}
              </p>
              <p className="mt-1 text-body-sm text-fg-secondary">
                {insight.bodyCs}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Sessions completed" value={String(dash.sessionsCompleted)} />
        <Stat label="Minutes studied" value={String(dash.minutesStudied)} />
        <Stat label="Questions answered" value={String(dash.questionsAnswered)} />
        <Stat
          label="Accuracy"
          value={dash.accuracyPct != null ? `${dash.accuracyPct} %` : "—"}
        />
        <Stat
          label="Mastery delta"
          value={
            dash.masteryDeltaPct != null
              ? `${dash.masteryDeltaPct > 0 ? "+" : ""}${dash.masteryDeltaPct}`
              : "—"
          }
        />
        <Stat label="Cohort" value={dash.cohortId} small />
      </section>

      <DataTable
        title="Topics neglected"
        empty="Žádná zanedbaná témata v okně."
        rows={dash.topicsNeglected.map((t) => [
          t.topicSlug,
          t.daysSince != null ? `${t.daysSince} dní` : "nikdy",
        ])}
        headers={["Topic", "Od poslední aktivity"]}
      />

      <DataTable
        title="Drop-off points"
        empty="Zatím bez drop-off signálů."
        rows={dash.dropOffPoints.map((d) => [d.dropOffAt, String(d.count)])}
        headers={["Kde odešla", "×"]}
      />

      <DataTable
        title="Most common errors"
        empty="Zatím bez agregovaných chyb."
        rows={dash.mostCommonErrors.map((e) => [
          e.labelCs,
          String(e.count),
        ])}
        headers={["Typ chyby", "×"]}
      />

      <DataTable
        title="Feature usage"
        empty="Zatím bez usage."
        rows={dash.featureUsage.map((f) => [
          f.feature,
          `${f.sessions} sess`,
          `${f.minutes} min`,
        ])}
        headers={["Feature", "Sessions", "Min"]}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-canvas px-3 py-3">
      <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-fg",
          small ? "truncate text-body-sm font-semibold" : "font-display text-xl",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DataTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl text-fg">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-body-sm text-fg-secondary">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[280px] text-left text-body-sm">
            <thead className="bg-subtle/60 text-caption uppercase tracking-wider text-fg-muted">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row[0]}-${i}`} className="border-t border-border">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-fg">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
