import { Badge } from "@/components/ui/badge";
import type { StudentBetaPulse } from "@/domain/learning/beta-profile";
import Link from "next/link";

export function StudentBetaPulsePanel({ pulse }: { pulse: StudentBetaPulse }) {
  return (
    <section
      aria-label="Private beta přehled"
      className="space-y-4 rounded-2xl border border-border bg-subtle/40 px-4 py-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">Private BETA</Badge>
        <p className="text-caption text-fg-muted">{pulse.noteCs}</p>
      </div>

      <div>
        <p className="text-caption font-semibold uppercase tracking-[0.14em] text-fg-muted">
          Cíl
        </p>
        <p className="mt-1 font-display text-xl text-fg">
          {pulse.targetDateLabelCs}
        </p>
        <p className="text-body-sm text-fg-secondary">
          Zbývá {pulse.daysRemaining} dní
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Coverage" value={`${pulse.coveragePct} %`} />
        <Metric label="Mastery" value={`${pulse.masteryPct} %`} />
        <Metric label="Čas učením" value={`${pulse.minutesStudied} min`} />
        <Metric
          label="Dodržení plánu"
          value={`${pulse.planAdherencePct} %`}
          hint={pulse.planAdherenceLabelCs}
        />
        <div className="col-span-2 sm:col-span-2">
          <dt className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Slabiny
          </dt>
          <dd className="mt-1 text-body-sm text-fg">
            {pulse.weakLabelsCs.length > 0
              ? pulse.weakLabelsCs.join(" · ")
              : "Zatím bez výrazných slabin"}
          </dd>
          <Link
            href="/app/mistakes"
            className="mt-1 inline-block text-caption font-semibold text-action hover:underline"
          >
            Procvičit chyby
          </Link>
        </div>
      </dl>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
        {label}
      </dt>
      <dd className="mt-1 font-display text-lg text-fg">{value}</dd>
      {hint ? (
        <p className="text-caption text-fg-secondary">{hint}</p>
      ) : null}
    </div>
  );
}
