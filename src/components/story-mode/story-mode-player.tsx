"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  storyAnswerAction,
  storyContinueAction,
} from "@/server/actions/story-mode";
import type { StoryPack, StoryProgress } from "@/domain/learning/story-mode";
import { safeResolveEvidenceText } from "@/domain/learning/story-mode";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

const beatLabels: Record<string, string> = {
  timeline: "Časová osa",
  cause_effect: "Příčina a následek",
  person_card: "Osobnost",
  what_next: "Co dál?",
  decision_moment: "Rozhodující okamžik",
  checkpoint: "Ověření",
};

export function StoryModePlayer({
  pack,
  initialProgress,
}: {
  pack: StoryPack;
  initialProgress: StoryProgress | null;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cpIndex, setCpIndex] = useState(0);
  const [locked, setLocked] = useState(false);

  const beatCount = pack.beats.length;
  const index = Math.min(
    progress?.currentBeatIndex ?? 0,
    Math.max(0, beatCount - 1),
  );
  const beat = pack.beats[index];
  const done = progress?.status === "completed";
  const completed = progress?.completedBeatIds.length ?? 0;
  const sceneLabel = done
    ? `${beatCount} / ${beatCount}`
    : `${Math.min(index + 1, beatCount)} / ${beatCount}`;
  const successPct =
    progress && progress.checksAnswered > 0
      ? Math.round((progress.checksCorrect / progress.checksAnswered) * 100)
      : null;

  useEffect(() => {
    if (!beat) return;
    setCpIndex(0);
    setFeedback(null);
    setLocked(false);
  }, [beat?.id]);

  function onContinue() {
    if (!beat) return;
    setError(null);
    startTransition(async () => {
      const res = await storyContinueAction({
        packSlug: pack.slug,
        beatId: beat.id,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProgress(res.progress);
    });
  }

  function onChoice(choiceIndex: number) {
    if (!beat || locked || pending) return;
    setLocked(true);
    setError(null);

    if (beat.type === "what_next") {
      const opt = beat.options[choiceIndex];
      if (!opt) {
        setLocked(false);
        return;
      }
      setFeedback(
        opt.isCorrect
          ? safeResolveEvidenceText(pack, opt.evidenceIds).join(" ") ||
              "Správně — tak to říká zdroj."
          : "Ne — vrať se k časové ose nebo k příčině a následku.",
      );
      startTransition(async () => {
        const res = await storyAnswerAction({
          packSlug: pack.slug,
          beatId: beat.id,
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
        }, 900);
      });
      return;
    }

    if (beat.type === "checkpoint") {
      const item = beat.items[cpIndex];
      if (!item) {
        setLocked(false);
        return;
      }
      const correct = choiceIndex === item.correctIndex;
      const explainIds = item.explanationEvidenceIds.length
        ? item.explanationEvidenceIds
        : item.evidenceIds;
      setFeedback(
        correct
          ? safeResolveEvidenceText(pack, explainIds).join(" ") ||
              "Správně."
          : safeResolveEvidenceText(pack, item.evidenceIds)[0] ??
              "Zkus to znovu podle zdroje.",
      );
      const answeredCount = cpIndex + 1;
      startTransition(async () => {
        const res = await storyAnswerAction({
          packSlug: pack.slug,
          beatId: beat.id,
          choiceIndex,
          answeredItemCount: answeredCount,
          totalItems: beat.items.length,
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
          if (cpIndex < beat.items.length - 1) setCpIndex(cpIndex + 1);
        }, 900);
      });
    }
  }

  const sourceNote = useMemo(() => {
    const names = new Set(
      Object.values(pack.evidence).map((e) => e.filename),
    );
    return [...names].join(", ");
  }, [pack.evidence]);

  if (!beat) {
    return (
      <Alert tone="danger" title="Příběh je prázdný">
        V tomto packu chybí scény. Vrať se k materiálům a zkus to znovu.
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-action">
          Příběh · ověřený zdroj
        </p>
        <h1 className="font-display text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-fg text-balance sm:text-[2.25rem]">
          {pack.title.replace(/\s*—\s*Story Mode$/i, "")}
        </h1>
        <p className="max-w-xl text-body-md leading-relaxed text-fg-secondary">
          {pack.summary}
        </p>
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-body-sm font-semibold text-fg">
              Scéna {sceneLabel}
            </p>
            {successPct !== null ? (
              <p className="text-caption text-fg-muted">
                Úspěšnost kontrol{" "}
                <span className="font-semibold text-fg">{successPct} %</span>
              </p>
            ) : null}
          </div>
          <Progress
            value={completed}
            max={beatCount}
            tone="brand"
            label="Postup v příběhu"
            showValue
          />
        </div>
      </header>

      {error ? (
        <Alert tone="danger" title="Nepodařilo se uložit">
          {error}
        </Alert>
      ) : null}

      {done ? (
        <section className="rounded-2xl border border-success/25 bg-success/5 px-5 py-6 sm:px-7 sm:py-8">
          <h2 className="font-display text-xl font-semibold text-fg">
            Příběh máš za sebou
          </h2>
          <p className="mt-2 text-body-md leading-relaxed text-fg-secondary">
            Prošel jsi všechny scény. Fakta stála na ověřeném textu ze zdroje
            {sourceNote ? ` (${sourceNote})` : ""}.
          </p>
          <Link
            href="/app/learn"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-action px-5 text-body-sm font-semibold text-fg-on-brand shadow-xs transition hover:bg-action-hover"
          >
            Zpět na Učit se
          </Link>
        </section>
      ) : (
        <article
          className={cn(
            "rounded-2xl border border-border bg-surface px-5 py-6 shadow-xs",
            "sm:px-8 sm:py-8",
          )}
        >
          <div className="mb-6 space-y-2 border-b border-border-subtle pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
              {beatLabels[beat.type] ?? beat.type}
            </p>
            <h2 className="font-display text-2xl font-semibold leading-snug tracking-tight text-fg text-balance">
              {beat.title}
            </h2>
          </div>

          <div className="space-y-6 text-body-md leading-[1.75] text-fg">
            {beat.type === "timeline" ? (
              <TimelineView pack={pack} beat={beat} />
            ) : null}
            {beat.type === "cause_effect" ? (
              <CauseEffectView pack={pack} beat={beat} />
            ) : null}
            {beat.type === "person_card" ? (
              <PersonView pack={pack} beat={beat} />
            ) : null}
            {beat.type === "decision_moment" ? (
              <DecisionView pack={pack} beat={beat} />
            ) : null}
            {beat.type === "what_next" ? (
              <WhatNextView
                beat={beat}
                disabled={pending || locked}
                onChoose={onChoice}
              />
            ) : null}
            {beat.type === "checkpoint" ? (
              <CheckpointView
                beat={beat}
                itemIndex={cpIndex}
                disabled={pending || locked}
                onChoose={onChoice}
              />
            ) : null}
          </div>

          {feedback ? (
            <p className="mt-6 rounded-xl border border-border bg-subtle/60 px-4 py-3 text-body-sm leading-relaxed text-fg-secondary">
              {feedback}
            </p>
          ) : null}

          {beat.type === "timeline" ||
          beat.type === "cause_effect" ||
          beat.type === "person_card" ||
          beat.type === "decision_moment" ? (
            <div className="mt-8">
              <Button
                className="min-h-12 w-full sm:w-auto"
                disabled={pending}
                onClick={onContinue}
              >
                Pokračovat v příběhu
              </Button>
            </div>
          ) : null}
        </article>
      )}

      <p className="text-caption leading-relaxed text-fg-muted">
        Text ze zdroje
        {sourceNote ? `: ${sourceNote}` : ""}. Žádná vymyšlená fakta.
      </p>
    </div>
  );
}

function StoryParagraphs({ texts }: { texts: string[] }) {
  if (texts.length === 0) {
    return (
      <p className="text-body-sm text-fg-muted">
        Text k této scéně teď není k dispozici.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {texts.map((t) => (
        <p
          key={t.slice(0, 48)}
          className="whitespace-pre-wrap text-body-md leading-[1.75] text-fg"
        >
          {t}
        </p>
      ))}
    </div>
  );
}

function TimelineView({
  pack,
  beat,
}: {
  pack: StoryPack;
  beat: Extract<StoryPack["beats"][number], { type: "timeline" }>;
}) {
  const era = safeResolveEvidenceText(pack, [beat.eraLabelEvidenceId])[0];
  const body = safeResolveEvidenceText(pack, beat.bodyEvidenceIds);
  return (
    <div className="relative space-y-5 border-l-2 border-action/35 pl-5">
      {era ? (
        <p className="text-body-sm font-semibold tracking-wide text-action">
          {era}
        </p>
      ) : null}
      <StoryParagraphs texts={body} />
    </div>
  );
}

function CauseEffectView({
  pack,
  beat,
}: {
  pack: StoryPack;
  beat: Extract<StoryPack["beats"][number], { type: "cause_effect" }>;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <section className="space-y-3 rounded-xl bg-subtle/50 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
          Příčina
        </p>
        <StoryParagraphs
          texts={safeResolveEvidenceText(pack, beat.causeEvidenceIds)}
        />
      </section>
      <section className="space-y-3 rounded-xl bg-subtle/50 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
          Následek
        </p>
        <StoryParagraphs
          texts={safeResolveEvidenceText(pack, beat.effectEvidenceIds)}
        />
      </section>
    </div>
  );
}

function PersonView({
  pack,
  beat,
}: {
  pack: StoryPack;
  beat: Extract<StoryPack["beats"][number], { type: "person_card" }>;
}) {
  const name = safeResolveEvidenceText(pack, [beat.nameEvidenceId])[0];
  const roles = safeResolveEvidenceText(pack, beat.roleEvidenceIds);
  return (
    <div className="space-y-4 rounded-xl bg-subtle/50 px-4 py-5 sm:px-5">
      {name ? (
        <p className="font-display text-xl font-semibold leading-snug text-fg whitespace-pre-wrap sm:text-2xl">
          {name}
        </p>
      ) : null}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
          Role
        </p>
        <StoryParagraphs texts={roles} />
      </div>
    </div>
  );
}

function DecisionView({
  pack,
  beat,
}: {
  pack: StoryPack;
  beat: Extract<StoryPack["beats"][number], { type: "decision_moment" }>;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
          Situace
        </p>
        <StoryParagraphs
          texts={safeResolveEvidenceText(pack, beat.situationEvidenceIds)}
        />
      </section>
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
          Co z toho plyne
        </p>
        <StoryParagraphs
          texts={safeResolveEvidenceText(pack, beat.outcomeEvidenceIds)}
        />
      </section>
      <p className="font-display text-lg font-semibold leading-snug text-fg text-balance">
        {beat.reflectionPrompt}
      </p>
    </div>
  );
}

function WhatNextView({
  beat,
  disabled,
  onChoose,
}: {
  beat: Extract<StoryPack["beats"][number], { type: "what_next" }>;
  disabled: boolean;
  onChoose: (i: number) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="font-display text-lg font-semibold leading-snug text-fg">
        {beat.prompt}
      </p>
      <ul className="space-y-2.5">
        {beat.options.map((opt, i) => (
          <li key={opt.label}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoose(i)}
              className={cn(
                "flex min-h-12 w-full items-center rounded-xl px-4 text-left text-body-sm font-medium leading-snug ring-1 transition duration-fast",
                "bg-canvas ring-border hover:ring-border-strong disabled:opacity-60",
              )}
            >
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CheckpointView({
  beat,
  itemIndex,
  disabled,
  onChoose,
}: {
  beat: Extract<StoryPack["beats"][number], { type: "checkpoint" }>;
  itemIndex: number;
  disabled: boolean;
  onChoose: (i: number) => void;
}) {
  const item = beat.items[itemIndex];
  if (!item) {
    return (
      <p className="text-body-sm text-fg-muted">Kontrolní otázka chybí.</p>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-caption text-fg-muted">
        Otázka {itemIndex + 1} / {beat.items.length}
      </p>
      <p className="font-display text-lg font-semibold leading-snug text-fg">
        {item.question}
      </p>
      <ul className="space-y-2.5">
        {item.choices.map((c, i) => (
          <li key={c}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoose(i)}
              className={cn(
                "flex min-h-12 w-full items-center rounded-xl px-4 text-left text-body-sm font-medium leading-snug ring-1 transition duration-fast",
                "bg-canvas ring-border hover:ring-border-strong disabled:opacity-60",
              )}
            >
              {c}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
