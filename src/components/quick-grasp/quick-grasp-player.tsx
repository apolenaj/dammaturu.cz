"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  answerCheckpointAction,
  answerMicroAction,
} from "@/server/actions/quick-grasp";
import {
  computeQuickGraspStats,
  type QuickGraspPack,
  type QuickGraspProgress,
} from "@/domain/learning/quick-grasp";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function QuickGraspPlayer({
  pack,
  initialProgress,
}: {
  pack: QuickGraspPack;
  initialProgress: QuickGraspProgress | null;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [checkpointAnswered, setCheckpointAnswered] = useState<string[]>([]);
  const [checkpointItemIndex, setCheckpointItemIndex] = useState(0);
  const [locked, setLocked] = useState(false);

  const stats = useMemo(
    () => computeQuickGraspStats(pack, progress),
    [pack, progress],
  );

  const stepIndex = progress?.currentStepIndex ?? 0;
  const step = pack.steps[Math.min(stepIndex, pack.steps.length - 1)]!;
  const done = progress?.status === "completed";

  const successPct =
    stats.successRate === null
      ? null
      : Math.round(stats.successRate * 100);

  function onMicroChoice(choiceIndex: number) {
    if (step.type !== "micro" || locked || pending) return;
    setLocked(true);
    setError(null);
    const correct = choiceIndex === step.check.correctIndex;
    setFeedback(
      correct
        ? step.check.explanation ?? "Správně."
        : step.check.explanation ??
            `Správně: ${step.check.choices[step.check.correctIndex]}`,
    );
    startTransition(async () => {
      const res = await answerMicroAction({
        packSlug: pack.slug,
        stepId: step.id,
        choiceIndex,
      });
      if (!res.ok) {
        setError(res.error);
        setLocked(false);
        return;
      }
      setProgress(res.progress);
      setTimeout(() => {
        setFeedback(null);
        setLocked(false);
      }, 700);
    });
  }

  function onCheckpointChoice(choiceIndex: number) {
    if (step.type !== "checkpoint" || locked || pending) return;
    const item = step.items[checkpointItemIndex];
    if (!item) return;
    setLocked(true);
    setError(null);
    const correct = choiceIndex === item.correctIndex;
    setFeedback(
      correct
        ? item.explanation ?? "Správně."
        : item.explanation ?? `Správně: ${item.choices[item.correctIndex]}`,
    );
    const answered = [...new Set([...checkpointAnswered, item.id])];
    startTransition(async () => {
      const res = await answerCheckpointAction({
        packSlug: pack.slug,
        stepId: step.id,
        itemId: item.id,
        choiceIndex,
        answeredItemIds: answered,
      });
      if (!res.ok) {
        setError(res.error);
        setLocked(false);
        return;
      }
      setProgress(res.progress);
      setCheckpointAnswered(answered);
      setTimeout(() => {
        setFeedback(null);
        setLocked(false);
        if (checkpointItemIndex < step.items.length - 1) {
          setCheckpointItemIndex(checkpointItemIndex + 1);
        } else {
          setCheckpointAnswered([]);
          setCheckpointItemIndex(0);
        }
      }, 700);
    });
  }

  // Reset checkpoint local state when step changes
  useEffect(() => {
    setCheckpointAnswered([]);
    setCheckpointItemIndex(0);
    setFeedback(null);
    setLocked(false);
  }, [step.id]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">Rychle pochopit</Badge>
          <Badge tone="accent">{pack.topicSlug}</Badge>
        </div>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-sm text-fg-secondary">{pack.summary}</p>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-display text-xl font-semibold text-fg">
              {stats.label}
            </p>
            <p className="text-body-sm text-fg-muted">{stats.remainingLabel}</p>
          </div>
          {successPct !== null ? (
            <p className="text-body-sm text-fg-secondary">
              Úspěšnost{" "}
              <span className="font-semibold text-fg">{successPct} %</span>
              <span className="text-fg-muted">
                {" "}
                ({progress?.checksCorrect}/{progress?.checksAnswered})
              </span>
            </p>
          ) : (
            <p className="text-caption text-fg-muted">Úspěšnost se počítá z odpovědí</p>
          )}
        </div>
        <Progress
          value={stats.completedSteps}
          max={stats.totalSteps}
          tone="brand"
          showValue
          label="Progress"
        />
      </header>

      {error ? (
        <Alert tone="danger" title="Chyba">
          {error}
        </Alert>
      ) : null}

      {done ? (
        <Alert tone="success" title="Hotovo">
          Dokončeno {stats.label}. Úspěšnost{" "}
          {successPct !== null ? `${successPct} %` : "—"}. Completion i
          úspěšnost jsou uložené.
        </Alert>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-5 shadow-xs">
          {step.type === "micro" ? (
            <MicroView
              title={step.title}
              idea={step.idea}
              example={step.example}
              question={step.check.question}
              choices={step.check.choices}
              disabled={pending || locked}
              onChoose={onMicroChoice}
            />
          ) : (
            <CheckpointView
              title={step.title}
              itemIndex={checkpointItemIndex}
              itemCount={step.items.length}
              prompt={step.items[checkpointItemIndex]!.prompt}
              choices={step.items[checkpointItemIndex]!.choices}
              disabled={pending || locked}
              onChoose={onCheckpointChoice}
            />
          )}
          {feedback ? (
            <p className="mt-4 rounded-md border border-border bg-subtle/50 px-3 py-2 text-body-sm text-fg-secondary">
              {feedback}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function MicroView({
  title,
  idea,
  example,
  question,
  choices,
  disabled,
  onChoose,
}: {
  title: string;
  idea: string;
  example: string;
  question: string;
  choices: string[];
  disabled: boolean;
  onChoose: (i: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge tone="neutral">Mikroblok</Badge>
        <h2 className="font-display text-xl font-semibold text-fg">{title}</h2>
      </div>
      <section>
        <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
          1 myšlenka
        </p>
        <p className="mt-1 text-body-md text-fg">{idea}</p>
      </section>
      <section>
        <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
          1 příklad
        </p>
        <p className="mt-1 text-body-md text-fg-secondary">{example}</p>
      </section>
      <section className="space-y-2 border-t border-border pt-4">
        <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
          1 kontrolní otázka
        </p>
        <p className="text-body-md font-semibold text-fg">{question}</p>
        <div className="space-y-2">
          {choices.map((c, i) => (
            <Button
              key={c}
              variant="outline"
              fullWidth
              className="justify-start"
              disabled={disabled}
              onClick={() => onChoose(i)}
            >
              {c}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

function CheckpointView({
  title,
  itemIndex,
  itemCount,
  prompt,
  choices,
  disabled,
  onChoose,
}: {
  title: string;
  itemIndex: number;
  itemCount: number;
  prompt: string;
  choices: string[];
  disabled: boolean;
  onChoose: (i: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warning">Retrieval checkpoint</Badge>
        <h2 className="font-display text-xl font-semibold text-fg">{title}</h2>
      </div>
      <p className="text-caption text-fg-muted">
        Otázka {itemIndex + 1} / {itemCount} — bez listování textem, jen recall.
      </p>
      <p className="text-body-md font-semibold text-fg">{prompt}</p>
      <div className="space-y-2">
        {choices.map((c, i) => (
          <Button
            key={c}
            variant="outline"
            fullWidth
            className="justify-start"
            disabled={disabled}
            onClick={() => onChoose(i)}
          >
            {c}
          </Button>
        ))}
      </div>
    </div>
  );
}
