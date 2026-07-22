import { z } from "zod";
import {
  evidenceConfidenceStates,
  sourceCitationSchema,
  type EvidenceConfidence,
  type SourceCitation,
} from "@/domain/learning/grounded-study";
import {
  openAnswerEvaluationSchema,
  type OpenAnswerEvaluation,
} from "@/domain/learning/open-answer-eval";

/**
 * Oral Exam Training — user/school materials only.
 * No hardcoded national oral-exam rules (school profile may differ).
 * Rubric + key points are derived only from uploaded source material.
 */

export const materialsOralModes = [
  "question_drill",
  "full_topic",
  "random_topic",
  "weak_spots",
  "quick_review",
] as const;

export type MaterialsOralMode = (typeof materialsOralModes)[number];

export const materialsOralModeLabelsCs: Record<MaterialsOralMode, string> = {
  question_drill: "Otázka nanečisto",
  full_topic: "Celé téma",
  random_topic: "Náhodné téma",
  weak_spots: "Moje slabiny",
  quick_review: "Rychlé ústní opakování",
};

export const materialsOralModeHintsCs: Record<MaterialsOralMode, string> = {
  question_drill:
    "Jedna otázka z materiálu — jako krátký ústní vstup.",
  full_topic:
    "Projdi celé téma (více klíčových bodů ze stejné sekce).",
  random_topic:
    "Losování tématu z tvých připravených materiálů.",
  weak_spots:
    "Zaměření na místa, kde jsi už chyboval/a (Moje chyby + slabé KU).",
  quick_review:
    "Krátká příprava (0–30 s) a rychlá odpověď — bez dlouhého nácviku.",
};

export const materialsOralPhases = [
  "select",
  "prepare",
  "answer",
  "report",
] as const;

export type MaterialsOralPhase = (typeof materialsOralPhases)[number];

export const materialsOralConfig = {
  prepSecondsByMode: {
    question_drill: 60,
    full_topic: 120,
    random_topic: 90,
    weak_spots: 60,
    quick_review: 20,
  } as Record<MaterialsOralMode, number>,
  maxPromptsPerSession: 6,
  maxKeyPoints: 10,
  minKeyPointsForGrade: 2,
  structureMinChars: 80,
  structureMinSentences: 2,
} as const;

export const materialsOralKeyPointSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  required: z.boolean().default(true),
});

export type MaterialsOralKeyPoint = z.infer<
  typeof materialsOralKeyPointSchema
>;

export const materialsOralPromptSchema = z.object({
  id: z.string().uuid(),
  mode: z.enum(materialsOralModes),
  topicCs: z.string().min(1).max(200),
  questionCs: z.string().min(1).max(500),
  /** Outline drawn only from source — never invented. */
  idealOutlineCs: z.string().min(1).max(2000),
  keyPoints: z.array(materialsOralKeyPointSchema).min(1).max(12),
  citations: z.array(sourceCitationSchema).min(1).max(8),
  confidence: z.enum(evidenceConfidenceStates),
  knowledgeUnitIds: z.array(z.string().uuid()).max(12),
  materialId: z.string().uuid(),
  materialTitle: z.string().min(1).max(240),
  sourceHref: z.string().min(1).max(300),
  prepSeconds: z.number().int().min(0).max(600),
  /** When true, UI hides outline/key points until after submit. */
  hideHints: z.boolean().default(true),
});

export type MaterialsOralPrompt = z.infer<typeof materialsOralPromptSchema>;

export const materialsOralSessionSchema = z.object({
  id: z.string().uuid(),
  mode: z.enum(materialsOralModes),
  materialIds: z.array(z.string().uuid()).min(1).max(8),
  materialTitles: z.array(z.string().min(1).max(240)).min(1).max(8),
  prompts: z.array(materialsOralPromptSchema).min(1).max(8),
  cursor: z.number().int().min(0),
  builtAt: z.string().datetime(),
  disclaimerCs: z.string().min(1).max(400),
});

export type MaterialsOralSession = z.infer<typeof materialsOralSessionSchema>;

export const materialsOralStructureFlags = [
  "ok",
  "too_short",
  "unclear_structure",
  "list_like",
] as const;

export type MaterialsOralStructureFlag =
  (typeof materialsOralStructureFlags)[number];

export const materialsOralReportSchema = z.object({
  promptId: z.string().uuid(),
  result: z.enum([
    "correct",
    "partial",
    "incorrect",
    "insufficient",
  ]),
  evaluationConfidence: z.enum(evidenceConfidenceStates),
  lowConfidence: z.boolean(),
  lowConfidenceNoteCs: z.string().nullable(),
  correctKeyPoints: z.array(z.string().min(1).max(200)).max(20),
  missingKeyPoints: z.array(z.string().min(1).max(200)).max(20),
  factualMistakes: z.array(z.string().min(1).max(200)).max(12),
  structureFlag: z.enum(materialsOralStructureFlags),
  structureNoteCs: z.string().min(1).max(400),
  idealOutlineCs: z.string().min(1).max(2000),
  expectedKeyPoints: z.array(z.string().min(1).max(200)).max(12),
  citations: z.array(sourceCitationSchema).max(8),
  sourceHref: z.string().min(1).max(300),
  materialTitle: z.string().min(1).max(240),
  feedbackCs: z.string().min(1).max(1200),
  openEvaluation: openAnswerEvaluationSchema.optional(),
  scheduledWeakConcepts: z.number().int().min(0).max(40),
  retryWithoutHintsAvailable: z.boolean(),
});

export type MaterialsOralReport = z.infer<typeof materialsOralReportSchema>;

export const MATERIALS_ORAL_DISCLAIMER_CS =
  "Ústní trénink z tvých materiálů. Neaplikujeme celostátní pravidla ústní maturity — ta mohou být školní. Hodnocení jen podle nahraných podkladů; nic si nevymýšlíme.";

export const MATERIALS_ORAL_LOW_CONFIDENCE_CS =
  "Jistota hodnocení je nízká — nebudu předstírat přesný verdikt. Níže jsou očekávané klíčové body ze zdroje.";

export function analyzeOralStructure(answer: string): {
  flag: MaterialsOralStructureFlag;
  noteCs: string;
} {
  const text = answer.trim();
  if (text.length < materialsOralConfig.structureMinChars) {
    return {
      flag: "too_short",
      noteCs:
        "Odpověď je krátká na ústní projev — rozveď alespoň 2–3 věty podle materiálu.",
    };
  }
  const sentences = text.split(/[.!?…]+/).filter((s) => s.trim().length > 12);
  const newlines = (text.match(/\n/g) ?? []).length;
  const bullets = (text.match(/(^|\n)\s*[-•*]/gm) ?? []).length;
  if (bullets >= 3 && sentences.length < 2) {
    return {
      flag: "list_like",
      noteCs:
        "Struktura spíš jako výčet. U ústní zkus souvislé věty: úvod → body → shrnutí.",
    };
  }
  if (
    sentences.length < materialsOralConfig.structureMinSentences &&
    newlines < 1
  ) {
    return {
      flag: "unclear_structure",
      noteCs:
        "Struktura není jasná. Odděl myšlenky (úvod, klíčové body, závěr).",
    };
  }
  return {
    flag: "ok",
    noteCs: "Základní struktura odpovědi působí srozumitelně.",
  };
}

export function buildMaterialsOralReport(input: {
  prompt: MaterialsOralPrompt;
  studentAnswer: string;
  openEvaluation: OpenAnswerEvaluation | null;
  evaluationConfidence: EvidenceConfidence;
  scheduledWeakConcepts?: number;
}): MaterialsOralReport {
  const structure = analyzeOralStructure(input.studentAnswer);
  const expectedKeyPoints = input.prompt.keyPoints.map((k) => k.label);
  const lowConfidence =
    input.evaluationConfidence === "insufficient" ||
    input.evaluationConfidence === "needs_review" ||
    !input.openEvaluation ||
    input.prompt.keyPoints.length < materialsOralConfig.minKeyPointsForGrade;

  if (lowConfidence) {
    return {
      promptId: input.prompt.id,
      result: "insufficient",
      evaluationConfidence: input.evaluationConfidence,
      lowConfidence: true,
      lowConfidenceNoteCs: MATERIALS_ORAL_LOW_CONFIDENCE_CS,
      correctKeyPoints: input.openEvaluation?.whatWasCorrect ?? [],
      missingKeyPoints:
        input.openEvaluation?.whatWasMissing ?? expectedKeyPoints,
      factualMistakes: input.openEvaluation?.whatWasWrong ?? [],
      structureFlag: structure.flag,
      structureNoteCs: structure.noteCs,
      idealOutlineCs: input.prompt.idealOutlineCs,
      expectedKeyPoints,
      citations: input.prompt.citations,
      sourceHref: input.prompt.sourceHref,
      materialTitle: input.prompt.materialTitle,
      feedbackCs: MATERIALS_ORAL_LOW_CONFIDENCE_CS,
      openEvaluation: input.openEvaluation ?? undefined,
      scheduledWeakConcepts: input.scheduledWeakConcepts ?? 0,
      retryWithoutHintsAvailable: true,
    };
  }

  const ev = input.openEvaluation!;
  const result =
    ev.result === "correct"
      ? ("correct" as const)
      : ev.result === "partially_correct"
        ? ("partial" as const)
        : ("incorrect" as const);

  const feedbackParts = [
    result === "correct"
      ? "Obsahově sedí vůči materiálu."
      : result === "partial"
        ? "Částečně správně — doplň chybějící body ze zdroje."
        : "Obsahově slabé vůči materiálu — vrať se ke zdroji.",
    structure.noteCs,
  ];

  return {
    promptId: input.prompt.id,
    result,
    evaluationConfidence: input.evaluationConfidence,
    lowConfidence: false,
    lowConfidenceNoteCs: null,
    correctKeyPoints: ev.whatWasCorrect,
    missingKeyPoints: ev.whatWasMissing,
    factualMistakes: ev.whatWasWrong,
    structureFlag: structure.flag,
    structureNoteCs: structure.noteCs,
    idealOutlineCs: input.prompt.idealOutlineCs,
    expectedKeyPoints,
    citations: input.prompt.citations,
    sourceHref: input.prompt.sourceHref,
    materialTitle: input.prompt.materialTitle,
    feedbackCs: feedbackParts.join(" "),
    openEvaluation: ev,
    scheduledWeakConcepts: input.scheduledWeakConcepts ?? 0,
    retryWithoutHintsAvailable: true,
  };
}

/** Strip hints for „Zkusit znovu bez nápovědy“. */
export function promptWithoutHints(
  prompt: MaterialsOralPrompt,
): MaterialsOralPrompt {
  return {
    ...prompt,
    hideHints: true,
  };
}

export function currentPrompt(
  session: MaterialsOralSession,
): MaterialsOralPrompt | null {
  return session.prompts[session.cursor] ?? null;
}

export type MaterialsOralSelectView = {
  modes: Array<{
    id: MaterialsOralMode;
    labelCs: string;
    hintCs: string;
    prepSeconds: number;
  }>;
  materials: Array<{
    id: string;
    title: string;
    knowledgePointCount: number;
    topicCount: number;
  }>;
  topics: string[];
  hasWeakSpots: boolean;
  disclaimerCs: string;
};

export function buildMaterialsOralSelectView(input: {
  materials: Array<{
    id: string;
    title: string;
    knowledgePointCount: number;
    topicCount: number;
  }>;
  topics: string[];
  hasWeakSpots: boolean;
}): MaterialsOralSelectView {
  return {
    modes: materialsOralModes.map((id) => ({
      id,
      labelCs: materialsOralModeLabelsCs[id],
      hintCs: materialsOralModeHintsCs[id],
      prepSeconds: materialsOralConfig.prepSecondsByMode[id],
    })),
    materials: input.materials,
    topics: input.topics,
    hasWeakSpots: input.hasWeakSpots,
    disclaimerCs: MATERIALS_ORAL_DISCLAIMER_CS,
  };
}

export type { SourceCitation, EvidenceConfidence };
