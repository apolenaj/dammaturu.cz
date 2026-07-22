"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { buildZachranMePlanAction } from "@/server/actions/zachran-me";
import {
  zachranMeBucketHintsCs,
  zachranMeBucketLabelsCs,
  zachranMeConfig,
  zachranMeScopeHintsCs,
  zachranMeScopeLabelsCs,
  zachranMeScopes,
  type HorizonBlock,
  type PriorityItem,
  type ZachranMeBucket,
  type ZachranMePlan,
  type ZachranMeScope,
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
    dailyMinutes: number;
    scope: ZachranMeScope;
  };
}) {
  const [examDate, setExamDate] = useState(
    defaults.examDate || zachranMeConfig.betaTargetDate,
  );
  const [dailyMinutes, setDailyMinutes] = useState(
    defaults.dailyMinutes || zachranMeConfig.defaultDailyMinutes,
  );
  const [scope, setScope] = useState<ZachranMeScope>(
    defaults.scope || "both",
  );
  const [plan, setPlan] = useState<ZachranMePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await buildZachranMePlanAction({
        examDate,
        dailyMinutes,
        scope,
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
          Triáž před termínem
        </h1>
        <p className="text-body-md text-fg-secondary">
          Termín × minuty denně × rozsah (materiály / CERMAT). Výstup: tři
          priority a konkrétní plán Dnes / Zítra / Tento týden — bez falešné
          přesnosti.
        </p>
      </header>

      {!plan ? (
        <section className="space-y-5 rounded-2xl border border-border bg-subtle/30 px-4 py-5">
          <div className="space-y-2">
            <label className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Termín maturity
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
              Dostupné minuty denně
            </label>
            <input
              type="number"
              min={zachranMeConfig.minDailyMinutes}
              max={zachranMeConfig.maxDailyMinutes}
              step={5}
              value={dailyMinutes}
              onChange={(e) =>
                setDailyMinutes(
                  Number.parseInt(e.target.value || "30", 10),
                )
              }
              className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-body-md text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
            <p className="text-caption text-fg-secondary">
              Reálný denní rozpočet ({zachranMeConfig.minDailyMinutes}–
              {zachranMeConfig.maxDailyMinutes} min). Podle něj skládáme Dnes a
              Zítra.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Rozsah studia
            </legend>
            <ul className="space-y-2">
              {zachranMeScopes.map((s) => {
                const on = scope === s;
                return (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setScope(s)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition",
                        on
                          ? "border-action bg-action/10"
                          : "border-border bg-canvas",
                      )}
                    >
                      <p className="font-semibold text-fg">
                        {zachranMeScopeLabelsCs[s]}
                      </p>
                      <p className="text-caption text-fg-secondary">
                        {zachranMeScopeHintsCs[s]}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-caption text-fg-muted">
              Matematika, AJ a další předměty tu nejsou — appka je zatím
              nepřipravuje.
            </p>
          </fieldset>

          {error ? (
            <Alert title="Nešlo spočítat" tone="danger">
              {error}
            </Alert>
          ) : null}

          <Button fullWidth disabled={pending} onClick={submit}>
            {pending ? "Sestavuji triáž…" : "Sestavit triáž"}
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

      {plan.analysis.evidenceDisclaimerCs ? (
        <Alert title="Upřímně k evidenci" tone="neutral">
          {plan.analysis.evidenceDisclaimerCs}
        </Alert>
      ) : null}

      <div className="space-y-2 rounded-2xl border border-action/40 bg-action/5 px-4 py-4">
        <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
          Situace
        </p>
        <p className="font-display text-xl text-fg">
          {plan.analysis.timePressureLabelCs} · zbývá {plan.daysRemaining} dní
        </p>
        <p className="text-body-sm text-fg-secondary">
          Termín {plan.examDateLabelCs} · {plan.dailyMinutes} min/den ·{" "}
          {plan.scopeLabelCs}
        </p>
        <p className="text-caption text-fg-muted">
          Orientačně cca {plan.analysis.studyDaysEstimate} studijních dní ·
          fronta: {plan.analysis.remainingUnitsTotal} jednotek ·{" "}
          {plan.analysis.repeatedErrorsTotal} chybových signálů ·{" "}
          {plan.analysis.overdueReviewsTotal} splatných
        </p>
        {plan.analysis.weakLaneLabelsCs.length > 0 ? (
          <p className="text-caption text-fg-muted">
            Relativně slabší linie:{" "}
            {plan.analysis.weakLaneLabelsCs.join(" · ")}
          </p>
        ) : null}
      </div>

      <section className="space-y-3 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-4">
        <div>
          <h2 className="font-display text-xl text-fg">Dnešní plán</h2>
          <p className="text-body-sm text-fg-secondary">
            {plan.horizon.today.noteCs}
          </p>
        </div>
        <HorizonList block={plan.horizon.today} />
        <Link
          href={plan.startTodayHref}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action px-4 text-body-sm font-semibold text-fg-on-brand"
        >
          {plan.ctaLabelCs}
        </Link>
      </section>

      <HorizonSection block={plan.horizon.tomorrow} />
      <HorizonSection block={plan.horizon.thisWeek} />

      <Bucket id="must_know" items={plan.mustKnow} tone="danger" />
      <Bucket id="important" items={plan.important} tone="action" />
      <Bucket id="if_time" items={plan.ifTime} tone="neutral" />

      <Button variant="ghost" onClick={onReset}>
        Přepočítat
      </Button>
    </div>
  );
}

function HorizonSection({ block }: { block: HorizonBlock }) {
  if (block.steps.length === 0) {
    return (
      <section className="space-y-1 rounded-xl border border-border px-4 py-3">
        <h2 className="font-display text-lg text-fg">{block.titleCs}</h2>
        <p className="text-caption text-fg-secondary">{block.noteCs}</p>
      </section>
    );
  }
  return (
    <section className="space-y-2 rounded-xl border border-border px-4 py-3">
      <div>
        <h2 className="font-display text-lg text-fg">{block.titleCs}</h2>
        <p className="text-caption text-fg-secondary">{block.noteCs}</p>
      </div>
      <HorizonList block={block} />
    </section>
  );
}

function HorizonList({ block }: { block: HorizonBlock }) {
  if (block.steps.length === 0) return null;
  return (
    <ol className="space-y-2">
      {block.steps.map((step) => (
        <li key={`${block.key}-${step.itemId}`}>
          <Link
            href={step.href}
            className="block rounded-xl border border-border bg-canvas px-3 py-3 hover:border-action"
          >
            <p className="font-semibold text-fg">
              {step.order}. {step.titleCs}
            </p>
            <p className="text-caption text-fg-secondary">
              {step.laneLabelCs} · {zachranMeBucketLabelsCs[step.bucket]} · ~
              {step.estimatedMinutes} min
            </p>
            <p className="mt-0.5 text-caption text-fg-muted">{step.reasonCs}</p>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function Bucket({
  id,
  items,
  tone,
}: {
  id: ZachranMeBucket;
  items: PriorityItem[];
  tone: "action" | "danger" | "neutral";
}) {
  if (items.length === 0) return null;
  const border =
    tone === "action"
      ? "border-action/40"
      : tone === "danger"
        ? "border-danger/40"
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
              <p className="font-medium text-fg">{item.titleCs}</p>
              <p className="text-caption text-fg-secondary">
                {item.laneLabelCs}
                {item.hasLearningEvidence && item.masteryPct != null
                  ? ` · mastery evidence ~${item.masteryPct} %`
                  : " · bez falešného %"}
                {" · ~"}
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
