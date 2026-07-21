"use client";

import { useMemo, useState, useTransition } from "react";
import {
  resetKdoJsemProgressAction,
  submitKdoJsemGuessAction,
} from "@/server/actions/kdo-jsem";
import {
  hintCategoryLabelsCs,
  pointsForHintCount,
  type KdoJsemMystery,
  type KdoJsemPack,
  type KdoJsemProgress,
} from "@/domain/learning/kdo-jsem";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function KdoJsemPlayer({
  pack,
  initialProgress,
  learnerId,
}: {
  pack: KdoJsemPack;
  initialProgress: KdoJsemProgress | null;
  learnerId: string | null;
}) {
  const queue = useMemo(() => {
    const solved = new Set(initialProgress?.solvedMysteryIds ?? []);
    const remaining = pack.mysteries.filter((m) => !solved.has(m.id));
    // stable shuffle by slug hash-ish
    return [...remaining].sort((a, b) => a.slug.localeCompare(b.slug));
  }, [pack.mysteries, initialProgress?.solvedMysteryIds]);

  const [progress, setProgress] = useState(initialProgress);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(1);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [solvedName, setSolvedName] = useState<string | null>(null);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mystery: KdoJsemMystery | null = queue[index] ?? null;
  const done = index >= queue.length;

  function revealNext() {
    if (!mystery) return;
    setFeedback(null);
    setRevealed((r) => Math.min(r + 1, mystery.hints.length));
  }

  function submit() {
    if (!mystery) return;
    if (!learnerId) {
      setError("Pro skóre dokonči onboarding.");
      return;
    }
    if (guess.trim().length < 2) {
      setError("Napiš tip.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitKdoJsemGuessAction({
        packSlug: pack.slug,
        mysteryId: mystery.id,
        guess,
        hintsRevealed: revealed,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProgress(res.progress);
      if (res.correct) {
        setSolvedName(res.answerName);
        setLastPoints(res.points);
        setFeedback(`Správně! +${res.points} bodů`);
      } else if (revealed < mystery.hints.length) {
        setFeedback("Ještě ne — odkrývám další nápovědu.");
        setRevealed((r) => r + 1);
      } else {
        setFeedback(
          `Konec nápověd. Odpověď: ${mystery.answerName}. (0 bodů)`,
        );
        setSolvedName(mystery.answerName);
        setLastPoints(0);
      }
    });
  }

  function nextMystery() {
    setIndex((i) => i + 1);
    setRevealed(1);
    setGuess("");
    setFeedback(null);
    setSolvedName(null);
    setLastPoints(null);
  }

  function restart() {
    if (!learnerId) return;
    startTransition(async () => {
      const res = await resetKdoJsemProgressAction({ packSlug: pack.slug });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProgress(res.progress);
      window.location.reload();
    });
  }

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-1 pb-[env(safe-area-inset-bottom)]">
        <Badge tone="success">Hotovo</Badge>
        <h1 className="font-display text-display-md text-fg">Shrnutí</h1>
        <p className="text-body-sm text-fg-secondary">
          Skóre {progress?.totalScore ?? 0} · early solves{" "}
          {progress?.earlySolves ?? 0}
        </p>
        <Button onClick={restart} disabled={pending || !learnerId}>
          Hrát znovu
        </Button>
      </div>
    );
  }

  if (!mystery) return null;

  const visibleHints = mystery.hints
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, revealed);

  const nextPoints = pointsForHintCount(revealed, mystery.hints.length);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
      <header className="space-y-2 px-1">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">Kdo jsem?</Badge>
          <Badge tone="accent">
            {index + 1}/{queue.length}
          </Badge>
          <Badge tone="warning">Teď za {nextPoints} b.</Badge>
        </div>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-sm text-fg-secondary">{pack.summary}</p>
        <p className="text-caption text-fg-muted">
          Skóre {progress?.totalScore ?? 0} · jen verified SOURCE fakta
        </p>
      </header>

      {error ? (
        <Alert title="Pozor" tone="warning">
          {error}
        </Alert>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Hádej osobnost
        </h2>
        <ol className="space-y-3">
          {visibleHints.map((h) => (
            <li
              key={h.id}
              className="rounded-xl bg-subtle/60 px-3 py-3 ring-1 ring-border"
            >
              <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
                {hintCategoryLabelsCs[h.category]}
              </p>
              <p className="mt-1 text-body-md text-fg">{h.displayText}</p>
              <p className="mt-1 text-caption text-fg-muted">
                zdroj: {pack.evidence[h.evidenceId]?.filename}
              </p>
            </li>
          ))}
        </ol>

        {!solvedName ? (
          <>
            <label className="block">
              <span className="sr-only">Tvůj tip</span>
              <input
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="Kdo jsem?"
                className="mt-2 w-full rounded-xl border border-border bg-subtle/40 px-3 py-3 text-body-md text-fg"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} disabled={pending}>
                Tipnout ({nextPoints} b.)
              </Button>
              {revealed < mystery.hints.length ? (
                <Button variant="ghost" onClick={revealNext} disabled={pending}>
                  Další nápověda
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <Alert
              title={lastPoints && lastPoints > 0 ? "Vyřešeno" : "Odhaleno"}
              tone={lastPoints && lastPoints > 0 ? "success" : "info"}
            >
              {feedback} — {solvedName}
            </Alert>
            <Button fullWidth onClick={nextMystery}>
              Další osobnost
            </Button>
          </div>
        )}

        {feedback && !solvedName ? (
          <p className="text-body-sm text-fg-secondary">{feedback}</p>
        ) : null}
      </section>
    </div>
  );
}
