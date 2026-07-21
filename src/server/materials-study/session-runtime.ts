import { evaluateOpenAnswer } from "@/domain/learning/open-answer-eval";
import {
  estimateRetention,
  masteryToReviewGrade,
  materialsSessionAttemptSchema,
  materialsSessionSummarySchema,
  type MaterialsSession,
  type MaterialsSessionAttempt,
  type MaterialsSessionItem,
  type MaterialsSessionSummary,
} from "@/domain/learning/materials-study-session";
import { emptyMasteryState } from "@/domain/learning/mastery-engine";
import { getReadinessBook } from "@/server/readiness/store";
import { recordReadinessPractice } from "@/server/readiness/record-practice";
import { storeOpenAnswerEvaluation } from "@/server/open-answer-eval/store";
import { applyMaterialsReviewSchedule } from "@/server/materials-study/schedule-store";

const KIND_DIFFICULTY: Record<MaterialsSessionItem["kind"], number> = {
  recall: 3,
  short_answer: 3,
  flashcard: 2,
  explanation: 4,
  retrieval: 4,
};

export type MaterialsSessionGradeResult = {
  attempt: MaterialsSessionAttempt;
  feedback: string;
  idealAnswer: string;
  whatWasCorrect: string[];
  whatWasMissing: string[];
  whatWasWrong: string[];
  scheduledDueAt: string | null;
};

function flashcardToCorrectness(
  grade: "dont_know" | "almost" | "know",
): "correct" | "partial" | "incorrect" {
  if (grade === "know") return "correct";
  if (grade === "almost") return "partial";
  return "incorrect";
}

/**
 * Evaluate one session item, update mastery + SM-2 schedule.
 */
export async function gradeMaterialsSessionItem(params: {
  learnerId: string;
  item: MaterialsSessionItem;
  studentAnswer: string;
  flashcardGrade?: "dont_know" | "almost" | "know";
}): Promise<MaterialsSessionGradeResult> {
  const now = new Date().toISOString();
  const primaryKu = params.item.knowledgeUnitIds[0]!;
  const citation = params.item.citations[0]!;

  let result: "correct" | "partial" | "incorrect";
  let coverage: number;
  let whatWasCorrect: string[] = [];
  let whatWasMissing: string[] = [];
  let whatWasWrong: string[] = [];
  let openEvaluation: MaterialsSessionAttempt["openEvaluation"];
  let flashcardGrade = params.flashcardGrade;

  if (params.item.kind === "flashcard") {
    const grade = params.flashcardGrade ?? "dont_know";
    flashcardGrade = grade;
    result = flashcardToCorrectness(grade);
    coverage = result === "correct" ? 1 : result === "partial" ? 0.5 : 0;
    whatWasCorrect =
      result !== "incorrect" ? [params.item.idealAnswer.slice(0, 200)] : [];
    whatWasMissing =
      result === "incorrect" ? ["Vybavení karty"] : [];
  } else {
    const evaluation = evaluateOpenAnswer({
      studentAnswer: params.studentAnswer,
      keyIdeas: params.item.keyIdeas,
      idealAnswer: params.item.idealAnswer,
      sourceEvidence: {
        quote: citation.sourceText,
        sourceLabel: citation.documentTitle,
        pageStart: citation.pageStart,
        pageEnd: citation.pageEnd,
      },
    });
    openEvaluation = evaluation;
    result = evaluation.masteryCorrectness;
    coverage = evaluation.coverage;
    whatWasCorrect = evaluation.whatWasCorrect;
    whatWasMissing = evaluation.whatWasMissing;
    whatWasWrong = evaluation.whatWasWrong;

    await storeOpenAnswerEvaluation({
      learnerId: params.learnerId,
      source: "materials_study_session",
      questionId: params.item.id,
      knowledgeUnitIds: params.item.knowledgeUnitIds,
      studentAnswer: params.studentAnswer,
      evaluation,
      difficulty: KIND_DIFFICULTY[params.item.kind],
    });
  }

  await recordReadinessPractice({
    learnerId: params.learnerId,
    units: params.item.knowledgeUnitIds.map((id) => ({
      id,
      title: params.item.topic ?? params.item.prompt.slice(0, 80),
    })),
    correctness: result,
    kind: params.item.kind === "flashcard" ? "self_grade" : "practice",
    difficulty: KIND_DIFFICULTY[params.item.kind],
  });

  if (result === "incorrect" || result === "partial") {
    const { ingestMeaningfulMistake } = await import(
      "@/server/error-memory/ingest"
    );
    await ingestMeaningfulMistake({
      learnerId: params.learnerId,
      question: params.item.prompt,
      studentAnswer:
        params.item.kind === "flashcard"
          ? `self-grade:${params.flashcardGrade ?? "dont_know"}`
          : params.studentAnswer,
      correctConcept: params.item.idealAnswer,
      knowledgeUnit: {
        id: primaryKu,
        title: params.item.topic ?? params.item.prompt.slice(0, 80),
      },
      source: "materials_study",
      result,
      coverage,
      whatWasWrong,
      whyWrong: openEvaluation
        ? [
            openEvaluation.whatWasMissing.length
              ? `Chybí: ${openEvaluation.whatWasMissing.slice(0, 3).join(", ")}`
              : "",
            openEvaluation.whatWasWrong.slice(0, 2).join(" "),
          ]
            .filter(Boolean)
            .join(" ")
            .slice(0, 600) || undefined
        : undefined,
    });
  }

  // Schedule review when not fully correct, or always update SM-2.
  const reviewGrade = masteryToReviewGrade(result);
  const { dueAt } = await applyMaterialsReviewSchedule({
    learnerId: params.learnerId,
    knowledgeUnitId: primaryKu,
    grade: reviewGrade,
    nowIso: now,
  });

  const attempt = materialsSessionAttemptSchema.parse({
    itemId: params.item.id,
    kind: params.item.kind,
    studentAnswer: params.studentAnswer.slice(0, 4000),
    result,
    coverage,
    openEvaluation,
    flashcardGrade,
    scheduledDueAt: dueAt,
    at: now,
  });

  const feedbackParts = [
    result === "correct"
      ? "Správně — sedí ke zdroji."
      : result === "partial"
        ? "Částečně správně — doplň chybějící body."
        : "Nesprávně — podívej se na ideální odpověď ze zdroje.",
    whatWasCorrect.length
      ? `Správně: ${whatWasCorrect.slice(0, 4).join(", ")}.`
      : "",
    whatWasMissing.length
      ? `Chybí: ${whatWasMissing.slice(0, 4).join(", ")}.`
      : "",
    whatWasWrong.length ? whatWasWrong.slice(0, 2).join(" ") : "",
    dueAt
      ? `Další opakování naplánováno: ${new Date(dueAt).toLocaleDateString("cs-CZ")}.`
      : "",
  ].filter(Boolean);

  return {
    attempt,
    feedback: feedbackParts.join(" "),
    idealAnswer: params.item.idealAnswer,
    whatWasCorrect,
    whatWasMissing,
    whatWasWrong,
    scheduledDueAt: dueAt,
  };
}

export async function buildMaterialsSessionSummary(params: {
  session: MaterialsSession;
  attempts: MaterialsSessionAttempt[];
}): Promise<MaterialsSessionSummary> {
  const now = new Date().toISOString();
  const book = await getReadinessBook(params.session.learnerId);
  const scoreAfter = new Map<string, number>();
  const titleById = new Map<string, string>();

  for (const unit of book?.units ?? []) {
    scoreAfter.set(unit.id, unit.state.score);
    titleById.set(unit.id, unit.title);
  }

  const kuIds = new Set<string>();
  for (const item of params.session.items) {
    for (const id of item.knowledgeUnitIds) kuIds.add(id);
  }

  const whatImproved: MaterialsSessionSummary["whatImproved"] = [];
  const whatRemainsWeak: MaterialsSessionSummary["whatRemainsWeak"] = [];

  for (const kuId of kuIds) {
    const before = params.session.masteryBefore[kuId] ?? 0;
    const after = scoreAfter.get(kuId) ?? before;
    const title =
      titleById.get(kuId) ??
      params.session.items.find((i) => i.knowledgeUnitIds.includes(kuId))
        ?.topic ??
      kuId.slice(0, 8);
    const delta = Math.round((after - before) * 10) / 10;
    if (delta > 0.5) {
      whatImproved.push({
        knowledgeUnitId: kuId,
        title,
        scoreBefore: before,
        scoreAfter: after,
        delta,
      });
    }
    const unitState =
      book?.units.find((u) => u.id === kuId)?.state ??
      emptyMasteryState(kuId, now);
    const band = unitState.band;
    if (
      after < 55 ||
      band === "learning" ||
      band === "introduced" ||
      band === "not_seen" ||
      band === "at_risk"
    ) {
      whatRemainsWeak.push({
        knowledgeUnitId: kuId,
        title,
        score: after,
        band,
      });
    }
  }

  whatImproved.sort((a, b) => b.delta - a.delta);
  whatRemainsWeak.sort((a, b) => a.score - b.score);

  const whatShouldBeRepeated: MaterialsSessionSummary["whatShouldBeRepeated"] =
    [];
  for (const attempt of params.attempts) {
    if (attempt.result === "correct") continue;
    const item = params.session.items.find((i) => i.id === attempt.itemId);
    if (!item) continue;
    whatShouldBeRepeated.push({
      itemId: item.id,
      prompt: item.prompt,
      kind: item.kind,
      topic: item.topic,
    });
  }

  const correctCount = params.attempts.filter((a) => a.result === "correct")
    .length;
  const partialCount = params.attempts.filter((a) => a.result === "partial")
    .length;
  const incorrectCount = params.attempts.filter(
    (a) => a.result === "incorrect",
  ).length;
  const n = Math.max(params.attempts.length, 1);
  const accuracy = (correctCount + 0.5 * partialCount) / n;

  const intervals = params.attempts
    .map((a) => a.scheduledDueAt)
    .filter((d): d is string => Boolean(d))
    .map((d) => {
      const ms = new Date(d).getTime() - Date.now();
      return Math.max(0, ms / (1000 * 60 * 60 * 24));
    });
  const meanIntervalDays =
    intervals.length > 0
      ? intervals.reduce((s, x) => s + x, 0) / intervals.length
      : 1;

  const retention = estimateRetention({ accuracy, meanIntervalDays });
  const nextReviewAt =
    params.attempts
      .map((a) => a.scheduledDueAt)
      .filter((d): d is string => Boolean(d))
      .sort()[0] ?? null;

  return materialsSessionSummarySchema.parse({
    sessionId: params.session.id,
    attemptCount: params.attempts.length,
    correctCount,
    partialCount,
    incorrectCount,
    whatImproved: whatImproved.slice(0, 12),
    whatRemainsWeak: whatRemainsWeak.slice(0, 12),
    whatShouldBeRepeated: whatShouldBeRepeated.slice(0, 16),
    estimatedRetention: retention.value,
    estimatedRetentionLabelCs: retention.labelCs,
    nextReviewAt,
    finishedAt: now,
  });
}

export async function snapshotMasteryScores(
  learnerId: string,
  knowledgeUnitIds: string[],
): Promise<Record<string, number>> {
  const book = await getReadinessBook(learnerId);
  const out: Record<string, number> = {};
  for (const id of knowledgeUnitIds) {
    const unit = book?.units.find((u) => u.id === id);
    out[id] = unit?.state.score ?? 0;
  }
  return out;
}
