"use server";

import {
  materialsSessionAttemptSchema,
  materialsSessionItemSchema,
  materialsSessionSchema,
  type MaterialsSession,
  type MaterialsSessionAttempt,
  type MaterialsSessionMode,
  type MaterialsSessionSummary,
} from "@/domain/learning/materials-study-session";
import type { LearnerMaterialListItem } from "@/domain/learning/learner-materials";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  buildMaterialsStudySession,
  collectMaterialTopics,
} from "@/server/learner-materials/materials-session-build";
import {
  getLearnerMaterial,
  listLearnerMaterials,
} from "@/server/learner-materials/store";
import {
  buildMaterialsSessionSummary,
  gradeMaterialsSessionItem,
  snapshotMasteryScores,
  type MaterialsSessionGradeResult,
} from "@/server/materials-study/session-runtime";

export async function listReadyMaterialsForSessionAction(): Promise<{
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

export async function listTopicsForMaterialsAction(input: {
  materialIds: string[];
}): Promise<
  | { ok: true; topics: string[] }
  | { ok: false; error: string }
> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };

  const materials = [];
  for (const id of [...new Set(input.materialIds)].slice(0, 8)) {
    const m = await getLearnerMaterial(learnerId, id);
    if (m?.status === "ready") materials.push(m);
  }
  if (!materials.length) {
    return { ok: false, error: "Vyber připravené materiály." };
  }
  return { ok: true, topics: collectMaterialTopics(materials) };
}

export async function startMaterialsStudySessionAction(input: {
  materialIds: string[];
  mode: MaterialsSessionMode;
  topic?: string | null;
}): Promise<
  | { ok: true; session: MaterialsSession }
  | { ok: false; error: string }
> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };

  const ids = [...new Set(input.materialIds)].slice(0, 8);
  if (ids.length === 0) {
    return { ok: false, error: "Vyber aspoň jeden připravený materiál." };
  }
  if (input.mode === "topic" && !input.topic?.trim()) {
    return { ok: false, error: "Vyber téma, nebo zapni chytrý mix." };
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

  const kuIds = materials.flatMap((m) =>
    (m.knowledgeUnits ?? []).map((u) => u.id),
  );
  const masteryBefore = await snapshotMasteryScores(learnerId, kuIds);

  try {
    const session = buildMaterialsStudySession({
      learnerId,
      materials,
      mode: input.mode,
      topic: input.topic,
      masteryBefore,
    });
    const { emitLessonStart } = await import("@/server/product-analytics/emit");
    await emitLessonStart({
      learnerKey: learnerId,
      featureId: "materials_study",
      topicSlug: (input.topic ?? materials[0]?.id ?? "materials").slice(0, 120),
    });
    return { ok: true, session };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sesit se nepodařilo sestavit.",
    };
  }
}

export async function submitMaterialsSessionAnswerAction(input: {
  item: unknown;
  studentAnswer: string;
  flashcardGrade?: "dont_know" | "almost" | "know";
}): Promise<
  | { ok: true; grade: MaterialsSessionGradeResult }
  | { ok: false; error: string }
> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };

  const itemParsed = materialsSessionItemSchema.safeParse(input.item);
  if (!itemParsed.success) {
    return { ok: false, error: "Neplatná položka sesitu." };
  }

  if (
    itemParsed.data.kind === "flashcard" &&
    !input.flashcardGrade
  ) {
    return { ok: false, error: "Ohodnoť kartu: nevím / skoro / umím." };
  }

  const grade = await gradeMaterialsSessionItem({
    learnerId,
    item: itemParsed.data,
    studentAnswer: input.studentAnswer,
    flashcardGrade: input.flashcardGrade,
  });
  const { emitRetrievalAnswerEvents } = await import(
    "@/server/product-analytics/emit"
  );
  await emitRetrievalAnswerEvents({
    learnerKey: learnerId,
    result: grade.attempt.result,
    featureId: "materials_study",
    topicSlug: (itemParsed.data.topic ?? "materials").slice(0, 120),
  });
  return { ok: true, grade };
}

export async function finishMaterialsStudySessionAction(input: {
  session: unknown;
  attempts: unknown[];
}): Promise<
  | { ok: true; summary: MaterialsSessionSummary }
  | { ok: false; error: string }
> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };

  const sessionParsed = materialsSessionSchema.safeParse(input.session);
  if (!sessionParsed.success) {
    return { ok: false, error: "Neplatný sesit." };
  }
  if (sessionParsed.data.learnerId !== learnerId) {
    return { ok: false, error: "Sesit nepatří k tomuto účtu." };
  }

  const attempts: MaterialsSessionAttempt[] = [];
  for (const raw of input.attempts) {
    const parsed = materialsSessionAttemptSchema.safeParse(raw);
    if (parsed.success) attempts.push(parsed.data);
  }

  const summary = await buildMaterialsSessionSummary({
    session: sessionParsed.data,
    attempts,
  });

  const { markTodayMissionStepFromActivity } = await import(
    "@/server/daily-dashboard/mission-progress"
  );
  await markTodayMissionStepFromActivity({
    learnerId,
    stepKind: "learn",
  });
  // Materials study also feeds SM-2 — mark review when the daily plan prioritizes it.
  await markTodayMissionStepFromActivity({
    learnerId,
    stepKind: "review",
  });

  const { emitSimpleProductEvent } = await import(
    "@/server/product-analytics/emit"
  );
  await emitSimpleProductEvent({
    learnerKey: learnerId,
    event: "lesson_complete",
    featureId: "materials_study",
    topicSlug: (
      sessionParsed.data.topic ?? sessionParsed.data.id
    ).slice(0, 120),
  });

  return { ok: true, summary };
}
