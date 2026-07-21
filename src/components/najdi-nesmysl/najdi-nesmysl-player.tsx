"use client";

import { useMemo, useState, useTransition } from "react";
import { submitNonsenseAction } from "@/server/actions/najdi-nesmysl";
import {
  nonsenseCategoryLabelsCs,
  reasonQualityLabelsCs,
  shuffleStatements,
  type NonsenseGrade,
  type NonsensePack,
  type NonsenseProgress,
  type NonsenseRound,
} from "@/domain/learning/najdi-nesmysl";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function NajdiNesmyslPlayer({
  pack,
  initialProgress,
  learnerId,
}: {
  pack: NonsensePack;
  initialProgress: NonsenseProgress | null;
  learnerId: string | null;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [round, setRound] = useState<NonsenseRound | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [grade, setGrade] = useState<NonsenseGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const solved = useMemo(
    () => new Set(progress?.solvedRoundIds ?? []),
    [progress],
  );

  const queue = useMemo(
    () => pack.rounds.filter((r) => !solved.has(r.id)),
    [pack.rounds, solved],
  );

  function begin(next: NonsenseRound) {
    setRound(next);
    setOrder(shuffleStatements(next.statements.map((s) => s.id)));
    setSelectedId(null);
    setReason("");
    setGrade(null);
    setError(null);
  }

  function submit() {
    if (!round || !learnerId) {
      setError("Pro vyhodnocení dokonči onboarding.");
      return;
    }
    if (!selectedId) {
      setError("Vyber tvrzení, které je nesmysl.");
      return;
    }
    if (reason.trim().length < 12) {
      setError("Napiš, proč je to nesmysl (alespoň krátká věta).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitNonsenseAction({
        packSlug: pack.slug,
        roundId: round.id,
        selectedStatementId: selectedId,
        studentReason: reason,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProgress(res.progress);
      setGrade(res.grade);
    });
  }

  if (grade && round) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <header className="space-y-2">
          <Badge tone={grade.pickCorrect ? "success" : "danger"}>
            {grade.pickCorrect ? "Odhaleno" : "Vedle"}
          </Badge>
          <h1 className="font-display text-display-sm text-fg">
            {grade.headline}
          </h1>
          <p className="text-caption text-fg-muted">
            {reasonQualityLabelsCs[grade.reasonQuality]} ·{" "}
            {nonsenseCategoryLabelsCs[round.category]}
          </p>
        </header>

        <Alert
          title="Skutečné vysvětlení"
          tone={grade.pickCorrect ? "success" : "warning"}
        >
          {grade.explanation}
        </Alert>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-fg">
            Chybné tvrzení
          </h2>
          <p className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-3 text-body-sm text-fg">
            {grade.nonsense.text}
          </p>
        </section>

        {grade.trueNotes.some((n) => n.note) ? (
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-fg">
              Proč ostatní sedí
            </h2>
            <ul className="space-y-2">
              {grade.trueNotes
                .filter((n) => n.note)
                .map((n) => (
                  <li
                    key={n.statementId}
                    className="rounded-xl border border-border bg-subtle px-3 py-2 text-body-sm"
                  >
                    <p className="font-medium text-fg">{n.text}</p>
                    <p className="mt-1 text-caption text-fg-muted">{n.note}</p>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-1">
          <h2 className="text-caption font-semibold uppercase text-fg-muted">
            Tvé zdůvodnění
          </h2>
          <p className="rounded-xl bg-canvas px-3 py-2 text-body-sm text-fg-secondary">
            {reason}
          </p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            fullWidth
            onClick={() => {
              setGrade(null);
              setRound(null);
            }}
          >
            Další kolo
          </Button>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => begin(round)}
          >
            Zkusit znovu
          </Button>
        </div>
      </div>
    );
  }

  if (round) {
    const byId = new Map(round.statements.map((s) => [s.id, s]));
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <header className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <Badge tone="warning">Najdi nesmysl</Badge>
            <Badge tone="neutral">
              {nonsenseCategoryLabelsCs[round.category]}
            </Badge>
          </div>
          <h1 className="font-display text-display-sm text-fg">{round.stem}</h1>
          <p className="text-caption text-fg-muted">
            3 tvrzení jsou pravdivá · 1 je nesmysl. Pak napiš proč.
          </p>
        </header>

        {error ? (
          <Alert title="Pozor" tone="danger">
            {error}
          </Alert>
        ) : null}

        <ul className="space-y-2">
          {order.map((id, i) => {
            const st = byId.get(id)!;
            const selected = selectedId === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setSelectedId(id)}
                  className={[
                    "w-full rounded-xl border px-3 py-3 text-left text-body-sm transition",
                    selected
                      ? "border-action bg-action/10 text-fg ring-2 ring-action/30"
                      : "border-border bg-canvas text-fg hover:border-action/50",
                  ].join(" ")}
                >
                  <span className="mr-2 text-caption font-semibold text-fg-muted">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {st.text}
                </button>
              </li>
            );
          })}
        </ul>

        <label className="block space-y-1">
          <span className="text-caption font-semibold text-fg-muted">
            Proč je vybrané tvrzení nesmysl?
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={pending}
            placeholder="Napiš vlastní vysvětlení — co je špatně a jak to má být…"
            className="w-full rounded-xl border border-border bg-subtle px-3 py-3 text-body-sm text-fg"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button fullWidth disabled={pending} onClick={submit}>
            Odeslat
          </Button>
          <Button
            fullWidth
            variant="ghost"
            disabled={pending}
            onClick={() => setRound(null)}
          >
            Zpět
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <Badge tone="warning">Najdi nesmysl</Badge>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-md text-fg-secondary">{pack.summary}</p>
        <p className="text-caption text-fg-muted">
          {progress?.solvedRoundIds.length ?? 0}/{pack.rounds.length} vyřešeno ·
          zbývá {queue.length}
        </p>
      </header>

      {!learnerId ? (
        <Alert title="Onboarding" tone="info">
          Pro skóre dokonči onboarding.
        </Alert>
      ) : null}

      {queue.length === 0 ? (
        <Alert title="Hotovo" tone="success">
          Všechna kola máš odhalená. Můžeš si je projít znovu níže.
        </Alert>
      ) : null}

      <ul className="space-y-3">
        {(queue.length > 0 ? queue : pack.rounds).map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-subtle px-4 py-3"
          >
            <div>
              <p className="font-medium text-fg">{r.stem}</p>
              <p className="text-caption text-fg-muted">
                {nonsenseCategoryLabelsCs[r.category]}
                {solved.has(r.id) ? " · vyřešeno" : ""}
              </p>
            </div>
            <Button
              size="sm"
              disabled={!learnerId || pending}
              onClick={() => begin(r)}
            >
              Hrát
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
