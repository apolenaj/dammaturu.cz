import Link from "next/link";
import {
  contentTrustIssueLabelsCs,
  contentTrustStatusLabelsCs,
  formatStudentSourceLabel,
  type ContentTrustStatus,
} from "@/domain/content/content-trust";
import type { ContentTrustReport } from "@/domain/content/content-trust-report";
import { Badge, type BadgeTone } from "@/components/ui/badge";

function statusTone(s: ContentTrustStatus): BadgeTone {
  switch (s) {
    case "VERIFIED":
      return "success";
    case "REVIEW_REQUIRED":
      return "warning";
    case "REJECTED":
      return "danger";
    case "EXTRACTED":
      return "info";
    default:
      return "neutral";
  }
}

/**
 * Internal content quality dashboard — editors only.
 */
export function ContentTrustDashboard({
  report,
}: {
  report: ContentTrustReport;
}) {
  const { summary, priorityQueue } = report;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
          Content trust
        </p>
        <h1 className="font-display text-title-lg tracking-tight text-fg">
          Kvalita obsahu
        </h1>
        <p className="max-w-2xl text-body-sm text-fg-secondary">
          Každý fakt a otázka musí mít zdroj. Autoritativní student feedback
          jen ze stavu <strong>VERIFIED</strong>. Nejistota se neskrývá.
        </p>
        <p className="text-caption text-fg-muted">
          Vygenerováno:{" "}
          {new Date(summary.generatedAt).toLocaleString("cs-CZ")} ·{" "}
          <Link
            href="/admin/reviews"
            className="font-semibold text-action hover:underline"
          >
            Content QA
          </Link>
          {" · "}
          <Link
            href="/admin/sources"
            className="font-semibold text-action hover:underline"
          >
            Zdroje
          </Link>
        </p>
      </header>

      <section
        aria-label="Souhrn"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Stat label="Celkem záznamů" value={summary.total} />
        <Stat
          label="Autoritativní feedback"
          value={summary.authoritativeCount}
          hint="VERIFIED"
        />
        <Stat
          label="Blokováno pro feedback"
          value={summary.blockedFromFeedback}
        />
        <Stat
          label="Nejistota viditelná"
          value={summary.uncertaintyExposed}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Stavy trust pipeline
        </h2>
        <ul className="flex flex-wrap gap-2">
          {(
            Object.entries(summary.byStatus) as [ContentTrustStatus, number][]
          ).map(([status, n]) => (
            <li key={status}>
              <Badge tone={statusTone(status)}>
                {status} · {contentTrustStatusLabelsCs[status]} · {n}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Detekované problémy
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {Object.entries(summary.byIssue)
            .filter(([, n]) => n > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([code, n]) => (
              <li
                key={code}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-body-sm"
              >
                <span className="text-fg">
                  {contentTrustIssueLabelsCs[
                    code as keyof typeof contentTrustIssueLabelsCs
                  ] ?? code}
                </span>
                <span className="font-semibold tabular-nums text-fg">{n}</span>
              </li>
            ))}
          {Object.values(summary.byIssue).every((n) => n === 0) ? (
            <li className="text-body-sm text-fg-muted">
              Žádné automatické nálezy v aktuálním korpusu.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Prioritní fronta
        </h2>
        <p className="text-caption text-fg-muted">
          Nejdřív rozpory, nepodložené odpovědi, OCR, chybějící klíče.
        </p>
        {priorityQueue.length === 0 ? (
          <p className="text-body-sm text-fg-muted">Fronta je prázdná.</p>
        ) : (
          <ul className="space-y-3">
            {priorityQueue.map((r) => (
              <li
                key={r.knowledgeUnitId}
                className="rounded-2xl border border-border bg-surface p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(r.trustStatus)}>
                    {r.trustStatus}
                  </Badge>
                  {r.authoritativeForFeedback ? (
                    <Badge tone="success">feedback OK</Badge>
                  ) : (
                    <Badge tone="warning">feedback blokován</Badge>
                  )}
                  {r.confidence != null ? (
                    <span className="text-caption text-fg-muted">
                      jistota {Math.round(r.confidence * 100)} %
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold text-fg">
                  {r.title}
                </h3>
                <p className="mt-1 text-body-sm text-fg-secondary">
                  {r.statement}
                </p>
                <p className="mt-2 text-caption font-medium text-fg">
                  {formatStudentSourceLabel({ sourceTitle: r.sourceTitle })}
                </p>
                {r.sourceLocation ? (
                  <p className="text-caption text-fg-muted">{r.sourceLocation}</p>
                ) : (
                  <p className="text-caption text-warning">
                    Lokalizace ve zdroji chybí
                  </p>
                )}
                {r.issues.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {r.issues.map((issue, i) => (
                      <li
                        key={`${issue.code}-${i}`}
                        className="text-caption text-fg-secondary"
                      >
                        <span className="font-semibold text-fg">
                          {contentTrustIssueLabelsCs[issue.code]}:
                        </span>{" "}
                        {issue.reasonCs}
                        {issue.evidence ? ` — ${issue.evidence}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-caption text-fg-muted">
                  Aktualizace:{" "}
                  {new Date(r.lastUpdated).toLocaleString("cs-CZ")}
                  {r.reviewedBy ? ` · ${r.reviewedBy}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-xs">
      <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-fg">
        {value}
      </p>
      {hint ? <p className="text-caption text-fg-muted">{hint}</p> : null}
    </div>
  );
}
