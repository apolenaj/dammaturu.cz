import type {
  OralExaminerBrief,
  OralChecklistItem,
  OralSimulationReport,
} from "@/domain/learning/oral-maturity-simulation";
import type { MockExamFollowUp } from "@/domain/learning/mock-exam";

/**
 * Oral examiner personality (D-054).
 * Affects questioning style and dialogue tone ONLY.
 * Factual checklist + rubric grading stay identical across modes (D-005).
 */

export const oralExaminerPersonalities = [
  "supportive_teacher",
  "standard_teacher",
  "strict_examiner",
  "maturitni_komise",
] as const;

export type OralExaminerPersonality =
  (typeof oralExaminerPersonalities)[number];

export const oralExaminerPersonalityLabelsCs: Record<
  OralExaminerPersonality,
  string
> = {
  supportive_teacher: "Podporující učitel",
  standard_teacher: "Standardní učitel",
  strict_examiner: "Přísný examinátor",
  maturitni_komise: "Maturitní komise",
};

export const oralExaminerPersonalityHintsCs: Record<
  OralExaminerPersonality,
  string
> = {
  supportive_teacher:
    "Klídnější tón, nápovědy ve formulaci otázek — stejná faktická rubrika.",
  standard_teacher: "Vyvážený školní tón, přímé otázky bez nátlaku.",
  strict_examiner: "Stručné, náročné formulace — stále stejné body hodnocení.",
  maturitni_komise:
    "Formálnější komise (více hlasů), střízlivé doplňující otázky.",
};

export type OralExaminerTurn = {
  id: string;
  speakerCs: string;
  textCs: string;
  /** For TTS — same as textCs unless shortened. */
  speakCs: string;
  kind: "intro" | "prompt" | "followup" | "nudge" | "closing";
  checklistItemId: string | null;
};

function wrapFollowUp(
  personality: OralExaminerPersonality,
  baseQuestion: string,
  itemLabel: string,
): { textCs: string; speakerCs: string } {
  const topic = itemLabel.replace(/^[^:]+:\s*/, "").slice(0, 100);
  switch (personality) {
    case "supportive_teacher":
      return {
        speakerCs: "Učitel/ka",
        textCs: `To je dobrý začátek. Ještě mi pomoz doplnit: ${baseQuestion} (klidně vlastními slovy o „${topic}“).`,
      };
    case "standard_teacher":
      return {
        speakerCs: "Učitel/ka",
        textCs: baseQuestion,
      };
    case "strict_examiner":
      return {
        speakerCs: "Examinátor",
        textCs: `Konkrétně. ${baseQuestion.replace(/\?$/, "")} — bez obecných frází.`,
      };
    case "maturitni_komise":
      return {
        speakerCs: "Člen komise",
        textCs: `Pane/paní kandidáte, komise se ptá: ${baseQuestion}`,
      };
  }
}

export function styleOpeningPrompt(
  personality: OralExaminerPersonality,
  brief: OralExaminerBrief,
): OralExaminerTurn {
  const title = brief.bookTitleCs;
  switch (personality) {
    case "supportive_teacher":
      return {
        id: "intro",
        speakerCs: "Učitel/ka",
        kind: "intro",
        checklistItemId: null,
        textCs: `Ahoj. Dnes si nanečisto projdeme „${title}“. Nejdřív máš chvíli na přípravu — pak mi to řekni jako u ústní. Jsem tu, abych tě vedl/a, ne nachytal/a.`,
        speakCs: `Dnes si nanečisto projdeme dílo ${title}. Nejdřív příprava, pak odpověď.`,
      };
    case "standard_teacher":
      return {
        id: "intro",
        speakerCs: "Učitel/ka",
        kind: "intro",
        checklistItemId: null,
        textCs: `Ústní nanečisto: „${title}“. Připrav se, pak souvisle odpověz. Budou doplňující otázky.`,
        speakCs: `Ústní nanečisto k dílu ${title}. Připrav se a pak odpověz.`,
      };
    case "strict_examiner":
      return {
        id: "intro",
        speakerCs: "Examinátor",
        kind: "intro",
        checklistItemId: null,
        textCs: `Téma: ${title}. Příprava. Poté odpověď bez zbytečných úvodů. Očekávám fakta a strukturu.`,
        speakCs: `Téma ${title}. Příprava. Pak odpověď. Očekávám fakta a strukturu.`,
      };
    case "maturitni_komise":
      return {
        id: "intro",
        speakerCs: "Předseda komise",
        kind: "intro",
        checklistItemId: null,
        textCs: `Vážená komise zahajuje simulaci. Kandidát/ka bude hovořit o díle „${title}“. Po přípravě následuje souvislý výklad a otázky členů komise.`,
        speakCs: `Komise zahajuje simulaci k dílu ${title}. Po přípravě výklad a otázky.`,
      };
  }
}

export function styleMainPrompt(
  personality: OralExaminerPersonality,
  brief: OralExaminerBrief,
): OralExaminerTurn {
  const base = brief.promptCs;
  switch (personality) {
    case "supportive_teacher":
      return {
        id: "prompt",
        speakerCs: "Učitel/ka",
        kind: "prompt",
        checklistItemId: null,
        textCs: `Můžeš začít. ${base} Klidně jdi od autora ke kompozici a tématům.`,
        speakCs: `Můžeš začít. ${base}`,
      };
    case "standard_teacher":
      return {
        id: "prompt",
        speakerCs: "Učitel/ka",
        kind: "prompt",
        checklistItemId: null,
        textCs: base,
        speakCs: base,
      };
    case "strict_examiner":
      return {
        id: "prompt",
        speakerCs: "Examinátor",
        kind: "prompt",
        checklistItemId: null,
        textCs: `Mluvte. ${base}`,
        speakCs: base,
      };
    case "maturitni_komise":
      return {
        id: "prompt",
        speakerCs: "Předseda komise",
        kind: "prompt",
        checklistItemId: null,
        textCs: `Prosím o výklad. ${base}`,
        speakCs: `Prosím o výklad k dílu ${brief.bookTitleCs}.`,
      };
  }
}

/**
 * Restyle follow-ups for personality — checklistItemId unchanged (grading).
 */
export function styleFollowUps(
  personality: OralExaminerPersonality,
  followUps: MockExamFollowUp[],
  checklist: OralChecklistItem[],
): OralExaminerTurn[] {
  return followUps.map((fu, i) => {
    const item = checklist.find((c) => c.id === fu.checklistItemId);
    const styled = wrapFollowUp(
      personality,
      fu.question,
      item?.label ?? fu.question,
    );
    const speaker =
      personality === "maturitni_komise"
        ? i % 2 === 0
          ? "Člen komise A"
          : "Člen komise B"
        : styled.speakerCs;
    return {
      id: fu.id,
      speakerCs: speaker,
      textCs: styled.textCs,
      speakCs: styled.textCs,
      kind: "followup" as const,
      checklistItemId: fu.checklistItemId,
    };
  });
}

/** How many follow-ups to ask — style pressure, same item pool. */
export function followUpCountForPersonality(
  personality: OralExaminerPersonality,
): number {
  switch (personality) {
    case "supportive_teacher":
      return 2;
    case "standard_teacher":
      return 3;
    case "strict_examiner":
      return 4;
    case "maturitni_komise":
      return 4;
  }
}

export function styleClosing(
  personality: OralExaminerPersonality,
): OralExaminerTurn {
  switch (personality) {
    case "supportive_teacher":
      return {
        id: "closing",
        speakerCs: "Učitel/ka",
        kind: "closing",
        checklistItemId: null,
        textCs: "Díky. Teď se podíváme na feedback podle evidence — ne na známku.",
        speakCs: "Díky. Teď feedback podle evidence.",
      };
    case "standard_teacher":
      return {
        id: "closing",
        speakerCs: "Učitel/ka",
        kind: "closing",
        checklistItemId: null,
        textCs: "Konec odpovědi. Následuje hodnocení podle rubriky.",
        speakCs: "Konec. Následuje hodnocení.",
      };
    case "strict_examiner":
      return {
        id: "closing",
        speakerCs: "Examinátor",
        kind: "closing",
        checklistItemId: null,
        textCs: "Dost. Vyhodnocení.",
        speakCs: "Dost. Vyhodnocení.",
      };
    case "maturitni_komise":
      return {
        id: "closing",
        speakerCs: "Předseda komise",
        kind: "closing",
        checklistItemId: null,
        textCs: "Komise děkuje. Následuje zápis z rubriky (simulace, ne oficiální protokol).",
        speakCs: "Komise děkuje. Následuje zápis z rubriky.",
      };
  }
}

/** Czech filler / hedge patterns — measurable delivery signal, not content grade. */
const FILLER_PATTERNS = [
  /\behm\b/gi,
  /\bhmm+\b/gi,
  /\bvlastně\b/gi,
  /\bjako\b/gi,
  /\bprostě\b/gi,
  /\bno\b/gi,
  /\btakhle\b/gi,
  /\btypu\b/gi,
  /\břekněme\b/gi,
  /\bvíš\b/gi,
  /\bže jo\b/gi,
];

const STRUCTURE_MARKERS = [
  /\bnejprve\b/i,
  /\bza prvé\b/i,
  /\bdále\b/i,
  /\bpak\b/i,
  /\bna závěr\b/i,
  /\bshrnutí\b/i,
  /\bprotože\b/i,
  /\btedy\b/i,
  /\bz hlediska\b/i,
];

export type OralDeliveryFeedback = {
  fillerCount: number;
  fillerExamples: string[];
  fillerNoteCs: string | null;
  sentenceCount: number;
  structureMarkerCount: number;
  structureNoteCs: string | null;
  wordCount: number;
};

export function analyzeOralDelivery(textCs: string): OralDeliveryFeedback {
  const text = textCs.trim();
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const sentenceCount = text
    ? text.split(/[.!?…]+/).filter((s) => s.trim().length > 8).length
    : 0;

  const fillerExamples: string[] = [];
  let fillerCount = 0;
  for (const re of FILLER_PATTERNS) {
    const matches = text.match(re);
    if (matches) {
      fillerCount += matches.length;
      for (const m of matches.slice(0, 2)) {
        if (!fillerExamples.includes(m.toLowerCase())) {
          fillerExamples.push(m.toLowerCase());
        }
      }
    }
  }

  let structureMarkerCount = 0;
  for (const re of STRUCTURE_MARKERS) {
    if (re.test(text)) structureMarkerCount += 1;
  }

  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
  const fillerNoteCs =
    wordCount < 40
      ? "Odpověď je krátká — filler metriky jsou jen orientační."
      : fillerRatio > 0.08
        ? `Hodně výplní (~${Math.round(fillerRatio * 100)} % slov). Zkus kratší věty a méně „jako/vlastně“.`
        : fillerCount >= 3
          ? `Občasné výplně (${fillerExamples.slice(0, 4).join(", ")}).`
          : null;

  const structureNoteCs =
    sentenceCount <= 1 && wordCount > 60
      ? "Málo členění — zkus oddělit autor / kompozice / témata."
      : structureMarkerCount === 0 && wordCount > 80
        ? "Chybí signály struktury (nejprve, dále, na závěr…). Obsah může být v pořádku, forma méně čitelná."
        : structureMarkerCount >= 2
          ? "Dobré signály struktury v mluveném projevu."
          : null;

  return {
    fillerCount,
    fillerExamples: fillerExamples.slice(0, 6),
    fillerNoteCs,
    sentenceCount,
    structureMarkerCount,
    structureNoteCs,
    wordCount,
  };
}

export type OralNextPractice = {
  titleCs: string;
  href: string;
  reasonCs: string;
};

export function buildNextPracticeRecommendations(input: {
  report: OralSimulationReport;
  bookHref: string | null;
}): OralNextPractice[] {
  const out: OralNextPractice[] = [];
  if (input.bookHref) {
    out.push({
      titleCs: "Doplň kartu díla",
      href: input.bookHref,
      reasonCs: "Chybějící pole = slabší evidence při příští simulaci.",
    });
  }
  for (const miss of input.report.missingPoints.slice(0, 3)) {
    out.push({
      titleCs: miss.label.slice(0, 80),
      href: input.bookHref ?? "/app/literature",
      reasonCs: miss.reviewHintCs,
    });
  }
  if (input.report.inaccuracies.length > 0) {
    out.push({
      titleCs: "Oprav nepřesnosti",
      href: "/app/mistakes",
      reasonCs: input.report.inaccuracies[0]!.correction,
    });
  }
  out.push({
    titleCs: "Další ústní nanečisto",
    href: "/app/simulation",
    reasonCs: "Zopakuj se stejným checklistem — sleduj mastery knihy.",
  });
  // unique by title
  const seen = new Set<string>();
  return out.filter((p) => {
    if (seen.has(p.titleCs)) return false;
    seen.add(p.titleCs);
    return true;
  }).slice(0, 5);
}

/**
 * Enrich report with delivery + next practice.
 * Personality is recorded for UI only — scores must match unstyled grade.
 */
export function enrichOralReport(input: {
  report: OralSimulationReport;
  mainAnswerText: string;
  personality: OralExaminerPersonality;
  bookHref: string | null;
}): OralSimulationReport & {
  personality: OralExaminerPersonality;
  personalityLabelCs: string;
  delivery: OralDeliveryFeedback;
  nextPractice: OralNextPractice[];
} {
  const delivery = analyzeOralDelivery(input.mainAnswerText);
  return {
    ...input.report,
    personality: input.personality,
    personalityLabelCs: oralExaminerPersonalityLabelsCs[input.personality],
    delivery,
    nextPractice: buildNextPracticeRecommendations({
      report: input.report,
      bookHref: input.bookHref,
    }),
  };
}
