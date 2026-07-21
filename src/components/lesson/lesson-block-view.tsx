"use client";

import type { LessonBlock } from "@/domain/learning/blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const typeLabels: Record<LessonBlock["type"], string> = {
  hook: "Úvod",
  quick_context: "Rychlý kontext",
  core_explanation: "Výklad",
  timeline: "Časová osa",
  story: "Příběh",
  example: "Příklad",
  visual_comparison: "Srovnání",
  character_card: "Postava",
  author_card: "Autor",
  work_card: "Dílo",
  remember_this: "Zapamatuj si",
  common_trap: "Častá past",
  mnemonic: "Mnemotechnika",
  flashcard_burst: "Flashcardy",
  mini_quiz: "Mini kvíz",
  active_recall: "Aktivní vybavování",
  teach_back: "Vysvětli zpět",
  summary: "Shrnutí",
  exit_ticket: "Exit ticket",
};

type BlockHandlers = {
  onQuizAnswer?: (correct: boolean, choiceIndex: number) => void;
  onFlashcardGrade?: (grade: "know" | "almost" | "dont_know") => void;
  onRecallSubmit?: (text: string) => void;
  onTeachBackSubmit?: (text: string) => void;
  onExitSubmit?: (text: string) => void;
  onOpenExplanation?: () => void;
  explanationOpen?: boolean;
};

/**
 * Schema-driven block renderer — switch only on `block.type` from Zod schema.
 */
export function LessonBlockView({
  block,
  handlers,
}: {
  block: LessonBlock;
  handlers?: BlockHandlers;
}) {
  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{typeLabels[block.type]}</Badge>
        {block.title ? (
          <h2 className="font-display text-xl font-semibold text-fg">{block.title}</h2>
        ) : null}
      </div>
      <BlockBody block={block} handlers={handlers} />
    </article>
  );
}

function BlockBody({
  block,
  handlers,
}: {
  block: LessonBlock;
  handlers?: BlockHandlers;
}) {
  switch (block.type) {
    case "hook":
      return (
        <div className="space-y-2">
          <p className="font-display text-xl font-semibold text-fg">{block.prompt}</p>
          {block.tease ? (
            <p className="text-body-md text-fg-secondary">{block.tease}</p>
          ) : null}
        </div>
      );
    case "quick_context":
      return (
        <ul className="list-disc space-y-2 pl-5 text-body-md text-fg">
          {block.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      );
    case "core_explanation":
      return (
        <div className="space-y-3">
          {block.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="text-body-md text-fg">
              {p}
            </p>
          ))}
          <ExplanationToggle
            text={block.explanation}
            open={handlers?.explanationOpen}
            onOpen={handlers?.onOpenExplanation}
          />
        </div>
      );
    case "timeline":
      return (
        <ol className="space-y-3 border-l border-border pl-4">
          {block.events.map((e) => (
            <li key={e.label}>
              <p className="text-body-sm font-semibold text-fg">{e.label}</p>
              <p className="text-body-sm text-fg-secondary">{e.detail}</p>
            </li>
          ))}
        </ol>
      );
    case "story":
      return <p className="text-body-md text-fg">{block.narrative}</p>;
    case "example":
      return (
        <div className="space-y-2 rounded-md border border-border bg-subtle/50 p-4">
          <p className="text-body-md text-fg">{block.setup}</p>
          <p className="text-body-sm text-fg-secondary">{block.resolution}</p>
        </div>
      );
    case "visual_comparison":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <CompareCol label={block.leftLabel} points={block.leftPoints} />
          <CompareCol label={block.rightLabel} points={block.rightPoints} />
        </div>
      );
    case "character_card":
      return (
        <CardShell>
          <p className="text-body-md font-semibold text-fg">{block.name}</p>
          <p className="text-body-sm text-fg-secondary">{block.role}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {block.traits.map((t) => (
              <Badge key={t} tone="neutral">
                {t}
              </Badge>
            ))}
          </ul>
          {block.note ? (
            <p className="mt-2 text-body-sm text-fg-muted">{block.note}</p>
          ) : null}
        </CardShell>
      );
    case "author_card":
      return (
        <CardShell>
          <p className="text-body-md font-semibold text-fg">{block.name}</p>
          <p className="text-caption text-fg-muted">
            {[block.lifespan, block.movement].filter(Boolean).join(" · ")}
          </p>
          {block.keyWorks.length ? (
            <p className="mt-2 text-body-sm text-fg-secondary">
              Díla: {block.keyWorks.join(", ")}
            </p>
          ) : null}
          {block.note ? (
            <p className="mt-2 text-body-sm text-fg">{block.note}</p>
          ) : null}
        </CardShell>
      );
    case "work_card":
      return (
        <CardShell>
          <p className="text-body-md font-semibold text-fg">{block.title}</p>
          <p className="text-body-sm text-fg-secondary">
            {block.author}
            {block.year ? ` · ${block.year}` : ""}
            {block.genre ? ` · ${block.genre}` : ""}
          </p>
          {block.themes.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {block.themes.map((t) => (
                <Badge key={t} tone="neutral">
                  {t}
                </Badge>
              ))}
            </ul>
          ) : null}
          {block.note ? (
            <p className="mt-2 text-body-sm text-fg-muted">{block.note}</p>
          ) : null}
        </CardShell>
      );
    case "remember_this":
      return (
        <p className="rounded-md border border-action/30 bg-action/5 px-4 py-3 text-body-md font-semibold text-fg">
          {block.statement}
        </p>
      );
    case "common_trap":
      return (
        <div className="space-y-2">
          <p className="text-body-sm font-semibold text-warning">
            Past: {block.trap}
          </p>
          <p className="text-body-sm text-fg">Správně: {block.correction}</p>
        </div>
      );
    case "mnemonic":
      return (
        <div className="space-y-1">
          <p className="font-display text-xl font-semibold text-fg">{block.cue}</p>
          {block.expansion ? (
            <p className="text-body-sm text-fg-secondary">{block.expansion}</p>
          ) : null}
        </div>
      );
    case "flashcard_burst":
      return <FlashcardBurst block={block} onGrade={handlers?.onFlashcardGrade} />;
    case "mini_quiz":
      return <MiniQuiz block={block} onAnswer={handlers?.onQuizAnswer} />;
    case "active_recall":
      return (
        <TextPrompt
          prompt={block.prompt}
          hints={block.expectedKeyPoints}
          explanation={block.explanation}
          explanationOpen={handlers?.explanationOpen}
          onOpenExplanation={handlers?.onOpenExplanation}
          onSubmit={handlers?.onRecallSubmit}
          submitLabel="Odeslat recall"
        />
      );
    case "teach_back":
      return (
        <TextPrompt
          prompt={block.prompt}
          hints={block.rubricHints}
          onSubmit={handlers?.onTeachBackSubmit}
          submitLabel="Odeslat teach-back"
        />
      );
    case "summary":
      return (
        <ul className="list-disc space-y-2 pl-5 text-body-md text-fg">
          {block.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      );
    case "exit_ticket":
      return (
        <TextPrompt
          prompt={block.prompt}
          hints={block.successCriteria}
          onSubmit={handlers?.onExitSubmit}
          submitLabel="Odevzdat exit ticket"
        />
      );
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

function CompareCol({ label, points }: { label: string; points: string[] }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
        {label}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-body-sm text-fg">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-subtle/40 p-4">
      {children}
    </div>
  );
}

function ExplanationToggle({
  text,
  open,
  onOpen,
}: {
  text?: string;
  open?: boolean;
  onOpen?: () => void;
}) {
  if (!text) return null;
  return (
    <div className="space-y-2">
      {!open ? (
        <Button size="sm" variant="outline" onClick={onOpen}>
          Otevřít vysvětlení
        </Button>
      ) : (
        <p className="rounded-md border border-border bg-subtle/60 p-3 text-body-sm text-fg-secondary">
          {text}
        </p>
      )}
    </div>
  );
}

function MiniQuiz({
  block,
  onAnswer,
}: {
  block: Extract<LessonBlock, { type: "mini_quiz" }>;
  onAnswer?: (correct: boolean, choiceIndex: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-body-md font-semibold text-fg">{block.question}</p>
      <div className="space-y-2">
        {block.choices.map((choice, i) => (
          <Button
            key={choice}
            variant={picked === i ? "primary" : "outline"}
            fullWidth
            className="justify-start"
            disabled={picked !== null}
            onClick={() => {
              setPicked(i);
              onAnswer?.(i === block.correctIndex, i);
            }}
          >
            {choice}
          </Button>
        ))}
      </div>
      {picked !== null && block.explanation ? (
        <p className="text-body-sm text-fg-secondary">{block.explanation}</p>
      ) : null}
    </div>
  );
}

function FlashcardBurst({
  block,
  onGrade,
}: {
  block: Extract<LessonBlock, { type: "flashcard_burst" }>;
  onGrade?: (grade: "know" | "almost" | "dont_know") => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = block.cards[index]!;
  return (
    <div className="space-y-3">
      <p className="text-caption text-fg-muted">
        Karta {index + 1} / {block.cards.length}
      </p>
      <div className="rounded-md border border-border p-4">
        <p className="text-body-md font-semibold text-fg">{card.front}</p>
        {revealed ? (
          <p className="mt-3 text-body-md text-fg-secondary">{card.back}</p>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setRevealed(true)}
          >
            Ukázat odpověď
          </Button>
        )}
      </div>
      {revealed ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              onGrade?.("know");
              next();
            }}
          >
            Umím
          </Button>
          <Button
            size="sm"
            variant="accent"
            onClick={() => {
              onGrade?.("almost");
              next();
            }}
          >
            Skoro
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onGrade?.("dont_know");
              next();
            }}
          >
            Neumím
          </Button>
        </div>
      ) : null}
    </div>
  );

  function next() {
    if (index < block.cards.length - 1) {
      setIndex(index + 1);
      setRevealed(false);
    }
  }
}

function TextPrompt({
  prompt,
  hints,
  explanation,
  explanationOpen,
  onOpenExplanation,
  onSubmit,
  submitLabel,
}: {
  prompt: string;
  hints: string[];
  explanation?: string;
  explanationOpen?: boolean;
  onOpenExplanation?: () => void;
  onSubmit?: (text: string) => void;
  submitLabel: string;
}) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-body-md font-semibold text-fg">{prompt}</p>
      <ul className="list-disc pl-5 text-caption text-fg-muted">
        {hints.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      <label className="block space-y-1">
        <span className="sr-only">Odpověď</span>
        <textarea
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-md text-fg"
          rows={3}
          value={text}
          disabled={sent}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napiš odpověď…"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={sent || text.trim().length < 4}
          onClick={() => {
            setSent(true);
            onSubmit?.(text.trim());
          }}
        >
          {submitLabel}
        </Button>
        <ExplanationToggle
          text={explanation}
          open={explanationOpen}
          onOpen={onOpenExplanation}
        />
      </div>
      {sent ? (
        <p className="text-caption text-success">Uloženo pro mastery model.</p>
      ) : null}
    </div>
  );
}
