"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play, Square } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import { cn } from "@/lib/cn";

export function MaterialAudioSummary({
  summary,
  materialTitle,
}: {
  summary: string;
  materialTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const cachedTextRef = useRef<string | null>(null);

  const sentences = useMemo(
    () =>
      summary
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [summary],
  );

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  function clearCachedAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    cachedTextRef.current = null;
  }

  function bindAudioEvents(audio: HTMLAudioElement) {
    audio.onended = () => {
      setPlaying(false);
      setPaused(false);
    };
    audio.onpause = () => {
      if (!audio.ended) {
        setPlaying(false);
        setPaused(true);
      }
    };
    audio.onplay = () => {
      setPlaying(true);
      setPaused(false);
    };
    audio.onerror = () => {
      setPlaying(false);
      setPaused(false);
      setError("Přehrávání audia selhalo. Zkus to prosím znovu.");
    };
  }

  async function ensureAudioElement(): Promise<HTMLAudioElement> {
    if (
      audioRef.current &&
      objectUrlRef.current &&
      cachedTextRef.current === summary
    ) {
      return audioRef.current;
    }

    clearCachedAudio();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary.slice(0, 4096) }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok || !contentType.includes("audio")) {
        let message = "Nepodařilo se stáhnout audio shrnutí.";
        try {
          const json = (await response.json()) as {
            error?: string;
          };
          if (json.error) message = json.error;
        } catch {
          // ignore non-JSON error body
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      bindAudioEvents(audio);

      objectUrlRef.current = url;
      audioRef.current = audio;
      cachedTextRef.current = summary;
      return audio;
    } finally {
      setLoading(false);
    }
  }

  async function play() {
    if (loading) return;

    try {
      if (paused && audioRef.current && cachedTextRef.current === summary) {
        await audioRef.current.play();
        return;
      }

      const audio = await ensureAudioElement();
      await audio.play();
    } catch (err) {
      console.error("[material-audio] play failed", err);
      setPlaying(false);
      setPaused(false);
      setError(
        err instanceof Error
          ? err.message
          : "Nepodařilo se přehrát audio shrnutí.",
      );
    }
  }

  function pause() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
  }

  function stop() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    setPaused(false);
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

      {error ? (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={playing ? pause : () => void play()}
            disabled={loading}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)] transition hover:brightness-110 disabled:opacity-70",
              "bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600",
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Generuji audio…
              </>
            ) : playing ? (
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
            disabled={loading || (!playing && !paused)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-40"
          >
            <Square className="h-3.5 w-3.5" aria-hidden />
            Stop
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Hlas: OpenAI TTS (nova) · formát MP3
        </p>
      </div>

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
    </GlassCard>
  );
}
