"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DONT_KNOW_TOKEN,
  learningInteractionLabelsCs,
  type LearningGradeResult,
  type LearningItem,
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
import { cn } from "@/lib/cn";

/**
 * Recall-before-reveal player.
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
    // Micro is framing only — advance without revealing the answer.
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
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-display text-xl font-semibold text-fg">
          Session hotová
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Prošel jsi {session.items.length} kroků u „{session.title}“. Opakování
          je naplánované podle tvých odpovědí.
        </p>
        {onExit ? (
          <Button type="button" onClick={onExit}>
            Zpět na materiál
          </Button>
        ) : null}
      </div>
    );
  }

  if (!item) return null;

  const revealAllowed = Boolean(grade);

  return (
    <div className="space-y-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-fg-muted">{progressLabel}</p>
        <Badge tone="neutral">
          {learningInteractionLabelsCs[item.interaction]}
        </Badge>
      </div>

      {item.literatureLens ? (
        <p className="text-caption font-semibold uppercase tracking-wide text-action">
          Literatura · {item.literatureLens.replace(/_/g, " ")}
        </p>
      ) : null}

      {item.stepKind === "micro" ? (
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
            Kontext
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-fg">
            {item.prompt}
          </h2>
          {item.microText ? (
            <p className="mt-2 text-body-sm text-fg-secondary">{item.microText}</p>
          ) : null}
          <p className="mt-3 text-caption text-fg-muted">
            Odpověď neuvidíš, dokud si ji nezkušíš vybavit.
          </p>
          <div className="mt-4">
            <Button type="button" onClick={onPrimarySubmit} disabled={pending}>
              Pokračovat k otázce
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
            {item.stepKind === "confidence"
              ? "Jistota"
              : item.stepKind === "follow_up"
                ? "Follow-up"
                : "Vybavení"}
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-fg">
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

          {/* Answer UI — never shows idealAnswer here */}
          {!revealAllowed ? (
            <div className="mt-4 space-y-3">
              {item.choices.length > 0 ? (
                <ul className="space-y-2">
                  {item.choices.map((c) => (
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
            </div>
          ) : null}
        </section>
      )}

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

          {grade.whatWasCorrect.length > 0 ? (
            <div>
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

          <div>
            <p className="text-caption font-semibold text-fg-muted">
              Stručné vysvětlení
            </p>
            <p className="mt-1 whitespace-pre-wrap text-body-sm text-fg">
              {grade.conciseExplanation}
            </p>
          </div>

          <div>
            <p className="text-caption font-semibold text-fg-muted">Zdroj</p>
            <p className="mt-1 text-caption text-fg-muted">
              {grade.source.sourceTitle}
              {grade.source.headingPath
                ? ` · ${grade.source.headingPath}`
                : ""}
              {grade.source.charStart != null
                ? ` · znaky ${grade.source.charStart}–${grade.source.charEnd ?? "?"}`
                : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-subtle px-3 py-2 text-body-sm text-fg-secondary">
              {grade.source.excerpt.slice(0, 420)}
              {grade.source.excerpt.length > 420 ? "…" : ""}
            </p>
          </div>

          {grade.scheduledDueAt ? (
            <p className="text-caption text-fg-muted">
              Další opakování:{" "}
              {new Date(grade.scheduledDueAt).toLocaleString("cs-CZ")}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onExplainSimply} disabled={pending}>
              Vysvětli mi to jednoduše
            </Button>
            <Button type="button" onClick={onNext} disabled={pending}>
              Další
            </Button>
          </div>

          {simple ? (
            <Alert
              tone={simple.insufficient ? "warning" : "info"}
              title="Jednoduše ze zdroje"
            >
              <p className="whitespace-pre-wrap text-body-sm">{simple.text}</p>
            </Alert>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
