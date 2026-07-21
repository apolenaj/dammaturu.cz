import { z } from "zod";

/** Student actions in the lesson player. */
export const lessonInteractionKinds = [
  "continue",
  "back",
  "understand",
  "dont_know",
  "save",
  "open_explanation",
  "quiz_answer",
  "flashcard_grade",
  "recall_submit",
  "teach_back_submit",
  "exit_submit",
  "lesson_completed",
] as const;

export type LessonInteractionKind = (typeof lessonInteractionKinds)[number];

export const lessonInteractionKindSchema = z.enum(lessonInteractionKinds);

export const flashcardGrades = ["know", "almost", "dont_know"] as const;

export const lessonInteractionSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  lessonId: z.string().uuid(),
  lessonSlug: z.string().min(1).max(120),
  blockId: z.string().uuid().nullable(),
  blockType: z.string().nullable(),
  kind: lessonInteractionKindSchema,
  knowledgeUnitIds: z.array(z.string().uuid()).default([]),
  payload: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  at: z.string().datetime(),
});

export type LessonInteraction = z.infer<typeof lessonInteractionSchema>;

export const lessonProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  lessonId: z.string().uuid(),
  lessonSlug: z.string().min(1).max(120),
  currentBlockIndex: z.number().int().min(0),
  completedBlockIds: z.array(z.string().uuid()),
  understoodBlockIds: z.array(z.string().uuid()),
  unknownBlockIds: z.array(z.string().uuid()),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  savedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LessonProgress = z.infer<typeof lessonProgressSchema>;
