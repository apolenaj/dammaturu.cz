"use client";

import { useMemo, useState } from "react";
import { Gamepad2, RotateCcw } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import type { MaterialMatchPair } from "@/domain/dashboard/material-study-content";
import { cn } from "@/lib/cn";

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function MaterialMatchGame({
  pairs,
  materialTitle,
}: {
  pairs: MaterialMatchPair[];
  materialTitle: string;
}) {
  const initialLeft = useMemo(
    () => shuffle(pairs.map((p) => ({ id: p.id, label: p.term }))),
    [pairs],
  );
  const initialRight = useMemo(
    () => shuffle(pairs.map((p) => ({ id: p.id, label: p.definition }))),
    [pairs],
  );

  const [left, setLeft] = useState(initialLeft);
  const [right, setRight] = useState(initialRight);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  function reset() {
    setLeft(shuffle(pairs.map((p) => ({ id: p.id, label: p.term }))));
    setRight(shuffle(pairs.map((p) => ({ id: p.id, label: p.definition }))));
    setSelectedLeft(null);
    setSelectedRight(null);
    setFlash(null);
    setMatched([]);
    setFinished(false);
  }

  function tryMatch(nextLeft: string | null, nextRight: string | null) {
    if (!nextLeft || !nextRight) return;
    if (nextLeft === nextRight) {
      setFlash("ok");
      const nextMatched = [...matched, nextLeft];
      setMatched(nextMatched);
      setTimeout(() => {
        setLeft((rows) => rows.filter((r) => r.id !== nextLeft));
        setRight((rows) => rows.filter((r) => r.id !== nextRight));
        setSelectedLeft(null);
        setSelectedRight(null);
        setFlash(null);
        if (nextMatched.length >= pairs.length) {
          setFinished(true);
        }
      }, 450);
      return;
    }
    setFlash("bad");
    setTimeout(() => {
      setSelectedLeft(null);
      setSelectedRight(null);
      setFlash(null);
    }, 550);
  }

  if (finished) {
    return (
      <GlassCard className="relative overflow-hidden space-y-6 text-center py-10">
        <div
          className="pointer-events-none absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.22),transparent_55%)]"
          aria-hidden
        />
        <p className="relative text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
          Hry · Spojovačka
        </p>
        <p
          className="relative text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 sm:text-6xl animate-[dmXpPop_700ms_ease-out]"
        >
          +250 XP
        </p>
        <p className="relative text-lg font-semibold text-white">
          Všechny páry spojené!
        </p>
        <p className="relative text-sm text-slate-400">{materialTitle}</p>
        <button
          type="button"
          onClick={reset}
          className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-6 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)] transition hover:brightness-110"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Hrát znovu
        </button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-400/25">
          <Gamepad2 className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300/90">
            Hry · Spojovačka
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">{materialTitle}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Klikni na pojem vlevo a definici vpravo. Správný pár zezelená a zmizí.
          </p>
        </div>
      </div>

      <p className="text-xs font-medium text-slate-500">
        Hotovo {matched.length} / {pairs.length}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pojmy
          </p>
          {left.map((item) => {
            const active = selectedLeft === item.id;
            const ok = flash === "ok" && active && selectedRight === item.id;
            const bad = flash === "bad" && active;
            return (
              <button
                key={`L-${item.id}`}
                type="button"
                onClick={() => {
                  const next = item.id;
                  setSelectedLeft(next);
                  tryMatch(next, selectedRight);
                }}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                  active && !flash && "border-blue-400/50 bg-blue-500/15 text-blue-50",
                  ok && "border-emerald-400/50 bg-emerald-500/20 text-emerald-50",
                  bad && "border-rose-400/50 bg-rose-500/20 text-rose-50",
                  !active &&
                    "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20 hover:bg-white/[0.06]",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Definice
          </p>
          {right.map((item) => {
            const active = selectedRight === item.id;
            const ok = flash === "ok" && active && selectedLeft === item.id;
            const bad = flash === "bad" && active;
            return (
              <button
                key={`R-${item.id}`}
                type="button"
                onClick={() => {
                  const next = item.id;
                  setSelectedRight(next);
                  tryMatch(selectedLeft, next);
                }}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                  active && !flash && "border-violet-400/50 bg-violet-500/15 text-violet-50",
                  ok && "border-emerald-400/50 bg-emerald-500/20 text-emerald-50",
                  bad && "border-rose-400/50 bg-rose-500/20 text-rose-50",
                  !active &&
                    "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20 hover:bg-white/[0.06]",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}
