"use server";

import {
  buildTestingSession,
  buildTestingSessionSummary,
  gradeTestingAnswer,
  testingModes,
  testingModeLabelsCs,
  testingQuestionSchema,
  type TestingAttemptRecord,
  type TestingGradeResult,
  type TestingMode,
  type TestingSession,
  type TestingSessionSummary,
  type ValidatedTestQuestion,
} from "@/domain/learning/testing-engine";
import { listCatalogMaterials } from "@/server/study-content/registry";
import { getStudyContentEntry } from "@/server/study-content/registry";
import { listLearnerMaterials, getLearnerMaterial } from "@/server/learner-materials/store";
import { getOrCreateErrorBook } from "@/server/error-memory/store";
import { getReadinessBook } from "@/server/readiness/store";
import { buildTestingPool } from "@/server/testing-engine/build-pool";
import { applyLearningSessionSchedule } from "@/server/learning-session/schedule-store";
import { recordReadinessPractice } from "@/server/readiness/record-practice";
import { resolveLearnerIdForAction } from "@/server/viewer-session";

async function loadPool(learnerId: string) {
  const [catalogList, materialList, errorBook, readinessBook] = await Promise.all([
    listCatalogMaterials({ subjectSlug: "cjl" }),
    listLearnerMaterials(learnerId),
    getOrCreateErrorBook(learnerId),
    getReadinessBook(learnerId),
  ]);

  const entries = (
    await Promise.all(
      catalogList.map((m) => getStudyContentEntry(m.sourceId)),
    )
  ).filter((e): e is NonNullable<typeof e> => Boolean(e));

  const materials = (
    await Promise.all(
      materialList.map((m) => getLearnerMaterial(learnerId, m.id)),
    )
  ).filter((m): m is NonNullable<typeof m> => Boolean(m));

  return buildTestingPool({
    catalog: entries,
    materials,
    errorBook,
    readinessBook,
  });
}

export async function listTestingModesAction(): Promise<{
  modes: Array<{
    id: TestingMode;
    label: string;
    description: string;
  }>;
  topics: string[];
  poolSize: number;
}> {
  const learnerId = await resolveLearnerIdForAction();
  if (!learnerId) {
    return {
      modes: testingModes.map((id) => ({
        id,
        label: testingModeLabelsCs[id],
        description: "",
      })),
      topics: [],
      poolSize: 0,
    };
  }
  const pool = await loadPool(learnerId);
  const topics = [...new Set(pool.map((a) => a.topic))].sort();
  const { testingModeDescriptionsCs } = await import(
    "@/domain/learning/testing-engine"
  );
  return {
    modes: testingModes.map((id) => ({
      id,
      label: testingModeLabelsCs[id],
      description: testingModeDescriptionsCs[id],
    })),
    topics,
    poolSize: pool.filter(
      (a) => a.statement.length >= 12 && a.sourceExcerpt.length >= 40,
    ).length,
  };
}

export async function startTestingSessionAction(input: {
  mode: TestingMode;
  topicFilter?: string | null;
}): Promise<
  | { ok: true; session: TestingSession }
  | { ok: false; error: string }
> {
  try {
    const learnerId = await resolveLearnerIdForAction();
    if (!learnerId) {
      return { ok: false, error: "Chybí studijní session." };
    }
    if (!testingModes.includes(input.mode)) {
      return { ok: false, error: "Neplatný režim testu." };
    }

    const pool = await loadPool(learnerId);
    const session = buildTestingSession({
      learnerId,
      mode: input.mode,
      pool,
      topicFilter: input.topicFilter,
    });

    if (!session) {
      const emptyByMode: Record<TestingMode, string> = {
        quick_5:
          "Zatím nemáme dost ověřených otázek. Otevři materiál a nejdřív se uč ze zdroje.",
        ten: "Zatím nemáme dost ověřených otázek pro 10 otázek.",
        twenty: "Zatím nemáme dost ověřených otázek pro 20 otázek.",
        mistakes_only:
          "Zatím nemáš zaznamenané chyby k procvičení. Nejdřív absolvuj krátký test.",
        single_topic:
          "Pro zvolené téma zatím nejsou ověřené otázky.",
        topic_mix: "Zatím nemáme ověřené otázky napříč tématy.",
        weakest:
          "Zatím nemáme dost evidence o slabinách. Zkus nejdřív Rychlých 5.",
        materials_exam:
          "V nahraných materiálech zatím nejsou ověřené jednotky ke zkoušce.",
      };
      return { ok: false, error: emptyByMode[input.mode] };
    }

    return { ok: true, session };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Nepovedlo se sestavit test.",
    };
  }
}

export async function submitTestingAnswerAction(input: {
  question: ValidatedTestQuestion;
  studentAnswer: string;
}): Promise<
  | { ok: true; grade: TestingGradeResult }
  | { ok: false; error: string }
> {
  try {
    const learnerId = await resolveLearnerIdForAction();
    if (!learnerId) {
      return { ok: false, error: "Chybí studijní session." };
    }

    const parsed = testingQuestionSchema.safeParse(input.question);
    if (!parsed.success) {
      return { ok: false, error: "Neplatná otázka — chybí validovaná odpověď." };
    }
    if (!parsed.data.validatedAnswer.canonical.trim()) {
      return { ok: false, error: "Otázka nemá validovanou odpověď." };
    }

    const question = parsed.data as ValidatedTestQuestion;
    const grade = gradeTestingAnswer({
      question,
      rawAnswer: input.studentAnswer,
    });

    // Schedule review — correct answers stay in rotation (SM-2 still schedules).
    await applyLearningSessionSchedule({
      learnerId,
      atomId: question.knowledgeUnitId,
      grade: grade.reviewGrade,
    });

    await recordReadinessPractice({
      learnerId,
      units: [
        {
          id: question.knowledgeUnitId,
          title: question.topic,
        },
      ],
      correctness: grade.result,
      kind: "practice",
      difficulty: question.difficulty,
    });

    if (grade.result === "incorrect" || grade.result === "partial") {
      const { ingestMeaningfulMistake } = await import(
        "@/server/error-memory/ingest"
      );
      await ingestMeaningfulMistake({
        learnerId,
        question: question.stem.slice(0, 500),
        studentAnswer: input.studentAnswer.slice(0, 500) || "—",
        correctConcept: question.validatedAnswer.canonical.slice(0, 500),
        knowledgeUnit: {
          id: question.knowledgeUnitId,
          title: question.topic.slice(0, 160),
        },
        source: "question_engine",
        result: grade.result === "partial" ? "partial" : "incorrect",
        coverage: grade.coverage,
        whatWasWrong: grade.whatWasWrong,
        whyWrong: grade.correctiveFeedback.slice(0, 600),
        sourceLabel: question.provenance.sourceTitle,
        sourceExcerpt: question.provenance.excerpt.slice(0, 900),
        examValue: Math.min(5, Math.max(1, question.difficulty)),
      });
    }

    return { ok: true, grade };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Hodnocení selhalo.",
    };
  }
}

export async function summarizeTestingSessionAction(input: {
  mode: TestingMode;
  attempts: TestingAttemptRecord[];
}): Promise<{ ok: true; summary: TestingSessionSummary }> {
  return {
    ok: true,
    summary: buildTestingSessionSummary({
      mode: input.mode,
      attempts: input.attempts,
    }),
  };
}
