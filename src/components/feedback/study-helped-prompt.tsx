"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "dm_study_helped_v1";
const MEANINGFUL_KEY = "dm_meaningful_study_v1";

export type StudyHelpedVote = "yes" | "partly" | "no";

export function markMeaningfulStudyLocal() {
  try {
    localStorage.setItem(MEANINGFUL_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasMeaningfulStudyLocal(): boolean {
  try {
    return localStorage.getItem(MEANINGFUL_KEY) === "1";
  } catch {
    return false;
  }
}

function alreadyVoted(context: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, string>;
    return Boolean(map[context]);
  } catch {
    return false;
  }
}

function saveVote(context: string, vote: StudyHelpedVote) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[context] = vote;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * Lightweight post-study feedback — never a modal, never blocks learning.
 * Show only after a meaningful study moment (session done / preview done).
 */
export function StudyHelpedPrompt({
  context,
  className,
}: {
  context: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (alreadyVoted(context)) return;
    setVisible(true);
  }, [context]);

  if (!visible) return null;

  function vote(v: StudyHelpedVote) {
    saveVote(context, v);
    setThanks(true);
    window.setTimeout(() => setVisible(false), 1800);
  }

  if (thanks) {
    return (
      <p
        className={cn("text-body-sm text-fg-muted", className)}
        role="status"
      >
        Díky — bereme to vážně.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-subtle/50 px-4 py-3",
        className,
      )}
      role="group"
      aria-label="Zpětná vazba ke studiu"
    >
      <p className="text-body-sm font-semibold text-fg">Pomohlo ti to?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            ["yes", "Ano"],
            ["partly", "Částečně"],
            ["no", "Ne"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => vote(id)}
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-body-sm font-semibold text-fg transition hover:border-action/40 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
