"use server";

import type {
  GroundedExplanation,
  GroundedGradeResult,
  GroundedStudySession,
} from "@/domain/learning/grounded-study";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  buildGroundedStudySession,
  explainFromMaterials,
} from "@/server/learner-materials/grounded-generate";
import { gradeAgainstSource } from "@/server/learner-materials/grounded-grade";
import {
  getLearnerMaterial,
  listLearnerMaterials,
} from "@/server/learner-materials/store";
import type { LearnerMaterialListItem } from "@/domain/learning/learner-materials";
import type { GroundedStudyItem } from "@/domain/learning/grounded-study";

export async function listReadyMaterialsForStudyAction(): Promise<{
  learnerId: string | null;
  materials: LearnerMaterialListItem[];
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { learnerId: null, materials: [] };
  const all = await listLearnerMaterials(learnerId);
  return {
    learnerId,
    materials: all.filter(
      (m) => m.status === "ready" && m.knowledgePointCount > 0,
    ),
  };
}

export async function startGroundedStudyAction(input: {
  materialIds: string[];
}): Promise<
  | { ok: true; session: GroundedStudySession }
  | { ok: false; error: string }
> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };

  const ids = [...new Set(input.materialIds)].slice(0, 8);
  if (ids.length === 0) {
    return { ok: false, error: "Vyber aspoň jeden připravený materiál." };
  }

  const materials = [];
  for (const id of ids) {
    const m = await getLearnerMaterial(learnerId, id);
    if (!m) {
      return { ok: false, error: "Některý materiál se nepodařilo načíst." };
    }
    if (m.status !== "ready") {
      return {
        ok: false,
        error: `„${m.title}“ ještě není připravený ke studiu.`,
      };
    }
    materials.push(m);
  }

  const session = buildGroundedStudySession(materials);
  if (session.items.length === 0) {
    return {
      ok: false,
      error:
        "V vybraných materiálech zatím nemám dost ověřených znalostních bodů pro učení. Zkus bohatší poznámky nebo jiný soubor.",
    };
  }

  return { ok: true, session };
}

export async function explainFromMyMaterialsAction(input: {
  materialIds: string[];
  query: string;
}): Promise<
  | { ok: true; explanation: GroundedExplanation }
  | { ok: false; error: string }
> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };

  const ids = [...new Set(input.materialIds)].slice(0, 8);
  const materials = [];
  for (const id of ids) {
    const m = await getLearnerMaterial(learnerId, id);
    if (m && m.status === "ready") materials.push(m);
  }
  if (!materials.length) {
    return { ok: false, error: "Chybí připravené materiály." };
  }

  return {
    ok: true,
    explanation: explainFromMaterials(materials, input.query),
  };
}

export async function gradeGroundedStudyAnswerAction(input: {
  item: GroundedStudyItem;
  studentAnswer: string;
}): Promise<
  | { ok: true; grade: GroundedGradeResult }
  | { ok: false; error: string }
> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };

  const grade = gradeAgainstSource({
    studentAnswer: input.studentAnswer,
    item: input.item,
  });

  if ("openEvaluation" in grade && grade.openEvaluation) {
    const { storeOpenAnswerEvaluation } = await import(
      "@/server/open-answer-eval/store"
    );
    await storeOpenAnswerEvaluation({
      learnerId,
      source: "grounded_study",
      questionId: input.item.id,
      knowledgeUnitIds: input.item.knowledgeUnitId
        ? [input.item.knowledgeUnitId]
        : [],
      studentAnswer: input.studentAnswer,
      evaluation: grade.openEvaluation,
      difficulty: 3,
    });

    const { recordReadinessPractice } = await import(
      "@/server/readiness/record-practice"
    );
    if (input.item.knowledgeUnitId) {
      await recordReadinessPractice({
        learnerId,
        units: [
          {
            id: input.item.knowledgeUnitId,
            title: input.item.topic ?? input.item.prompt.slice(0, 80),
          },
        ],
        correctness: grade.openEvaluation.masteryCorrectness,
        kind: "practice",
        difficulty: 3,
      });
    }

    if (
      grade.openEvaluation.masteryCorrectness === "incorrect" ||
      grade.openEvaluation.masteryCorrectness === "partial"
    ) {
      const { ingestMeaningfulMistake } = await import(
        "@/server/error-memory/ingest"
      );
      await ingestMeaningfulMistake({
        learnerId,
        question: input.item.prompt,
        studentAnswer: input.studentAnswer,
        correctConcept: input.item.groundedAnswer,
        knowledgeUnit: {
          id: input.item.knowledgeUnitId ?? undefined,
          title: input.item.topic ?? input.item.prompt.slice(0, 80),
        },
        source: "grounded_study",
        result: grade.openEvaluation.masteryCorrectness,
        coverage: grade.openEvaluation.coverage,
        whatWasWrong: grade.openEvaluation.whatWasWrong,
      });
    }
  }

  return { ok: true, grade };
}
