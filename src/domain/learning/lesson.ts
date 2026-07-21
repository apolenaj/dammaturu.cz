import { z } from "zod";
import {
  ACTIVE_BLOCK_TYPES,
  lessonBlockSchema,
  type LessonBlock,
} from "@/domain/learning/blocks";
import { publishStatusSchema } from "@/domain/content/schemas";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const lessonDocumentSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  topicId: z.string().uuid().nullable(),
  topicSlug: z.string().min(1).max(120),
  curriculumSlug: z.string().min(1).max(120),
  objective: z.string().min(1).max(400),
  estimatedMinutes: z.number().int().min(3).max(45),
  status: publishStatusSchema,
  knowledgeUnitIds: z.array(z.string().uuid()).default([]),
  blocks: z.array(lessonBlockSchema).min(3).max(24),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LessonDocument = z.infer<typeof lessonDocumentSchema>;

/**
 * A topic must never render as one long text blob.
 * Enforced at parse / seed time.
 */
export function assertLessonNotBlob(lesson: LessonDocument): void {
  const types = new Set(lesson.blocks.map((b) => b.type));
  if (types.size < 3) {
    throw new Error(
      `Lekce „${lesson.slug}“ musí mít ≥3 různé typy bloků (má ${types.size}).`,
    );
  }
  const hasActive = lesson.blocks.some((b) => ACTIVE_BLOCK_TYPES.has(b.type));
  if (!hasActive) {
    throw new Error(
      `Lekce „${lesson.slug}“ musí obsahovat aktivní blok (recall/quiz/flashcard/exit/teach-back).`,
    );
  }
  const passiveChars = lesson.blocks.reduce((sum, b) => sum + estimateChars(b), 0);
  if (passiveChars > 4500) {
    throw new Error(
      `Lekce „${lesson.slug}“ je příliš textově hustá (${passiveChars} znaků) — rozděl nebo zkrať.`,
    );
  }
  // Forbid a lone core_explanation dominating the lesson
  const coreOnly =
    lesson.blocks.length <= 2 &&
    lesson.blocks.every(
      (b) => b.type === "core_explanation" || b.type === "summary",
    );
  if (coreOnly) {
    throw new Error(
      `Lekce „${lesson.slug}“ nesmí být jen výkladový text.`,
    );
  }
}

function estimateChars(block: LessonBlock): number {
  switch (block.type) {
    case "hook":
      return block.prompt.length + (block.tease?.length ?? 0);
    case "quick_context":
      return block.bullets.join("").length;
    case "core_explanation":
      return (
        block.paragraphs.join("").length + (block.explanation?.length ?? 0)
      );
    case "timeline":
      return block.events.map((e) => e.label + e.detail).join("").length;
    case "story":
      return block.narrative.length;
    case "example":
      return block.setup.length + block.resolution.length;
    case "visual_comparison":
      return (
        block.leftPoints.join("").length + block.rightPoints.join("").length
      );
    case "character_card":
      return block.name.length + block.role.length + block.traits.join("").length;
    case "author_card":
      return block.name.length + (block.note?.length ?? 0);
    case "work_card":
      return block.title.length + (block.note?.length ?? 0);
    case "remember_this":
      return block.statement.length;
    case "common_trap":
      return block.trap.length + block.correction.length;
    case "mnemonic":
      return block.cue.length + (block.expansion?.length ?? 0);
    case "flashcard_burst":
      return block.cards.map((c) => c.front + c.back).join("").length;
    case "mini_quiz":
      return block.question.length;
    case "active_recall":
      return block.prompt.length;
    case "teach_back":
      return block.prompt.length;
    case "summary":
      return block.points.join("").length;
    case "exit_ticket":
      return block.prompt.length;
    default:
      return 0;
  }
}

export function parseLessonDocument(raw: unknown): LessonDocument {
  const lesson = lessonDocumentSchema.parse(raw);
  assertLessonNotBlob(lesson);
  return lesson;
}
