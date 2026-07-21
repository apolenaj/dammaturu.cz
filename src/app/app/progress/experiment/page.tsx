import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ExperimentCheckpointActions } from "@/components/beta/experiment-checkpoint-actions";
import { getExperimentReportAction } from "@/server/actions/beta-experiment";
import {
  BETA_EXPERIMENT_FRAMING,
  retentionWindowLabelsCs,
} from "@/domain/learning/beta-experiment";

export const metadata: Metadata = {
  title: "N=1 Beta experiment",
};
export const dynamic = "force-dynamic";

export default async function ExperimentReportPage() {
  const { report, learnerId } = await getExperimentReportAction();

  if (!learnerId || !report) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-3">
        <Alert title="N=1 experiment" tone="info">
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
    <div className="mx-auto w-full max-w-2xl space-y-8 px-3 pb-14">
      <header className="space-y-2">
        <Badge tone="brand">{report.framing}</Badge>
        <h1 className="font-display text-display-md text-fg">
          Experiment — {report.displayName}
        </h1>
        <p className="text-body-md text-fg-secondary">
          Cíl {report.targetDate}. N={report.n}. {report.disclaimerCs}
        </p>
        <Alert title="Ne vědecký důkaz" tone="warning">
          {BETA_EXPERIMENT_FRAMING.claimCs}
        </Alert>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Assessmenty</h2>
        <ExperimentCheckpointActions />
        <p className="text-caption text-fg-muted">
          Weekly = témata posledních 7 dní + transfer otázky. Final = stejné
          objectives jako baseline, jiné otázky.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Start · accuracy" value={pct(report.start.diagnosticAccuracyPct)} />
        <Stat label="Start · mastery" value={pct(report.start.overallMasteryPct)} />
        <Stat label="Start · confidence" value={report.start.confidence != null ? `${report.start.confidence}/5` : "—"} />
        <Stat label="Diag. čas" value={report.start.durationMinutes != null ? `${report.start.durationMinutes} min` : "—"} />
        <Stat label="End · mastery" value={pct(report.end.overallMasteryPct)} />
        <Stat label="End · accuracy" value={pct(report.end.accuracyPct)} />
        <Stat label="Study time" value={`${report.studyTimeMinutes} min`} />
        <Stat label="Plan adherence" value={pct(report.planAdherencePct)} />
        <Stat
          label="Oral readiness"
          value={
            report.end.oralReadiness.avgScore != null
              ? `${report.end.oralReadiness.avgScore}/100`
              : "—"
          }
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-fg">Retention (LEARNED vs RETAINED)</h2>
        <p className="text-body-sm text-fg-secondary">{report.retention.noteCs}</p>
        <p className="text-body-sm text-fg-secondary">
          LEARNED {report.retention.learnedCount} · RETAINED{" "}
          {report.retention.retainedCount} · FORGOTTEN{" "}
          {report.retention.forgottenCount}
        </p>
        <ul className="space-y-1 text-body-sm">
          {report.retention.byWindow.map((w) => (
            <li key={w.window} className="flex justify-between gap-4 border-b border-border py-2">
              <span>{retentionWindowLabelsCs[w.window]}</span>
              <span className="font-semibold text-fg">
                {w.probes === 0
                  ? "zatím žádný probe"
                  : `${w.retainedPct}% (${w.probes})`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <TwoCol
        title="TOP 5 zlepšení"
        empty="Zatím žádná Δ mastery podle oblastí."
        items={report.topImprovements.map(
          (i) => `${i.title}: ${i.deltaPct > 0 ? "+" : ""}${i.deltaPct} p.b.`,
        )}
      />
      <TwoCol
        title="TOP 5 přetrvávajících slabin"
        empty="Zatím málo mastery dat."
        items={report.topWeaknesses.map(
          (w) => `${w.title}: ${w.masteryPct} %`,
        )}
      />

      <section className="grid gap-6 sm:grid-cols-2">
        <MethodList
          title="Nejefektivnější metody"
          items={report.mostEffectiveMethods}
        />
        <MethodList
          title="Nejméně efektivní metody"
          items={report.leastEffectiveMethods}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-fg">Weekly / Final</h2>
        {report.weeklyCheckpoints.length === 0 ? (
          <p className="text-body-sm text-fg-muted">Zatím žádný weekly checkpoint.</p>
        ) : (
          <ul className="space-y-1 text-body-sm">
            {report.weeklyCheckpoints.map((w) => (
              <li key={w.id}>
                {w.weekKey ?? "week"} · accuracy {pct(w.accuracyPct)} · transfer{" "}
                {pct(w.transferSharePct)}
              </li>
            ))}
          </ul>
        )}
        <p className="text-body-sm text-fg-secondary">
          Final:{" "}
          {report.finalAssessment
            ? `accuracy ${pct(report.finalAssessment.accuracyPct)}${
                report.finalAssessment.completedAt
                  ? ` · hotovo ${new Date(report.finalAssessment.completedAt).toLocaleString("cs-CZ")}`
                  : " · rozpracováno"
              }`
            : "ještě nevytvořen"}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-fg">Caveats</h2>
        <ul className="list-disc space-y-1 pl-5 text-body-sm text-fg-secondary">
          {report.caveatsCs.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <p className="text-body-sm">
        <Link href="/app/progress/beta-report" className="font-semibold text-action">
          Starší Before/After report
        </Link>
        {" · "}
        <Link href="/app/progress" className="font-semibold text-action">
          Připravenost
        </Link>
      </p>
    </div>
  );
}

function pct(v: number | null | undefined) {
  return v == null ? "—" : `${v} %`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-canvas px-3 py-3">
      <p className="text-caption uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold text-fg">{value}</p>
    </div>
  );
}

function TwoCol({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl text-fg">{title}</h2>
      {items.length === 0 ? (
        <p className="text-body-sm text-fg-muted">{empty}</p>
      ) : (
        <ol className="list-decimal space-y-1 pl-5 text-body-sm text-fg-secondary">
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      )}
    </section>
  );
}

function MethodList({
  title,
  items,
}: {
  title: string;
  items: Array<{
    method: string;
    labelCs: string;
    accuracyPct: number | null;
    attempts: number;
  }>;
}) {
  return (
    <div className="space-y-2">
      <h2 className="font-display text-lg text-fg">{title}</h2>
      {items.length === 0 ? (
        <p className="text-body-sm text-fg-muted">
          Málo dat (≥2 pokusy na metodu).
        </p>
      ) : (
        <ul className="space-y-1 text-body-sm text-fg-secondary">
          {items.map((m) => (
            <li key={m.method}>
              {m.labelCs}: {pct(m.accuracyPct)} ({m.attempts}×)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
