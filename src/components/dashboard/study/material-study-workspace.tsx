"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, Headphones, Layers, Sparkles } from "lucide-react";
import { MaterialAudioSummary } from "@/components/dashboard/study/material-audio";
import { MaterialFlashcards } from "@/components/dashboard/study/material-flashcards";
import { MaterialQuiz } from "@/components/dashboard/study/material-quiz";
import { GlassCard } from "@/components/dashboard/glass-card";
import type { MaterialStudyPack } from "@/domain/dashboard/material-study-content";
import { cn } from "@/lib/cn";

type StudyMode = "flashcards" | "quiz" | "audio";

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
];

export function MaterialStudyWorkspace({
  title,
  pack,
  source,
  warning,
  info,
}: {
  title: string;
  pack: MaterialStudyPack;
  source: "extracted" | "title_fallback";
  warning?: string | null;
  info?: string | null;
}) {
  const [mode, setMode] = useState<StudyMode>("flashcards");

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

      {source === "title_fallback" && !warning ? (
        <p className="text-xs text-slate-500">
          Režim podle názvu materiálu — u nahraných souborů se snažíme číst obsah
          PDF/DOCX/TXT.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
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
        <MaterialFlashcards cards={pack.flashcards} materialTitle={title} />
      ) : null}
      {mode === "quiz" ? (
        <MaterialQuiz questions={pack.quiz} materialTitle={title} />
      ) : null}
      {mode === "audio" ? (
        <MaterialAudioSummary summary={pack.audioSummary} materialTitle={title} />
      ) : null}
    </div>
  );
}
