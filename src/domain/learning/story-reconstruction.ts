import { z } from "zod";

/**
 * Story Reconstruction — reorder plot beats (D-028).
 * Every step is source-backed (Content QA verified_from_source).
 * Difficulties: easy 4 · medium 6 · hard 8+.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const reconstructionDifficulties = ["easy", "medium", "hard"] as const;
export type ReconstructionDifficulty =
  (typeof reconstructionDifficulties)[number];

export const reconstructionDifficultySchema = z.enum(
  reconstructionDifficulties,
);

/** How many ordered steps each difficulty uses (prefix of story steps). */
export const difficultyStepCounts: Record<ReconstructionDifficulty, number> = {
  easy: 4,
  medium: 6,
  hard: 8,
};

export const reconstructionEvidenceSchema = z.object({
  qaItemId: z.string().min(1),
  knowledgeUnitId: z.string().min(1),
  publishedStatement: z.string().min(1).max(4000),
  validationStatus: z.enum(["verified_from_source", "corrected"]),
  filename: z.string().min(1).max(260),
});

export type StoryReconstructionEvidence = z.infer<
  typeof reconstructionEvidenceSchema
>;

export const reconstructionStepSchema = z.object({
  id: z.string().uuid(),
  /** 0-based canonical plot order. */
  order: z.number().int().min(0).max(24),
  /** Short student-facing beat (must appear in evidence statement). */
  label: z.string().min(1).max(280),
  evidenceId: z.string().min(1).max(80),
});

export type ReconstructionStep = z.infer<typeof reconstructionStepSchema>;

export const reconstructionStorySchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(160),
  workTitle: z.string().min(1).max(160),
  author: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  /** Full ordered plot chain (hard uses ≥8). */
  steps: z.array(reconstructionStepSchema).min(4).max(16),
});

export type ReconstructionStory = z.infer<typeof reconstructionStorySchema>;

export const storyReconstructionPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  requiresVerifiedOnly: z.literal(true),
  stories: z.array(reconstructionStorySchema).min(3).max(40),
  evidence: z.record(z.string(), reconstructionEvidenceSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type StoryReconstructionPack = z.infer<
  typeof storyReconstructionPackSchema
>;

export const reconstructionAttemptSchema = z.object({
  storyId: z.string().uuid(),
  difficulty: reconstructionDifficultySchema,
  submittedOrder: z.array(z.string().uuid()),
  correct: z.boolean(),
  elapsedMs: z.number().int().min(0).max(600_000),
  at: z.string().datetime(),
});

export type ReconstructionAttempt = z.infer<typeof reconstructionAttemptSchema>;

export const reconstructionProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  attempts: z.array(reconstructionAttemptSchema),
  /** storyId → highest difficulty cleared. */
  cleared: z.record(z.string(), reconstructionDifficultySchema),
  updatedAt: z.string().datetime(),
});

export type ReconstructionProgress = z.infer<
  typeof reconstructionProgressSchema
>;

export const difficultyLabelsCs: Record<ReconstructionDifficulty, string> = {
  easy: "Easy · 4 kroky",
  medium: "Medium · 6 kroků",
  hard: "Hard · 8+ kroků",
};

export function parseStoryReconstructionPack(
  raw: unknown,
): StoryReconstructionPack {
  const pack = storyReconstructionPackSchema.parse(raw);
  const storySlugs = new Set<string>();
  for (const story of pack.stories) {
    if (storySlugs.has(story.slug)) {
      throw new Error(`Duplicitní story slug: ${story.slug}`);
    }
    storySlugs.add(story.slug);
    const orders = story.steps.map((s) => s.order);
    const sorted = [...orders].sort((a, b) => a - b);
    if (orders.join(",") !== sorted.join(",")) {
      throw new Error(`Story ${story.slug}: steps must be ascending by order`);
    }
    for (let i = 0; i < story.steps.length; i += 1) {
      if (story.steps[i]!.order !== i) {
        throw new Error(`Story ${story.slug}: order must be contiguous from 0`);
      }
    }
    for (const step of story.steps) {
      const evidence = pack.evidence[step.evidenceId];
      if (!evidence) {
        throw new Error(
          `Story ${story.slug}: missing evidence ${step.evidenceId}`,
        );
      }
      const normLabel = step.label.replace(/\s+/g, " ").trim();
      const normSrc = evidence.publishedStatement.replace(/\s+/g, " ").trim();
      if (!normSrc.includes(normLabel)) {
        throw new Error(
          `Story ${story.slug} step ${step.order}: label not in SOURCE evidence`,
        );
      }
    }
  }
  return pack;
}

export function stepsForDifficulty(
  story: ReconstructionStory,
  difficulty: ReconstructionDifficulty,
): ReconstructionStep[] {
  const n = difficultyStepCounts[difficulty];
  if (story.steps.length < n) {
    throw new Error(
      `Story ${story.slug} má jen ${story.steps.length} kroků, ${difficulty} vyžaduje ${n}`,
    );
  }
  // hard: use all steps if more than 8
  if (difficulty === "hard") {
    return story.steps.slice(0);
  }
  return story.steps.slice(0, n);
}

export function availableDifficulties(
  story: ReconstructionStory,
): ReconstructionDifficulty[] {
  return reconstructionDifficulties.filter(
    (d) => story.steps.length >= difficultyStepCounts[d],
  );
}

export function isCorrectOrder(
  submittedIds: string[],
  correctIds: string[],
): boolean {
  if (submittedIds.length !== correctIds.length) return false;
  return submittedIds.every((id, i) => id === correctIds[i]);
}

export function shuffleIds(ids: string[]): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Ensure shuffle is not accidentally correct (retry a few times). */
export function shuffleStepsNotCorrect(ids: string[]): string[] {
  if (ids.length < 2) return [...ids];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shuffled = shuffleIds(ids);
    if (!isCorrectOrder(shuffled, ids)) return shuffled;
  }
  // deterministic swap
  const forced = [...ids];
  [forced[0], forced[1]] = [forced[1]!, forced[0]!];
  return forced;
}

export function emptyReconstructionProgress(
  learnerId: string,
  pack: StoryReconstructionPack,
  nowIso: string,
): ReconstructionProgress {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    attempts: [],
    cleared: {},
    updatedAt: nowIso,
  };
}

const difficultyRank: Record<ReconstructionDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export function applyReconstructionAttempt(
  progress: ReconstructionProgress,
  attempt: ReconstructionAttempt,
  nowIso: string,
): ReconstructionProgress {
  const prev = progress.cleared[attempt.storyId];
  let cleared = progress.cleared;
  if (attempt.correct) {
    if (
      !prev ||
      difficultyRank[attempt.difficulty] > difficultyRank[prev]
    ) {
      cleared = { ...cleared, [attempt.storyId]: attempt.difficulty };
    }
  }
  return {
    ...progress,
    attempts: [...progress.attempts, attempt],
    cleared,
    updatedAt: nowIso,
  };
}

export type AxisPoint = {
  order: number;
  label: string;
  evidenceExcerpt: string;
  filename: string;
};

/** Visual plot axis after successful reconstruction. */
export function buildPlotAxis(
  pack: StoryReconstructionPack,
  story: ReconstructionStory,
  difficulty: ReconstructionDifficulty,
): AxisPoint[] {
  const steps = stepsForDifficulty(story, difficulty);
  return steps.map((step) => {
    const evidence = pack.evidence[step.evidenceId]!;
    return {
      order: step.order,
      label: step.label,
      evidenceExcerpt: evidence.publishedStatement.slice(0, 220),
      filename: evidence.filename,
    };
  });
}

export function gradeReconstruction(input: {
  pack: StoryReconstructionPack;
  storyId: string;
  difficulty: ReconstructionDifficulty;
  submittedOrder: string[];
}): {
  correct: boolean;
  story: ReconstructionStory;
  expectedOrder: string[];
  axis: AxisPoint[] | null;
} | null {
  const story = input.pack.stories.find((s) => s.id === input.storyId);
  if (!story) return null;
  if (!availableDifficulties(story).includes(input.difficulty)) return null;
  const expected = stepsForDifficulty(story, input.difficulty).map((s) => s.id);
  const correct = isCorrectOrder(input.submittedOrder, expected);
  return {
    correct,
    story,
    expectedOrder: expected,
    axis: correct
      ? buildPlotAxis(input.pack, story, input.difficulty)
      : null,
  };
}
