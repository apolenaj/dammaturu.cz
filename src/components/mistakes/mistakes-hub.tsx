"use client";

import { useMemo, useState, useTransition } from "react";
import {
  gradeMistakePracticeAction,
  startMistakePracticeAction,
} from "@/server/actions/error-memory";
import {
  listActiveMemories,
  listMasteredMemories,
  mistakeClassLabelsCs,
  mistakeStatusLabelsCs,
  type ErrorMemory,
  type ErrorMemoryBook,
  type MistakeClass,
  type MistakePracticeSession,
  type MistakeStatus,
  type MistakesHubSummary,
  type PracticeGrade,
} from "@/domain/learning/error-memory";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function MistakesHub({
  initialBook,
  initialSummary,
  learnerId,
}: {
  initialBook: ErrorMemoryBook | null;
  initialSummary: MistakesHubSummary | null;
  learnerId: string | null;
}) {
  const [book, setBook] = useState(initialBook);
  const [summary, setSummary] = useState(initialSummary);
  const [session, setSession] = useState<MistakePracticeSession | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current: ErrorMemory | null = useMemo(() => {
    if (!session || !book) return null;
    const id = session.queue[session.cursor];
    if (!id) return null;
    return book.memories.find((m) => m.id === id) ?? null;
  }, [session, book]);

  const active = book ? listActiveMemories(book) : [];
  const mastered = book ? listMasteredMemories(book) : [];

  function startPractice() {
    if (!learnerId) {
      setError("Pro Moje chyby dokonči onboarding.");
      return;
    }
    setError(null);
    setRevealed(false);
    startTransition(async () => {
      const res = await startMistakePracticeAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSession(res.session);
      setBook(res.book);
    });
  }

  function grade(g: PracticeGrade) {
    if (!session) return;
    startTransition(async () => {
      const res = await gradeMistakePracticeAction({
        sessionId: session.id,
        grade: g,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSession(res.session);
      setBook(res.book);
      setSummary(res.summary);
      setRevealed(false);
    });
  }

  if (session?.status === "completed") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <Badge tone="success">Hotovo</Badge>
        <h1 className="font-display text-display-md text-fg">
          Procvičení chyb dokončeno
        </h1>
        <p className="text-body-md text-fg-secondary">
          {session.grades.length} položek. Po opakovaném úspěchu se chyba posune
          na Zvládnutá — historie zůstává.
        </p>
        {summary ? (
          <Alert title="Stav" tone="info">
            {summary.headlineCs}
          </Alert>
        ) : null}
        <Button
          fullWidth
          onClick={() => {
            setSession(null);
          }}
        >
          Zpět na přehled
        </Button>
        {summary && summary.activeCount > 0 ? (
          <Button
            fullWidth
            variant="secondary"
            onClick={startPractice}
            disabled={pending}
          >
            Procvičit znovu
          </Button>
        ) : null}
      </div>
    );
  }

  if (session && current) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning">Procvičit moje chyby</Badge>
          <span className="text-caption text-fg-muted">
            {session.cursor + 1} / {session.queue.length}
          </span>
          <Badge tone="neutral">
            {mistakeClassLabelsCs[current.errorType]}
          </Badge>
          <StatusBadge status={current.status} />
        </div>

        <h1 className="font-display text-display-md text-fg">
          {current.knowledgeUnit.title}
        </h1>

        <div className="space-y-3 rounded-xl border border-border bg-canvas px-4 py-5">
          <p className="text-caption font-semibold uppercase text-fg-muted">
            Otázka
          </p>
          <p className="font-display text-lg text-fg">{current.question}</p>

          {!revealed ? (
            <Button fullWidth onClick={() => setRevealed(true)}>
              Odhalit správnou odpověď
            </Button>
          ) : (
            <div className="space-y-3 border-t border-border pt-4">
              <div>
                <p className="text-caption text-fg-muted">Tvá tehdejší odpověď</p>
                <p className="text-body-md text-fg-secondary">
                  {current.studentAnswer}
                </p>
              </div>
              <div>
                <p className="text-caption text-fg-muted">Správný koncept</p>
                <p className="font-display text-lg text-fg">
                  {current.correctConcept}
                </p>
              </div>
              <div>
                <p className="text-caption text-fg-muted">Proč to bylo špatně</p>
                <p className="text-body-md text-fg-secondary">{current.whyWrong}</p>
              </div>
              <p className="text-caption text-fg-muted">
                Výskytů: {current.occurrenceCount} · Pokusů o nápravu:{" "}
                {current.recoveryAttempts}
              </p>
            </div>
          )}
        </div>

        {error ? (
          <Alert title="Chyba" tone="danger">
            {error}
          </Alert>
        ) : null}

        {revealed ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              fullWidth
              variant="secondary"
              disabled={pending}
              onClick={() => grade("again")}
            >
              Pořád nejisté
            </Button>
            <Button fullWidth disabled={pending} onClick={() => grade("good")}>
              Už vím
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <Badge tone="warning">Moje chyby</Badge>
        <h1 className="font-display text-display-md text-fg">Moje chyby</h1>
        <p className="text-body-md text-fg-secondary">
          Ukládáme jen skutečné chyby z testů, mixed review a studia z materiálů.
          Žádná ukázková data — jen to, co jsi opravdu odpověděl špatně.
        </p>
      </header>

      {summary ? (
        <Alert title="Přehled" tone="info">
          {summary.headlineCs}
        </Alert>
      ) : null}

      {!learnerId ? (
        <Alert title="Onboarding" tone="info">
          Pro Moje chyby dokonči onboarding.
        </Alert>
      ) : null}

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}

      {summary && summary.activeCount > 0 ? (
        <>
          <StatusBreakdown byStatus={summary.byStatus} />
          <TypeBreakdown byType={summary.byType} />
        </>
      ) : null}

      <Button
        fullWidth
        disabled={pending || !learnerId || active.length === 0}
        onClick={startPractice}
      >
        Procvičit moje chyby
      </Button>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">
          Aktivní ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-body-sm text-fg-muted">
            Žádné aktivní chyby. Objeví se po špatné nebo částečné odpovědi v
            testech, mixed review („Znovu“) a studiu z materiálů.
          </p>
        ) : (
          <ul className="space-y-2">
            {active.map((m) => (
              <MemoryRow key={m.id} memory={m} />
            ))}
          </ul>
        )}
      </section>

      {mastered.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-fg">
            Zvládnuté ({mastered.length})
          </h2>
          <ul className="space-y-2">
            {mastered.slice(0, 12).map((m) => (
              <MemoryRow key={m.id} memory={m} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: MistakeStatus }) {
  const tone =
    status === "mastered"
      ? "success"
      : status === "improving"
        ? "info"
        : status === "weak"
          ? "danger"
          : "warning";
  return <Badge tone={tone}>{mistakeStatusLabelsCs[status]}</Badge>;
}

function StatusBreakdown({
  byStatus,
}: {
  byStatus: Record<MistakeStatus, number>;
}) {
  const rows = (Object.entries(byStatus) as [MistakeStatus, number][]).filter(
    ([, n]) => n > 0,
  );
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {rows.map(([status, n]) => (
        <li key={status}>
          <Badge
            tone={
              status === "mastered"
                ? "success"
                : status === "improving"
                  ? "info"
                  : status === "weak"
                    ? "danger"
                    : "warning"
            }
          >
            {mistakeStatusLabelsCs[status]} · {n}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function TypeBreakdown({ byType }: { byType: Record<MistakeClass, number> }) {
  const rows = (Object.entries(byType) as [MistakeClass, number][]).filter(
    ([, n]) => n > 0,
  );
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {rows.map(([type, n]) => (
        <li key={type}>
          <Badge tone="neutral">
            {mistakeClassLabelsCs[type]} · {n}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function MemoryRow({ memory }: { memory: ErrorMemory }) {
  return (
    <li className="rounded-xl border border-border bg-subtle px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={memory.status} />
        <Badge tone="neutral">{mistakeClassLabelsCs[memory.errorType]}</Badge>
        <span className="text-caption text-fg-muted">
          {memory.occurrenceCount}× · náprava {memory.recoveryAttempts}×
        </span>
        <span className="text-caption text-fg-muted">
          naposledy{" "}
          {new Date(memory.lastOccurredAt).toLocaleDateString("cs-CZ")}
        </span>
      </div>
      <p className="mt-2 font-display text-body-md text-fg">{memory.question}</p>
      <p className="mt-1 text-body-sm text-fg-secondary">
        <span className="text-fg-muted">Ty:</span> {memory.studentAnswer}
        {" · "}
        <span className="text-fg-muted">Správně:</span> {memory.correctConcept}
      </p>
    </li>
  );
}
