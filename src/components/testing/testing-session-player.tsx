"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DONT_KNOW_TOKEN,
  buildTestingSessionSummary,
  testingModeLabelsCs,
  testingQuestionTypeLabelsCs,
  type TestingAttemptRecord,
  type TestingGradeResult,
  type TestingMode,
  type TestingSession,
  type TestingSessionSummary,
} from "@/domain/learning/testing-engine";
import {
  startTestingSessionAction,
  submitTestingAnswerAction,
} from "@/server/actions/testing-engine";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function TestingSessionPlayer({
  session,
  onExit,
}: {
  session: TestingSession;
  onExit?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [grade, setGrade] = useState<TestingGradeResult | null>(null);
  const [attempts, setAttempts] = useState<TestingAttemptRecord[]>([]);
  const [summary, setSummary] = useState<TestingSessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const question = session.questions[index] ?? null;
  const progressLabel = `${Math.min(index + 1, session.questions.length)} / ${session.questions.length}`;

  const canSubmit = useMemo(() => {
    if (!question) return false;
    if (question.choices.length > 0) return Boolean(selectedChoice);
    return answer.trim().length > 0;
  }, [question, answer, selectedChoice]);

  function resetLocal() {
    setAnswer("");
    setSelectedChoice(null);
    setGrade(null);
    setError(null);
  }

  function submit(raw: string) {
    if (!question) return;
    setError(null);
    startTransition(async () => {
      const res = await submitTestingAnswerAction({
        question,
        studentAnswer: raw,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGrade(res.grade);
      setAttempts((prev) => [
        ...prev,
        {
          questionId: question.questionId,
          knowledgeUnitId: question.knowledgeUnitId,
          topic: question.topic,
          result: res.grade.result,
          studentAnswer: raw,
          coverage: res.grade.coverage,
        },
      ]);
    });
  }

  function onPrimarySubmit() {
    if (!question) return;
    if (question.choices.length > 0) {
      if (!selectedChoice) return;
      submit(selectedChoice);
      return;
    }
    submit(answer);
  }

  function onNext() {
    if (index >= session.questions.length - 1) {
      setSummary(
        buildTestingSessionSummary({
          mode: session.mode,
          attempts,
        }),
      );
      return;
    }
    setIndex((i) => i + 1);
    resetLocal();
  }

  if (summary) {
    return <TestingSummaryView summary={summary} onExit={onExit} />;
  }

  if (!question) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-fg-muted">
          {testingModeLabelsCs[session.mode]} · {progressLabel}
        </p>
        <Badge tone="neutral">
          {testingQuestionTypeLabelsCs[question.questionType]}
        </Badge>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
          {question.topic}
        </p>
        <h2 className="mt-2 whitespace-pre-wrap font-display text-xl font-semibold text-fg">
          {question.stem}
        </h2>

        {question.clozeTemplate ? (
          <p className="mt-3 rounded-lg bg-subtle px-3 py-2 font-mono text-body-sm text-fg">
            {question.clozeTemplate}
          </p>
        ) : null}

        {!grade ? (
          <div className="mt-4 space-y-3">
            {question.choices.length > 0 ? (
              <ul className="space-y-2">
                {question.choices.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedChoice(c.id)}
                      className={cn(
                        "flex min-h-12 w-full items-center rounded-xl px-3 text-left text-body-sm font-medium ring-1 transition",
                        selectedChoice === c.id
                          ? "bg-action/10 ring-action"
                          : "bg-subtle ring-border",
                      )}
                    >
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                placeholder="Napiš odpověď…"
                className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-body-sm text-fg"
                aria-label="Odpověď"
              />
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={onPrimarySubmit}
                disabled={pending || !canSubmit}
              >
                Odeslat
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => submit(DONT_KNOW_TOKEN)}
                disabled={pending}
              >
                Nevím
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <Alert tone="danger" title="Chyba">
          {error}
        </Alert>
      ) : null}

      {grade ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <Badge
            tone={
              grade.result === "correct"
                ? "success"
                : grade.result === "partial"
                  ? "warning"
                  : "danger"
            }
          >
            {grade.resultLabelCs}
          </Badge>

          <p className="text-body-sm text-fg">{grade.correctiveFeedback}</p>

          {grade.whatWasMissing.length > 0 ? (
            <div>
              <p className="text-caption font-semibold text-fg-muted">
                Chybějící koncepty
              </p>
              <ul className="mt-1 list-disc pl-5 text-body-sm text-fg">
                {grade.whatWasMissing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="text-caption font-semibold text-fg-muted">
              Vysvětlení
            </p>
            <p className="mt-1 whitespace-pre-wrap text-body-sm text-fg">
              {grade.explanation}
            </p>
          </div>

          <div>
            <p className="text-caption font-semibold text-fg-muted">Zdroj</p>
            <p className="mt-1 text-caption text-fg-muted">
              {grade.provenance.sourceTitle}
              {grade.provenance.headingPath
                ? ` · ${grade.provenance.headingPath}`
                : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-subtle px-3 py-2 text-body-sm text-fg-secondary">
              {grade.provenance.excerpt.slice(0, 420)}
              {grade.provenance.excerpt.length > 420 ? "…" : ""}
            </p>
          </div>

          <Button type="button" onClick={onNext} disabled={pending}>
            {index >= session.questions.length - 1 ? "Shrnutí" : "Další"}
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function TestingSummaryView({
  summary,
  onExit,
}: {
  summary: TestingSessionSummary;
  onExit?: () => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-xl font-semibold text-fg">
        Shrnutí testu
      </h2>
      <p className="text-caption text-fg-muted">
        {summary.correctCount} správně · {summary.partialCount} částečně ·{" "}
        {summary.incorrectCount} chybně z {summary.total}
      </p>

      <SummaryBlock title="Co už umíš" items={summary.whatYouKnow} />
      <SummaryBlock title="Co ještě zopakovat" items={summary.whatToReview} />

      {summary.biggestMistakeToday ? (
        <div>
          <p className="text-caption font-semibold text-fg-muted">
            Největší chyba dneška
          </p>
          <p className="mt-1 text-body-sm text-fg">
            {summary.biggestMistakeToday}
          </p>
        </div>
      ) : (
        <Alert tone="success" title="Bez velké chyby">
          V tomto setu nebyla zásadní chyba.
        </Alert>
      )}

      <div>
        <p className="text-caption font-semibold text-fg-muted">
          Další doporučený krok
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={summary.nextRecommendedStep.href}
            className="inline-flex min-h-11 items-center rounded-lg bg-action px-4 text-body-sm font-semibold text-fg-on-brand"
          >
            {summary.nextRecommendedStep.label}
          </Link>
          {onExit ? (
            <Button type="button" variant="outline" onClick={onExit}>
              Zpět na režimy
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-caption font-semibold text-fg-muted">{title}</p>
      <ul className="mt-1 list-disc pl-5 text-body-sm text-fg">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function TestingModeHub({
  modes,
  topics,
  poolSize,
  initialMode,
  initialTopic,
}: {
  modes: Array<{ id: TestingMode; label: string; description: string }>;
  topics: string[];
  poolSize: number;
  initialMode?: TestingMode | null;
  initialTopic?: string | null;
}) {
  const [session, setSession] = useState<TestingSession | null>(null);
  const [topic, setTopic] = useState(initialTopic ?? topics[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [autoStarted, setAutoStarted] = useState(false);

  function start(mode: TestingMode) {
    setError(null);
    startTransition(async () => {
      const res = await startTestingSessionAction({
        mode,
        topicFilter: mode === "single_topic" ? topic : null,
      });
      if (!res.ok) {
        setError(res.error);
        setSession(null);
        return;
      }
      setSession(res.session);
    });
  }

  useEffect(() => {
    if (!initialMode || autoStarted || session) return;
    setAutoStarted(true);
    start(initialMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode]);

  if (session) {
    return (
      <TestingSessionPlayer
        session={session}
        onExit={() => {
          setSession(null);
          setAutoStarted(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-body-sm text-fg-secondary">
        {poolSize > 0
          ? `K dispozici ${poolSize} ověřených jednotek ze zdrojů.`
          : "Ověřené otázky se sestaví ze studijních materiálů, jakmile mají podložený text."}
      </p>

      {error ? (
        <Alert tone="warning" title="Nelze spustit">
          {error}
        </Alert>
      ) : null}

      {pending ? (
        <p className="text-body-sm text-fg-secondary" aria-live="polite">
          Připravuji test…
        </p>
      ) : null}

      {topics.length > 0 ? (
        <label className="block text-body-sm text-fg-secondary">
          Téma pro režim „Jedno téma“
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-fg"
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {modes.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(m.id)}
              className="flex min-h-[5.5rem] w-full flex-col items-start rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-action"
            >
              <span className="font-display text-lg font-semibold text-fg">
                {m.label}
              </span>
              <span className="mt-1 text-caption text-fg-muted">
                {m.description}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
