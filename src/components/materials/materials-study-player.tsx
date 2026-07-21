"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  materialsSessionItemKindLabelsCs,
  type MaterialsSession,
  type MaterialsSessionAttempt,
  type MaterialsSessionSummary,
} from "@/domain/learning/materials-study-session";
import {
  finishMaterialsStudySessionAction,
  submitMaterialsSessionAnswerAction,
} from "@/server/actions/materials-study-session";
import {
  ConfidenceBadge,
  SourceCitationPanel,
} from "@/components/materials/source-citation-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GradeView = {
  feedback: string;
  idealAnswer: string;
  whatWasCorrect: string[];
  whatWasMissing: string[];
  whatWasWrong: string[];
  scheduledDueAt: string | null;
  result: "correct" | "partial" | "incorrect";
};

export function MaterialsStudyPlayer({
  session,
}: {
  session: MaterialsSession;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [grade, setGrade] = useState<GradeView | null>(null);
  const [attempts, setAttempts] = useState<MaterialsSessionAttempt[]>([]);
  const [summary, setSummary] = useState<MaterialsSessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const item = session.items[index];
  const awaitingSummary = index >= session.items.length && !summary;

  const progressLabel = useMemo(() => {
    if (summary) return "Hotovo";
    if (awaitingSummary) return "Shrnutí…";
    return `${index + 1} / ${session.items.length}`;
  }, [awaitingSummary, index, session.items.length, summary]);

  function submitOpen() {
    if (!item) return;
    setError(null);
    startTransition(async () => {
      const res = await submitMaterialsSessionAnswerAction({
        item,
        studentAnswer: answer,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGrade({
        feedback: res.grade.feedback,
        idealAnswer: res.grade.idealAnswer,
        whatWasCorrect: res.grade.whatWasCorrect,
        whatWasMissing: res.grade.whatWasMissing,
        whatWasWrong: res.grade.whatWasWrong,
        scheduledDueAt: res.grade.scheduledDueAt,
        result: res.grade.attempt.result,
      });
      setAttempts((prev) => [...prev, res.grade.attempt]);
    });
  }

  function submitFlashcard(g: "dont_know" | "almost" | "know") {
    if (!item) return;
    setError(null);
    startTransition(async () => {
      const res = await submitMaterialsSessionAnswerAction({
        item,
        studentAnswer: g,
        flashcardGrade: g,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGrade({
        feedback: res.grade.feedback,
        idealAnswer: res.grade.idealAnswer,
        whatWasCorrect: res.grade.whatWasCorrect,
        whatWasMissing: res.grade.whatWasMissing,
        whatWasWrong: res.grade.whatWasWrong,
        scheduledDueAt: res.grade.scheduledDueAt,
        result: res.grade.attempt.result,
      });
      setAttempts((prev) => [...prev, res.grade.attempt]);
    });
  }

  function onNextWithLatest(latest: MaterialsSessionAttempt[]) {
    const nextIndex = index + 1;
    setGrade(null);
    setAnswer("");
    setRevealed(false);
    setIndex(nextIndex);
    if (nextIndex >= session.items.length) {
      startTransition(async () => {
        const res = await finishMaterialsStudySessionAction({
          session,
          attempts: latest,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setSummary(res.summary);
      });
    }
  }

  function advance() {
    if (!grade) return;
    onNextWithLatest(attempts);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/app/materials"
          className="text-body-sm font-semibold text-action hover:underline"
        >
          ← Moje materiály
        </Link>
        <Badge tone="neutral">{progressLabel}</Badge>
      </div>

      <div>
        <h1 className="font-display text-display-sm text-fg">
          Studijní sesit
        </h1>
        <p className="mt-1 text-body-sm text-fg-secondary">
          {session.mode === "topic"
            ? `Téma: ${session.topic ?? "—"}`
            : "Chytrý mix"}{" "}
          · {session.materialTitles.join(", ")}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-body-sm text-danger">
          {error}
        </p>
      ) : null}

      {summary ? (
        <SessionSummaryCard summary={summary} />
      ) : item ? (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">
                {materialsSessionItemKindLabelsCs[item.kind]}
              </Badge>
              {item.topic ? <Badge tone="neutral">{item.topic}</Badge> : null}
              <ConfidenceBadge confidence="verified_from_source" />
            </div>
            <CardTitle className="text-title-md">{item.prompt}</CardTitle>
            <CardDescription>
              Po odpovědi dostaneš hodnocení, vysvětlení ze zdroje, aktualizaci
              mastery a plán opakování.
            </CardDescription>
          </CardHeader>

          <div className="space-y-4 px-6 pb-6">
            {item.kind === "flashcard" ? (
              <div className="space-y-3">
                <p className="rounded-lg border border-border bg-subtle/40 px-4 py-6 text-center text-title-sm text-fg">
                  {item.flashcardFront}
                </p>
                {revealed ? (
                  <p className="rounded-lg border border-border bg-surface px-4 py-3 text-body-sm text-fg-secondary">
                    {item.flashcardBack}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRevealed(true)}
                    disabled={pending || Boolean(grade)}
                  >
                    Ukázat odpověď
                  </Button>
                )}
                {revealed && !grade ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => submitFlashcard("dont_know")}
                    >
                      Nevím
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => submitFlashcard("almost")}
                    >
                      Skoro
                    </Button>
                    <Button
                      type="button"
                      disabled={pending}
                      onClick={() => submitFlashcard("know")}
                    >
                      Umím
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <textarea
                  className="min-h-28 w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-md text-fg"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Napiš odpověď vlastními slovy…"
                  disabled={pending || Boolean(grade)}
                />
                {!grade ? (
                  <Button
                    type="button"
                    disabled={pending || !answer.trim()}
                    onClick={submitOpen}
                  >
                    Odeslat a vyhodnotit
                  </Button>
                ) : null}
              </>
            )}

            {grade ? (
              <div className="space-y-3">
                <Badge
                  tone={
                    grade.result === "correct"
                      ? "success"
                      : grade.result === "partial"
                        ? "warning"
                        : "danger"
                  }
                >
                  {grade.result === "correct"
                    ? "Správně"
                    : grade.result === "partial"
                      ? "Částečně"
                      : "Nesprávně"}
                </Badge>
                <p className="text-body-sm text-fg-secondary">{grade.feedback}</p>
                {grade.whatWasCorrect.length > 0 ? (
                  <p className="text-body-sm">
                    <span className="font-semibold text-success">Správně: </span>
                    {grade.whatWasCorrect.join(", ")}
                  </p>
                ) : null}
                {grade.whatWasMissing.length > 0 ? (
                  <p className="text-body-sm">
                    <span className="font-semibold text-warning">Chybí: </span>
                    {grade.whatWasMissing.join(", ")}
                  </p>
                ) : null}
                {grade.whatWasWrong.length > 0 ? (
                  <p className="text-body-sm">
                    <span className="font-semibold text-danger">Pozor: </span>
                    {grade.whatWasWrong.join(" ")}
                  </p>
                ) : null}
                <div className="rounded-lg border border-border bg-subtle/30 p-3">
                  <p className="text-caption font-semibold text-fg-muted">
                    Ideální odpověď ze zdroje
                  </p>
                  <p className="mt-1 text-body-sm text-fg">{grade.idealAnswer}</p>
                </div>
                <SourceCitationPanel citations={item.citations} />
                <Button type="button" disabled={pending} onClick={advance}>
                  {index + 1 >= session.items.length
                    ? "Ukázat shrnutí"
                    : "Další"}
                </Button>
              </div>
            ) : null}
          </div>
        </Card>
      ) : awaitingSummary ? (
        <p className="text-body-sm text-fg-muted">Počítám shrnutí…</p>
      ) : null}
    </div>
  );
}

function SessionSummaryCard({ summary }: { summary: MaterialsSessionSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shrnutí sesitu</CardTitle>
        <CardDescription>
          {summary.correctCount} správně · {summary.partialCount} částečně ·{" "}
          {summary.incorrectCount} nesprávně
        </CardDescription>
      </CardHeader>
      <div className="space-y-5 px-6 pb-6 text-body-sm">
        <section className="space-y-2">
          <h2 className="font-semibold text-fg">Co se zlepšilo</h2>
          {summary.whatImproved.length === 0 ? (
            <p className="text-fg-muted">Zatím bez výrazného posunu mastery.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-fg-secondary">
              {summary.whatImproved.map((w) => (
                <li key={w.knowledgeUnitId}>
                  {w.title}: {w.scoreBefore.toFixed(0)} →{" "}
                  {w.scoreAfter.toFixed(0)} (+{w.delta.toFixed(0)})
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-fg">Co zůstává slabé</h2>
          {summary.whatRemainsWeak.length === 0 ? (
            <p className="text-fg-muted">Nic kriticky slabého v tomto sesitu.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-fg-secondary">
              {summary.whatRemainsWeak.map((w) => (
                <li key={w.knowledgeUnitId}>
                  {w.title} ({w.score.toFixed(0)}, {w.band})
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-fg">Co zopakovat</h2>
          {summary.whatShouldBeRepeated.length === 0 ? (
            <p className="text-fg-muted">Všechny položky seděly — skvělé.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-fg-secondary">
              {summary.whatShouldBeRepeated.map((w) => (
                <li key={w.itemId}>
                  [{materialsSessionItemKindLabelsCs[w.kind]}] {w.prompt}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2 rounded-lg border border-border bg-subtle/30 p-3">
          <h2 className="font-semibold text-fg">Odhadovaná retence</h2>
          <p className="text-fg-secondary">
            {(summary.estimatedRetention * 100).toFixed(0)} % —{" "}
            {summary.estimatedRetentionLabelCs}
          </p>
          {summary.nextReviewAt ? (
            <p className="text-caption text-fg-muted">
              Nejbližší opakování:{" "}
              {new Date(summary.nextReviewAt).toLocaleDateString("cs-CZ")}
            </p>
          ) : null}
        </section>

        <Link href="/app/materials/study">
          <Button type="button">Další sesit</Button>
        </Link>
      </div>
    </Card>
  );
}
