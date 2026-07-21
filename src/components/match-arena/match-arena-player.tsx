"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  startMatchArenaAction,
  submitMatchAction,
} from "@/server/actions/match-arena";
import {
  matchPairKindLabelsCs,
  matchPairKindLeftLabelCs,
  matchPairKindRightLabelCs,
  resolveOpenPairs,
  shuffleLabels,
  type MatchArenaPack,
  type MatchArenaSession,
  type MatchReviewQueue,
  type MatchSessionSummary,
  type MatchSide,
} from "@/domain/learning/match-arena";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function MatchArenaPlayer({
  pack,
  initialReviewQueue,
  learnerId,
}: {
  pack: MatchArenaPack;
  initialReviewQueue: MatchReviewQueue | null;
  learnerId: string | null;
}) {
  const [session, setSession] = useState<MatchArenaSession | null>(null);
  const [reviewQueue, setReviewQueue] = useState(initialReviewQueue);
  const [summary, setSummary] = useState<MatchSessionSummary | null>(null);
  const [matchedRightIds, setMatchedRightIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [draggingLeftId, setDraggingLeftId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "danger" | "info";
    text: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const attemptStartedAt = useRef<number>(Date.now());

  const openPairs = useMemo(
    () => (session ? resolveOpenPairs(pack, session.openPairIds) : []),
    [pack, session],
  );

  const kind = openPairs[0]?.kind ?? pack.rounds[session?.cursor ?? 0]?.kind;
  const roundTitle =
    session?.mode === "review"
      ? `Review · ${kind ? matchPairKindLabelsCs[kind] : "páry"}`
      : (pack.rounds[session?.cursor ?? 0]?.title ?? pack.title);

  const [leftOrder, setLeftOrder] = useState<MatchSide[]>([]);
  const [rightOrder, setRightOrder] = useState<MatchSide[]>([]);

  useEffect(() => {
    if (!session || openPairs.length === 0) {
      setLeftOrder([]);
      setRightOrder([]);
      return;
    }
    const unmatched = openPairs.filter(
      (p) => !matchedRightIds.has(p.right.id),
    );
    setLeftOrder(shuffleLabels(unmatched.map((p) => p.left)));
    setRightOrder(shuffleLabels(unmatched.map((p) => p.right)));
    attemptStartedAt.current = Date.now();
    setSelectedLeftId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reshuffle only when open set / round changes
  }, [session?.id, session?.cursor, session?.openPairIds.join("|")]);

  function start(reviewMode: boolean) {
    if (!learnerId) {
      setError("Pro skóre dokonči onboarding.");
      return;
    }
    setError(null);
    setSummary(null);
    setFeedback(null);
    setMatchedRightIds(new Set());
    startTransition(async () => {
      const res = await startMatchArenaAction({
        packSlug: pack.slug,
        reviewMode,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSession(res.session);
      setReviewQueue(res.reviewQueue);
      attemptStartedAt.current = Date.now();
    });
  }

  function tryMatch(leftId: string, rightId: string) {
    if (!session || !learnerId || pending) return;
    setError(null);
    const elapsedMs = Date.now() - attemptStartedAt.current;
    startTransition(async () => {
      const res = await submitMatchAction({
        packSlug: pack.slug,
        sessionId: session.id,
        leftId,
        rightId,
        elapsedMs,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSession(res.session);
      setReviewQueue(res.reviewQueue);
      setSelectedLeftId(null);
      setDraggingLeftId(null);

      if (res.grade.correct) {
        setMatchedRightIds((prev) => new Set(prev).add(rightId));
        setFeedback({
          tone: "success",
          text: `Správně: ${res.grade.pair.left.label} ↔ ${res.grade.pair.right.label}`,
        });
        if (res.advancedRound && !res.completed) {
          setMatchedRightIds(new Set());
          setFeedback({
            tone: "info",
            text: "Kolo hotovo — další typ párů.",
          });
        }
      } else {
        setFeedback({
          tone: "danger",
          text: res.grade.explanation ?? "Špatně.",
        });
      }

      if (res.completed && res.summary) {
        setSummary(res.summary);
        setMatchedRightIds(new Set());
      }
      attemptStartedAt.current = Date.now();
    });
  }

  function onLeftTap(leftId: string) {
    if (pending) return;
    setSelectedLeftId((prev) => (prev === leftId ? null : leftId));
  }

  function onRightTap(rightId: string) {
    if (pending || matchedRightIds.has(rightId)) return;
    if (!selectedLeftId) {
      setFeedback({
        tone: "info",
        text: "Nejdřív klepni na položku vlevo, pak na partnera vpravo.",
      });
      return;
    }
    tryMatch(selectedLeftId, rightId);
  }

  const reviewCount = reviewQueue?.pairIds.length ?? 0;
  const done = Boolean(summary) || session?.status === "completed";

  if (!session) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <Badge tone="warning">Match Arena</Badge>
          <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
          <p className="text-body-md text-fg-secondary">{pack.summary}</p>
          <p className="text-caption text-fg-muted">
            {pack.pairs.length} párů · {pack.rounds.length} kol · desktop
            drag/drop · mobil klepnutí
          </p>
        </header>
        {error ? (
          <Alert title="Chyba" tone="danger">
            {error}
          </Alert>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button fullWidth disabled={pending || !learnerId} onClick={() => start(false)}>
            Spustit arénu
          </Button>
          <Button
            fullWidth
            variant="secondary"
            disabled={pending || !learnerId || reviewCount === 0}
            onClick={() => start(true)}
          >
            Review queue ({reviewCount})
          </Button>
        </div>
        <ul className="grid gap-2 text-body-sm text-fg-secondary sm:grid-cols-2">
          {pack.rounds.map((r) => (
            <li key={r.id} className="rounded-xl bg-subtle px-3 py-2">
              {r.title} · {r.pairIds.length} párů
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (done && summary) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <Badge tone="success">Session hotova</Badge>
          <h1 className="font-display text-display-md text-fg">Výsledky</h1>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Přesnost" value={`${summary.accuracyPct} %`} />
          <Stat label="Průměrná rychlost" value={formatMs(summary.avgMs)} />
          <Stat label="Celkový čas" value={formatMs(summary.durationMs)} />
        </div>
        <p className="text-body-sm text-fg-secondary">
          {summary.correctCount} správně · {summary.wrongCount} chybně · medián{" "}
          {formatMs(summary.medianMs)}
        </p>
        {summary.weakPairs.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-fg">
              Slabé páry
            </h2>
            <ul className="space-y-2">
              {summary.weakPairs.map((w) => (
                <li
                  key={w.pairId}
                  className="rounded-xl border border-border bg-subtle px-3 py-2 text-body-sm"
                >
                  <span className="font-medium text-fg">
                    {w.leftLabel} ↔ {w.rightLabel}
                  </span>
                  <span className="mt-1 block text-caption text-fg-muted">
                    {matchPairKindLabelsCs[w.kind]} · {w.wrongCount}× špatně ·
                    avg {formatMs(w.avgWrongMs)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-caption text-fg-muted">
              Chybné páry jsou v review queue ({reviewCount}).
            </p>
          </section>
        ) : (
          <Alert title="Perfektní" tone="success">
            Žádné slabé páry — výborně.
          </Alert>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            fullWidth
            disabled={pending}
            onClick={() => {
              setSession(null);
              setSummary(null);
            }}
          >
            Zpět na start
          </Button>
          <Button
            fullWidth
            variant="secondary"
            disabled={pending || reviewCount === 0}
            onClick={() => {
              setSummary(null);
              start(true);
            }}
          >
            Procvičit review ({reviewCount})
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning">
            {session.mode === "review" ? "Review" : "Aréna"}
          </Badge>
          <span className="text-caption text-fg-muted">
            kolo {(session.cursor % Math.max(session.roundIds.length, 1)) + 1}/
            {session.roundIds.length} · zbývá {openPairs.length}
          </span>
        </div>
        <h1 className="font-display text-display-sm text-fg">{roundTitle}</h1>
        <p className="text-caption text-fg-muted">
          Desktop: přetáhni vlevo → vpravo. Mobil: klepni vlevo, pak vpravo.
        </p>
      </header>

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}
      {feedback ? (
        <Alert
          title={
            feedback.tone === "success"
              ? "Správně"
              : feedback.tone === "danger"
                ? "Proč ne"
                : "Info"
          }
          tone={feedback.tone}
        >
          {feedback.text}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Column
          title={kind ? matchPairKindLeftLabelCs[kind] : "Vlevo"}
          items={leftOrder}
          selectedId={selectedLeftId}
          draggingId={draggingLeftId}
          mode="left"
          disabled={pending}
          onTap={onLeftTap}
          onDragStart={setDraggingLeftId}
          onDragEnd={() => setDraggingLeftId(null)}
        />
        <Column
          title={kind ? matchPairKindRightLabelCs[kind] : "Vpravo"}
          items={rightOrder}
          selectedId={null}
          draggingId={draggingLeftId}
          mode="right"
          disabled={pending}
          matchedIds={matchedRightIds}
          onTap={onRightTap}
          onDropLeft={(leftId, rightId) => tryMatch(leftId, rightId)}
        />
      </div>
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

function Column({
  title,
  items,
  selectedId,
  draggingId,
  mode,
  disabled,
  matchedIds,
  onTap,
  onDragStart,
  onDragEnd,
  onDropLeft,
}: {
  title: string;
  items: MatchSide[];
  selectedId: string | null;
  draggingId: string | null;
  mode: "left" | "right";
  disabled: boolean;
  matchedIds?: Set<string>;
  onTap: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onDropLeft?: (leftId: string, rightId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const matched = matchedIds?.has(item.id) ?? false;
          const selected = selectedId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={disabled || matched}
                draggable={mode === "left" && !disabled}
                onDragStart={(e) => {
                  if (mode !== "left") return;
                  e.dataTransfer.setData("text/plain", item.id);
                  e.dataTransfer.effectAllowed = "move";
                  onDragStart?.(item.id);
                }}
                onDragEnd={() => onDragEnd?.()}
                onDragOver={(e) => {
                  if (mode !== "right" || !draggingId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  if (mode !== "right") return;
                  e.preventDefault();
                  const leftId = e.dataTransfer.getData("text/plain");
                  if (leftId) onDropLeft?.(leftId, item.id);
                }}
                onClick={() => onTap(item.id)}
                className={[
                  "w-full rounded-xl border px-3 py-3 text-left text-body-sm transition",
                  matched
                    ? "border-transparent bg-success/10 text-fg-muted line-through"
                    : selected
                      ? "border-action bg-action/10 text-fg ring-2 ring-action/30"
                      : draggingId && mode === "right"
                        ? "border-dashed border-action bg-subtle text-fg"
                        : "border-border bg-canvas text-fg hover:border-action/50",
                ].join(" ")}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
