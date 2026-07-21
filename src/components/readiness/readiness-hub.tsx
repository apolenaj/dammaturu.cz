"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loadDemoReadinessAction } from "@/server/actions/readiness";
import {
  formatWeekDeltaCs,
  readinessToScoreMastery,
  type ReadinessSnapshot,
} from "@/domain/learning/readiness";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Score } from "@/components/ui/score";

export function ReadinessHub({
  initialSnapshot,
  learnerId,
  hasBook,
}: {
  initialSnapshot: ReadinessSnapshot | null;
  learnerId: string | null;
  hasBook: boolean;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadDemo() {
    setError(null);
    startTransition(async () => {
      const res = await loadDemoReadinessAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSnapshot(res.snapshot);
    });
  }

  if (!learnerId) {
    return (
      <Alert title="Onboarding" tone="info">
        Pro Připravenost dokonči onboarding.
      </Alert>
    );
  }

  if (!snapshot) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <header className="space-y-2">
          <Badge tone="brand">Připravenost</Badge>
          <h1 className="font-display text-display-md text-fg">
            Celková připravenost
          </h1>
          <p className="text-body-md text-fg-secondary">
            Metrika z mastery coverage učiva — ne predikce úspěchu u maturity.
          </p>
        </header>
        {error ? (
          <Alert title="Chyba" tone="danger">
            {error}
          </Alert>
        ) : null}
        <Alert title="Zatím bez dat" tone="info">
          {hasBook
            ? "Kniha existuje, ale snapshot chybí."
            : "Procvičuj (testy, review, flashcards) — připravenost se plní z reálné evidence, ne z ukázky."}
        </Alert>
        <Link
          href="/app/dashboard"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold uppercase tracking-wide text-fg-on-brand"
        >
          Jít na dnešní misi
        </Link>
        {process.env.NODE_ENV !== "production" &&
        process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "1" ? (
          <Button fullWidth disabled={pending} onClick={loadDemo} variant="ghost">
            [Dev] Načíst ukázkovou připravenost
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header className="space-y-3 text-center sm:text-left">
        <Badge tone="brand">Připravenost</Badge>
        <h1 className="font-display text-display-md text-fg">
          Celková připravenost
        </h1>
        <p className="text-body-sm text-fg-secondary">
          Vážené mastery coverage — ne „šance složit maturitu“.
        </p>
      </header>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
        <Score
          value={snapshot.overallPct}
          label="CELKOVÁ PŘIPRAVENOST"
          mastery={readinessToScoreMastery(snapshot.overallPct)}
          size="lg"
        />
        <div className="space-y-3 text-center sm:pt-4 sm:text-left">
          <p className="font-display text-2xl tabular-nums text-fg">
            {snapshot.overallPct} %
          </p>
          <Badge
            tone={
              snapshot.weekDeltaPct > 0
                ? "success"
                : snapshot.weekDeltaPct < 0
                  ? "warning"
                  : "neutral"
            }
          >
            {formatWeekDeltaCs(snapshot.weekDeltaPct)}
          </Badge>
          {snapshot.lowEvidence ? (
            <p className="text-caption text-fg-muted">
              Některé KU mají málo graded evidence — ber čísla opatrně.
            </p>
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Oblasti</h2>
        <ul className="space-y-3">
          {snapshot.areas.map((area) => (
            <li key={area.id}>
              <AreaBar
                label={area.labelCs}
                pct={area.pct}
                href={area.sessionHref}
                cta={area.sessionLabelCs}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">3 silné oblasti</h2>
        <ul className="space-y-2">
          {snapshot.strongAreas.map((a) => (
            <li
              key={`strong-${a.id}`}
              className="rounded-xl border border-border bg-subtle px-3 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-body-md text-fg">
                  {a.labelCs}
                </span>
                <Badge tone="success">{a.pct} %</Badge>
              </div>
              <p className="mt-1 text-body-sm text-fg-secondary">{a.reasonCs}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">3 největší slabiny</h2>
        <p className="text-body-sm text-fg-secondary">
          Klepni a hned spusť cílenou session.
        </p>
        <ul className="space-y-2">
          {snapshot.weakAreas.map((a) => (
            <li key={`weak-${a.id}`}>
              <Link
                href={a.sessionHref}
                className="block rounded-xl border border-warning/40 bg-warning-soft/30 px-3 py-3 transition hover:border-action hover:bg-action/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-body-md text-fg">
                    {a.labelCs}
                  </span>
                  <Badge tone="warning">{a.pct} %</Badge>
                </div>
                <p className="mt-1 text-body-sm text-fg-secondary">
                  {a.reasonCs}
                </p>
                <p className="mt-2 text-body-sm font-semibold text-action">
                  Spustit: {a.sessionLabelCs} →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Alert title="Co to znamená" tone="info">
        {snapshot.disclaimerCs}
      </Alert>

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}

function AreaBar({
  label,
  pct,
  href,
  cta,
}: {
  label: string;
  pct: number;
  href: string;
  cta: string;
}) {
  const tone =
    pct >= 75 ? "bg-success" : pct >= 55 ? "bg-accent" : "bg-warning";
  return (
    <div className="rounded-xl border border-border bg-canvas px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-body-md font-semibold text-fg">{label}</span>
        <span className="tabular-nums text-body-md text-fg">{pct} %</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-subtle"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct} procent`}
      >
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
      <Link
        href={href}
        className="mt-2 inline-flex text-body-sm font-semibold text-action hover:underline"
      >
        Procvičit · {cta}
      </Link>
    </div>
  );
}
