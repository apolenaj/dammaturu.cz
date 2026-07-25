"use client";

import { BookOpen } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";

export function MaterialStory({
  story,
  materialTitle,
}: {
  story: string;
  materialTitle: string;
}) {
  const paragraphs = story
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <GlassCard className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25">
          <BookOpen className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/90">
            Příběhy
          </p>
          <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
            {materialTitle}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Látka jako vyprávění — lépe se pamatuje, když má děj a pointu.
          </p>
        </div>
      </div>

      <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-sky-950/20 px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {paragraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 48)}
              className="text-base leading-8 text-slate-200 sm:text-lg sm:leading-9"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </GlassCard>
  );
}
