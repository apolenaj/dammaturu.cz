"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { LessonBlockView } from "@/components/lesson/lesson-block-view";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LessonDocument } from "@/domain/learning/lesson";
import type { LessonProgress } from "@/domain/learning/interactions";
import { lessonPlayerAction } from "@/server/actions/lesson-engine";

export function LessonPlayer({
  lesson,
  initialProgress,
}: {
  lesson: LessonDocument;
  initialProgress: LessonProgress | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [index, setIndex] = useState(initialProgress?.currentBlockIndex ?? 0);
  const [progress, setProgress] = useState(initialProgress);
  const [error, setError] = useState<string | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const block = lesson.blocks[index]!;
  const pct = useMemo(
    () => Math.round(((index + 1) / lesson.blocks.length) * 100),
    [index, lesson.blocks.length],
  );

  function run(
    kind: Parameters<typeof lessonPlayerAction>[0]["kind"],
    opts?: {
      success?: boolean | null;
      payload?: Record<string, string | number | boolean | null>;
      nextIndex?: number;
    },
  ) {
    setError(null);
    setSavedFlash(false);
    startTransition(async () => {
      const res = await lessonPlayerAction({
        lessonSlug: lesson.slug,
        blockId: block.id,
        kind,
        success: opts?.success,
        payload: opts?.payload,
        nextBlockIndex: opts?.nextIndex,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProgress(res.progress);
      if (kind === "save") setSavedFlash(true);
      if (typeof opts?.nextIndex === "number") {
        setIndex(opts.nextIndex);
        setExplanationOpen(false);
      }
      if (kind === "lesson_completed") {
        router.refresh();
      }
    });
  }

  function onContinue() {
    if (index >= lesson.blocks.length - 1) {
      run("lesson_completed", { nextIndex: index });
      return;
    }
    run("continue", { nextIndex: index + 1 });
  }

  function onBack() {
    if (index <= 0) return;
    run("back", { nextIndex: index - 1 });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-3">
        <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
          {lesson.topicSlug} · {lesson.estimatedMinutes} min
        </p>
        <h1 className="font-display text-display-md text-fg">{lesson.title}</h1>
        <p className="text-body-md text-fg-secondary">{lesson.objective}</p>
        <Progress
          value={pct}
          label={`Blok ${index + 1} / ${lesson.blocks.length}`}
          showValue
          tone="brand"
        />
        {progress?.status === "completed" ? (
          <Alert tone="success" title="Lekce dokončena">
            Interakce jsou uložené pro mastery model.
          </Alert>
        ) : null}
      </header>

      {error ? (
        <Alert tone="danger" title="Akce selhala">
          {error}
        </Alert>
      ) : null}
      {savedFlash ? (
        <Alert tone="success" title="Uloženo">
          Progress lekce je uložený — můžeš se vrátit.
        </Alert>
      ) : null}

      <div className="rounded-lg border border-border bg-surface p-5 shadow-xs">
        <LessonBlockView
          block={block}
          handlers={{
            explanationOpen,
            onOpenExplanation: () => {
              setExplanationOpen(true);
              run("open_explanation");
            },
            onQuizAnswer: (correct, choiceIndex) =>
              run("quiz_answer", {
                success: correct,
                payload: { choiceIndex, correct },
              }),
            onFlashcardGrade: (grade) =>
              run("flashcard_grade", {
                success: grade === "know",
                payload: { grade },
              }),
            onRecallSubmit: (text) =>
              run("recall_submit", {
                success: text.length >= 12 ? null : false,
                payload: { text: text.slice(0, 500) },
              }),
            onTeachBackSubmit: (text) =>
              run("teach_back_submit", {
                success: null,
                payload: { text: text.slice(0, 500) },
              }),
            onExitSubmit: (text) =>
              run("exit_submit", {
                success: text.length >= 12 ? null : false,
                payload: { text: text.slice(0, 500) },
              }),
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={pending || index === 0}
          onClick={onBack}
        >
          Zpět
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run("save", { nextIndex: index })}
        >
          Uložit
        </Button>
        <Button
          variant="accent"
          size="sm"
          disabled={pending}
          onClick={() => run("understand")}
        >
          Rozumím
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run("dont_know")}
        >
          Nevím
        </Button>
        <Button
          className="ml-auto"
          size="sm"
          disabled={pending}
          onClick={onContinue}
        >
          {index >= lesson.blocks.length - 1 ? "Dokončit" : "Pokračovat"}
        </Button>
      </div>
    </div>
  );
}
