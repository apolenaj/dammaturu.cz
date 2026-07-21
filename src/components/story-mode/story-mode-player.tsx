"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  storyAnswerAction,
  storyContinueAction,
} from "@/server/actions/story-mode";
import type { StoryPack, StoryProgress } from "@/domain/learning/story-mode";
import { resolveEvidenceText } from "@/domain/learning/story-mode";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const beatLabels: Record<string, string> = {
  timeline: "Timeline",
  cause_effect: "Příčina → následek",
  person_card: "Osobnost",
  what_next: "Co se stalo dál?",
  decision_moment: "Decision moment",
  checkpoint: "Checkpoint",
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

  const index = progress?.currentBeatIndex ?? 0;
  const beat = pack.beats[Math.min(index, pack.beats.length - 1)]!;
  const done = progress?.status === "completed";
  const completed = progress?.completedBeatIds.length ?? 0;
  const successPct =
    progress && progress.checksAnswered > 0
      ? Math.round((progress.checksCorrect / progress.checksAnswered) * 100)
      : null;

  useEffect(() => {
    setCpIndex(0);
    setFeedback(null);
    setLocked(false);
  }, [beat.id]);

  function onContinue() {
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
    if (locked || pending) return;
    setLocked(true);
    setError(null);

    if (beat.type === "what_next") {
      const opt = beat.options[choiceIndex]!;
      setFeedback(
        opt.isCorrect
          ? resolveEvidenceText(pack, opt.evidenceIds).join(" ")
          : "Ne — vrať se k timeline / příčině a následku.",
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
      const item = beat.items[cpIndex]!;
      const correct = choiceIndex === item.correctIndex;
      setFeedback(
        correct
          ? resolveEvidenceText(pack, item.explanationEvidenceIds.length
              ? item.explanationEvidenceIds
              : item.evidenceIds).join(" ")
          : resolveEvidenceText(pack, item.evidenceIds)[0] ?? "Znovu ze zdroje.",
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

  const evidenceFooter = useMemo(() => {
    const ids = new Set(
      Object.values(pack.evidence).map((e) => e.filename),
    );
    return [...ids].join(", ");
  }, [pack.evidence]);

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">Story Mode</Badge>
          <Badge tone="accent">{pack.topicSlug}</Badge>
          <Badge tone="success">verified only</Badge>
        </div>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-sm text-fg-secondary">{pack.summary}</p>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="font-display text-xl font-semibold text-fg">
            {completed}/{pack.beats.length} scén
          </p>
          {successPct !== null ? (
            <p className="text-body-sm text-fg-secondary">
              Úspěšnost <span className="font-semibold text-fg">{successPct} %</span>
            </p>
          ) : null}
        </div>
        <Progress
          value={completed}
          max={pack.beats.length}
          tone="brand"
          label="Progress"
          showValue
        />
        <p className="text-caption text-fg-muted">
          Provenance: {evidenceFooter} · žádná fikční fakta
        </p>
      </header>

      {error ? (
        <Alert tone="danger" title="Chyba">
          {error}
        </Alert>
      ) : null}

      {done ? (
        <Alert tone="success" title="Příběh dokončen">
          Completion i úspěšnost uloženy. Všechny scény stály na verified FINAL.
        </Alert>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-5 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{beatLabels[beat.type] ?? beat.type}</Badge>
            <h2 className="font-display text-xl font-semibold text-fg">
              {beat.title}
            </h2>
          </div>

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

          {feedback ? (
            <p className="mt-4 rounded-md border border-border bg-subtle/50 px-3 py-2 text-body-sm text-fg-secondary">
              {feedback}
            </p>
          ) : null}

          {beat.type === "timeline" ||
          beat.type === "cause_effect" ||
          beat.type === "person_card" ||
          beat.type === "decision_moment" ? (
            <div className="mt-5">
              <Button disabled={pending} onClick={onContinue}>
                Pokračovat v příběhu
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FactBlock({ label, texts }: { label: string; texts: string[] }) {
  return (
    <section className="space-y-2">
      <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
        {label}
      </p>
      {texts.map((t) => (
        <p key={t.slice(0, 40)} className="text-body-md text-fg">
          {t}
        </p>
      ))}
    </section>
  );
}

function TimelineView({
  pack,
  beat,
}: {
  pack: StoryPack;
  beat: Extract<StoryPack["beats"][number], { type: "timeline" }>;
}) {
  const era = resolveEvidenceText(pack, [beat.eraLabelEvidenceId])[0]!;
  const body = resolveEvidenceText(pack, beat.bodyEvidenceIds);
  return (
    <div className="space-y-4 border-l-2 border-action/40 pl-4">
      <p className="text-body-sm font-semibold text-action">{era}</p>
      <FactBlock label="Z verified zdroje" texts={body} />
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
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-md border border-border p-3">
        <FactBlock
          label="Příčina"
          texts={resolveEvidenceText(pack, beat.causeEvidenceIds)}
        />
      </div>
      <div className="rounded-md border border-border p-3">
        <FactBlock
          label="Následek"
          texts={resolveEvidenceText(pack, beat.effectEvidenceIds)}
        />
      </div>
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
  const name = resolveEvidenceText(pack, [beat.nameEvidenceId])[0]!;
  const roles = resolveEvidenceText(pack, beat.roleEvidenceIds);
  return (
    <div className="rounded-md border border-border bg-subtle/40 p-4 space-y-3">
      <p className="font-display text-xl font-semibold text-fg whitespace-pre-wrap">
        {name}
      </p>
      <FactBlock label="Role (verified)" texts={roles} />
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
    <div className="space-y-4">
      <FactBlock
        label="Situace"
        texts={resolveEvidenceText(pack, beat.situationEvidenceIds)}
      />
      <FactBlock
        label="Co z toho historicky plyne"
        texts={resolveEvidenceText(pack, beat.outcomeEvidenceIds)}
      />
      <p className="text-body-md font-semibold text-fg">{beat.reflectionPrompt}</p>
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
    <div className="space-y-3">
      <p className="text-body-md font-semibold text-fg">{beat.prompt}</p>
      {beat.options.map((opt, i) => (
        <Button
          key={opt.label}
          variant="outline"
          fullWidth
          className="justify-start"
          disabled={disabled}
          onClick={() => onChoose(i)}
        >
          {opt.label}
        </Button>
      ))}
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
  const item = beat.items[itemIndex]!;
  return (
    <div className="space-y-3">
      <p className="text-caption text-fg-muted">
        Otázka {itemIndex + 1} / {beat.items.length}
      </p>
      <p className="text-body-md font-semibold text-fg">{item.question}</p>
      {item.choices.map((c, i) => (
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
  );
}
