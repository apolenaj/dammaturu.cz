import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getBeforeAfterReportAction } from "@/server/actions/beta-feedback";

export const metadata: Metadata = { title: "Before / After · Beta" };
export const dynamic = "force-dynamic";

export default async function BetaReportPage() {
  const { report, learnerId } = await getBeforeAfterReportAction();

  if (!learnerId || !report) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Alert title="Before / After" tone="info">
          Nejdřív dokonči{" "}
          <Link href="/onboarding" className="font-semibold underline">
            onboarding
          </Link>
          .
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-1 pb-12">
      <header className="space-y-2">
        <Badge tone="brand">Beta 1.0 report</Badge>
        <h1 className="font-display text-display-md text-fg">
          Before / After — {report.displayName}
        </h1>
        <p className="text-body-md text-fg-secondary">
          Cíl {report.targetDate}. {report.summaryCs}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Diagnostic baseline"
          value={
            report.diagnosticBaseline
              ? `${report.diagnosticBaseline.accuracyPct} %`
              : "—"
          }
        />
        <Stat
          label="Final mastery"
          value={
            report.finalMasteryPct != null
              ? `${report.finalMasteryPct} %`
              : "—"
          }
        />
        <Stat
          label="Accuracy Δ"
          value={
            report.accuracyImprovementPct != null
              ? `${report.accuracyImprovementPct > 0 ? "+" : ""}${report.accuracyImprovementPct} p.b.`
              : "—"
          }
        />
        <Stat
          label="Retention proxy"
          value={
            report.retentionProxyPct != null
              ? `${report.retentionProxyPct} %`
              : "—"
          }
        />
        <Stat
          label="Study time"
          value={`${report.studyTimeMinutes} min`}
        />
        <Stat
          label="Topics mastered"
          value={String(report.topicsMastered.length)}
        />
      </section>

      {report.diagnosticBaseline ? (
        <section className="space-y-2">
          <h2 className="font-display text-xl text-fg">Baseline detail</h2>
          <p className="text-body-sm text-fg-secondary">
            {report.diagnosticBaseline.attempts} pokusů ·{" "}
            {report.diagnosticBaseline.correct} správně · pack{" "}
            {report.diagnosticBaseline.packSlug} ·{" "}
            {new Date(report.diagnosticBaseline.completedAt).toLocaleString(
              "cs-CZ",
            )}
          </p>
        </section>
      ) : (
        <Alert title="Chybí diagnostika" tone="warning">
          Spusť{" "}
          <Link
            href="/app/tests?intent=diagnostic"
            className="font-semibold underline"
          >
            vstupní diagnostiku
          </Link>{" "}
          (min. 8 otázek), aby šel spočítat before/after.
        </Alert>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-xl text-fg">Topics mastered</h2>
        {report.topicsMastered.length === 0 ? (
          <p className="text-body-sm text-fg-secondary">Zatím žádné (≥80).</p>
        ) : (
          <ul className="space-y-1 text-body-sm text-fg">
            {report.topicsMastered.map((t) => (
              <li key={t.id}>
                {t.title} — {t.score}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-fg">Weaknesses remaining</h2>
        {report.weaknessesRemaining.length === 0 ? (
          <p className="text-body-sm text-fg-secondary">
            Žádné slabé oblasti ve snapshotu (nebo málo evidence).
          </p>
        ) : (
          <ul className="space-y-1 text-body-sm text-fg">
            {report.weaknessesRemaining.map((w) => (
              <li key={w.labelCs}>
                {w.labelCs} — {w.pct} %
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/app/progress"
        className="text-body-sm font-semibold text-action hover:underline"
      >
        ← Připravenost
      </Link>
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
