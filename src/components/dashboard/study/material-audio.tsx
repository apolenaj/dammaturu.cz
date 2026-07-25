"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import { cn } from "@/lib/cn";

function pickCzechVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const czech =
    voices.find((v) => v.lang.toLowerCase().startsWith("cs")) ??
    voices.find((v) => v.lang.toLowerCase().includes("cz")) ??
    voices.find((v) => /czech|čeština|cesky/i.test(v.name));
  return czech ?? null;
}

export function MaterialAudioSummary({
  summary,
  materialTitle,
}: {
  summary: string;
  materialTitle: string;
}) {
  const [supported, setSupported] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const sentences = useMemo(
    () =>
      summary
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [summary],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "speechSynthesis" in window;
    setSupported(ok);

    // Některé prohlížeče načítají hlasy asynchronně.
    if (ok) {
      window.speechSynthesis.getVoices();
      const onVoices = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", onVoices);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stop() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setPlaying(false);
    setPaused(false);
  }

  function play() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    if (paused && utteranceRef.current) {
      window.speechSynthesis.resume();
      setPaused(false);
      setPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.lang = "cs-CZ";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    const voice = pickCzechVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      setPlaying(false);
      setPaused(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setPlaying(false);
      setPaused(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
    setPaused(false);
  }

  function pause() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setPaused(true);
    setPlaying(false);
  }

  return (
    <GlassCard className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/90">
          Audio shrnutí
        </p>
        <p className="mt-1 text-sm text-slate-400">{materialTitle}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-slate-900/40 to-blue-500/10 p-5">
        <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
          {summary}
        </p>
      </div>

      {!supported ? (
        <p className="text-sm text-amber-200">
          Tvůj prohlížeč nepodporuje hlasové čtení. Můžeš si shrnutí přečíst výše
          nahlas sám — funguje to stejně dobře.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={playing ? pause : play}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)] transition hover:brightness-110",
              "bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600",
            )}
          >
            {playing ? (
              <>
                <Pause className="h-4 w-4" aria-hidden />
                Pauza
              </>
            ) : (
              <>
                <Play className="h-4 w-4" aria-hidden />
                {paused ? "Pokračovat" : "Spustit"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={stop}
            disabled={!playing && !paused}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-40"
          >
            <Square className="h-3.5 w-3.5" aria-hidden />
            Stop
          </button>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Body k poslechu
        </p>
        <ul className="space-y-2">
          {sentences.slice(0, 4).map((sentence) => (
            <li
              key={sentence}
              className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-slate-400"
            >
              {sentence}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-500">
        Přehrávání využívá Web Speech API přímo v prohlížeči (čeština, pokud je
        v systému dostupný český hlas).
      </p>
    </GlassCard>
  );
}
