"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser oral voice: mic permission, STT (cs-CZ), optional TTS.
 * Grading always uses transcript text — never raw audio.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: {
    length: number;
    [index: number]:
      | {
          isFinal?: boolean;
          length: number;
          [index: number]: { transcript: string } | undefined;
        }
      | undefined;
  };
};

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type MicPermission = "unknown" | "granted" | "denied" | "unsupported";

export function useOralVoice(opts?: {
  lang?: string;
  onFinalTranscript?: (chunk: string) => void;
}) {
  const lang = opts?.lang ?? "cs-CZ";
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermission>("unknown");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(opts?.onFinalTranscript);
  onFinalRef.current = opts?.onFinalTranscript;

  useEffect(() => {
    setSttSupported(Boolean(getSpeechRecognitionCtor()));
    setTtsSupported(
      typeof window !== "undefined" && "speechSynthesis" in window,
    );
  }, []);

  const requestMicPermission = useCallback(async (): Promise<MicPermission> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicPermission("unsupported");
      return "unsupported";
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      setError(null);
      return "granted";
    } catch {
      setMicPermission("denied");
      setError("Mikrofon zamítnut — povol ho v prohlížeči, nebo piš textem.");
      return "denied";
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const startListening = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Prohlížeč nepodporuje speech-to-text (zkus Chrome).");
      return;
    }
    const perm = micPermission === "granted"
      ? "granted"
      : await requestMicPermission();
    if (perm === "denied") return;

    setError(null);
    stopListening();
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let interimBuf = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript ?? "";
        if (!transcript) continue;
        if (result?.isFinal) {
          onFinalRef.current?.(transcript.trim());
        } else {
          interimBuf += transcript;
        }
      }
      setInterim(interimBuf.trim());
    };
    rec.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") {
        setMicPermission("denied");
        setError("Mikrofon zamítnut.");
      } else if (event.error !== "aborted") {
        setError("Hlasový vstup selhal — můžeš pokračovat textem.");
      }
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Nepodařilo se spustit mikrofon.");
      setListening(false);
    }
  }, [lang, micPermission, requestMicPermission, stopListening]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (textCs: string) => {
      if (!ttsEnabled || !ttsSupported || !textCs.trim()) return;
      stopSpeaking();
      const u = new SpeechSynthesisUtterance(textCs);
      u.lang = lang;
      u.rate = 1;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [lang, stopSpeaking, ttsEnabled, ttsSupported],
  );

  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [stopListening, stopSpeaking]);

  return {
    sttSupported,
    ttsSupported,
    micPermission,
    listening,
    speaking,
    ttsEnabled,
    setTtsEnabled,
    interim,
    error,
    setError,
    requestMicPermission,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
