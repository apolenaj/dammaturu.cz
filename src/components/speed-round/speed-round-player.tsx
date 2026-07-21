"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  endSpeedRoundAction,
  startSpeedRoundAction,
  submitSpeedAnswerAction,
} from "@/server/actions/speed-round";
import {
  SPEED_ROUND_DURATION_MS,
  currentQuestion,
  remainingMs,
  speedQuestionKindLabelsCs,
  type SpeedRoundBest,
  type SpeedRoundPack,
  type SpeedRoundSession,
  type SpeedRoundSummary,
} from "@/domain/learning/speed-round";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function SpeedRoundPlayer({
  pack,
  initialBest,
  learnerId,
}: {
  pack: SpeedRoundPack;
  initialBest: SpeedRoundBest | null;
  learnerId: string | null;
}) {
  const [session, setSession] = useState<SpeedRoundSession | null>(null);
  const [best, setBest] = useState(initialBest);
  const [summary, setSummary] = useState<SpeedRoundSummary | null>(null);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [streak, setStreak] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const questionStartedAt = useRef(Date.now());
  const endingRef = useRef(false);

  const question = useMemo(
    () => (session ? currentQuestion(session, pack) : null),
    [session, pack],
  );

  const timeLeft = session
    ? remainingMs(session, new Date(nowTick).toISOString())
    : SPEED_ROUND_DURATION_MS;

  useEffect(() => {
    if (!session || session.status !== "active") return;
    const id = window.setInterval(() => setNowTick(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [session]);

  useEffect(() => {
    if (!session || session.status !== "active") return;
    if (timeLeft > 0 || endingRef.current) return;
    endingRef.current = true;
    startTransition(async () => {
      const res = await endSpeedRoundAction({
        packSlug: pack.slug,
        sessionId: session.id,
      });
      if (!res.ok) {
        setError(res.error);
        endingRef.current = false;
        return;
      }
      setSession(res.session);
      setSummary(res.summary);
      setBest(res.best);
    });
  }, [timeLeft, session, pack.slug]);

  function start() {
    if (!learnerId) {
      setError("Pro skóre dokonči onboarding.");
      return;
    }
    setError(null);
    setSummary(null);
    setFlash(null);
    setStreak(0);
    setLiveScore(0);
    endingRef.current = false;
    startTransition(async () => {
      const res = await startSpeedRoundAction({ packSlug: pack.slug });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSession(res.session);
      questionStartedAt.current = Date.now();
      setNowTick(Date.now());
    });
  }

  function answer(optionId: string) {
    if (!session || !question || pending || timeLeft <= 0) return;
    const responseMs = Date.now() - questionStartedAt.current;
    startTransition(async () => {
      const res = await submitSpeedAnswerAction({
        packSlug: pack.slug,
        sessionId: session.id,
        questionId: question.id,
        optionId,
        responseMs,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFlash(res.correct ? "ok" : "bad");
      setStreak((s) => (res.correct ? s + 1 : 0));
      if (res.correct) setLiveScore((x) => x + 1);
      setSession(res.session);
      if (res.completed && res.summary) {
        setSummary(res.summary);
        if (res.best) setBest(res.best);
      } else {
        questionStartedAt.current = Date.now();
        window.setTimeout(() => setFlash(null), 180);
      }
    });
  }

  if (summary) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <Badge tone="success">Čas vypršel</Badge>
          <h1 className="font-display text-display-md text-fg">Výsledky</h1>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Score" value={String(summary.score)} />
          <Stat label="Accuracy" value={`${summary.accuracyPct} %`} />
          <Stat label="Best streak" value={String(summary.bestStreak)} />
          <Stat
            label="Response time (avg)"
            value={formatMs(summary.avgResponseMs)}
          />
        </div>
        <p className="text-body-sm text-fg-secondary">
          {summary.correct}/{summary.answered} správně · medián{" "}
          {formatMs(summary.medianResponseMs)} · běh {formatMs(summary.durationMs)}
        </p>
        {best ? (
          <p className="text-caption text-fg-muted">
            Osobní best: score {best.bestScore} · streak {best.bestStreak} ·{" "}
            {best.runs} běhů
          </p>
        ) : null}
        {summary.misses.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-fg">
              Rychlé opravy
            </h2>
            <ul className="space-y-2">
              {summary.misses.map((m, i) => (
                <li
                  key={`${m.prompt}-${i}`}
                  className="rounded-xl border border-border bg-subtle px-3 py-2 text-body-sm"
                >
                  <span className="font-medium text-fg">{m.prompt}</span>
                  {m.factHint ? (
                    <span className="mt-1 block text-caption text-fg-muted">
                      {m.factHint}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <Alert title="Čistý běh" tone="success">
            Žádné chyby v tomto kole.
          </Alert>
        )}
        <Button fullWidth onClick={start} disabled={pending || !learnerId}>
          Hrát znovu
        </Button>
      </div>
    );
  }

  if (session && question) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone={timeLeft < 10_000 ? "danger" : "warning"}>
            {formatClock(timeLeft)}
          </Badge>
          <div className="flex flex-wrap gap-3 text-caption text-fg-muted">
            <span>Score {liveScore}</span>
            <span>Streak {streak}</span>
            <span>
              #{session.cursor + 1}/{session.queue.length}
            </span>
          </div>
        </div>

        {flash ? (
          <div
            className={
              flash === "ok"
                ? "h-1 rounded-full bg-success"
                : "h-1 rounded-full bg-danger"
            }
          />
        ) : (
          <div className="h-1 rounded-full bg-border" />
        )}

        <header className="space-y-1">
          <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
            {speedQuestionKindLabelsCs[question.kind]}
          </p>
          <h1 className="font-display text-display-sm text-fg">
            {question.prompt}
          </h1>
        </header>

        {error ? (
          <Alert title="Chyba" tone="danger">
            {error}
          </Alert>
        ) : null}

        <ul className="grid gap-2 sm:grid-cols-2">
          {question.options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                disabled={pending || timeLeft <= 0}
                onClick={() => answer(opt.id)}
                className="w-full rounded-xl border border-border bg-canvas px-3 py-4 text-left text-body-sm font-medium text-fg transition hover:border-action/50 active:bg-action/10"
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <Badge tone="warning">Speed Round</Badge>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-md text-fg-secondary">{pack.summary}</p>
        <p className="text-caption text-fg-muted">
          {pack.questions.length} otázek · {pack.durationMs / 1000} s · jen
          základní fakta
        </p>
      </header>

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}

      {!learnerId ? (
        <Alert title="Onboarding" tone="info">
          Pro skóre a best streak dokonči onboarding.
        </Alert>
      ) : null}

      {best && best.runs > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Best score" value={String(best.bestScore)} />
          <Stat label="Best streak" value={String(best.bestStreak)} />
          <Stat
            label="Best avg RT"
            value={
              best.bestAvgResponseMs != null
                ? formatMs(best.bestAvgResponseMs)
                : "—"
            }
          />
        </div>
      ) : null}

      <ul className="grid gap-2 text-body-sm text-fg-secondary sm:grid-cols-2">
        {(
          [
            "author_work",
            "term_definition",
            "true_false",
            "movement_trait",
          ] as const
        ).map((k) => (
          <li key={k} className="rounded-xl bg-subtle px-3 py-2">
            {speedQuestionKindLabelsCs[k]}
          </li>
        ))}
      </ul>

      <Button fullWidth disabled={pending || !learnerId} onClick={start}>
        Start 60 s
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-subtle px-4 py-3">
      <p className="text-caption text-fg-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-fg">{value}</p>
    </div>
  );
}
