"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import type { ProductAnalyticsDashboard } from "@/domain/product-analytics";
import type { FeatureFlagsStore } from "@/domain/feature-flags";
import { exportAnonymizedProductAnalyticsAction } from "@/server/actions/product-analytics";
import {
  updateFeatureFlagAction,
  upsertExperimentAction,
} from "@/server/actions/feature-flags";
import { cn } from "@/lib/cn";

export function AdminProductAnalyticsView({
  dash,
  flags,
}: {
  dash: ProductAnalyticsDashboard;
  flags: FeatureFlagsStore | null;
}) {
  const [pending, startTransition] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);
  const [flagMsg, setFlagMsg] = useState<string | null>(null);

  function onExport() {
    setExportError(null);
    startTransition(async () => {
      const result = await exportAnonymizedProductAnalyticsAction();
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
      a.download = `dammaturu-product-analytics-${result.export.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function toggleFlag(flag: FeatureFlagsStore["flags"][number]) {
    setFlagMsg(null);
    startTransition(async () => {
      const res = await updateFeatureFlagAction({
        key: flag.key,
        enabled: !flag.enabled,
        rolloutPercent: flag.rolloutPercent,
        descriptionCs: flag.descriptionCs,
        experimentId: flag.experimentId,
      });
      setFlagMsg(res.ok ? `Flag ${flag.key} uložen.` : res.error);
    });
  }

  function startDemoExperiment() {
    setFlagMsg(null);
    startTransition(async () => {
      const res = await upsertExperimentAction({
        id: "homepage_cta_copy",
        nameCs: "Homepage CTA copy",
        status: "running",
        variants: [
          { id: "control", labelCs: "Kontrola", weight: 50 },
          { id: "variant_a", labelCs: "Varianta A", weight: 50 },
        ],
      });
      setFlagMsg(
        res.ok ? "Experiment homepage_cta_copy běží." : res.error,
      );
    });
  }

  const o = dash.outcomes;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-1 pb-12">
      <header className="space-y-2">
        <Badge tone="brand">Product analytics · D-062</Badge>
        <h1 className="font-display text-display-md text-fg">
          Funnel a učení (interní)
        </h1>
        <p className="text-body-md text-fg-secondary">
          {dash.eventCount} eventů · {dash.learnerCount} learnerů ·{" "}
          {new Date(dash.generatedAt).toLocaleString("cs-CZ")}
        </p>
      </header>

      <Alert title="Privacy-first" tone="info">
        {dash.privacyNoteCs} Admin nikdy neukazuje text odpovědí ani obsah
        dokumentů.
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
          {pending ? "Exportuji…" : "Exportovat anonymizovaná data"}
        </button>
        {exportError ? (
          <p className="text-body-sm text-danger">{exportError}</p>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Funnel</h2>
        <ol className="space-y-2">
          {dash.funnel.map((step) => (
            <li
              key={step.step}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-2"
            >
              <span className="text-body-sm font-medium text-fg">
                {step.labelCs}
              </span>
              <span className="text-body-sm text-fg-secondary tabular-nums">
                {step.count}
                {step.conversionFromPrevPct != null
                  ? ` · ${step.conversionFromPrevPct} % z předchozího`
                  : null}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Learning funnel metrics</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <OutcomeStat
            label="Čas do první interakce (medián)"
            value={
              o.learning.timeToFirstInteractionSecMedian != null
                ? `${o.learning.timeToFirstInteractionSecMedian} s`
                : "—"
            }
          />
          <OutcomeStat
            label="Dokončení lekcí"
            value={
              o.learning.lessonCompletionPct != null
                ? `${o.learning.lessonCompletionPct} %`
                : "—"
            }
          />
          <OutcomeStat
            label="Návrat další den"
            value={
              o.learning.returnNextDayPct != null
                ? `${o.learning.returnNextDayPct} % (${o.learning.returnNextDayCount}/${o.learning.returnNextDayEligible})`
                : "—"
            }
          />
          <OutcomeStat
            label="Chyby později opravené"
            value={
              o.learning.mistakesCorrectedPct != null
                ? `${o.learning.mistakesCorrectedPct} %`
                : "—"
            }
          />
          <OutcomeStat
            label="Dokončení opakování"
            value={
              o.learning.reviewCompletionPct != null
                ? `${o.learning.reviewCompletionPct} %`
                : "—"
            }
          />
        </dl>
        {o.learning.topicAbandonment.length > 0 ? (
          <div className="space-y-2 pt-2">
            <h3 className="text-body-sm font-semibold text-fg">
              Odchody z témat (otevřeno bez dokončení)
            </h3>
            <ul className="space-y-1">
              {o.learning.topicAbandonment.map((t) => (
                <li
                  key={t.topicSlug}
                  className="flex justify-between text-body-sm text-fg-secondary"
                >
                  <code className="text-fg">{t.topicSlug}</code>
                  <span className="tabular-nums">
                    {t.abandonPct} % · {t.completes}/{t.opens}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Learning outcomes</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <OutcomeStat
            label="Otázky zodpovězené"
            value={String(o.questionsAnswered)}
          />
          <OutcomeStat
            label="Správnost"
            value={
              o.questionsCorrectPct != null
                ? `${o.questionsCorrectPct} %`
                : "—"
            }
          />
          <OutcomeStat
            label="Studijní minuty"
            value={String(o.studyMinutes)}
          />
          <OutcomeStat
            label="Mastery Δ (součet)"
            value={String(o.masteryImprovementSum)}
          />
          <OutcomeStat
            label="Retence den 2"
            value={
              o.retention.day2Pct != null
                ? `${o.retention.day2Pct} % (${o.retention.day2Returners}/${o.retention.eligibleForDay2})`
                : "—"
            }
          />
          <OutcomeStat
            label="Retence den 7"
            value={
              o.retention.day7Pct != null
                ? `${o.retention.day7Pct} % (${o.retention.day7Returners}/${o.retention.eligibleForDay7})`
                : "—"
            }
          />
        </dl>
        {o.weakTopics.length > 0 ? (
          <div className="space-y-2 pt-2">
            <h3 className="text-body-sm font-semibold text-fg">
              Slabá témata (slugy, bez obsahu)
            </h3>
            <ul className="space-y-1">
              {o.weakTopics.map((t) => (
                <li
                  key={t.topicSlug}
                  className="flex justify-between text-body-sm text-fg-secondary"
                >
                  <code className="text-fg">{t.topicSlug}</code>
                  <span className="tabular-nums">{t.hits}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">
          Feature flags & experimenty
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Flags jsou oddělené od billing entitlements — řídí UX experimenty,
          ne placený přístup.
        </p>
        {flags ? (
          <ul className="space-y-2">
            {flags.flags.map((f) => (
              <li
                key={f.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-body-sm font-semibold text-fg">{f.key}</p>
                  <p className="text-caption text-fg-muted">
                    {f.descriptionCs} · rollout {f.rolloutPercent} %
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggleFlag(f)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-caption font-semibold",
                    f.enabled
                      ? "bg-brand/15 text-brand"
                      : "bg-subtle text-fg-muted",
                  )}
                >
                  {f.enabled ? "Zapnuto" : "Vypnuto"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-fg-muted">Flags nedostupné.</p>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={startDemoExperiment}
          className="rounded-lg border border-border px-3 py-2 text-body-sm font-medium text-fg hover:bg-subtle/60 disabled:opacity-50"
        >
          Spustit demo experiment (homepage CTA)
        </button>
        {flags && flags.experiments.length > 0 ? (
          <ul className="space-y-1 text-body-sm text-fg-secondary">
            {flags.experiments.map((e) => (
              <li key={e.id}>
                <code className="text-fg">{e.id}</code> — {e.nameCs} ·{" "}
                {e.status} · {e.variants.map((v) => v.id).join(" / ")}
              </li>
            ))}
          </ul>
        ) : null}
        {flagMsg ? (
          <p className="text-body-sm text-fg-secondary">{flagMsg}</p>
        ) : null}
      </section>

      <details className="text-caption text-fg-muted">
        <summary className="cursor-pointer">Denied fields</summary>
        <ul className="mt-2 list-disc pl-5">
          {dash.deniedCs.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function OutcomeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 px-3 py-2">
      <dt className="text-caption text-fg-muted">{label}</dt>
      <dd className="text-body-md font-semibold tabular-nums text-fg">
        {value}
      </dd>
    </div>
  );
}
