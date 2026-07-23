"use client";

import { useState } from "react";
import Link from "next/link";
import {
  gradePreviewChoice,
  publicPreviewItems,
  type PreviewItem,
} from "@/domain/marketing/public-learning-preview";
import { StudyPhaseFrame } from "@/components/ui/study-phase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  StudyHelpedPrompt,
  markMeaningfulStudyLocal,
} from "@/components/feedback/study-helped-prompt";

type Phase = "question" | "feedback" | "done";

/**
 * Real interactive learning preview for the homepage.
 * Uses verified ČJL facts; shows question → feedback → source → next.
 */
export function InteractiveLearningPreview({
  className,
}: {
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("question");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  const item: PreviewItem = publicPreviewItems[index]!;
  const progressLabel = `${Math.min(index + 1, publicPreviewItems.length)} / ${publicPreviewItems.length}`;

  function submit() {
    if (!selected) return;
    const result = gradePreviewChoice(item, selected);
    setLastCorrect(result.correct);
    setPhase("feedback");
    setAnsweredCount((n) => n + 1);
    markMeaningfulStudyLocal();
  }

  function next() {
    if (index >= publicPreviewItems.length - 1) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setLastCorrect(null);
    setPhase("question");
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-4 shadow-xs sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-action">
          Vyzkoušej teď
        </p>
        <p className="text-caption font-semibold tabular-nums text-fg-muted">
          {progressLabel}
        </p>
      </div>
      <p className="mt-1 text-body-sm text-fg-secondary">
        Skutečná otázka z češtiny k maturitě — ne screenshot.
      </p>

      {phase === "done" ? (
        <div className="mt-5 space-y-4">
          <StudyPhaseFrame phase="feedback" showLabel={false}>
            <h3 className="font-display text-xl font-semibold text-fg">
              Tohle je learning loop
            </h3>
            <p className="mt-2 text-body-sm text-fg-secondary">
              Otázka → odpověď → zpětná vazba → zdroj → další. V appce se chyby
              vrací do opakování a vidíš, co je Nové / Učím se / K procvičení /
              Silné.
            </p>
            <Link
              href="/app/learn"
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-action px-4 text-body-sm font-semibold text-fg-on-brand shadow-xs transition hover:bg-action-hover sm:w-auto"
            >
              Začít se učit zdarma
            </Link>
          </StudyPhaseFrame>
          {answeredCount > 0 ? (
            <StudyHelpedPrompt context="homepage_preview" />
          ) : null}
        </div>
      ) : (
        <div className="mt-2.5 space-y-5">
          <StudyPhaseFrame phase="question">
            <h3 className="font-display text-lg font-semibold text-fg sm:text-xl">
              {item.prompt}
            </h3>
          </StudyPhaseFrame>

          {phase === "question" ? (
            <StudyPhaseFrame phase="answer">
              <ul className="space-y-2">
                {item.choices.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c.id)}
                      className={cn(
                        "flex min-h-12 w-full items-center rounded-xl px-3 text-left text-body-sm font-medium ring-1 transition duration-fast",
                        selected === c.id
                          ? "bg-action/10 ring-action shadow-xs"
                          : "bg-canvas ring-border hover:ring-border-strong",
                      )}
                    >
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                className="mt-4 min-h-12 w-full sm:w-auto"
                disabled={!selected}
                onClick={submit}
              >
                Odeslat
              </Button>
            </StudyPhaseFrame>
          ) : null}

          {phase === "feedback" && lastCorrect != null ? (
            <>
              <StudyPhaseFrame phase="feedback">
                <Badge tone={lastCorrect ? "success" : "danger"}>
                  {lastCorrect ? "Správně" : "Ještě ne"}
                </Badge>
                <p className="mt-2 text-body-sm text-fg">
                  {lastCorrect
                    ? item.feedbackCorrectCs
                    : item.feedbackWrongCs}
                </p>
              </StudyPhaseFrame>
              <StudyPhaseFrame phase="explanation">
                <p className="text-body-sm text-fg">{item.explanationCs}</p>
              </StudyPhaseFrame>
              <StudyPhaseFrame phase="source">
                <p className="text-caption font-semibold text-fg">
                  {item.sourceLabelCs}
                </p>
                <blockquote className="mt-2 border-l-2 border-action pl-3 text-body-sm text-fg-secondary">
                  {item.sourceExcerptCs}
                </blockquote>
              </StudyPhaseFrame>
              <StudyPhaseFrame phase="next" showLabel={false}>
                <Button
                  type="button"
                  className="min-h-12 w-full sm:w-auto"
                  onClick={next}
                >
                  {index >= publicPreviewItems.length - 1
                    ? "Shrnutí"
                    : "Další otázka"}
                </Button>
              </StudyPhaseFrame>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
