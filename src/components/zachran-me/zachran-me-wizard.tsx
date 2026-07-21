"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { buildZachranMePlanAction } from "@/server/actions/zachran-me";
import {
  zachranMeBucketHintsCs,
  zachranMeBucketLabelsCs,
  zachranMeComponentHintsCs,
  zachranMeComponentLabelsCs,
  zachranMeComponents,
  zachranMeConfig,
  type PriorityItem,
  type ZachranMeBucket,
  type ZachranMeComponent,
  type ZachranMePlan,
} from "@/domain/learning/zachran-me";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ZachranMeWizard({
  defaults,
}: {
  defaults: {
    examDate: string;
    availableHours: number;
    components: ZachranMeComponent[];
  };
}) {
  const [examDate, setExamDate] = useState(
    defaults.examDate || zachranMeConfig.betaTargetDate,
  );
  const [availableHours, setAvailableHours] = useState(
    defaults.availableHours || 1,
  );
  const [selected, setSelected] = useState<ZachranMeComponent[]>(
    defaults.components.length
      ? defaults.components
      : [...zachranMeComponents],
  );
  const [plan, setPlan] = useState<ZachranMePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleComponent(c: ZachranMeComponent) {
    setSelected((prev) => {
      if (prev.includes(c)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== c);
      }
      return [...prev, c];
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await buildZachranMePlanAction({
        examDate,
        availableHours,
        components: selected,
      });
      if (!res.ok) {
        setError(res.error);
        setPlan(null);
        return;
      }
      setPlan(res.plan);
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-8">
      <header className="space-y-2">
        <Badge tone="danger">Zachraň mě</Badge>
        <h1 className="font-display text-display-md text-fg">
          Nouzový plánovač
        </h1>
        <p className="text-body-md text-fg-secondary">
          Termín maturity × dostupné hodiny × složky, které app opravdu umí.
          Výstup: triáž + přesná příští session — ne náhodný cram.
        </p>
      </header>

      {!plan ? (
        <section className="space-y-5 rounded-2xl border border-border bg-subtle/30 px-4 py-5">
          <div className="space-y-2">
            <label className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Skutečný termín maturity
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-body-md text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          <div className="space-y-2">
            <label className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Dostupné hodiny teď
            </label>
            <input
              type="number"
              min={0.5}
              max={12}
              step={0.5}
              value={availableHours}
              onChange={(e) =>
                setAvailableHours(
                  Number.parseFloat(e.target.value || "1"),
                )
              }
              className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-body-md text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
            <p className="text-caption text-fg-secondary">
              Kolik hodin máš teď na studium (0,5–12). Z toho složíme session.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Složky maturity (jen podporované)
            </legend>
            <ul className="space-y-2">
              {zachranMeComponents.map((c) => {
                const on = selected.includes(c);
                return (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => toggleComponent(c)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition",
                        on
                          ? "border-action bg-action/10"
                          : "border-border bg-canvas",
                      )}
                    >
                      <p className="font-semibold text-fg">
                        {zachranMeComponentLabelsCs[c]}
                      </p>
                      <p className="text-caption text-fg-secondary">
                        {zachranMeComponentHintsCs[c]}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-caption text-fg-muted">
              Matematika, AJ a další předměty tu nejsou — v appce pro ně zatím
              není příprava.
            </p>
          </fieldset>

          {error ? (
            <Alert title="Nešlo spočítat" tone="danger">
              {error}
            </Alert>
          ) : null}

          <Button fullWidth disabled={pending} onClick={submit}>
            {pending ? "Počítám…" : "Spočítat nouzový plán"}
          </Button>
        </section>
      ) : (
        <ZachranMePlanView
          plan={plan}
          onReset={() => {
            setPlan(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

function ZachranMePlanView({
  plan,
  onReset,
}: {
  plan: ZachranMePlan;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <Alert title="Triáž, ne sprint" tone="warning">
        {plan.manifestoCs}
      </Alert>

      <div className="rounded-2xl border border-action/40 bg-action/5 px-4 py-4 space-y-2">
        <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
          Analýza
        </p>
        <p className="font-display text-xl text-fg">
          {plan.analysis.timePressureLabelCs} · zbývá {plan.daysRemaining} dní
        </p>
        <p className="text-body-sm text-fg-secondary">
          Termín {plan.examDateLabelCs} · {plan.availableHours} h k dispozici ·{" "}
          {plan.componentLabelsCs.join(" · ")}
          {plan.analysis.overallReadinessPct != null
            ? ` · readiness ${plan.analysis.overallReadinessPct} %`
            : ""}
        </p>
        {plan.analysis.weakComponentLabelsCs.length > 0 ? (
          <p className="text-caption text-fg-muted">
            Relativně slabší složky:{" "}
            {plan.analysis.weakComponentLabelsCs.join(" · ")}
          </p>
        ) : null}
      </div>

      <section className="space-y-3 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-4">
        <div>
          <h2 className="font-display text-xl text-fg">
            Příští studijní session
          </h2>
          <p className="text-body-sm text-fg-secondary">
            {plan.nextSession.directiveCs}
          </p>
          <p className="mt-1 text-caption text-fg-muted">
            {plan.nextSession.totalMinutes} min z{" "}
            {plan.nextSession.availableMinutes} min rozpočtu
          </p>
        </div>
        <ol className="space-y-2">
          {plan.nextSession.steps.map((step) => (
            <li key={step.itemId}>
              <Link
                href={step.href}
                className="block rounded-xl border border-border bg-canvas px-3 py-3 hover:border-action"
              >
                <p className="font-semibold text-fg">
                  {step.order}. {step.titleCs}
                </p>
                <p className="text-caption text-fg-secondary">
                  {step.componentLabelCs} · ~{step.estimatedMinutes} min
                </p>
                <p className="mt-0.5 text-caption text-fg-muted">
                  {step.reasonCs}
                </p>
              </Link>
            </li>
          ))}
        </ol>
        <Link
          href={plan.nextSession.startHref}
          className="inline-flex min-h-11 items-center rounded-md bg-action px-4 text-body-sm font-semibold text-fg-on-brand"
        >
          Začít session
        </Link>
      </section>

      <Bucket id="must_know" items={plan.mustKnow} tone="danger" />
      <Bucket id="high_impact" items={plan.highImpact} tone="action" />
      <Bucket id="should_know" items={plan.shouldKnow} tone="warning" />
      <Bucket id="if_time" items={plan.ifTime} tone="neutral" />
      <Bucket id="already_knows" items={plan.alreadyKnows} tone="success" />

      <Button variant="ghost" onClick={onReset}>
        Přepočítat
      </Button>
    </div>
  );
}

function Bucket({
  id,
  items,
  tone,
}: {
  id: ZachranMeBucket;
  items: PriorityItem[];
  tone: "action" | "danger" | "neutral" | "success" | "warning";
}) {
  if (items.length === 0) return null;
  const border =
    tone === "action"
      ? "border-action/40"
      : tone === "danger"
        ? "border-danger/40"
        : tone === "success"
          ? "border-success/30"
          : tone === "warning"
            ? "border-warning/40"
            : "border-border";

  return (
    <section className={cn("space-y-2 rounded-xl border px-4 py-3", border)}>
      <div>
        <h2 className="font-display text-lg text-fg">
          {zachranMeBucketLabelsCs[id]}
        </h2>
        <p className="text-caption text-fg-secondary">
          {zachranMeBucketHintsCs[id]}
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="block rounded-lg px-2 py-2 hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-fg">{item.titleCs}</p>
                <span className="tabular-nums text-caption text-fg-muted">
                  {item.impactScore.toFixed(3)}
                </span>
              </div>
              <p className="text-caption text-fg-secondary">
                {item.componentLabelCs} · readiness {item.readinessPct}% · ~
                {item.estimatedMinutes} min
              </p>
              <p className="mt-0.5 text-caption text-fg-muted">{item.detailCs}</p>
              <p className="mt-0.5 text-caption text-fg-muted">{item.reasonCs}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
