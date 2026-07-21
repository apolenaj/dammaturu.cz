/**
 * Voice-ready oral I/O ports (D-053 / D-054).
 * Browser implementation: `useOralVoice` (mic + STT + optional TTS).
 * Grading never reads audio — only OralUtterance.textCs.
 */

import type {
  OralInputPort,
  OralModality,
  OralOutputPort,
  OralUtterance,
} from "@/domain/learning/oral-maturity-simulation";
import { textUtterance } from "@/domain/learning/oral-maturity-simulation";

export function createTextInputPort(
  getText: () => string,
): OralInputPort {
  return {
    modality: "text",
    async captureAnswer() {
      return textUtterance(getText(), new Date().toISOString());
    },
  };
}

export function createTextOutputPort(
  present: (textCs: string) => void,
): OralOutputPort {
  return {
    modality: "text",
    async presentPrompt(textCs: string) {
      present(textCs);
    },
  };
}

/**
 * Placeholder voice input — wire Web Speech Recognition here.
 * Must always resolve to OralUtterance with textCs transcript.
 */
export function createVoiceInputPortStub(opts: {
  /** Injected STT result for tests / future browser hook. */
  transcribe: () => Promise<string>;
}): OralInputPort {
  return {
    modality: "voice",
    async captureAnswer() {
      const text = await opts.transcribe();
      const u: OralUtterance = {
        modality: "voice",
        textCs: text,
        audioRef: null,
        durationMs: null,
        capturedAt: new Date().toISOString(),
      };
      return u;
    },
  };
}

/**
 * Placeholder voice output — wire speechSynthesis / TTS here.
 */
export function createVoiceOutputPortStub(opts: {
  speak: (textCs: string) => Promise<void>;
}): OralOutputPort {
  return {
    modality: "voice",
    async presentPrompt(textCs: string) {
      await opts.speak(textCs);
    },
  };
}

export type OralIoBundle = {
  input: OralInputPort;
  output: OralOutputPort;
  preferredModality: OralModality;
};

export function createDefaultTextIo(opts: {
  getAnswerText: () => string;
  onPrompt: (textCs: string) => void;
}): OralIoBundle {
  return {
    input: createTextInputPort(opts.getAnswerText),
    output: createTextOutputPort(opts.onPrompt),
    preferredModality: "text",
  };
}
