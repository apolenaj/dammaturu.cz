import {
  generatedQuestionSchema,
  questionDifficultyBands,
  type GeneratedQuestion,
  type GeneratedQuestionKind,
  type QuestionDifficultyBand,
  type QuestionGenerationResult,
  type VerifiedKnowledgeUnitInput,
} from "@/domain/learning/question-generation";
import { engineQuestionSchema } from "@/domain/learning/question-engine";
import { GENERATORS } from "@/server/question-engine/generate/generators";
import {
  isStatementGrounded,
  stemSimilarity,
} from "@/server/question-engine/generate/support";

export type GenerateQuestionsOptions = {
  /** Which generation kinds to emit (default: all). */
  kinds?: GeneratedQuestionKind[];
  /** Difficulty bands to generate (default: all). */
  difficulties?: QuestionDifficultyBand[];
  /** Max questions total. */
  maxQuestions?: number;
  /** Max questions per knowledge unit. */
  maxPerUnit?: number;
  /** Drop stems more similar than this to an existing one (0–1). */
  stemSimilarityThreshold?: number;
};

function validateDraft(q: GeneratedQuestion): string | null {
  const parsed = generatedQuestionSchema.safeParse(q);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "invalid";
  if (q.engineQuestion) {
    const eq = engineQuestionSchema.safeParse(q.engineQuestion);
    if (!eq.success) return eq.error.issues[0]?.message ?? "invalid engine";
  }
  if (q.generationKind === "flashcard" && !q.flashcard) {
    return "flashcard payload missing";
  }
  if (q.generationKind !== "flashcard" && !q.engineQuestion) {
    return "engine question missing";
  }
  // Answer support already enforced in generators; double-check KU ids
  if (!q.knowledgeUnitIds.length) return "missing KU ids";
  if (!q.sourceEvidence.quote.trim()) return "missing source evidence";
  return null;
}

/**
 * Production Question Generation Engine.
 * Input: verified KnowledgeUnits only. Output: questions with rubric + evidence.
 */
export function generateQuestionsFromKnowledgeUnits(
  units: VerifiedKnowledgeUnitInput[],
  opts: GenerateQuestionsOptions = {},
): QuestionGenerationResult {
  const kinds = new Set(opts.kinds ?? GENERATORS.map((g) => g.kind));
  const difficulties = opts.difficulties ?? [...questionDifficultyBands];
  const maxQuestions = opts.maxQuestions ?? 60;
  const maxPerUnit = opts.maxPerUnit ?? 4;
  const simThreshold = opts.stemSimilarityThreshold ?? 0.82;

  const skipped: QuestionGenerationResult["skipped"] = [];
  const eligible: VerifiedKnowledgeUnitInput[] = [];

  for (const unit of units) {
    if (
      unit.verification !== "verified_from_source" &&
      unit.verification !== "corrected" &&
      unit.verification !== "source_grounded"
    ) {
      skipped.push({
        knowledgeUnitId: unit.id,
        reason: "KU nemá ověřený ani source-grounded status.",
      });
      continue;
    }
    if (!unit.sourceEvidence.quote.trim()) {
      skipped.push({
        knowledgeUnitId: unit.id,
        reason: "Chybí source evidence quote.",
      });
      continue;
    }
    if (!isStatementGrounded(unit.statement, unit.sourceEvidence)) {
      skipped.push({
        knowledgeUnitId: unit.id,
        reason: "Statement není podložený source quote — přeskočeno.",
      });
      continue;
    }
    eligible.push(unit);
  }

  const emitted: GeneratedQuestion[] = [];
  const fingerprints = new Set<string>();
  let duplicatesRemoved = 0;
  let unsupportedRejected = 0;
  const perUnitCount = new Map<string, number>();

  const generators = GENERATORS.filter((g) => kinds.has(g.kind));

  for (const band of difficulties) {
    for (const unit of eligible) {
      if (emitted.length >= maxQuestions) break;
      for (const gen of generators) {
        if (emitted.length >= maxQuestions) break;
        const count = perUnitCount.get(unit.id) ?? 0;
        if (count >= maxPerUnit) continue;

        const draft = gen.run({ unit, pool: eligible, band });
        if (!draft) continue;

        const question: GeneratedQuestion = {
          ...draft,
          id: draft.id ?? cryptoRandom(),
        };

        const err = validateDraft(question);
        if (err) {
          unsupportedRejected += 1;
          skipped.push({
            knowledgeUnitId: unit.id,
            reason: `Generátor ${gen.kind}: ${err}`,
          });
          continue;
        }

        if (fingerprints.has(question.fingerprint)) {
          duplicatesRemoved += 1;
          continue;
        }

        const stem =
          question.engineQuestion?.stem ?? question.flashcard?.front ?? "";
        const tooSimilar = emitted.some((e) => {
          if (e.generationKind !== question.generationKind) return false;
          const other =
            e.engineQuestion?.stem ?? e.flashcard?.front ?? "";
          return stemSimilarity(stem, other) >= simThreshold;
        });
        if (tooSimilar) {
          duplicatesRemoved += 1;
          continue;
        }

        fingerprints.add(question.fingerprint);
        emitted.push(question);
        perUnitCount.set(unit.id, count + 1);
      }
    }
  }

  const byKind: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  for (const q of emitted) {
    byKind[q.generationKind] = (byKind[q.generationKind] ?? 0) + 1;
    byDifficulty[q.difficultyBand] =
      (byDifficulty[q.difficultyBand] ?? 0) + 1;
  }

  return {
    questions: emitted,
    skipped,
    stats: {
      inputUnits: units.length,
      emitted: emitted.length,
      duplicatesRemoved,
      unsupportedRejected,
      byKind,
      byDifficulty,
    },
    generatedAt: new Date().toISOString(),
  };
}

function cryptoRandom(): string {
  return globalThis.crypto?.randomUUID?.() ??
    "00000000-0000-4000-8000-000000000000";
}
