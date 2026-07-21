import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import type { DynamicStudyPlan } from "@/domain/learning/dynamic-study-plan";
import { cn } from "@/lib/cn";

export function DynamicStudyPlanView({ plan }: { plan: DynamicStudyPlan }) {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Badge tone="brand">Dynamický plán</Badge>
        <h1 className="font-display text-display-md text-fg">Plán k maturitě</h1>
        <p className="text-body-md text-fg-secondary">
          Cíl{" "}
          <span className="font-semibold text-fg">{plan.targetDateCs}</span>
          {" · "}
          {plan.daysRemainingCs}
        </p>
        <p className="text-body-sm text-fg-muted">{plan.philosophyCs}</p>
        {plan.subjectsCs.length > 0 ? (
          <p className="text-caption text-fg-secondary">
            {plan.subjectsCs.join(" · ")} · {plan.availableDaysPerWeek} dní/týden ·{" "}
            {plan.dailyMinutes} min/den
            {plan.readinessPct != null
              ? ` · připravenost ${Math.round(plan.readinessPct)} %`
              : ""}
          </p>
        ) : null}
      </header>

      <FeasibilityBanner plan={plan} />

      {plan.recalculationReasonsCs.length > 0 ? (
        <Alert title="Přepočet" tone="info">
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {plan.recalculationReasonsCs.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {/* Today */}
      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Dnes</h2>
        <p className="text-body-sm text-fg-secondary">{plan.today.noteCs}</p>
        <ol className="space-y-2">
          {plan.today.items.map((item) => (
            <li key={item.labelCs}>
              <Link
                href={item.href}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-border bg-canvas px-3 py-3 text-body-sm transition hover:border-action/40"
              >
                <span className="font-medium text-fg">{item.labelCs}</span>
                <span className="shrink-0 tabular-nums text-fg-muted">
                  {item.minutes} min
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <Link
          href={plan.today.ctaHref}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold uppercase tracking-wide text-fg-on-brand shadow-xs transition hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {plan.today.ctaLabelCs}
        </Link>
        <p className="text-center text-caption text-fg-muted">
          Nebo otevři{" "}
          <Link href="/app/dashboard" className="font-semibold text-action hover:underline">
            dnešní misi
          </Link>
        </p>
      </section>

      {/* This week */}
      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Tento týden</h2>
        <ul className="space-y-2">
          {plan.thisWeek.map((day) => (
            <li
              key={day.dateKey}
              className={cn(
                "flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5",
                day.isToday
                  ? "border-action bg-action/5"
                  : day.isAvailable
                    ? "border-border bg-canvas"
                    : "border-border/60 bg-subtle/40 opacity-80",
              )}
            >
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-fg">
                  {day.weekdayCs} {day.labelCs}
                  {day.isToday ? " · dnes" : ""}
                </p>
                <p className="text-caption text-fg-secondary">{day.focusCs}</p>
              </div>
              <p className="shrink-0 tabular-nums text-body-sm text-fg-muted">
                {day.isAvailable ? `${day.minutes} min` : "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Milestones */}
      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Milníky</h2>
        <ol className="space-y-3">
          {plan.milestones.map((m) => (
            <li
              key={m.id}
              className={cn(
                "rounded-xl border px-3 py-3",
                m.status === "current"
                  ? "border-action bg-action/5"
                  : "border-border bg-canvas",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-body-md text-fg">{m.titleCs}</p>
                <Badge
                  tone={
                    m.status === "current"
                      ? "brand"
                      : m.status === "done"
                        ? "success"
                        : "neutral"
                  }
                >
                  {m.status === "current"
                    ? "Teď"
                    : m.status === "done"
                      ? "Hotovo"
                      : formatShortDate(m.dateKey)}
                </Badge>
              </div>
              <p className="mt-1 text-body-sm text-fg-secondary">{m.detailCs}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Risk areas */}
      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Rizikové oblasti</h2>
        {plan.riskAreas.length === 0 ? (
          <p className="text-body-sm text-fg-secondary">
            Zatím žádná výrazná rizika — drž denní budget.
          </p>
        ) : (
          <ul className="space-y-2">
            {plan.riskAreas.map((r) => (
              <li key={r.id}>
                {r.href ? (
                  <Link
                    href={r.href}
                    className="block rounded-xl border border-border bg-canvas px-3 py-3 transition hover:border-action/40"
                  >
                    <RiskRow risk={r} />
                  </Link>
                ) : (
                  <div className="rounded-xl border border-border bg-canvas px-3 py-3">
                    <RiskRow risk={r} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/onboarding?edit=1"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-body-sm font-semibold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Upravit datum / čas
        </Link>
        <Link
          href="/app/zachran-me"
          className="inline-flex min-h-11 items-center rounded-md border border-danger/40 px-4 text-body-sm font-semibold text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Zachraň mě
        </Link>
      </div>
    </div>
  );
}

function RiskRow({
  risk,
}: {
  risk: DynamicStudyPlan["riskAreas"][number];
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone={
            risk.severity === "high"
              ? "danger"
              : risk.severity === "medium"
                ? "warning"
                : "neutral"
          }
        >
          {risk.severity === "high"
            ? "Vysoké"
            : risk.severity === "medium"
              ? "Střední"
              : "Nízké"}
        </Badge>
        <p className="font-semibold text-fg">{risk.titleCs}</p>
      </div>
      <p className="mt-1 text-body-sm text-fg-secondary">{risk.detailCs}</p>
    </>
  );
}

function FeasibilityBanner({ plan }: { plan: DynamicStudyPlan }) {
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

function formatShortDate(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  if (!m || !d) return isoDate;
  return `${d}. ${m}.`;
}
