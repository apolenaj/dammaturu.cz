"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import type { MaterialQuizQuestion } from "@/domain/dashboard/material-study-content";
import { cn } from "@/lib/cn";

export function MaterialQuiz({
  questions,
  materialTitle,
}: {
  questions: MaterialQuizQuestion[];
  materialTitle: string;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = questions.length;
  const question = questions[index];
  const answered = selected !== null;

  const scorePercent = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((correctCount / total) * 100);
  }, [correctCount, total]);

  function choose(optionId: "A" | "B" | "C" | "D") {
    if (answered || !question) return;
    setSelected(optionId);
    if (optionId === question.correctOptionId) {
      setCorrectCount((n) => n + 1);
    }
  }

  function next() {
    if (!answered) return;
    if (index >= total - 1) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setFinished(false);
  }

  if (!question) {
    return (
      <GlassCard>
        <p className="text-sm text-slate-400">
          Pro tento materiál zatím není kvíz k dispozici.
        </p>
      </GlassCard>
    );
  }

  if (finished) {
    const tone =
      scorePercent >= 75
        ? "výborný výsledek"
        : scorePercent >= 50
          ? "slušný základ — ještě to zopakuj"
          : "ještě to chce procvičit";

    return (
      <GlassCard className="space-y-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
          Test · {materialTitle}
        </p>
        <h3 className="text-2xl font-bold text-white">Výsledek testu</h3>
        <p className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300">
          {scorePercent}&nbsp;%
        </p>
        <p className="text-sm text-slate-400">
          Správně {correctCount} z {total} · {tone}
        </p>
        <button
          type="button"
          onClick={restart}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-6 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)] transition hover:brightness-110"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Zkusit znovu
        </button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
            Test
          </p>
          <p className="mt-1 text-sm text-slate-400">{materialTitle}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
          {index + 1} / {total}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <h3 className="text-lg font-semibold leading-snug text-white sm:text-xl">
        {question.prompt}
      </h3>

      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = selected === option.id;
          const isCorrect = option.id === question.correctOptionId;
          const showCorrect = answered && isCorrect;
          const showWrong = answered && isSelected && !isCorrect;

          return (
            <button
              key={option.id}
              type="button"
              disabled={answered}
              onClick={() => choose(option.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition",
                !answered &&
                  "border-white/10 bg-white/[0.03] hover:border-blue-400/40 hover:bg-blue-500/10",
                showCorrect &&
                  "border-emerald-400/40 bg-emerald-500/15 text-emerald-50",
                showWrong && "border-rose-400/40 bg-rose-500/15 text-rose-50",
                answered &&
                  !showCorrect &&
                  !showWrong &&
                  "border-white/5 bg-white/[0.02] text-slate-500",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  showCorrect && "bg-emerald-500/30 text-emerald-200",
                  showWrong && "bg-rose-500/30 text-rose-200",
                  !answered && "bg-blue-500/20 text-blue-200",
                  answered &&
                    !showCorrect &&
                    !showWrong &&
                    "bg-white/5 text-slate-500",
                )}
              >
                {option.id}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium leading-relaxed sm:text-base">
                {option.text}
              </span>
              {showCorrect ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              ) : null}
              {showWrong ? (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              ) : null}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-relaxed",
            selected === question.correctOptionId
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
              : "border-rose-400/25 bg-rose-500/10 text-rose-100",
          )}
        >
          <p className="font-semibold">
            {selected === question.correctOptionId
              ? "Správně!"
              : `Špatně — správně je ${question.correctOptionId}.`}
          </p>
          <p className="mt-1.5 opacity-90">{question.explanation}</p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!answered}
        onClick={next}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {index >= total - 1 ? "Zobrazit výsledek" : "Další otázka"}
      </button>
    </GlassCard>
  );
}
