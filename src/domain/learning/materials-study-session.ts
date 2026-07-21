import { z } from "zod";
import { openAnswerEvaluationSchema } from "@/domain/learning/open-answer-eval";
import { sourceCitationSchema } from "@/domain/learning/grounded-study";
import { scheduleEntrySchema } from "@/domain/learning/flashcards";
import { masteryBandSchema } from "@/domain/learning/mastery-engine";

/**
 * End-to-end Czech study session from “Moje materiály”.
 * Mixes recall / short answer / flashcards / explanation / retrieval.
 */

export const materialsSessionModes = ["topic", "smart_mix"] as const;
export type MaterialsSessionMode = (typeof materialsSessionModes)[number];

export const materialsSessionItemKinds = [
  "recall",
  "short_answer",
  "flashcard",
  "explanation",
  "retrieval",
] as const;

export type MaterialsSessionItemKind =
  (typeof materialsSessionItemKinds)[number];

export const materialsSessionItemKindLabelsCs: Record<
  MaterialsSessionItemKind,
  string
> = {
  recall: "Vybavování",
  short_answer: "Krátká odpověď",
  flashcard: "Karty",
  explanation: "Vysvětlení",
  retrieval: "Retrieval",
};

export const materialsSessionItemSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(materialsSessionItemKinds),
  prompt: z.string().min(1).max(600),
  /** Ideal / model answer from source. */
  idealAnswer: z.string().min(1).max(2000),
  keyIdeas: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        label: z.string().min(1).max(200),
        synonyms: z.array(z.string()).max(8).default([]),
        required: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(16),
  citations: z.array(sourceCitationSchema).min(1).max(6),
  knowledgeUnitIds: z.array(z.string().uuid()).min(1).max(4),
  topic: z.string().max(200).nullable(),
  /** Flashcard front (when kind === flashcard). */
  flashcardFront: z.string().max(400).optional(),
  flashcardBack: z.string().max(800).optional(),
  materialId: z.string().uuid(),
  materialTitle: z.string().min(1).max(240),
});

export type MaterialsSessionItem = z.infer<typeof materialsSessionItemSchema>;

export const materialsSessionSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  mode: z.enum(materialsSessionModes),
  topic: z.string().max(200).nullable(),
  materialIds: z.array(z.string().uuid()).min(1).max(8),
  materialTitles: z.array(z.string()).min(1).max(8),
  availableTopics: z.array(z.string().max(200)).max(40),
  items: z.array(materialsSessionItemSchema).min(1).max(40),
  /** Mastery snapshot before session (kuId → score). */
  masteryBefore: z.record(z.string(), z.number()),
  createdAt: z.string().datetime(),
});

export type MaterialsSession = z.infer<typeof materialsSessionSchema>;

export const materialsSessionAttemptSchema = z.object({
  itemId: z.string().uuid(),
  kind: z.enum(materialsSessionItemKinds),
  studentAnswer: z.string().max(4000),
  result: z.enum(["correct", "partial", "incorrect"]),
  coverage: z.number().min(0).max(1),
  openEvaluation: openAnswerEvaluationSchema.optional(),
  /** Flashcard self-grade mapped to result. */
  flashcardGrade: z.enum(["dont_know", "almost", "know"]).optional(),
  scheduledDueAt: z.string().datetime().nullable(),
  at: z.string().datetime(),
});

export type MaterialsSessionAttempt = z.infer<
  typeof materialsSessionAttemptSchema
>;

export const materialsSessionSummarySchema = z.object({
  sessionId: z.string().uuid(),
  attemptCount: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  partialCount: z.number().int().min(0),
  incorrectCount: z.number().int().min(0),
  /** What improved — KU title + score delta. */
  whatImproved: z.array(
    z.object({
      knowledgeUnitId: z.string(),
      title: z.string(),
      scoreBefore: z.number(),
      scoreAfter: z.number(),
      delta: z.number(),
    }),
  ),
  /** Still weak after session. */
  whatRemainsWeak: z.array(
    z.object({
      knowledgeUnitId: z.string(),
      title: z.string(),
      score: z.number(),
      band: masteryBandSchema,
    }),
  ),
  /** Should repeat soon (missed / partial). */
  whatShouldBeRepeated: z.array(
    z.object({
      itemId: z.string().uuid(),
      prompt: z.string(),
      kind: z.enum(materialsSessionItemKinds),
      topic: z.string().nullable(),
    }),
  ),
  /** Coarse retention estimate 0–1 from schedule intervals + accuracy. */
  estimatedRetention: z.number().min(0).max(1),
  estimatedRetentionLabelCs: z.string().max(120),
  nextReviewAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime(),
});

export type MaterialsSessionSummary = z.infer<
  typeof materialsSessionSummarySchema
>;

export const materialsStudyScheduleSchema = z.object({
  learnerId: z.string().min(1).max(64),
  byItemKey: z.record(z.string(), scheduleEntrySchema),
  updatedAt: z.string().datetime(),
});

export type MaterialsStudySchedule = z.infer<
  typeof materialsStudyScheduleSchema
>;

export function masteryToReviewGrade(
  correctness: "correct" | "partial" | "incorrect",
): "know" | "almost" | "dont_know" {
  if (correctness === "correct") return "know";
  if (correctness === "partial") return "almost";
  return "dont_know";
}

/** Retention heuristic from mean interval days + session accuracy. */
export function estimateRetention(params: {
  accuracy: number;
  meanIntervalDays: number;
}): { value: number; labelCs: string } {
  const intervalFactor = Math.min(1, params.meanIntervalDays / 14);
  const value =
    Math.round(
      (params.accuracy * 0.55 + intervalFactor * 0.45) * 100,
    ) / 100;
  let labelCs: string;
  if (value >= 0.75) labelCs = "Silná — většina by měla vydržet do dalšího opakování.";
  else if (value >= 0.5)
    labelCs = "Střední — zopakuj slabší body do pár dnů.";
  else labelCs = "Křehká — brzy zopakuj chybějící body.";
  return { value, labelCs };
}
