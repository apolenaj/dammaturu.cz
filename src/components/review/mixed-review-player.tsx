"use client";

import { useMemo, useState, useTransition } from "react";
import {
  gradeMixedReviewAction,
  startMixedReviewAction,
} from "@/server/actions/spaced-repetition";
import {
  performanceGradeLabelsCs,
  reviewFormatLabelsCs,
  suggestGradeFromRecall,
  type DueSummary,
  type MixedReviewSession,
  type PerformanceGrade,
  type QueuedReviewItem,
  type SpacedReviewPack,
} from "@/domain/learning/spaced-repetition";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function MixedReviewPlayer({
  pack,
  initialSummary,
  learnerId,
}: {
  pack: SpacedReviewPack;
  initialSummary: DueSummary | null;
  learnerId: string | null;
}) {
  const [session, setSession] = useState<MixedReviewSession | null>(null);
  const [summary, setSummary] = useState(initialSummary);
  const [flash, setFlash] = useState(false);
  const [recallText, setRecallText] = useState("");
  const [matchChoice, setMatchChoice] = useState<string | null>(null);
  const [questionChoice, setQuestionChoice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const item: QueuedReviewItem | null = session
    ? (session.queue[session.cursor] ?? null)
    : null;

  const matchOptions = useMemo(() => {
    if (!item || item.payload.format !== "matching") return [];
    const opts = [item.payload.right, ...item.payload.distractors];
    return [...opts].sort((a, b) => a.localeCompare(b, "cs"));
  }, [item]);

  function start() {
    if (!learnerId) {
      setError("Pro opakování dokonči onboarding.");
      return;
    }
    setError(null);
    setFlash(false);
    setRecallText("");
    setMatchChoice(null);
    setQuestionChoice(null);
    startTransition(async () => {
      const res = await startMixedReviewAction({ packSlug: pack.slug });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSession(res.session);
      setSummary(res.summary);
    });
  }

  function submitGrade(grade: PerformanceGrade) {
    if (!session) return;
    startTransition(async () => {
      const studentAnswer =
        item?.payload.format === "free_recall"
          ? recallText
          : item?.payload.format === "matching"
            ? matchChoice ?? undefined
            : item?.payload.format === "question" && questionChoice != null
              ? item.payload.options[questionChoice]
              : undefined;
      const res = await gradeMixedReviewAction({
        packSlug: pack.slug,
        sessionId: session.id,
        grade,
        studentAnswer,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSession(res.session);
      setSummary(res.summary);
      setFlash(false);
      setRecallText("");
      setMatchChoice(null);
      setQuestionChoice(null);
    });
  }

  function checkObjectiveThenGrade() {
    if (!item) return;
    if (item.payload.format === "matching") {
      if (!matchChoice) {
        setError("Vyber partnera.");
        return;
      }
      setError(null);
      submitGrade(matchChoice === item.payload.right ? "good" : "again");
      return;
    }
    if (item.payload.format === "question") {
      if (questionChoice == null) {
        setError("Vyber odpověď.");
        return;
      }
      setError(null);
      submitGrade(
        questionChoice === item.payload.correctIndex ? "good" : "again",
      );
      return;
    }
  }

  if (session?.status === "completed") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <Badge tone="success">Hotovo</Badge>
        <h1 className="font-display text-display-md text-fg">
          Review session dokončena
        </h1>
        <p className="text-body-md text-fg-secondary">
          {session.grades.length} položek · formáty se střídaly (flashcard,
          recall, matching, otázky).
        </p>
        {summary ? (
          <Alert title="Další fronta" tone="info">
            {summary.headlineCs}
          </Alert>
        ) : null}
        <Button fullWidth onClick={start} disabled={pending}>
          Další kolo
        </Button>
      </div>
    );
  }

  if (session && item) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="warning">
            {reviewFormatLabelsCs[item.format]}
          </Badge>
          <span className="text-caption text-fg-muted">
            {session.cursor + 1}/{session.queue.length}
          </span>
        </div>

        {error ? (
          <Alert title="Pozor" tone="danger">
            {error}
          </Alert>
        ) : null}

        <FormatView
          item={item}
          flash={flash}
          onFlip={() => setFlash(true)}
          recallText={recallText}
          onRecallText={setRecallText}
          matchOptions={matchOptions}
          matchChoice={matchChoice}
          onMatch={setMatchChoice}
          questionChoice={questionChoice}
          onQuestion={setQuestionChoice}
        />

        {item.payload.format === "flashcard" ||
        item.payload.format === "free_recall" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                "again",
                "hard",
                "good",
                "easy",
              ] as const satisfies PerformanceGrade[]
            ).map((g) => (
              <Button
                key={g}
                size="sm"
                variant={g === "again" ? "danger" : "outline"}
                disabled={
                  pending ||
                  (item.payload.format === "flashcard" && !flash) ||
                  (item.payload.format === "free_recall" &&
                    recallText.trim().length < 2)
                }
                onClick={() => {
                  if (item.payload.format === "free_recall") {
                    const suggested = suggestGradeFromRecall(
                      recallText,
                      item.payload.keywords,
                    );
                    // Student still picks; pre-suggest by enabling — use their button
                    void suggested;
                  }
                  submitGrade(g);
                }}
              >
                {performanceGradeLabelsCs[g]}
              </Button>
            ))}
          </div>
        ) : (
          <Button
            fullWidth
            disabled={pending}
            onClick={checkObjectiveThenGrade}
          >
            Odeslat
          </Button>
        )}

        {item.payload.format === "free_recall" && recallText.trim().length >= 2 ? (
          <p className="text-caption text-fg-muted">
            Návrh podle klíčových slov:{" "}
            {
              performanceGradeLabelsCs[
                suggestGradeFromRecall(recallText, item.payload.keywords)
              ]
            }{" "}
            — potvrď tlačítkem výše.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <Badge tone="warning">Spaced review</Badge>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-md text-fg-secondary">{pack.summary}</p>
      </header>

      {summary ? (
        <Alert title="Dnes" tone="info">
          <p>{summary.headlineCs}</p>
          {summary.interleaveRationaleCs ? (
            <p className="mt-2 text-body-sm text-fg-secondary">
              {summary.interleaveRationaleCs}
            </p>
          ) : null}
        </Alert>
      ) : null}

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}

      {!learnerId ? (
        <Alert title="Onboarding" tone="info">
          Pro schedule dokonči onboarding.
        </Alert>
      ) : null}

      <ul className="grid gap-2 text-body-sm text-fg-secondary sm:grid-cols-2">
        {(
          ["flashcard", "free_recall", "matching", "question"] as const
        ).map((f) => (
          <li key={f} className="rounded-xl bg-subtle px-3 py-2">
            {reviewFormatLabelsCs[f]}
          </li>
        ))}
      </ul>

      <Button
        fullWidth
        disabled={pending || !learnerId}
        onClick={start}
      >
        Spustit mixed review
      </Button>
    </div>
  );
}

function FormatView({
  item,
  flash,
  onFlip,
  recallText,
  onRecallText,
  matchOptions,
  matchChoice,
  onMatch,
  questionChoice,
  onQuestion,
}: {
  item: QueuedReviewItem;
  flash: boolean;
  onFlip: () => void;
  recallText: string;
  onRecallText: (v: string) => void;
  matchOptions: string[];
  matchChoice: string | null;
  onMatch: (v: string) => void;
  questionChoice: number | null;
  onQuestion: (v: number) => void;
}) {
  const p = item.payload;
  if (p.format === "flashcard") {
    return (
      <button
        type="button"
        onClick={onFlip}
        className="w-full rounded-xl border border-border bg-canvas px-4 py-10 text-center"
      >
        <p className="font-display text-xl text-fg">
          {flash ? p.back : p.front}
        </p>
        <p className="mt-3 text-caption text-fg-muted">
          {flash ? "Ohodnoť níže" : "Klepni pro odhalení"}
        </p>
      </button>
    );
  }
  if (p.format === "free_recall") {
    return (
      <div className="space-y-3">
        <p className="font-display text-lg text-fg">{p.prompt}</p>
        <textarea
          value={recallText}
          onChange={(e) => onRecallText(e.target.value)}
          rows={3}
          placeholder="Napiš odpověď vlastními slovy…"
          className="w-full rounded-xl border border-border bg-subtle px-3 py-3 text-body-sm"
        />
      </div>
    );
  }
  if (p.format === "matching") {
    return (
      <div className="space-y-3">
        <p className="text-caption font-semibold uppercase text-fg-muted">
          Spoj
        </p>
        <p className="font-display text-lg text-fg">{p.left}</p>
        <ul className="space-y-2">
          {matchOptions.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onClick={() => onMatch(opt)}
                className={[
                  "w-full rounded-xl border px-3 py-3 text-left text-body-sm",
                  matchChoice === opt
                    ? "border-action bg-action/10"
                    : "border-border bg-canvas",
                ].join(" ")}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="font-display text-lg text-fg">{p.stem}</p>
      <ul className="space-y-2">
        {p.options.map((opt, i) => (
          <li key={opt}>
            <button
              type="button"
              onClick={() => onQuestion(i)}
              className={[
                "w-full rounded-xl border px-3 py-3 text-left text-body-sm",
                questionChoice === i
                  ? "border-action bg-action/10"
                  : "border-border bg-canvas",
              ].join(" ")}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
