"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import { cn } from "@/lib/cn";

/**
 * Projde dostupné hlasy a vybere ten, jehož lang obsahuje „cs“
 * (případně cz / Czech), ať prohlížeč nečte češtinu anglickým hlasem.
 */
function findCzechVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const score = (voice: SpeechSynthesisVoice): number => {
    const lang = voice.lang.toLowerCase().replace("_", "-");
    const name = voice.name.toLowerCase();
    let points = 0;

    if (lang === "cs-cz") points += 100;
    else if (lang.startsWith("cs")) points += 80;
    else if (lang.includes("cs")) points += 60;
    else if (lang.includes("cz")) points += 40;

    if (/czech|čeština|cesky|česk/i.test(voice.name)) points += 50;
    if (name.includes("zira") || name.includes("jakub") || name.includes("elsa")) {
      points += 10;
    }
    // Preferuj lokální hlasy (méně anglické „fallback“ výslovnosti).
    if (voice.localService) points += 15;

    return points;
  };

  const ranked = [...voices]
    .map((voice) => ({ voice, points: score(voice) }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points);

  return ranked[0]?.voice ?? null;
}

function configureCzechUtterance(
  text: string,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  // Striktně čeština — prohlížeč nesmí padnout na výchozí anglický hlas.
  utterance.lang = "cs-CZ";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 1;

  const czechVoice = findCzechVoice(voices);
  if (czechVoice) {
    utterance.voice = czechVoice;
  }

  // Pojistka: lang musí zůstat cs-CZ i po přiřazení hlasu.
  utterance.lang = "cs-CZ";

  return utterance;
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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const sentences = useMemo(
    () =>
      summary
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [summary],
  );

  const refreshVoices = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const list = window.speechSynthesis.getVoices();
    setVoices(list);
    const czech = findCzechVoice(list);
    setVoiceLabel(
      czech
        ? `${czech.name} (${czech.lang})`
        : list.length > 0
          ? "Český hlas v systému nebyl nalezen — výslovnost může být horší"
          : null,
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "speechSynthesis" in window;
    setSupported(ok);
    if (!ok) return;

    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    // Chrome někdy potřebuje „probuzení“ getVoices.
    window.speechSynthesis.getVoices();

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
      window.speechSynthesis.cancel();
    };
  }, [refreshVoices]);

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

    // Před spuštěním znovu načti hlasy (Chrome je někdy dodá až pozdě).
    const latestVoices = window.speechSynthesis.getVoices();
    if (latestVoices.length > 0) {
      setVoices(latestVoices);
    }
    const voicePool = latestVoices.length > 0 ? latestVoices : voices;

    if (paused && utteranceRef.current) {
      window.speechSynthesis.resume();
      setPaused(false);
      setPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = configureCzechUtterance(summary, voicePool);

    const czech = findCzechVoice(voicePool);
    setVoiceLabel(
      czech
        ? `${czech.name} (${czech.lang})`
        : "Český hlas v systému nebyl nalezen — výslovnost může být horší",
    );

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
        <div className="space-y-3">
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
          {voiceLabel ? (
            <p className="text-xs text-slate-500">
              Hlas: {voiceLabel} · jazyk utterance: cs-CZ
            </p>
          ) : null}
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
        Přehrávání používá Web Speech API s preferencí českého hlasu (lang obsahuje
        „cs“). Pokud v systému český hlas chybí, nainstaluj ho v nastavení OS /
        prohlížeče.
      </p>
    </GlassCard>
  );
}
