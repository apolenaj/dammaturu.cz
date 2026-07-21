"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { submitReconstructionAction } from "@/server/actions/story-reconstruction";
import {
  availableDifficulties,
  difficultyLabelsCs,
  shuffleStepsNotCorrect,
  stepsForDifficulty,
  type AxisPoint,
  type ReconstructionDifficulty,
  type ReconstructionProgress,
  type ReconstructionStory,
  type StoryReconstructionPack,
} from "@/domain/learning/story-reconstruction";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function StoryReconstructionPlayer({
  pack,
  initialProgress,
  learnerId,
}: {
  pack: StoryReconstructionPack;
  initialProgress: ReconstructionProgress | null;
  learnerId: string | null;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [story, setStory] = useState<ReconstructionStory | null>(null);
  const [difficulty, setDifficulty] =
    useState<ReconstructionDifficulty>("easy");
  const [order, setOrder] = useState<string[]>([]);
  const [axis, setAxis] = useState<AxisPoint[] | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(Date.now());

  const stepById = useMemo(() => {
    if (!story) return new Map<string, { label: string }>();
    return new Map(story.steps.map((s) => [s.id, s]));
  }, [story]);

  function begin(next: ReconstructionStory, diff: ReconstructionDifficulty) {
    const steps = stepsForDifficulty(next, diff);
    setStory(next);
    setDifficulty(diff);
    setOrder(shuffleStepsNotCorrect(steps.map((s) => s.id)));
    setAxis(null);
    setFeedback(null);
    setError(null);
    startedAt.current = Date.now();
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...order];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    setOrder(next);
  }

  function reshuffle() {
    if (!story) return;
    const steps = stepsForDifficulty(story, difficulty);
    setOrder(shuffleStepsNotCorrect(steps.map((s) => s.id)));
    setFeedback(null);
    startedAt.current = Date.now();
  }

  function check() {
    if (!story || !learnerId) {
      setError("Pro vyhodnocení dokonči onboarding.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitReconstructionAction({
        packSlug: pack.slug,
        storyId: story.id,
        difficulty,
        submittedOrder: order,
        elapsedMs: Date.now() - startedAt.current,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProgress(res.progress);
      if (res.correct && res.axis) {
        setAxis(res.axis);
        setFeedback("Správné pořadí — tady je dějová osa.");
      } else {
        setAxis(null);
        setFeedback("Ještě ne — zkus upravit pořadí událostí.");
      }
    });
  }

  if (axis && story) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <Badge tone="success">Hotovo · {difficultyLabelsCs[difficulty]}</Badge>
          <h1 className="font-display text-display-md text-fg">
            Dějová osa — {story.workTitle}
          </h1>
          <p className="text-body-sm text-fg-secondary">
            {story.author} · každý krok ověřen ze SOURCE
          </p>
        </header>
        {feedback ? (
          <Alert title="Výborně" tone="success">
            {feedback}
          </Alert>
        ) : null}
        <PlotAxis axis={axis} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            fullWidth
            onClick={() => {
              setAxis(null);
              setStory(null);
            }}
          >
            Zvolit jiné dílo
          </Button>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => begin(story, difficulty)}
          >
            Znovu zamíchat
          </Button>
        </div>
      </div>
    );
  }

  if (story) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <header className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <Badge tone="warning">Rekonstrukce</Badge>
            <Badge tone="neutral">{difficultyLabelsCs[difficulty]}</Badge>
          </div>
          <h1 className="font-display text-display-sm text-fg">{story.title}</h1>
          <p className="text-body-sm text-fg-secondary">{story.summary}</p>
        </header>
        {error ? (
          <Alert title="Chyba" tone="danger">
            {error}
          </Alert>
        ) : null}
        {feedback ? (
          <Alert title="Zpětná vazba" tone="warning">
            {feedback}
          </Alert>
        ) : null}
        <ol className="space-y-2">
          {order.map((id, index) => {
            const step = stepById.get(id);
            return (
              <li
                key={id}
                className="flex items-start gap-2 rounded-xl border border-border bg-canvas px-3 py-3"
              >
                <span className="mt-0.5 w-6 shrink-0 text-caption font-semibold text-fg-muted">
                  {index + 1}.
                </span>
                <p className="min-w-0 flex-1 text-body-sm text-fg">
                  {step?.label ?? id}
                </p>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Posunout nahoru"
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending || index === order.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Posunout dolů"
                  >
                    ↓
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button fullWidth disabled={pending} onClick={check}>
            Zkontrolovat pořadí
          </Button>
          <Button
            fullWidth
            variant="outline"
            disabled={pending}
            onClick={reshuffle}
          >
            Zamíchat znovu
          </Button>
          <Button
            fullWidth
            variant="ghost"
            disabled={pending}
            onClick={() => setStory(null)}
          >
            Zpět
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <Badge tone="warning">Story Reconstruction</Badge>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-md text-fg-secondary">{pack.summary}</p>
        <p className="text-caption text-fg-muted">
          {pack.stories.length} příběhů · {Object.keys(pack.evidence).length}{" "}
          verified SOURCE kroků
        </p>
      </header>
      {!learnerId ? (
        <Alert title="Onboarding" tone="info">
          Pro uložení výsledků dokonči onboarding.
        </Alert>
      ) : null}
      <ul className="space-y-4">
        {pack.stories.map((s) => (
          <StoryCard
            key={s.id}
            story={s}
            cleared={progress?.cleared[s.id] ?? null}
            disabled={!learnerId || pending}
            onStart={(diff) => begin(s, diff)}
          />
        ))}
      </ul>
    </div>
  );
}

function StoryCard({
  story,
  cleared,
  disabled,
  onStart,
}: {
  story: ReconstructionStory;
  cleared: ReconstructionDifficulty | null;
  disabled: boolean;
  onStart: (d: ReconstructionDifficulty) => void;
}) {
  const diffs = availableDifficulties(story);
  const [picked, setPicked] = useState<ReconstructionDifficulty>(
    diffs.includes("easy") ? "easy" : diffs[0]!,
  );

  useEffect(() => {
    if (!diffs.includes(picked)) setPicked(diffs[0]!);
  }, [diffs, picked]);

  return (
    <li className="rounded-xl border border-border bg-subtle px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-fg">
            {story.workTitle}
          </h2>
          <p className="text-caption text-fg-muted">
            {story.author} · {story.steps.length} kroků
          </p>
          <p className="mt-1 text-body-sm text-fg-secondary">{story.summary}</p>
        </div>
        {cleared ? (
          <Badge tone="success">Cleared · {cleared}</Badge>
        ) : (
          <Badge tone="neutral">Nové</Badge>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {diffs.map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => setPicked(d)}
            className={[
              "rounded-lg border px-3 py-1.5 text-caption font-semibold transition",
              picked === d
                ? "border-action bg-action/10 text-fg"
                : "border-border bg-canvas text-fg-secondary hover:border-action/40",
            ].join(" ")}
          >
            {difficultyLabelsCs[d]}
          </button>
        ))}
      </div>
      <Button
        className="mt-3"
        disabled={disabled}
        onClick={() => onStart(picked)}
      >
        Spustit challenge
      </Button>
    </li>
  );
}

function PlotAxis({ axis }: { axis: AxisPoint[] }) {
  return (
    <ol className="relative space-y-0 border-l-2 border-action/40 pl-6">
      {axis.map((point, i) => (
        <li key={`${point.order}-${i}`} className="relative pb-8 last:pb-0">
          <span
            className="absolute -left-[1.6rem] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-action text-[10px] font-bold text-fg-on-brand"
            aria-hidden
          >
            {i + 1}
          </span>
          <p className="font-display text-base font-semibold text-fg">
            {point.label}
          </p>
          <p className="mt-1 text-caption text-fg-muted">{point.filename}</p>
          <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-body-sm text-fg-secondary">
            {point.evidenceExcerpt}
            {point.evidenceExcerpt.length >= 220 ? "…" : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
