/**
 * One-minute study (D-059) — bus-friendly micro session.
 * Pick one quick activity the student can finish in ~60s.
 */

export const oneMinuteStudyModes = [
  "flashcards",
  "cermat",
  "review",
  "speed",
] as const;

export type OneMinuteStudyMode = (typeof oneMinuteStudyModes)[number];

export type OneMinuteStudyPlan = {
  mode: OneMinuteStudyMode;
  titleCs: string;
  reasonCs: string;
  href: string;
  estimatedSeconds: number;
  ctaLabelCs: string;
};

export function pickOneMinuteStudy(input: {
  flashcardDueCount: number;
  reviewDueCount: number;
  hasCermat: boolean;
  hasSpeedRound: boolean;
  speedRoundHref?: string | null;
}): OneMinuteStudyPlan {
  if (input.flashcardDueCount > 0) {
    return {
      mode: "flashcards",
      titleCs: "1 minuta · kartičky",
      reasonCs: "Máš kartičky k opakování — stihneš pár karet ve stoje.",
      href: "/app/review",
      estimatedSeconds: 60,
      ctaLabelCs: "Spustit kartičky",
    };
  }
  if (input.reviewDueCount > 0) {
    return {
      mode: "review",
      titleCs: "1 minuta · opakování",
      reasonCs: "Krátká fronta k zopakování — ideální do cesty.",
      href: "/app/review/mixed",
      estimatedSeconds: 60,
      ctaLabelCs: "Spustit opakování",
    };
  }
  if (input.hasCermat) {
    return {
      mode: "cermat",
      titleCs: "1 minuta · CERMAT",
      reasonCs: "Jedna kategorie didaktického tréninku — bez limitu, jen tempo.",
      href: "/app/cermat",
      estimatedSeconds: 60,
      ctaLabelCs: "Spustit CERMAT",
    };
  }
  if (input.hasSpeedRound && input.speedRoundHref) {
    return {
      mode: "speed",
      titleCs: "1 minuta · speed round",
      reasonCs: "60 sekund rychlých otázek — přesně na cestu.",
      href: input.speedRoundHref,
      estimatedSeconds: 60,
      ctaLabelCs: "Spustit 60 s",
    };
  }
  return {
    mode: "cermat",
    titleCs: "1 minuta · učení",
    reasonCs: "Otevři Učit se a vezmi nejkratší režim — i minuta se počítá.",
    href: "/app/learn",
    estimatedSeconds: 60,
    ctaLabelCs: "Otevřít Učit se",
  };
}
