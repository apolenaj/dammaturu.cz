"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import type { LearningAnalyticsDashboard } from "@/domain/learning/learning-analytics";
import { exportAnonymizedLearningDataAction } from "@/server/actions/learning-analytics";
import { cn } from "@/lib/cn";

export function AdminLearningAnalyticsView({
  dash,
}: {
  dash: LearningAnalyticsDashboard;
}) {
  const [pending, startTransition] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);

  function onExport() {
    setExportError(null);
    startTransition(async () => {
      const result = await exportAnonymizedLearningDataAction();
      if (!result.ok) {
        setExportError(result.error);
        return;
      }
      const blob = new Blob([JSON.stringify(result.export, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dammaturu-learning-analytics-${result.export.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-1 pb-12">
      <header className="space-y-2">
        <Badge tone="brand">Learning analytics · D-049</Badge>
        <h1 className="font-display text-display-md text-fg">
          Učí se student skutečně?
        </h1>
        <p className="text-body-md text-fg-secondary">
          {dash.questionsAnswered.actuallyLearningCs}
        </p>
        <p className="text-caption text-fg-muted">
          {dash.eventCount} eventů · vygenerováno{" "}
          {new Date(dash.generatedAt).toLocaleString("cs-CZ")}
        </p>
      </header>

      <Alert title="Privacy-first" tone="info">
        {dash.privacyNoteCs}
      </Alert>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onExport}
          disabled={pending}
          className={cn(
            "rounded-lg border border-border bg-canvas px-4 py-2 text-body-sm font-semibold text-fg",
            "hover:bg-subtle/60 disabled:opacity-50",
          )}
        >
          {pending ? "Exportuji…" : "Exportovat anonymizovaná beta data"}
        </button>
        {exportError ? (
          <p className="text-body-sm text-danger">{exportError}</p>
        ) : null}
      </div>

      {dash.contentErrorSignals.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-fg">
            Signály chyb v obsahu
          </h2>
          <ul className="space-y-3">
            {dash.contentErrorSignals.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "rounded-xl border px-4 py-3",
                  s.severity === "act" &&
                    "border-danger/40 bg-danger-soft/20",
                  s.severity === "watch" &&
                    "border-warning/40 bg-warning-soft/20",
                )}
              >
                <p className="font-display text-lg text-fg">{s.titleCs}</p>
                <p className="mt-1 text-body-sm text-fg-secondary">{s.bodyCs}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Active learners"
          value={String(dash.questionsAnswered.activeLearners)}
        />
        <Stat
          label="Learning time"
          value={`${dash.learningTimeMinutes} min`}
        />
        <Stat
          label="Retention proxy"
          value={
            dash.retentionProxy.pct != null
              ? `${dash.retentionProxy.pct} %`
              : "—"
          }
        />
        <Stat
          label="Lesson completion"
          value={
            dash.completion.lessonStartToCompletePct != null
              ? `${dash.completion.lessonStartToCompletePct} %`
              : "—"
          }
        />
        <Stat
          label="Reviews done"
          value={String(dash.questionsAnswered.reviewsCompleted)}
        />
        <Stat
          label="Simulations"
          value={String(dash.questionsAnswered.simulationsCompleted)}
        />
      </section>

      <p className="text-body-sm text-fg-secondary">
        {dash.retentionProxy.labelCs} · {dash.completion.labelCs} ·{" "}
        {dash.forgettingSignals.labelCs}
      </p>

      <TrendTable
        title="Accuracy trend"
        empty="Zatím bez graded answers."
        headers={["Den", "Accuracy"]}
        rows={dash.accuracyTrend.map((r) => [
          r.dateKey,
          `${r.accuracyPct} %`,
        ])}
      />

      <TrendTable
        title="Mastery trend"
        empty="Zatím bez mastery_changed."
        headers={["Den", "Avg mastery"]}
        rows={dash.masteryTrend.map((r) => [r.dateKey, `${r.avgScore}`])}
      />

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">
          Která metoda funguje?
        </h2>
        {dash.methodEffectiveness.length === 0 ? (
          <p className="text-body-sm text-fg-secondary">Bez method dat.</p>
        ) : (
          <ul className="space-y-2">
            {dash.methodEffectiveness.map((m) => (
              <li
                key={m.method}
                className="rounded-xl border border-border bg-canvas px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-lg text-fg">{m.labelCs}</p>
                  <p className="text-caption text-fg-muted">
                    {m.events} evt · {m.completions} done
                    {m.accuracyPct != null ? ` · ${m.accuracyPct} %` : ""}
                    {m.avgRating != null ? ` · rating ${m.avgRating}` : ""}
                  </p>
                </div>
                <p className="mt-1 text-body-sm text-fg-secondary">
                  {m.verdictCs}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TrendTable
        title="Weak topics"
        empty="Žádná slabá témata (≥3 pokusy)."
        headers={["Topic", "Accuracy", "Wrong"]}
        rows={dash.weakTopics.map((t) => [
          t.topicSlug,
          `${t.accuracyPct} %`,
          String(t.incorrect),
        ])}
      />

      <TrendTable
        title="Question quality"
        empty="Žádné flagged otázky."
        headers={["Item", "Flag", "Correct %", "n"]}
        rows={dash.questionQuality.map((q) => [
          q.itemId,
          q.flagCs,
          `${q.correctPct} %`,
          String(q.attempts),
        ])}
      />

      <TrendTable
        title="Kde odpadá?"
        empty="Bez drop-off signálů."
        headers={["Kde", "×"]}
        rows={dash.dropOffs.map((d) => [d.at, String(d.count)])}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-canvas px-3 py-3">
      <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-xl text-fg">{value}</p>
    </div>
  );
}

function TrendTable({
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
