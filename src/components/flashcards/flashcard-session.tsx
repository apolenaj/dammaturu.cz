"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type TouchEvent,
} from "react";
import {
  gradeFlashcardAction,
  startFlashcardSessionAction,
} from "@/server/actions/flashcards";
import {
  flashcardTypeLabelsCs,
  gradeLabelsCs,
  type FlashcardDeck,
  type FlashcardItem,
  type FlashcardSchedule,
  type FlashcardSession,
  type ReviewGrade,
  type SessionSummary,
} from "@/domain/learning/flashcards";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type HubStat = {
  slug: string;
  due: number;
  newCount: number;
  learning: number;
};

export function FlashcardReviewHub({
  decks,
  stats,
  learnerId,
}: {
  decks: FlashcardDeck[];
  stats: HubStat[];
  learnerId: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<{
    deck: FlashcardDeck;
    session: FlashcardSession;
    schedule: FlashcardSchedule;
  } | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  function startDeck(slug: string) {
    if (!learnerId) {
      setError("Pro session dokonči onboarding.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await startFlashcardSessionAction({ deckSlug: slug });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.session.queue.length === 0) {
        setError("Teď nic není due. Zkus později — scheduler čeká.");
        return;
      }
      setSummary(null);
      setActive({
        deck: res.deck,
        session: res.session,
        schedule: res.schedule,
      });
    });
  }

  if (active) {
    return (
      <FlashcardSessionPlayer
        deck={active.deck}
        initialSession={active.session}
        initialSchedule={active.schedule}
        initialSummary={summary}
        onExit={() => {
          setActive(null);
          setSummary(null);
        }}
        onSummary={(s) => setSummary(s)}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
      <header className="space-y-2 px-1">
        <Badge tone="brand">Flashcards</Badge>
        <h1 className="font-display text-display-md text-fg">Opakovat</h1>
        <p className="text-body-sm text-fg-secondary">
          Odpověz v hlavě → otoč → ohodnoť. Známka řídí SM-2 plánování další
          karty.
        </p>
      </header>

      {error ? (
        <Alert title="Pozor" tone="warning">
          {error}
        </Alert>
      ) : null}

      {!learnerId ? (
        <Alert title="Onboarding" tone="info">
          Pro ukládání schedule dokonči onboarding.
        </Alert>
      ) : null}

      {decks.length === 0 ? (
        <Alert title="Žádný balíček" tone="neutral">
          Spusť <code className="text-body-sm">npm run seed:flashcards</code>.
        </Alert>
      ) : (
        decks.map((deck) => {
          const st = stats.find((s) => s.slug === deck.slug);
          return (
            <section
              key={deck.id}
              className="rounded-2xl border border-border bg-surface p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-fg">
                    {deck.title}
                  </h2>
                  <p className="mt-1 text-body-sm text-fg-secondary">
                    {deck.summary}
                  </p>
                  <p className="mt-2 text-caption text-fg-muted">
                    {deck.cards.length} karet · due {st?.due ?? 0} · nové{" "}
                    {st?.newCount ?? 0} · učení {st?.learning ?? 0}
                  </p>
                </div>
                <Button
                  onClick={() => startDeck(deck.slug)}
                  disabled={pending || !learnerId}
                >
                  Spustit session
                </Button>
              </div>
            </section>
          );
        })
      )}

      <p className="px-1 text-caption text-fg-muted">
        Zkratky: mezerník = otočit · 1 / 2 / 3 = Nevěděl · Téměř · Věděl. Mobil:
        swipe po otočení.
      </p>
    </div>
  );
}

function FlashcardSessionPlayer({
  deck,
  initialSession,
  initialSchedule,
  initialSummary,
  onExit,
  onSummary,
}: {
  deck: FlashcardDeck;
  initialSession: FlashcardSession;
  initialSchedule: FlashcardSchedule;
  initialSummary: SessionSummary | null;
  onExit: () => void;
  onSummary: (s: SessionSummary) => void;
}) {
  const [session, setSession] = useState(initialSession);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [summary, setSummary] = useState(initialSummary);
  const [flipped, setFlipped] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [swipeHint, setSwipeHint] = useState<string | null>(null);

  const cardById = useMemo(() => {
    const m = new Map<string, FlashcardItem>();
    for (const c of deck.cards) m.set(c.id, c);
    return m;
  }, [deck.cards]);

  const currentId = session.queue[session.cursor];
  const card = currentId ? cardById.get(currentId) : undefined;
  const progress =
    session.queue.length === 0
      ? 100
      : Math.round((session.grades.length / session.queue.length) * 100);

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const grade = useCallback(
    (g: ReviewGrade) => {
      if (!card || !flipped || pending || session.status !== "active") return;
      setError(null);
      startTransition(async () => {
        const res = await gradeFlashcardAction({
          sessionId: session.id,
          cardId: card.id,
          grade: g,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setSession(res.session);
        setSchedule(res.schedule);
        setFlipped(false);
        setSwipeHint(null);
        if (res.summary) {
          setSummary(res.summary);
          onSummary(res.summary);
        }
      });
    },
    [card, flipped, pending, session.id, session.status, onSummary],
  );

  const flip = useCallback(() => {
    if (session.status !== "active" || !card) return;
    setFlipped((f) => !f);
  }, [session.status, card]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!flipped) flip();
        return;
      }
      if (!flipped) return;
      if (e.key === "1") grade("dont_know");
      if (e.key === "2") grade("almost");
      if (e.key === "3") grade("know");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, flip, grade]);

  function onTouchStart(e: TouchEvent) {
    const t = e.changedTouches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 48 && absY < 48) {
      // tap
      if (!flipped) flip();
      return;
    }
    if (!flipped) {
      if (absY > absX && dy < -48) flip();
      return;
    }
    if (absY > absX && dy < -56) {
      setSwipeHint("Téměř");
      grade("almost");
    } else if (dx > 64) {
      setSwipeHint("Věděl/a jsem");
      grade("know");
    } else if (dx < -64) {
      setSwipeHint("Nevěděl/a jsem");
      grade("dont_know");
    }
  }

  if (session.status === "completed" && summary) {
    return (
      <SessionSummaryView
        summary={summary}
        deckTitle={deck.title}
        onAgain={() => onExit()}
        onExit={onExit}
      />
    );
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Alert title="Hotovo" tone="success">
          Fronta je prázdná.
        </Alert>
        <Button onClick={onExit}>Zpět</Button>
      </div>
    );
  }

  const nextDue = schedule.byCardId[card.id]?.dueAt;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-3 pb-[env(safe-area-inset-bottom)] sm:px-0">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onExit}>
          Ukončit
        </Button>
        <p className="text-caption text-fg-muted">
          {session.grades.length + 1}/{session.queue.length}
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full bg-action transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}

      <div
        className="select-none touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={() => {
            if (!flipped) flip();
          }}
          className={cn(
            "relative flex min-h-[280px] w-full flex-col justify-between rounded-2xl border border-border bg-surface p-5 text-left shadow-md transition active:scale-[0.99] sm:min-h-[320px]",
            flipped && "ring-2 ring-action/30",
          )}
          aria-label={flipped ? "Odpověď odkryta" : "Klepni nebo mezerník pro otočení"}
        >
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{flashcardTypeLabelsCs[card.type]}</Badge>
            {!flipped ? (
              <Badge tone="neutral">Odpověz v hlavě</Badge>
            ) : (
              <Badge tone="success">Odkryto</Badge>
            )}
          </div>

          {card.context && (!flipped || card.type === "context_concept") ? (
            <p className="mt-4 rounded-lg bg-subtle/60 px-3 py-2 text-body-sm text-fg-secondary">
              {card.context}
            </p>
          ) : null}

          <div className="mt-6 flex flex-1 flex-col justify-center">
            <p className="font-display text-2xl font-semibold leading-snug text-fg sm:text-3xl">
              {flipped ? card.back : card.front}
            </p>
            {!flipped && card.hint ? (
              <p className="mt-3 text-body-sm text-fg-muted">Nápověda: {card.hint}</p>
            ) : null}
          </div>

          <p className="mt-6 text-caption text-fg-muted">
            {flipped
              ? "Ohodnoť: 1 / 2 / 3 · nebo swipe ← / ↑ / →"
              : "Mezerník / klepnutí / swipe ↑ = otočit"}
          </p>
        </button>
      </div>

      {swipeHint ? (
        <p className="text-center text-body-sm font-semibold text-action">
          {swipeHint}
        </p>
      ) : null}

      {!flipped ? (
        <Button fullWidth size="lg" onClick={flip}>
          Ukázat odpověď
        </Button>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <GradeButton
            tone="danger"
            shortcut="1"
            label={gradeLabelsCs.dont_know}
            disabled={pending}
            onClick={() => grade("dont_know")}
          />
          <GradeButton
            tone="warning"
            shortcut="2"
            label={gradeLabelsCs.almost}
            disabled={pending}
            onClick={() => grade("almost")}
          />
          <GradeButton
            tone="success"
            shortcut="3"
            label={gradeLabelsCs.know}
            disabled={pending}
            onClick={() => grade("know")}
          />
        </div>
      )}

      {flipped && nextDue ? (
        <p className="text-center text-caption text-fg-muted">
          Po „Věděl/a“ se karta typicky odloží; po „Nevěděl/a“ je due zítra
          (error loop).
        </p>
      ) : null}
    </div>
  );
}

function GradeButton({
  label,
  shortcut,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  shortcut: string;
  tone: "danger" | "warning" | "success";
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneCls =
    tone === "danger"
      ? "border-danger/40 bg-danger-soft text-danger"
      : tone === "warning"
        ? "border-warning/40 bg-warning-soft text-warning"
        : "border-success/40 bg-success-soft text-success";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-14 touch-manipulation flex-col items-center justify-center rounded-xl border px-2 py-2 text-body-sm font-semibold transition disabled:opacity-50",
        toneCls,
      )}
    >
      <span>{label}</span>
      <span className="text-caption opacity-70">{shortcut}</span>
    </button>
  );
}

function SessionSummaryView({
  summary,
  deckTitle,
  onAgain,
  onExit,
}: {
  summary: SessionSummary;
  deckTitle: string;
  onAgain: () => void;
  onExit: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-3 pb-[env(safe-area-inset-bottom)]">
      <Badge tone="success">Session hotová</Badge>
      <h1 className="font-display text-display-md text-fg">Shrnutí</h1>
      <p className="text-body-sm text-fg-secondary">{deckTitle}</p>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Věděl/a" value={summary.know} />
        <Stat label="Téměř" value={summary.almost} />
        <Stat label="Nevěděl/a" value={summary.dont_know} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 space-y-2">
        <p className="text-body-sm text-fg">
          Celkem ohodnoceno: <strong>{summary.total}</strong>
        </p>
        {summary.accuracyPct !== null ? (
          <p className="text-body-sm text-fg">
            Vážená úspěšnost: <strong>{summary.accuracyPct}%</strong>
          </p>
        ) : null}
        {summary.nextDueAt ? (
          <p className="text-body-sm text-fg-secondary">
            Nejbližší due:{" "}
            {new Date(summary.nextDueAt).toLocaleString("cs-CZ", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        ) : null}
        <p className="text-caption text-fg-muted">
          Známky už jsou v schedule — příští session vytáhne due + nové karty.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button fullWidth onClick={onAgain}>
          Zpět na balíčky
        </Button>
        <Button fullWidth variant="outline" onClick={onExit}>
          Hotovo
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-subtle px-3 py-4 text-center">
      <p className="font-display text-2xl font-semibold text-fg">{value}</p>
      <p className="text-caption text-fg-muted">{label}</p>
    </div>
  );
}
