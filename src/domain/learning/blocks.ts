import { z } from "zod";

/**
 * Lesson content blocks — schema-driven, never a single long-text blob.
 * Each type has a dedicated payload for the renderer registry.
 */

export const lessonBlockTypes = [
  "hook",
  "quick_context",
  "core_explanation",
  "timeline",
  "story",
  "example",
  "visual_comparison",
  "character_card",
  "author_card",
  "work_card",
  "remember_this",
  "common_trap",
  "mnemonic",
  "flashcard_burst",
  "mini_quiz",
  "active_recall",
  "teach_back",
  "summary",
  "exit_ticket",
] as const;

export type LessonBlockType = (typeof lessonBlockTypes)[number];

export const lessonBlockTypeSchema = z.enum(lessonBlockTypes);

const blockBase = {
  id: z.string().uuid(),
  /** Optional KU links for mastery evidence. */
  knowledgeUnitIds: z.array(z.string().uuid()).default([]),
  title: z.string().min(1).max(200).optional(),
};

const shortText = z.string().trim().min(1).max(600);
const mediumText = z.string().trim().min(1).max(1200);

export const hookBlockSchema = z.object({
  ...blockBase,
  type: z.literal("hook"),
  prompt: shortText,
  tease: z.string().trim().max(300).optional(),
});

export const quickContextBlockSchema = z.object({
  ...blockBase,
  type: z.literal("quick_context"),
  bullets: z.array(z.string().trim().min(1).max(200)).min(1).max(6),
});

export const coreExplanationBlockSchema = z.object({
  ...blockBase,
  type: z.literal("core_explanation"),
  /** Short paragraphs — engine forbids one giant blob as a whole lesson. */
  paragraphs: z.array(z.string().trim().min(1).max(500)).min(1).max(4),
  explanation: mediumText.optional(),
});

export const timelineBlockSchema = z.object({
  ...blockBase,
  type: z.literal("timeline"),
  events: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        detail: z.string().min(1).max(240),
      }),
    )
    .min(2)
    .max(8),
});

export const storyBlockSchema = z.object({
  ...blockBase,
  type: z.literal("story"),
  narrative: mediumText,
});

export const exampleBlockSchema = z.object({
  ...blockBase,
  type: z.literal("example"),
  setup: shortText,
  resolution: shortText,
});

export const visualComparisonBlockSchema = z.object({
  ...blockBase,
  type: z.literal("visual_comparison"),
  leftLabel: z.string().min(1).max(80),
  rightLabel: z.string().min(1).max(80),
  leftPoints: z.array(z.string().min(1).max(160)).min(1).max(5),
  rightPoints: z.array(z.string().min(1).max(160)).min(1).max(5),
});

export const characterCardBlockSchema = z.object({
  ...blockBase,
  type: z.literal("character_card"),
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(160),
  traits: z.array(z.string().min(1).max(80)).min(1).max(6),
  note: z.string().max(300).optional(),
});

export const authorCardBlockSchema = z.object({
  ...blockBase,
  type: z.literal("author_card"),
  name: z.string().min(1).max(120),
  lifespan: z.string().max(40).optional(),
  movement: z.string().max(120).optional(),
  keyWorks: z.array(z.string().min(1).max(120)).max(5).default([]),
  note: z.string().max(400).optional(),
});

export const workCardBlockSchema = z.object({
  ...blockBase,
  type: z.literal("work_card"),
  title: z.string().min(1).max(160),
  author: z.string().min(1).max(120),
  year: z.string().max(40).optional(),
  genre: z.string().max(80).optional(),
  themes: z.array(z.string().min(1).max(80)).max(6).default([]),
  note: z.string().max(400).optional(),
});

export const rememberThisBlockSchema = z.object({
  ...blockBase,
  type: z.literal("remember_this"),
  statement: shortText,
});

export const commonTrapBlockSchema = z.object({
  ...blockBase,
  type: z.literal("common_trap"),
  trap: shortText,
  correction: shortText,
});

export const mnemonicBlockSchema = z.object({
  ...blockBase,
  type: z.literal("mnemonic"),
  cue: shortText,
  expansion: shortText.optional(),
});

export const flashcardBurstBlockSchema = z.object({
  ...blockBase,
  type: z.literal("flashcard_burst"),
  cards: z
    .array(
      z.object({
        front: z.string().min(1).max(240),
        back: z.string().min(1).max(400),
      }),
    )
    .min(1)
    .max(6),
});

export const miniQuizBlockSchema = z.object({
  ...blockBase,
  type: z.literal("mini_quiz"),
  question: shortText,
  choices: z.array(z.string().min(1).max(200)).min(2).max(5),
  correctIndex: z.number().int().min(0),
  explanation: shortText.optional(),
});

export const activeRecallBlockSchema = z.object({
  ...blockBase,
  type: z.literal("active_recall"),
  prompt: shortText,
  expectedKeyPoints: z.array(z.string().min(1).max(160)).min(1).max(5),
  explanation: mediumText.optional(),
});

export const teachBackBlockSchema = z.object({
  ...blockBase,
  type: z.literal("teach_back"),
  prompt: shortText,
  rubricHints: z.array(z.string().min(1).max(160)).min(1).max(4),
});

export const summaryBlockSchema = z.object({
  ...blockBase,
  type: z.literal("summary"),
  points: z.array(z.string().min(1).max(200)).min(2).max(6),
});

export const exitTicketBlockSchema = z.object({
  ...blockBase,
  type: z.literal("exit_ticket"),
  prompt: shortText,
  successCriteria: z.array(z.string().min(1).max(160)).min(1).max(4),
});

export const lessonBlockSchema = z.discriminatedUnion("type", [
  hookBlockSchema,
  quickContextBlockSchema,
  coreExplanationBlockSchema,
  timelineBlockSchema,
  storyBlockSchema,
  exampleBlockSchema,
  visualComparisonBlockSchema,
  characterCardBlockSchema,
  authorCardBlockSchema,
  workCardBlockSchema,
  rememberThisBlockSchema,
  commonTrapBlockSchema,
  mnemonicBlockSchema,
  flashcardBurstBlockSchema,
  miniQuizBlockSchema,
  activeRecallBlockSchema,
  teachBackBlockSchema,
  summaryBlockSchema,
  exitTicketBlockSchema,
]);

export type LessonBlock = z.infer<typeof lessonBlockSchema>;

/** Blocks that require active student response (not passive reading). */
export const ACTIVE_BLOCK_TYPES: ReadonlySet<LessonBlockType> = new Set([
  "flashcard_burst",
  "mini_quiz",
  "active_recall",
  "teach_back",
  "exit_ticket",
]);

export function isActiveBlockType(type: LessonBlockType): boolean {
  return ACTIVE_BLOCK_TYPES.has(type);
}
