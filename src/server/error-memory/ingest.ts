import {
  classifyMistake,
  defaultWhyWrong,
  type MistakeClass,
} from "@/domain/learning/error-memory";
import { recordLearnerError } from "@/server/error-memory/store";

function slugifyKu(raw: string): string {
  const s = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return s.length > 0 ? s : "unknown-ku";
}

/**
 * Persist a real graded mistake. No-ops if answer is empty / not meaningful.
 * Never invents content — only stores what the caller observed.
 */
export async function ingestMeaningfulMistake(input: {
  learnerId: string;
  question: string;
  studentAnswer: string;
  correctConcept: string;
  knowledgeUnit: {
    id?: string;
    slug?: string;
    title: string;
  };
  source:
    | "mixed_review"
    | "question_engine"
    | "materials_study"
    | "grounded_study"
    | "manual";
  result?: "incorrect" | "partial" | "partially_correct";
  coverage?: number;
  whatWasWrong?: string[];
  whyWrong?: string;
  errorType?: MistakeClass;
  nowIso?: string;
  sourceLabel?: string | null;
  sourceExcerpt?: string | null;
  examValue?: number;
}): Promise<{ created: boolean } | null> {
  const question = input.question.trim().slice(0, 500);
  const studentAnswer = input.studentAnswer.trim().slice(0, 500);
  const correctConcept = input.correctConcept.trim().slice(0, 500);
  if (!question || !studentAnswer || !correctConcept) return null;

  const slug =
    input.knowledgeUnit.slug?.trim() ||
    slugifyKu(input.knowledgeUnit.id ?? input.knowledgeUnit.title);

  const errorType =
    input.errorType ??
    classifyMistake({
      question,
      studentAnswer,
      correctConcept,
      knowledgeSlug: slug,
      result: input.result,
      coverage: input.coverage,
      whatWasWrong: input.whatWasWrong,
    });

  const whyWrong =
    input.whyWrong?.trim().slice(0, 600) ||
    defaultWhyWrong({
      errorType,
      studentAnswer: studentAnswer.slice(0, 200),
      correctConcept: correctConcept.slice(0, 200),
    });

  const { created } = await recordLearnerError({
    learnerId: input.learnerId,
    question,
    studentAnswer,
    correctConcept,
    whyWrong,
    knowledgeUnit: {
      id: input.knowledgeUnit.id,
      slug,
      title: input.knowledgeUnit.title.slice(0, 160),
    },
    errorType,
    source: input.source,
    nowIso: input.nowIso,
    sourceLabel: input.sourceLabel ?? null,
    sourceExcerpt: input.sourceExcerpt ?? null,
    examValue: input.examValue,
  });
  return { created };
}

export { slugifyKu };
