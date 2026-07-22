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
  prioritizeMistakeQueue,
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
import {
  StudyPhaseFrame,
  StudySessionChrome,
} from "@/components/ui/study-phase";

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

  const active = book ? prioritizeMistakeQueue(listActiveMemories(book)) : [];
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
      <StudySessionChrome
        title={current.knowledgeUnit.title}
        progressLabel={`${session.cursor + 1} / ${session.queue.length}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning">Procvičit moje chyby</Badge>
          <Badge tone="neutral">
            {mistakeClassLabelsCs[current.errorType]}
          </Badge>
          <StatusBadge status={current.status} />
        </div>

        <StudyPhaseFrame phase="question">
          <p className="font-display text-lg text-fg">{current.question}</p>
          {!revealed ? (
            <Button className="mt-4" fullWidth onClick={() => setRevealed(true)}>
              Odhalit správnou odpověď
            </Button>
          ) : null}
        </StudyPhaseFrame>

        {revealed ? (
          <>
            <StudyPhaseFrame phase="feedback">
              <div>
                <p className="text-caption text-fg-muted">Tvá tehdejší odpověď</p>
                <p className="text-body-md text-fg-secondary">
                  {current.studentAnswer}
                </p>
              </div>
            </StudyPhaseFrame>
            <StudyPhaseFrame phase="explanation">
              <div>
                <p className="text-caption text-fg-muted">Správný koncept</p>
                <p className="font-display text-lg text-fg">
                  {current.correctConcept}
                </p>
              </div>
              <div className="mt-3">
                <p className="text-caption text-fg-muted">Proč to bylo špatně</p>
                <p className="text-body-md text-fg-secondary">{current.whyWrong}</p>
              </div>
              <p className="mt-3 text-caption text-fg-muted">
                Výskytů: {current.occurrenceCount} · Pokusů o nápravu:{" "}
                {current.recoveryAttempts}
                {current.nextReviewAt
                  ? ` · Další opakování: ${new Date(current.nextReviewAt).toLocaleString("cs-CZ")}`
                  : ""}
              </p>
            </StudyPhaseFrame>
            {(current.sourceLabel || current.sourceExcerpt) && (
              <StudyPhaseFrame phase="source">
                <p className="text-body-sm text-fg-secondary">
                  {current.sourceLabel ?? "Materiál"}
                  {current.sourceExcerpt
                    ? ` — ${current.sourceExcerpt.slice(0, 220)}`
                    : ""}
                </p>
              </StudyPhaseFrame>
            )}
            <StudyPhaseFrame phase="next" showLabel={false}>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  fullWidth
                  variant="secondary"
                  disabled={pending}
                  onClick={() => grade("again")}
                >
                  Pořád nejisté
                </Button>
                <Button
                  fullWidth
                  disabled={pending}
                  onClick={() => grade("good")}
                >
                  Už vím
                </Button>
              </div>
            </StudyPhaseFrame>
          </>
        ) : null}

        {error ? (
          <Alert title="Chyba" tone="danger">
            {error}
          </Alert>
        ) : null}
      </StudySessionChrome>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
          Slabiny
        </p>
        <h1 className="font-display text-title-lg tracking-tight text-fg sm:text-display-sm">
          Moje chyby
        </h1>
        <p className="text-body-sm text-fg-secondary sm:text-body-md">
          Jen skutečné chyby z testů a studia. Jedna správná nestačí — historii
          držíme, dokud to několikrát neprokážeš.
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
            Silné ({mastered.length})
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
          {memory.occurrenceCount}× chyba · náprava {memory.recoveryAttempts}×
        </span>
      </div>
      <p className="mt-2 font-display text-body-md text-fg">{memory.question}</p>
      <p className="mt-1 text-body-sm text-fg-secondary">
        <span className="text-fg-muted">Koncept:</span>{" "}
        {memory.knowledgeUnit.title}
      </p>
      <p className="mt-1 text-body-sm text-fg-secondary">
        <span className="text-fg-muted">Ty:</span> {memory.studentAnswer}
      </p>
      <p className="mt-1 text-body-sm text-fg">
        <span className="text-fg-muted">Správný princip:</span>{" "}
        {memory.correctConcept}
      </p>
      <p className="mt-1 text-body-sm text-fg-secondary">
        <span className="text-fg-muted">Proč špatně:</span> {memory.whyWrong}
      </p>
      {(memory.sourceLabel || memory.sourceExcerpt) && (
        <p className="mt-2 text-caption text-fg-muted">
          Zdroj: {memory.sourceLabel ?? "studijní materiál"}
          {memory.sourceExcerpt
            ? ` — „${memory.sourceExcerpt.slice(0, 160)}${memory.sourceExcerpt.length > 160 ? "…" : ""}“`
            : ""}
        </p>
      )}
      <p className="mt-1 text-caption text-fg-muted">
        Další opakování:{" "}
        {memory.nextReviewAt
          ? new Date(memory.nextReviewAt).toLocaleString("cs-CZ")
          : memory.status === "mastered"
            ? "zvládnuto (historie zůstává)"
            : "co nejdřív"}
      </p>
    </li>
  );
}
