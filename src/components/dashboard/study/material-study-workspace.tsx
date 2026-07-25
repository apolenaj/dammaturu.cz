"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  Gamepad2,
  Headphones,
  Layers,
  Sparkles,
  Star,
} from "lucide-react";
import { MaterialAudioSummary } from "@/components/dashboard/study/material-audio";
import { MaterialFlashcards } from "@/components/dashboard/study/material-flashcards";
import { MaterialMatchGame } from "@/components/dashboard/study/material-match-game";
import { MaterialQuiz } from "@/components/dashboard/study/material-quiz";
import { MaterialReview } from "@/components/dashboard/study/material-review";
import { MaterialStory } from "@/components/dashboard/study/material-story";
import { GlassCard } from "@/components/dashboard/glass-card";
import type { MaterialStudyPack } from "@/domain/dashboard/material-study-content";
import { cn } from "@/lib/cn";

type StudyMode =
  | "flashcards"
  | "quiz"
  | "audio"
  | "stories"
  | "games"
  | "review";

const modes: Array<{
  id: StudyMode;
  label: string;
  description: string;
  icon: typeof Layers;
  accent: string;
}> = [
  {
    id: "flashcards",
    label: "Kartičky",
    description: "Otázka a odpověď",
    icon: Layers,
    accent: "text-blue-300",
  },
  {
    id: "quiz",
    label: "Testy",
    description: "Kvíz A–D",
    icon: BookOpen,
    accent: "text-indigo-300",
  },
  {
    id: "audio",
    label: "Audio",
    description: "Poslech shrnutí",
    icon: Headphones,
    accent: "text-violet-300",
  },
  {
    id: "stories",
    label: "Příběhy",
    description: "Látka jako příběh",
    icon: BookMarked,
    accent: "text-sky-300",
  },
  {
    id: "games",
    label: "Hry",
    description: "Spojovačka pojmů",
    icon: Gamepad2,
    accent: "text-fuchsia-300",
  },
  {
    id: "review",
    label: "Opakovačka",
    description: "Tvoje chyby",
    icon: Star,
    accent: "text-amber-300",
  },
];

export function MaterialStudyWorkspace({
  materialId,
  title,
  pack,
  source,
  warning,
  info,
  error,
}: {
  materialId: string;
  title: string;
  pack: MaterialStudyPack | null;
  source: "extracted" | "topic_ai" | "failed";
  warning?: string | null;
  info?: string | null;
  error?: string | null;
}) {
  const [mode, setMode] = useState<StudyMode>("flashcards");

  if (error || !pack) {
    return (
      <GlassCard className="border-rose-400/30 bg-rose-500/10 space-y-3">
        <p className="flex items-start gap-2 text-sm font-semibold text-rose-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Generování učení selhalo
        </p>
        <p className="text-sm leading-relaxed text-rose-50/95">
          {error ??
            "Chyba připojení k AI: Zkontrolujte OPENAI_API_KEY a zkuste stránku obnovit."}
        </p>
        <p className="text-xs text-rose-100/70">
          Aplikace záměrně nepoužívá zástupné texty — bez funkční AI nevracíme
          falešný obsah.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      {warning ? (
        <GlassCard className="border-amber-400/25 bg-amber-500/10">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-amber-100">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
              aria-hidden
            />
            {warning}
          </p>
        </GlassCard>
      ) : null}

      {info ? (
        <GlassCard className="border-blue-400/20 bg-blue-500/10">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-blue-100">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-300"
              aria-hidden
            />
            {info}
          </p>
        </GlassCard>
      ) : null}

      {source === "topic_ai" ? (
        <p className="text-xs text-slate-500">
          Systémové téma — obsah vytvořila AI podle maturitního okruhu.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modes.map(({ id, label, description, icon: Icon, accent }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "rounded-2xl border p-4 text-left transition",
                active
                  ? "border-blue-400/40 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-violet-500/10 shadow-[0_0_28px_-12px_rgba(59,130,246,0.7)]"
                  : "border-white/10 bg-slate-900/50 hover:border-white/20 hover:bg-white/[0.04]",
              )}
            >
              <Icon className={cn("h-6 w-6", accent)} aria-hidden />
              <p className="mt-3 text-sm font-semibold text-white">{label}</p>
              <p className="mt-1 text-xs text-slate-500">{description}</p>
              {active ? (
                <p className="mt-2 text-xs font-semibold text-blue-300">Aktivní</p>
              ) : (
                <p className="mt-2 text-xs font-medium text-slate-600">Spustit</p>
              )}
            </button>
          );
        })}
      </div>

      {mode === "flashcards" ? (
        <MaterialFlashcards
          cards={pack.flashcards}
          materialTitle={title}
          materialId={materialId}
        />
      ) : null}
      {mode === "quiz" ? (
        <MaterialQuiz
          questions={pack.quiz}
          materialTitle={title}
          materialId={materialId}
        />
      ) : null}
      {mode === "audio" ? (
        <MaterialAudioSummary summary={pack.audioSummary} materialTitle={title} />
      ) : null}
      {mode === "stories" ? (
        <MaterialStory story={pack.story} materialTitle={title} />
      ) : null}
      {mode === "games" ? (
        <MaterialMatchGame pairs={pack.matchPairs} materialTitle={title} />
      ) : null}
      {mode === "review" ? (
        <MaterialReview materialId={materialId} materialTitle={title} />
      ) : null}
    </div>
  );
}
