import { z } from "zod";

/**
 * „Rychle pochopit“ — micro learning mode.
 * One idea + one example + one check per microblock.
 * No long-text scrolling sessions.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const shortLine = z.string().trim().min(1).max(220);
const exampleLine = z.string().trim().min(1).max(280);

export const microCheckSchema = z.object({
  question: shortLine,
  choices: z.array(z.string().trim().min(1).max(160)).min(2).max(4),
  correctIndex: z.number().int().min(0),
  explanation: z.string().trim().max(240).optional(),
});

export const microBlockSchema = z.object({
  type: z.literal("micro"),
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(120),
  /** Exactly one thought. */
  idea: shortLine,
  /** Exactly one example. */
  example: exampleLine,
  check: microCheckSchema,
  /** Target duration for this micro (2–5 min). */
  estimatedSeconds: z.number().int().min(90).max(300),
  knowledgeUnitIds: z.array(z.string().uuid()).default([]),
});

export const checkpointItemSchema = z.object({
  id: z.string().uuid(),
  prompt: shortLine,
  choices: z.array(z.string().trim().min(1).max(160)).min(2).max(4),
  correctIndex: z.number().int().min(0),
  explanation: z.string().trim().max(240).optional(),
});

export const retrievalCheckpointSchema = z.object({
  type: z.literal("checkpoint"),
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  /** Short retrieval burst — not a reading section. */
  items: z.array(checkpointItemSchema).min(2).max(4),
  estimatedSeconds: z.number().int().min(60).max(240),
  knowledgeUnitIds: z.array(z.string().uuid()).default([]),
});

export const quickGraspStepSchema = z.discriminatedUnion("type", [
  microBlockSchema,
  retrievalCheckpointSchema,
]);

export type MicroBlock = z.infer<typeof microBlockSchema>;
export type RetrievalCheckpoint = z.infer<typeof retrievalCheckpointSchema>;
export type QuickGraspStep = z.infer<typeof quickGraspStepSchema>;

export const quickGraspPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  topicSlug: z.string().min(1).max(120),
  curriculumSlug: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  /** Ordered sequence: micros + checkpoints after every 3–5 micros. */
  steps: z.array(quickGraspStepSchema).min(4).max(16),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type QuickGraspPack = z.infer<typeof quickGraspPackSchema>;

/** Progress + success metrics for mastery / analytics. */
export const quickGraspProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  currentStepIndex: z.number().int().min(0),
  completedStepIds: z.array(z.string().uuid()),
  /** Graded attempts: correct / total for success rate. */
  checksAnswered: z.number().int().min(0),
  checksCorrect: z.number().int().min(0),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

export type QuickGraspProgress = z.infer<typeof quickGraspProgressSchema>;

export function assertQuickGraspStructure(pack: QuickGraspPack): void {
  const micros = pack.steps.filter((s) => s.type === "micro");
  const checkpoints = pack.steps.filter((s) => s.type === "checkpoint");
  if (micros.length < 3) {
    throw new Error(`Pack ${pack.slug}: potřeba ≥3 mikrobloky.`);
  }
  if (checkpoints.length < 1) {
    throw new Error(`Pack ${pack.slug}: potřeba ≥1 retrieval checkpoint.`);
  }

  let microsSinceCheckpoint = 0;
  for (const step of pack.steps) {
    if (step.type === "micro") {
      microsSinceCheckpoint += 1;
      if (microsSinceCheckpoint > 5) {
        throw new Error(
          `Pack ${pack.slug}: více než 5 mikrobloků bez checkpointu.`,
        );
      }
    } else {
      if (microsSinceCheckpoint < 3 || microsSinceCheckpoint > 5) {
        throw new Error(
          `Pack ${pack.slug}: checkpoint musí přijít po 3–5 mikroblocích (bylo ${microsSinceCheckpoint}).`,
        );
      }
      microsSinceCheckpoint = 0;
    }
  }

  // Forbid oversized idea/example already via schema; also sum duration
  const totalMin = pack.steps.reduce((s, st) => s + st.estimatedSeconds, 0) / 60;
  if (totalMin > 40) {
    throw new Error(`Pack ${pack.slug}: příliš dlouhý (~${totalMin} min).`);
  }
}

export function parseQuickGraspPack(raw: unknown): QuickGraspPack {
  const pack = quickGraspPackSchema.parse(raw);
  assertQuickGraspStructure(pack);
  return pack;
}

export function computeQuickGraspStats(
  pack: QuickGraspPack,
  progress: QuickGraspProgress | null,
): {
  completedSteps: number;
  totalSteps: number;
  remainingMinutes: number;
  successRate: number | null;
  label: string;
  remainingLabel: string;
} {
  const totalSteps = pack.steps.length;
  const completedSteps = progress?.completedStepIds.length ?? 0;
  const current = progress?.currentStepIndex ?? 0;
  const remainingSeconds = pack.steps
    .slice(Math.min(current, totalSteps))
    .reduce((sum, s) => sum + s.estimatedSeconds, 0);
  const remainingMinutes = Math.max(1, Math.round(remainingSeconds / 60));
  const successRate =
    progress && progress.checksAnswered > 0
      ? progress.checksCorrect / progress.checksAnswered
      : null;

  return {
    completedSteps: Math.min(completedSteps, totalSteps),
    totalSteps,
    remainingMinutes,
    successRate,
    label: `${Math.min(completedSteps, totalSteps)}/${totalSteps} bloků`,
    remainingLabel: `≈ ${remainingMinutes} min zbývá`,
  };
}
