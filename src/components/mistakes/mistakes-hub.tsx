"use client";

import { useMemo, useState, useTransition } from "react";
import {
  gradeMistakePracticeAction,
  loadDemoMistakesAction,
  startMistakePracticeAction,
} from "@/server/actions/error-memory";
import {
  errorTypeLabelsCs,
  listOpenMemories,
  listResolvedMemories,
  resolvedStatusLabelsCs,
  type ErrorMemory,
  type ErrorMemoryBook,
  type ErrorType,
  type MistakePracticeSession,
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

  const open = book ? listOpenMemories(book) : [];
  const resolved = book ? listResolvedMemories(book) : [];

  function loadDemo() {
    if (!learnerId) return;
    setError(null);
    startTransition(async () => {
      const res = await loadDemoMistakesAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBook(res.book);
      setSummary(res.summary);
    });
  }

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
      if (res.completed) {
        // keep completed session for summary screen
      }
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
          {session.grades.length} položek. Po opakovaném úspěchu se chyba označí
          jako vyřešená — historie zůstává.
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
        {summary && summary.openCount > 0 ? (
          <Button fullWidth variant="secondary" onClick={startPractice} disabled={pending}>
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
            {errorTypeLabelsCs[current.errorType]}
          </Badge>
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
          Významné chyby se uloží jako ErrorMemory. Procvičuj slabiny, dokud se
          neoznačí jako vyřešené — historie zůstane.
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

      {summary && summary.openCount > 0 ? (
        <TypeBreakdown byType={summary.byType} />
      ) : null}

      <Button
        fullWidth
        disabled={pending || !learnerId || open.length === 0}
        onClick={startPractice}
      >
        Procvičit moje chyby
      </Button>

      {open.length === 0 &&
      learnerId &&
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "1" ? (
        <Button
          fullWidth
          variant="secondary"
          disabled={pending}
          onClick={loadDemo}
        >
          [Dev] Načíst ukázkové chyby
        </Button>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">
          Otevřené ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="text-body-sm text-fg-muted">
            Žádné otevřené chyby. Ukládají se automaticky z testů (špatná
            odpověď) a z mixed review (hodnocení „Znovu“).
          </p>
        ) : (
          <ul className="space-y-2">
            {open.map((m) => (
              <MemoryRow key={m.id} memory={m} />
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-fg">
            Historie — vyřešené ({resolved.length})
          </h2>
          <ul className="space-y-2">
            {resolved.slice(0, 12).map((m) => (
              <MemoryRow key={m.id} memory={m} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TypeBreakdown({ byType }: { byType: Record<ErrorType, number> }) {
  const rows = (Object.entries(byType) as [ErrorType, number][]).filter(
    ([, n]) => n > 0,
  );
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {rows.map(([type, n]) => (
        <li key={type}>
          <Badge tone="neutral">
            {errorTypeLabelsCs[type]} · {n}
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
        <Badge tone={memory.resolvedStatus === "resolved" ? "success" : "warning"}>
          {resolvedStatusLabelsCs[memory.resolvedStatus]}
        </Badge>
        <Badge tone="neutral">{errorTypeLabelsCs[memory.errorType]}</Badge>
        <span className="text-caption text-fg-muted">
          {new Date(memory.date).toLocaleDateString("cs-CZ")}
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
