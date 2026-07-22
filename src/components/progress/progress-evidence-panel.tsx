"use client";

import {
  transparentMasteryStateLabelsCs,
  type TransparentMasteryState,
} from "@/domain/learning/mastery-engine";
import type { ProgressEvidenceView } from "@/domain/learning/progress-evidence";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

function StateBadge({ state }: { state: TransparentMasteryState }) {
  const tone =
    state === "mastered"
      ? "success"
      : state === "stable"
        ? "info"
        : state === "fragile"
          ? "warning"
          : state === "learning"
            ? "brand"
            : "neutral";
  return (
    <Badge tone={tone}>{transparentMasteryStateLabelsCs[state]}</Badge>
  );
}

export function ProgressEvidencePanel({
  view,
}: {
  view: ProgressEvidenceView;
}) {
  return (
    <div className="space-y-6 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <header className="space-y-2">
        <Badge tone="brand">Zvládnutí</Badge>
        <h2 className="font-display text-xl font-semibold text-fg">
          Jak dobře to umíš
        </h2>
        <p className="text-body-sm text-fg-secondary">{view.disclaimerCs}</p>
        <Alert
          tone={view.evidenceReady ? "info" : "warning"}
          title={
            view.evidenceReady
              ? "Dost cvičení pro odhad"
              : "Málo ověřených výsledků"
          }
        >
          {view.minEvidenceHintCs}
        </Alert>
      </header>

      <section className="space-y-2">
        <h3 className="font-display text-lg font-semibold text-fg">
          Posledních 7 dní
        </h3>
        <p className="text-body-sm text-fg-secondary">
          Dotčené jednotky: {view.last7Days.unitsTouched} · Hodnocené pokusy
          (odhad): {view.last7Days.gradedEvidenceApprox} · Nové chyby:{" "}
          {view.last7Days.newMistakes}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-lg font-semibold text-fg">
          Dnes zopakovat
        </h3>
        {view.dueToday.length === 0 ? (
          <p className="text-body-sm text-fg-muted">Dnes nic k opakování.</p>
        ) : (
          <UnitList rows={view.dueToday} />
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="space-y-2">
          <h3 className="font-display text-lg font-semibold text-fg">
            Nejsilnější oblasti
          </h3>
          <UnitList rows={view.strongest} />
        </section>
        <section className="space-y-2">
          <h3 className="font-display text-lg font-semibold text-fg">
            Nejslabší oblasti
          </h3>
          <UnitList rows={view.weakest} />
        </section>
      </div>

      <section className="space-y-2">
        <h3 className="font-display text-lg font-semibold text-fg">
          Podle tématu
        </h3>
        {view.byTopic.length === 0 ? (
          <p className="text-body-sm text-fg-muted">
            Zatím bez zvládnutí z cvičení.
          </p>
        ) : (
          <ul className="space-y-2">
            {view.byTopic.map((t) => (
              <li
                key={t.topic}
                className="rounded-xl border border-border bg-subtle px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-fg">{t.topic}</span>
                  <StateBadge state={t.dominant} />
                  <span className="text-caption text-fg-muted">
                    {t.unitCount} j. · avg {t.avgScore}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-lg font-semibold text-fg">
          Podle knowledge unit
        </h3>
        <UnitList rows={view.byKnowledgeUnit.slice(0, 20)} />
      </section>
    </div>
  );
}

function UnitList({
  rows,
}: {
  rows: ProgressEvidenceView["byKnowledgeUnit"];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-body-sm text-fg-muted">Zatím bez dat z vybavení.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.knowledgeUnitId}
          className="rounded-xl border border-border bg-subtle px-3 py-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <StateBadge state={r.transparent} />
            <span className="font-medium text-fg">{r.title}</span>
          </div>
          <p className="mt-1 text-caption text-fg-muted">
            {r.topic} · evidence {r.retrievalEvidenceCount} · signál{" "}
            {r.score}
            {r.dueAt
              ? ` · due ${new Date(r.dueAt).toLocaleDateString("cs-CZ")}`
              : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
