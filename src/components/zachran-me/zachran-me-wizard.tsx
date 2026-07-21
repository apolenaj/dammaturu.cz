"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { buildZachranMePlanAction } from "@/server/actions/zachran-me";
import { subjects, subjectLabels } from "@/domain/onboarding/schema";
import {
  zachranMeBucketHintsCs,
  zachranMeBucketLabelsCs,
  zachranMeConfig,
  type PriorityItem,
  type ZachranMeBucket,
  type ZachranMePlan,
} from "@/domain/learning/zachran-me";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Subject = (typeof subjects)[number];

export function ZachranMeWizard({
  defaults,
}: {
  defaults: {
    deadline: string;
    dailyMinutes: number;
    subjects: Subject[];
  };
}) {
  const [deadline, setDeadline] = useState(
    defaults.deadline || zachranMeConfig.betaTargetDate,
  );
  const [dailyMinutes, setDailyMinutes] = useState(defaults.dailyMinutes || 30);
  const [selected, setSelected] = useState<Subject[]>(
    defaults.subjects.length ? defaults.subjects : ["cjl"],
  );
  const [plan, setPlan] = useState<ZachranMePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const betaHint = deadline === zachranMeConfig.betaTargetDate;

  function toggleSubject(s: Subject) {
    setSelected((prev) => {
      if (prev.includes(s)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== s);
      }
      return [...prev, s];
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await buildZachranMePlanAction({
        deadline,
        dailyMinutes,
        subjects: selected,
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
        <h1 className="font-display text-display-md text-fg">Málo času?</h1>
        <p className="text-body-md text-fg-secondary">
          Triáž, ne sprint. Řekneme co dnes musíš, co počká, co už umíš a co je
          riziko — pro beta až do 31. 8. 2026.
        </p>
      </header>

      {!plan ? (
        <section className="space-y-5 rounded-2xl border border-border bg-subtle/30 px-4 py-5">
          <div className="space-y-2">
            <label className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-body-md text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
            {betaHint ? (
              <p className="text-caption text-fg-secondary">
                Beta cíl 31. 8. — výchozí pro testerku.
              </p>
            ) : (
              <button
                type="button"
                className="text-caption font-semibold text-action hover:underline"
                onClick={() => setDeadline(zachranMeConfig.betaTargetDate)}
              >
                Nastavit beta deadline 31. 8. 2026
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Čas denně (minuty)
            </label>
            <input
              type="number"
              min={10}
              max={240}
              value={dailyMinutes}
              onChange={(e) =>
                setDailyMinutes(Number.parseInt(e.target.value || "30", 10))
              }
              className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-body-md text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Předměty
            </legend>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => {
                const on = selected.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-body-sm font-semibold transition",
                      on
                        ? "border-action bg-action/10 text-fg"
                        : "border-border bg-canvas text-fg-secondary",
                    )}
                  >
                    {subjectLabels[s]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error ? (
            <Alert title="Nešlo spočítat" tone="danger">
              {error}
            </Alert>
          ) : null}

          <Button fullWidth disabled={pending} onClick={submit}>
            {pending ? "Počítám…" : "Spočítat Priority Plan"}
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
      <Alert title="Ne sprint — triáž" tone="warning">
        {plan.manifestoCs}
      </Alert>

      <div className="rounded-2xl border border-action/40 bg-action/5 px-4 py-4">
        <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
          Dnešní direktivá
        </p>
        <p className="mt-1 font-display text-xl text-fg">
          {plan.todayDirectiveCs}
        </p>
        <p className="mt-2 text-body-sm text-fg-secondary">
          Deadline {plan.deadlineLabelCs} · zbývá {plan.daysRemaining} dní ·{" "}
          {plan.dailyMinutes} min/den · {plan.subjectLabelsCs.join(", ")}
        </p>
      </div>

      {plan.unsupportedSubjectsCs.length > 0 ? (
        <Alert title="Beta scope" tone="info">
          Zatím počítáme ČJL. Ostatní (
          {plan.unsupportedSubjectsCs.join(", ")}) přijdou později — nevyplňují
          must-today náhodným obsahem.
        </Alert>
      ) : null}

      <Bucket id="must_today" items={plan.mustToday} tone="action" />
      <Bucket id="risk" items={plan.risk} tone="danger" />
      <Bucket id="can_wait" items={plan.canWait} tone="neutral" />
      <Bucket id="already_knows" items={plan.alreadyKnows} tone="success" />

      <div className="flex flex-wrap gap-3">
        {plan.mustToday[0] ? (
          <Link
            href={plan.mustToday[0].href}
            className="inline-flex min-h-11 items-center rounded-md bg-action px-4 text-body-sm font-semibold text-fg-on-brand"
          >
            Začít must-today
          </Link>
        ) : (
          <Link
            href="/app/dashboard"
            className="inline-flex min-h-11 items-center rounded-md bg-action px-4 text-body-sm font-semibold text-fg-on-brand"
          >
            Zpět na Dnes
          </Link>
        )}
        <Button variant="ghost" onClick={onReset}>
          Přepočítat
        </Button>
      </div>
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
  tone: "action" | "danger" | "neutral" | "success";
}) {
  if (items.length === 0) return null;
  const border =
    tone === "action"
      ? "border-action/40"
      : tone === "danger"
        ? "border-danger/40"
        : tone === "success"
          ? "border-success/30"
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
        {items.slice(0, id === "can_wait" ? 8 : 12).map((item) => (
          <li key={item.topicId}>
            <Link
              href={item.href}
              className="block rounded-lg px-2 py-2 hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-fg">{item.title}</p>
                <span className="tabular-nums text-caption text-fg-muted">
                  P {item.priority.toFixed(3)}
                </span>
              </div>
              <p className="text-caption text-fg-secondary">
                {item.moduleTitle} · {item.examRelevance} · mastery{" "}
                {item.masteryPct}% · ~{item.estimatedMinutes} min
              </p>
              <p className="mt-0.5 text-caption text-fg-muted">{item.reasonCs}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
