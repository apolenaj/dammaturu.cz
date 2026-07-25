"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import type { MaterialFlashcard } from "@/domain/dashboard/material-study-content";
import { cn } from "@/lib/cn";

export function MaterialFlashcards({
  cards,
  materialTitle,
}: {
  cards: MaterialFlashcard[];
  materialTitle: string;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [learningCount, setLearningCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = cards.length;
  const card = cards[index];

  const progressLabel = useMemo(() => {
    if (finished) return "Hotovo";
    return `${index + 1} / ${total}`;
  }, [finished, index, total]);

  function goNext(knewIt: boolean) {
    if (knewIt) setKnownCount((n) => n + 1);
    else setLearningCount((n) => n + 1);

    setFlipped(false);
    if (index >= total - 1) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnownCount(0);
    setLearningCount(0);
    setFinished(false);
  }

  if (!card) {
    return (
      <GlassCard>
        <p className="text-sm text-slate-400">
          Pro tento materiál zatím nejsou kartičky k dispozici.
        </p>
      </GlassCard>
    );
  }

  if (finished) {
    return (
      <GlassCard className="space-y-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-300/90">
          Kartičky · {materialTitle}
        </p>
        <h3 className="text-2xl font-bold text-white">Skvělé opakování!</h3>
        <p className="text-sm text-slate-400">
          Prošel jsi všech {total} kartiček.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4">
            <p className="text-2xl font-bold text-emerald-300">{knownCount}</p>
            <p className="mt-1 text-sm text-emerald-100/80">Umím</p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-4">
            <p className="text-2xl font-bold text-amber-300">{learningCount}</p>
            <p className="mt-1 text-sm text-amber-100/80">Ještě ne</p>
          </div>
        </div>
        <button
          type="button"
          onClick={restart}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-6 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)] transition hover:brightness-110"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Spustit znovu
        </button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300/90">
            Kartičky
          </p>
          <p className="mt-1 text-sm text-slate-400">{materialTitle}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
          {progressLabel}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="group relative w-full min-h-[220px] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-indigo-950/40 p-6 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition hover:border-blue-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 sm:min-h-[260px]"
        aria-label={flipped ? "Zobrazit otázku" : "Zobrazit odpověď"}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {flipped ? "Odpověď" : "Otázka"} · klikni pro otočení
        </p>
        <p
          className={cn(
            "mt-4 text-lg font-semibold leading-relaxed text-white sm:text-xl",
            flipped && "text-blue-50",
          )}
        >
          {flipped ? card.back : card.front}
        </p>
        <p className="mt-6 text-xs text-slate-500 transition group-hover:text-slate-400">
          {flipped
            ? "Kliknutím se vrať k otázce"
            : "Nejdřív zkus odpovědět sám, pak kartu otoč"}
        </p>
      </button>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => goNext(false)}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
        >
          Ještě ne
        </button>
        <button
          type="button"
          onClick={() => goNext(true)}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
        >
          Umím
        </button>
      </div>
    </GlassCard>
  );
}
