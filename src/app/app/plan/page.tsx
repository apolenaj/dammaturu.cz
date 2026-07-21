import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { BetaLearningPathView } from "@/components/plan/beta-learning-path-view";
import {
  plannerPhaseShortCs,
  type DeadlinePlan,
} from "@/domain/learning/deadline-planner";
import { getDeadlinePlanAction } from "@/server/actions/deadline-planner";
import { getBetaLearningPathAction } from "@/server/actions/beta-learning-path";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Plán" };
export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const [{ plan, learnerId }, { path }] = await Promise.all([
    getDeadlinePlanAction(),
    getBetaLearningPathAction(),
  ]);
  if (!learnerId) redirect("/onboarding");
  if (!plan) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-xl space-y-10 px-3 pb-10 sm:px-0">
      <header className="space-y-2">
        <Badge tone="brand">Plán k maturitě</Badge>
        <h1 className="font-display text-display-md text-fg">Plán k maturitě</h1>
        <p className="text-body-md text-fg-secondary">
          Cíl{" "}
          <span className="font-semibold text-fg">{formatDateCs(plan.targetDate)}</span>
          {" · "}
          zbývá {plan.daysRemaining} dní · tempo{" "}
          <span className="font-semibold text-fg">
            {plannerPhaseShortCs[plan.currentPhase]}
          </span>
        </p>
      </header>

      {path ? <BetaLearningPathView path={path} /> : null}

      {plan.recalculatedAfterMiss ? (
        <Alert title="Přepočet po vynechaném dni" tone="warning">
          {plan.today.noteCs}
        </Alert>
      ) : null}

      <FeasibilityBanner plan={plan} />

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Deadline výpočet</h2>
        <ul className="space-y-2">
          {plan.summaryLinesCs.map((line) => (
            <li
              key={line}
              className="rounded-xl border border-border bg-subtle/40 px-3 py-2 text-body-sm text-fg"
            >
              {line}
            </li>
          ))}
        </ul>
        <p className="text-body-sm text-fg-secondary">
          Odhad potřebných minut:{" "}
          <span className="font-semibold text-fg">{plan.requiredMinutes}</span>
          {" · "}
          dostupných:{" "}
          <span className="font-semibold text-fg">{plan.availableMinutes}</span>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Tempo (deadline engine)</h2>
        <ol className="space-y-3">
          {plan.phases.map((phase, i) => {
            const active = phase.phase === plan.currentPhase;
            return (
              <li
                key={phase.phase}
                className={cn(
                  "rounded-xl border px-3 py-3",
                  active
                    ? "border-action bg-action/5"
                    : "border-border bg-canvas",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-body-md text-fg">
                    {i + 1}. {plannerPhaseShortCs[phase.phase]}
                  </p>
                  <Badge tone={active ? "brand" : "neutral"}>
                    {phase.dayCount} dní
                  </Badge>
                </div>
                <p className="mt-1 text-body-sm text-fg-secondary">
                  {phase.focusCs}
                </p>
                <p className="mt-1 text-caption text-fg-muted">
                  {formatDateCs(phase.startDate)} – {formatDateCs(phase.endDate)}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-subtle/30 px-4 py-4">
        <h2 className="font-display text-xl text-fg">Dnes (zastropováno)</h2>
        <p className="text-body-sm text-fg-secondary">{plan.today.noteCs}</p>
        <ul className="mt-2 grid grid-cols-2 gap-2 text-body-sm">
          <Stat label="Minuty" value={`${plan.today.scheduledMinutes}`} />
          <Stat label="Nová témata" value={`${plan.today.newTopics}`} />
          <Stat label="Opakování" value={`${plan.today.reviewItems}`} />
          <Stat
            label="Recall bloky"
            value={`${plan.today.consolidationBlocks}`}
          />
        </ul>
        {plan.today.backlogCapped ? (
          <p className="text-caption text-warning">
            Backlog je zastropovaný — nereálná zátěž se na dnešek nepromítne.
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/app/dashboard"
          className="inline-flex min-h-11 items-center rounded-md bg-action px-4 text-body-sm font-semibold text-fg-on-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Dnešní mise
        </Link>
        <Link
          href="/app/zachran-me"
          className="inline-flex min-h-11 items-center rounded-md border border-danger/40 px-4 text-body-sm font-semibold text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Zachraň mě
        </Link>
        <Link
          href="/onboarding?edit=1"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-body-sm font-semibold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Upravit datum / čas
        </Link>
      </div>
    </div>
  );
}

function FeasibilityBanner({ plan }: { plan: DeadlinePlan }) {
  const tone =
    plan.feasibility === "on_track"
      ? "success"
      : plan.feasibility === "tight"
        ? "warning"
        : "danger";
  return (
    <Alert
      title={
        plan.feasibility === "on_track"
          ? "Na trati"
          : plan.feasibility === "tight"
            ? "Těsné"
            : "Riziko"
      }
      tone={tone}
    >
      {plan.feasibilityCs}
    </Alert>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-lg bg-canvas px-3 py-2 ring-1 ring-border">
      <p className="text-caption text-fg-muted">{label}</p>
      <p className="font-display text-lg tabular-nums text-fg">{value}</p>
    </li>
  );
}

function formatDateCs(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d}. ${m}. ${y}`;
}
