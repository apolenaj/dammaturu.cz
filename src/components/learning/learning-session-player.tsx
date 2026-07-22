"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DONT_KNOW_TOKEN,
  learningInteractionLabelsCs,
  type LearningGradeResult,
  type LearningSession,
  type SimpleExplanation,
} from "@/domain/learning/learning-session-engine";
import {
  explainSimplyAction,
  submitLearningSessionAnswerAction,
} from "@/server/actions/learning-session";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  StudyPhaseFrame,
  StudySessionChrome,
} from "@/components/ui/study-phase";
import {
  StudyHelpedPrompt,
  markMeaningfulStudyLocal,
} from "@/components/feedback/study-helped-prompt";
import { trackProductBeacon } from "@/lib/product-analytics-beacon";
import { cn } from "@/lib/cn";

/**
 * Recall-before-reveal player with clear study phases.
 * Never shows idealAnswer until after attempt or explicit „Nevím“.
 */
export function LearningSessionPlayer({
  session,
  onExit,
}: {
  session: LearningSession;
  onExit?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [grade, setGrade] = useState<LearningGradeResult | null>(null);
  const [simple, setSimple] = useState<SimpleExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const item = session.items[index] ?? null;
  const progressLabel = `${Math.min(index + 1, session.items.length)} / ${session.items.length}`;

  const canSubmit = useMemo(() => {
    if (!item) return false;
    if (item.stepKind === "micro") return true;
    if (item.choices.length > 0) return Boolean(selectedChoice);
    return answer.trim().length > 0;
  }, [item, answer, selectedChoice]);

  function resetLocal() {
    setAnswer("");
    setSelectedChoice(null);
    setGrade(null);
    setSimple(null);
    setError(null);
  }

  function submit(raw: string) {
    if (!item) return;
    setError(null);
    startTransition(async () => {
      const res = await submitLearningSessionAnswerAction({
        item,
        studentAnswer: raw,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGrade(res.grade);
    });
  }

  function onPrimarySubmit() {
    if (!item) return;
    if (item.stepKind === "micro") {
      onNext();
      return;
    }
    if (item.choices.length > 0) {
      if (!selectedChoice) return;
      submit(selectedChoice);
      return;
    }
    submit(answer);
  }

  function onDontKnow() {
    submit(DONT_KNOW_TOKEN);
  }

  function onNext() {
    if (index >= session.items.length - 1) {
      markMeaningfulStudyLocal();
      trackProductBeacon("lesson_complete", {
        featureId: "catalog_learning",
        topicSlug: session.id.slice(0, 120),
      });
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    resetLocal();
  }

  function onExplainSimply() {
    if (!item) return;
    startTransition(async () => {
      const res = await explainSimplyAction({
        sourceId: item.source.sourceId,
        atomId: item.atomId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSimple(res.explanation);
    });
  }

  if (done) {
    return (
      <StudySessionChrome title={session.title} progressLabel="Hotovo">
        <StudyPhaseFrame phase="feedback" showLabel={false}>
          <h2 className="font-display text-xl font-semibold text-fg">
            Session hotová
          </h2>
          <p className="mt-2 text-body-sm text-fg-secondary">
            Prošel jsi {session.items.length} kroků u „{session.title}“.
            Opakování je naplánované podle tvých odpovědí.
          </p>
          {onExit ? (
            <div className="mt-4">
              <Button type="button" onClick={onExit}>
                Zpět na materiál
              </Button>
            </div>
          ) : null}
        </StudyPhaseFrame>
        <StudyHelpedPrompt
          className="mt-4"
          context={`learning_session:${session.id}`}
        />
      </StudySessionChrome>
    );
  }

  if (!item) return null;

  const revealAllowed = Boolean(grade);

  return (
    <StudySessionChrome title={session.title} progressLabel={progressLabel}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">
          {learningInteractionLabelsCs[item.interaction]}
        </Badge>
        {item.literatureLens ? (
          <p className="text-caption font-semibold uppercase tracking-wide text-action">
            Literatura · {item.literatureLens.replace(/_/g, " ")}
          </p>
        ) : null}
      </div>

      {item.stepKind === "micro" ? (
        <StudyPhaseFrame phase="question">
          <h2 className="font-display text-xl font-semibold text-fg">
            {item.prompt}
          </h2>
          {item.microText ? (
            <p className="mt-2 text-body-sm text-fg-secondary">
              {item.microText}
            </p>
          ) : null}
          <p className="mt-3 text-caption text-fg-muted">
            Odpověď neuvidíš, dokud si ji nezkušíš vybavit.
          </p>
          <div className="mt-4">
            <Button type="button" onClick={onPrimarySubmit} disabled={pending}>
              Pokračovat k otázce
            </Button>
          </div>
        </StudyPhaseFrame>
      ) : (
        <>
          <StudyPhaseFrame phase="question">
            <p className="mb-2 text-caption font-medium text-fg-muted">
              {item.stepKind === "confidence"
                ? "Jistota"
                : item.stepKind === "follow_up"
                  ? "Doplňující"
                  : "Vybavení"}
            </p>
            <h2 className="font-display text-xl font-semibold text-fg">
              {item.prompt}
            </h2>

            {item.clozeTemplate ? (
              <p className="mt-3 rounded-lg bg-subtle px-3 py-2 font-mono text-body-sm text-fg">
                {item.clozeTemplate}
              </p>
            ) : null}

            {item.pairs.length > 0 ? (
              <ul className="mt-3 space-y-1 text-body-sm text-fg-secondary">
                {item.pairs.map((p) => (
                  <li key={p.leftId}>
                    <span className="font-semibold text-fg">{p.left}</span> ↔ ?
                  </li>
                ))}
              </ul>
            ) : null}

            {item.orderItems.length > 0 && !revealAllowed ? (
              <p className="mt-2 text-caption text-fg-muted">
                Napiš pořadí názvů oddělené šipkou →
              </p>
            ) : null}
          </StudyPhaseFrame>

          {!revealAllowed ? (
            <StudyPhaseFrame phase="answer">
              {item.choices.length > 0 ? (
                <ul className="space-y-2">
                  {item.choices.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedChoice(c.id)}
                        className={cn(
                          "flex min-h-12 w-full items-center rounded-xl px-3 text-left text-body-sm font-medium ring-1 transition duration-fast",
                          selectedChoice === c.id
                            ? "bg-action/10 ring-action shadow-xs"
                            : "bg-surface ring-border hover:ring-border-strong",
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
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-fg shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  aria-label="Tvoje odpověď"
                />
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={onPrimarySubmit}
                  disabled={pending || !canSubmit}
                >
                  Odeslat
                </Button>
                {item.stepKind !== "confidence" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDontKnow}
                    disabled={pending}
                  >
                    Nevím
                  </Button>
                ) : null}
              </div>
            </StudyPhaseFrame>
          ) : null}
        </>
      )}

      {error ? (
        <Alert tone="danger" title="Chyba">
          {error}
        </Alert>
      ) : null}

      {grade ? (
        <div className="space-y-3" aria-live="polite" aria-atomic="false">
          <StudyPhaseFrame phase="feedback">
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

            {grade.whatWasMissing.length > 0 ? (
              <div className="mt-3">
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

            {grade.whatWasCorrect.length > 0 ? (
              <div className="mt-3">
                <p className="text-caption font-semibold text-fg-muted">
                  Co sedělo
                </p>
                <ul className="mt-1 list-disc pl-5 text-body-sm text-fg">
                  {grade.whatWasCorrect.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </StudyPhaseFrame>

          <StudyPhaseFrame phase="explanation">
            <p className="whitespace-pre-wrap text-body-sm text-fg">
              {grade.conciseExplanation}
            </p>
            {simple ? (
              <Alert
                className="mt-3"
                tone={simple.insufficient ? "warning" : "info"}
                title="Jednoduše ze zdroje"
              >
                <p className="whitespace-pre-wrap text-body-sm">{simple.text}</p>
              </Alert>
            ) : null}
          </StudyPhaseFrame>

          <StudyPhaseFrame phase="source">
            <p className="text-caption text-fg-muted">
              {grade.source.sourceTitle}
              {grade.source.headingPath
                ? ` · ${grade.source.headingPath}`
                : ""}
              {grade.source.charStart != null
                ? ` · znaky ${grade.source.charStart}–${grade.source.charEnd ?? "?"}`
                : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-subtle/80 px-3 py-2 text-body-sm text-fg-secondary">
              {grade.source.excerpt.slice(0, 420)}
              {grade.source.excerpt.length > 420 ? "…" : ""}
            </p>
            {grade.scheduledDueAt ? (
              <p className="mt-3 text-caption text-fg-muted">
                Další opakování:{" "}
                {new Date(grade.scheduledDueAt).toLocaleString("cs-CZ")}
              </p>
            ) : null}
          </StudyPhaseFrame>

          <StudyPhaseFrame phase="next" showLabel={false}>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onExplainSimply}
                disabled={pending}
              >
                Vysvětli mi to jednoduše
              </Button>
              <Button type="button" onClick={onNext} disabled={pending}>
                Další otázka
              </Button>
            </div>
          </StudyPhaseFrame>
        </div>
      ) : null}
    </StudySessionChrome>
  );
}
