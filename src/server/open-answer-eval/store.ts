import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  openAnswerEvaluationSchema,
  type OpenAnswerEvaluation,
} from "@/domain/learning/open-answer-eval";
import { assertSafeId } from "@/server/safe-id";

const ROOT = path.join(process.cwd(), "data", "open-answer-evals");

export const openAnswerEvalRecordSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  at: z.string().datetime(),
  source: z.enum([
    "question_engine",
    "grounded_study",
    "materials_study_session",
    "active_recall",
    "other",
  ]),
  packSlug: z.string().max(120).nullable(),
  questionId: z.string().uuid().nullable(),
  knowledgeUnitIds: z.array(z.string().min(1).max(120)).max(8),
  studentAnswer: z.string().max(4000),
  evaluation: openAnswerEvaluationSchema,
  /** Difficulty used when applying mastery. */
  difficulty: z.number().int().min(1).max(5).default(3),
});

export type OpenAnswerEvalRecord = z.infer<typeof openAnswerEvalRecordSchema>;

function learnerDir(learnerId: string): string {
  return path.join(ROOT, assertSafeId(learnerId, "learner id"));
}

/**
 * Persist open-answer evaluation for mastery / analytics.
 */
export async function storeOpenAnswerEvaluation(input: {
  learnerId: string;
  source: OpenAnswerEvalRecord["source"];
  packSlug?: string | null;
  questionId?: string | null;
  knowledgeUnitIds: string[];
  studentAnswer: string;
  evaluation: OpenAnswerEvaluation;
  difficulty?: number;
}): Promise<OpenAnswerEvalRecord> {
  const learnerId = assertSafeId(input.learnerId, "learner id");
  const dir = learnerDir(learnerId);
  await fs.mkdir(dir, { recursive: true });

  const record = openAnswerEvalRecordSchema.parse({
    id: randomUUID(),
    learnerId,
    at: new Date().toISOString(),
    source: input.source,
    packSlug: input.packSlug ?? null,
    questionId: input.questionId ?? null,
    knowledgeUnitIds: input.knowledgeUnitIds.slice(0, 8),
    studentAnswer: input.studentAnswer.slice(0, 4000),
    evaluation: input.evaluation,
    difficulty: input.difficulty ?? 3,
  });

  const file = path.join(dir, `${record.id}.json`);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);

  // Append to index for chronological mastery replay
  const indexPath = path.join(dir, "index.jsonl");
  await fs.appendFile(
    indexPath,
    `${JSON.stringify({
      id: record.id,
      at: record.at,
      result: record.evaluation.result,
      masteryCorrectness: record.evaluation.masteryCorrectness,
      knowledgeUnitIds: record.knowledgeUnitIds,
      source: record.source,
    })}\n`,
    "utf8",
  );

  return record;
}
