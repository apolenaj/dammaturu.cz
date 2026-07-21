"use client";

import { useMemo, useState, useTransition } from "react";
import {
  timelineQuizAnswerAction,
  timelineReorderAction,
  timelineSetModeAction,
  timelineViewEventAction,
} from "@/server/actions/timeline";
import {
  filterEventsByKinds,
  filterEventsByRange,
  isChronologicalOrder,
  kindLabelsCs,
  pickChronoQuizPairs,
  shuffleEvents,
  sortEventsChronologically,
  type ChronoQuizItem,
  type TimelineEvent,
  type TimelineEventKind,
  type TimelineMode,
  type TimelinePack,
  type TimelineProgress,
} from "@/domain/learning/timeline";
import { Alert } from "@/components/ui/alert";
import { useEscapeToClose } from "@/lib/use-escape-to-close";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const ALL_KINDS: TimelineEventKind[] = [
  "author",
  "work",
  "event",
  "movement",
];

const kindTone: Record<
  TimelineEventKind,
  "neutral" | "accent" | "brand" | "warning" | "success"
> = {
  author: "brand",
  work: "accent",
  event: "warning",
  movement: "success",
};

export function TimelineExplorer({
  pack,
  initialProgress,
  learnerId,
}: {
  pack: TimelinePack;
  initialProgress: TimelineProgress | null;
  learnerId: string | null;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [mode, setMode] = useState<TimelineMode>(
    initialProgress?.mode ?? "learn",
  );
  const [zoomId, setZoomId] = useState(pack.zoomPresets[0]?.id ?? "all");
  const [kinds, setKinds] = useState<TimelineEventKind[]>([...ALL_KINDS]);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);
  const [panel, setPanel] = useState<"timeline" | "quiz" | "reorder">(
    "timeline",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [reorderIds, setReorderIds] = useState<string[]>([]);
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);

  const zoom =
    pack.zoomPresets.find((z) => z.id === zoomId) ?? pack.zoomPresets[0]!;

  const visible = useMemo(() => {
    const ranged = filterEventsByRange(
      pack.events,
      zoom.yearStart,
      zoom.yearEnd,
    );
    return sortEventsChronologically(filterEventsByKinds(ranged, kinds));
  }, [pack.events, zoom, kinds]);

  const quizPairs = useMemo(
    () => pickChronoQuizPairs(visible, 5),
    // regenerate when zoom/filter changes meaningfully
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zoomId, kinds.join(","), pack.id],
  );

  const quizItem: ChronoQuizItem | null = quizPairs[quizIndex] ?? null;

  function requireLearner(): boolean {
    if (learnerId) return true;
    setError("Pro ukládání výsledků dokonči onboarding.");
    return false;
  }

  function switchMode(next: TimelineMode) {
    setMode(next);
    setPanel(next === "reorder" ? "reorder" : "timeline");
    setReorderMsg(null);
    if (next === "reorder") {
      const sample = shuffleEvents(visible.slice(0, Math.min(6, visible.length)));
      setReorderIds(sample.map((e) => e.id));
    }
    if (!learnerId) return;
    startTransition(async () => {
      const res = await timelineSetModeAction({
        packSlug: pack.slug,
        mode: next,
      });
      if (res.ok) setProgress(res.progress);
    });
  }

  function openDetail(ev: TimelineEvent) {
    setSelected(ev);
    if (!learnerId) return;
    startTransition(async () => {
      const res = await timelineViewEventAction({
        packSlug: pack.slug,
        eventId: ev.id,
      });
      if (res.ok) setProgress(res.progress);
    });
  }

  function toggleKind(kind: TimelineEventKind) {
    setKinds((prev) => {
      if (prev.includes(kind)) {
        const next = prev.filter((k) => k !== kind);
        return next.length === 0 ? [...ALL_KINDS] : next;
      }
      return [...prev, kind];
    });
  }

  function onQuizChoose(chosenId: string) {
    if (!quizItem || !requireLearner()) return;
    const correct = chosenId === quizItem.earlierId;
    setQuizFeedback(correct ? "Správně — dřívější položka." : "Ne — zkus znovu podle let.");
    startTransition(async () => {
      const res = await timelineQuizAnswerAction({
        packSlug: pack.slug,
        correct,
      });
      if (res.ok) setProgress(res.progress);
      setTimeout(() => {
        setQuizFeedback(null);
        setQuizIndex((i) => (i + 1) % Math.max(quizPairs.length, 1));
      }, 700);
    });
  }

  function moveReorder(index: number, dir: -1 | 1) {
    const next = [...reorderIds];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    setReorderIds(next);
    setReorderMsg(null);
  }

  function checkReorder() {
    if (!requireLearner()) return;
    const correctOrder = sortEventsChronologically(
      reorderIds
        .map((id) => pack.events.find((e) => e.id === id)!)
        .filter(Boolean),
    ).map((e) => e.id);
    const success = isChronologicalOrder(reorderIds, correctOrder);
    setReorderMsg(
      success
        ? "Výborně — pořadí sedí."
        : "Ještě ne — posuň položky šipkami.",
    );
    startTransition(async () => {
      const res = await timelineReorderAction({
        packSlug: pack.slug,
        success,
      });
      if (res.ok) setProgress(res.progress);
    });
  }

  function reshuffleReorder() {
    const sample = shuffleEvents(visible.slice(0, Math.min(6, visible.length)));
    setReorderIds(sample.map((e) => e.id));
    setReorderMsg(null);
  }

  const quizPct =
    progress && progress.quizAnswered > 0
      ? Math.round((progress.quizCorrect / progress.quizAnswered) * 100)
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
      <header className="space-y-3 px-1">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">Časová osa</Badge>
          <Badge tone="accent">{visible.length} položek</Badge>
        </div>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-sm text-fg-secondary">{pack.summary}</p>

        {/* Mode switch — large touch targets */}
        <div
          className="grid grid-cols-2 gap-2 rounded-xl bg-subtle p-1"
          role="tablist"
          aria-label="Režim timeline"
        >
          <ModeTab
            active={mode === "learn"}
            onClick={() => switchMode("learn")}
            label="Učit se"
          />
          <ModeTab
            active={mode === "reorder"}
            onClick={() => switchMode("reorder")}
            label="Seřadit sám"
          />
        </div>

        {progress ? (
          <p className="text-caption text-fg-muted">
            Zobrazeno {progress.viewedEventIds.length} · quiz{" "}
            {progress.quizCorrect}/{progress.quizAnswered}
            {quizPct !== null ? ` (${quizPct} %)` : ""} · řazení{" "}
            {progress.reorderSuccesses}/{progress.reorderAttempts}
          </p>
        ) : null}
      </header>

      {error ? (
        <Alert tone="danger" title="Poznámka">
          {error}
        </Alert>
      ) : null}

      {/* Zoom */}
      <section className="space-y-2">
        <p className="px-1 text-caption font-semibold uppercase tracking-wide text-fg-muted">
          Zoom období
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pack.zoomPresets.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setZoomId(z.id)}
              className={cn(
                "snap-start shrink-0 rounded-full border px-4 py-2.5 text-body-sm font-semibold min-h-11 transition",
                zoomId === z.id
                  ? "border-action bg-action text-fg-on-brand"
                  : "border-border bg-surface text-fg hover:bg-subtle",
              )}
            >
              {z.label}
            </button>
          ))}
        </div>
        <p className="px-1 text-caption text-fg-muted">
          {zoom.yearStart}–{zoom.yearEnd}
        </p>
      </section>

      {/* Filters */}
      <section className="space-y-2">
        <p className="px-1 text-caption font-semibold uppercase tracking-wide text-fg-muted">
          Filtr
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ALL_KINDS.map((kind) => {
            const on = kinds.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                onClick={() => toggleKind(kind)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2.5 text-body-sm font-semibold min-h-11",
                  on
                    ? "border-border-strong bg-fg text-fg-inverse"
                    : "border-border bg-surface text-fg-muted",
                )}
              >
                {kindLabelsCs[kind]}
              </button>
            );
          })}
        </div>
      </section>

      {mode === "learn" ? (
        <>
          <div className="flex gap-2 px-1">
            <Button
              size="sm"
              variant={panel === "timeline" ? "primary" : "outline"}
              onClick={() => setPanel("timeline")}
            >
              Osa
            </Button>
            <Button
              size="sm"
              variant={panel === "quiz" ? "primary" : "outline"}
              onClick={() => setPanel("quiz")}
            >
              Chrono quiz
            </Button>
          </div>

          {panel === "timeline" ? (
            <TimelineTrack events={visible} onSelect={openDetail} />
          ) : (
            <ChronoQuizPanel
              pack={pack}
              item={quizItem}
              feedback={quizFeedback}
              disabled={pending}
              onChoose={onQuizChoose}
            />
          )}
        </>
      ) : (
        <ReorderChallenge
          pack={pack}
          orderedIds={reorderIds}
          message={reorderMsg}
          disabled={pending}
          onMove={moveReorder}
          onCheck={checkReorder}
          onReshuffle={reshuffleReorder}
        />
      )}

      {/* Detail bottom sheet */}
      {selected ? (
        <DetailSheet event={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "min-h-12 rounded-lg text-body-sm font-semibold transition",
        active
          ? "bg-surface text-fg shadow-xs"
          : "text-fg-secondary hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}

function TimelineTrack({
  events,
  onSelect,
}: {
  events: TimelineEvent[];
  onSelect: (e: TimelineEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <CardNote>V tomto zoomu/filtru nic není — uprav období nebo filtr.</CardNote>
    );
  }

  return (
    <div className="relative">
      <div
        className="flex gap-3 overflow-x-auto px-1 pb-4 pt-2 snap-x snap-mandatory scroll-pl-4 [scrollbar-width:thin]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* spine */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-[2.75rem] h-0.5 bg-border"
          aria-hidden
        />
        {events.map((ev) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => onSelect(ev)}
            className="snap-start relative z-10 flex w-[min(78vw,280px)] shrink-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-left shadow-xs transition active:scale-[0.98] min-h-[9.5rem] touch-manipulation"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge tone={kindTone[ev.kind]}>{kindLabelsCs[ev.kind]}</Badge>
              <span className="text-caption font-semibold text-fg-muted tabular-nums">
                {formatYears(ev)}
              </span>
            </div>
            <p className="font-display text-lg font-semibold leading-snug text-fg">
              {ev.title}
            </p>
            <p className="line-clamp-2 text-body-sm text-fg-secondary">
              {ev.summary}
            </p>
            <span className="mt-auto text-caption font-semibold text-action">
              Detail
            </span>
          </button>
        ))}
      </div>
      <p className="px-1 text-caption text-fg-muted">
        Posuň prstem · klepni pro detail
      </p>
    </div>
  );
}

function ChronoQuizPanel({
  pack,
  item,
  feedback,
  disabled,
  onChoose,
}: {
  pack: TimelinePack;
  item: ChronoQuizItem | null;
  feedback: string | null;
  disabled: boolean;
  onChoose: (id: string) => void;
}) {
  if (!item) {
    return <CardNote>Pro quiz potřebuješ alespoň 2 položky ve filtru.</CardNote>;
  }
  const a = pack.events.find((e) => e.id === item.earlierId)!;
  const b = pack.events.find((e) => e.id === item.laterId)!;
  const options = shuffleStable([a, b], item.earlierId + item.laterId);

  return (
    <div className="mx-1 space-y-3 rounded-xl border border-border bg-surface p-4">
      <Badge tone="warning">Chronological quiz</Badge>
      <p className="text-body-md font-semibold text-fg">{item.prompt}</p>
      <div className="grid gap-2">
        {options.map((ev) => (
          <Button
            key={ev.id}
            variant="outline"
            fullWidth
            className="min-h-14 justify-start text-left"
            disabled={disabled}
            onClick={() => onChoose(ev.id)}
          >
            <span className="flex flex-col items-start gap-0.5">
              <span>{ev.title}</span>
              <span className="text-caption font-normal text-fg-muted">
                {kindLabelsCs[ev.kind]}
              </span>
            </span>
          </Button>
        ))}
      </div>
      {feedback ? (
        <p className="text-body-sm text-fg-secondary">{feedback}</p>
      ) : null}
    </div>
  );
}

function ReorderChallenge({
  pack,
  orderedIds,
  message,
  disabled,
  onMove,
  onCheck,
  onReshuffle,
}: {
  pack: TimelinePack;
  orderedIds: string[];
  message: string | null;
  disabled: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onCheck: () => void;
  onReshuffle: () => void;
}) {
  const items = orderedIds
    .map((id) => pack.events.find((e) => e.id === id))
    .filter(Boolean) as TimelineEvent[];

  if (items.length < 3) {
    return (
      <CardNote>
        Pro řazení rozšiř zoom/filtr — potřeba aspoň 3 položky.
      </CardNote>
    );
  }

  return (
    <div className="mx-1 space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="brand">Reorder challenge</Badge>
        <Button size="sm" variant="ghost" onClick={onReshuffle} disabled={disabled}>
          Zamíchat
        </Button>
      </div>
      <p className="text-body-sm text-fg-secondary">
        Seřaď od nejstaršího po nejnovější. Na mobilu použij šipky — žádné
        nepřesné drag&drop.
      </p>
      <ul className="space-y-2">
        {items.map((ev, i) => (
          <li
            key={ev.id}
            className="flex items-stretch gap-2 rounded-lg border border-border bg-subtle/40 p-2"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                aria-label="Nahoru"
                disabled={disabled || i === 0}
                onClick={() => onMove(i, -1)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-fg disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Dolů"
                disabled={disabled || i === items.length - 1}
                onClick={() => onMove(i, 1)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-fg disabled:opacity-40"
              >
                ↓
              </button>
            </div>
            <div className="min-w-0 flex-1 py-1">
              <p className="text-caption text-fg-muted">{i + 1}.</p>
              <p className="truncate text-body-sm font-semibold text-fg">
                {ev.title}
              </p>
              <p className="text-caption text-fg-muted">
                {kindLabelsCs[ev.kind]}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Button fullWidth disabled={disabled} onClick={onCheck}>
        Zkontrolovat pořadí
      </Button>
      {message ? (
        <p className="text-body-sm text-fg-secondary">{message}</p>
      ) : null}
    </div>
  );
}

function DetailSheet({
  event,
  onClose,
}: {
  event: TimelineEvent;
  onClose: () => void;
}) {
  useEscapeToClose(onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge tone={kindTone[event.kind]}>
              {kindLabelsCs[event.kind]}
            </Badge>
            <h2
              id="timeline-detail-title"
              className="mt-2 font-display text-xl font-semibold text-fg"
            >
              {event.title}
            </h2>
            <p className="mt-1 text-caption font-semibold text-fg-muted tabular-nums">
              {formatYears(event)}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Zavřít
          </Button>
        </div>
        <p className="mt-4 text-body-md text-fg">{event.summary}</p>
        <p className="mt-3 text-body-sm text-fg-secondary">{event.detail}</p>
        {event.sourceHint ? (
          <p className="mt-4 text-caption text-fg-muted">
            Zdrojový kontext: {event.sourceHint}
          </p>
        ) : null}
        {event.eras.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {event.eras.map((era) => (
              <Badge key={era} tone="neutral">
                {era}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CardNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-1 rounded-xl border border-border bg-subtle/50 p-4 text-body-sm text-fg-secondary">
      {children}
    </div>
  );
}

function formatYears(ev: TimelineEvent): string {
  if (ev.yearStart === ev.yearEnd) return String(ev.yearStart);
  return `${ev.yearStart}–${ev.yearEnd}`;
}

/** Deterministic-ish shuffle from seed string for quiz option order. */
function shuffleStable<T>(items: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    h = (h * 1103515245 + 12345) | 0;
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
