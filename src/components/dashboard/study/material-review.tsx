"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, RotateCcw, Sparkles, Star } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import {
  listMistakesForMaterial,
  removeStudyMistake,
  type StudyMistakeItem,
} from "@/domain/dashboard/study-mistakes";

export function MaterialReview({
  materialId,
  materialTitle,
}: {
  materialId: string;
  materialTitle: string;
}) {
  const [items, setItems] = useState<StudyMistakeItem[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setItems(listMistakesForMaterial(materialId));
  }, [materialId]);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh]);

  useEffect(() => {
    if (index >= items.length && items.length > 0) {
      setIndex(0);
    }
  }, [index, items.length]);

  if (!hydrated) {
    return (
      <GlassCard>
        <p className="text-sm text-slate-400">Načítám Opakovačku…</p>
      </GlassCard>
    );
  }

  if (items.length === 0) {
    return (
      <GlassCard className="space-y-4 text-center py-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
          <Sparkles className="h-7 w-7" aria-hidden />
        </span>
        <h3 className="text-2xl font-bold text-white">Skvělá práce!</h3>
        <p className="text-sm text-slate-300 sm:text-base">
          Nemáš žádné nedořešené chyby.
        </p>
        <p className="text-xs text-slate-500">
          Sem se ukládají kartičky s „Ještě ne“ a špatné odpovědi z testů u
          materiálu „{materialTitle}“.
        </p>
      </GlassCard>
    );
  }

  const item = items[Math.min(index, items.length - 1)]!;

  function markKnown() {
    removeStudyMistake(item.id);
    const nextItems = listMistakesForMaterial(materialId);
    setItems(nextItems);
    setRevealed(false);
    setIndex((i) => (nextItems.length === 0 ? 0 : Math.min(i, nextItems.length - 1)));
  }

  function keepForLater() {
    setRevealed(false);
    setIndex((i) => (i + 1) % items.length);
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
            <Star className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">
              Opakovačka
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">{materialTitle}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Procvič to, co ti ještě nejde — chyby z kartiček a testů.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
          {Math.min(index + 1, items.length)} / {items.length}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="w-full min-h-[180px] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-amber-950/20 p-6 text-left transition hover:border-amber-400/30"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {item.kind === "flashcard" ? "Kartička" : "Test"} ·{" "}
          {revealed ? "odpověď" : "otázka"}
        </p>
        <p className="mt-4 text-lg font-semibold leading-relaxed text-white">
          {revealed ? item.answer : item.prompt}
        </p>
        <p className="mt-5 text-xs text-slate-500">
          Kliknutím {revealed ? "skryj odpověď" : "odhal odpověď"}
        </p>
      </button>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={keepForLater}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Ještě ne
        </button>
        <button
          type="button"
          onClick={markKnown}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/25"
        >
          <Check className="h-4 w-4" aria-hidden />
          Umím
        </button>
      </div>
    </GlassCard>
  );
}
