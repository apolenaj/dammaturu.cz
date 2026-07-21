"use server";

import { revalidatePath } from "next/cache";
import {
  BETA_EXPERIMENT_FRAMING,
  buildExperimentReport,
  pickCheckpointQuestions,
  type ExperimentReport,
} from "@/domain/learning/beta-experiment";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import {
  getExperimentBook,
  getOrCreateExperimentBook,
} from "@/server/beta-experiment/store";
import {
  createExperimentAssessment,
  topicMasteryFromReadinessAreas,
} from "@/server/beta-experiment/record";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import { listQuestionPacks } from "@/server/question-engine/store";
import { listLearningEvents } from "@/server/learning-analytics/store";
import { assertAdmin } from "@/server/admin-auth";

export async function getExperimentReportAction(): Promise<{
  report: ExperimentReport | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { report: null, learnerId: null };
  const learner = await getLearner(learnerId);
  if (!learner) return { report: null, learnerId };

  const book = await getOrCreateExperimentBook({
    learnerId,
    targetDate: learner.profile.targetDate,
  });
  const readiness = await getReadinessSnapshotForLearner({ learnerId });
  const topics = topicMasteryFromReadinessAreas(
    readiness?.snapshot.areas.map((a) => ({
      id: a.id,
      labelCs: a.labelCs,
      pct: a.pct,
    })) ?? [],
  );

  const events = (await listLearningEvents()).filter(
    (e) => e.learnerKey === learnerId && e.correct != null,
  );
  const recent = events.slice(-40);
  const recentAccuracyPct =
    recent.length > 0
      ? Math.round(
          (100 * recent.filter((e) => e.correct).length) / recent.length,
        )
      : null;

  return {
    learnerId,
    report: buildExperimentReport({
      book,
      displayName: learner.profile.displayName,
      currentTopicMastery: topics,
      currentOverallMasteryPct: readiness?.snapshot.overallPct ?? null,
      recentAccuracyPct,
    }),
  };
}

export async function getAdminExperimentReportAction(learnerId: string): Promise<
  | { ok: true; report: ExperimentReport }
  | { ok: false; error: string }
> {
  const gate = await assertAdmin();
  if (!gate.ok) return gate;
  const learner = await getLearner(learnerId);
  if (!learner) return { ok: false, error: "Learner nenalezen." };
  const book = await getExperimentBook(learnerId);
  if (!book) return { ok: false, error: "Experiment book chybí." };
  const readiness = await getReadinessSnapshotForLearner({ learnerId });
  const topics = topicMasteryFromReadinessAreas(
    readiness?.snapshot.areas.map((a) => ({
      id: a.id,
      labelCs: a.labelCs,
      pct: a.pct,
    })) ?? [],
  );
  return {
    ok: true,
    report: buildExperimentReport({
      book,
      displayName: learner.profile.displayName,
      currentTopicMastery: topics,
      currentOverallMasteryPct: readiness?.snapshot.overallPct ?? null,
      recentAccuracyPct: null,
    }),
  };
}

type CreateResult =
  | {
      ok: true;
      assessmentId: string;
      packSlug: string;
      questionCount: number;
      transferCount: number;
      href: string;
    }
  | { ok: false; error: string };

/**
 * Weekly checkpoint: topics from last 7 daily snapshots, unseen questions,
 * prefer transfer kinds + KU overlap.
 */
export async function createWeeklyCheckpointAction(): Promise<CreateResult> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
  const learner = await getLearner(learnerId);
  if (!learner) return { ok: false, error: "Learner nenalezen." };

  const book = await getOrCreateExperimentBook({
    learnerId,
    targetDate: learner.profile.targetDate,
  });

  const now = new Date();
  const topics = new Set<string>();
  const kuIds = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const day = book.dailyByDate[key];
    if (!day) continue;
    for (const t of day.topicsStudied) topics.add(t);
  }
  for (const r of book.retention) {
    const learned = new Date(r.learnedAt).getTime();
    if (now.getTime() - learned <= 7 * 86_400_000) {
      kuIds.add(r.knowledgeUnitId);
    }
  }
  if (book.baseline) {
    for (const id of book.baseline.objectiveKuIds) kuIds.add(id);
  }

  const packs = await listQuestionPacks();
  const pack = packs[0];
  if (!pack) return { ok: false, error: "Chybí question pack." };

  const exclude = new Set(book.seenQuestionIds);
  // Also exclude questions already used in assessments
  for (const a of book.assessments) {
    for (const id of a.questionIds) exclude.add(id);
  }
  if (book.final) {
    for (const id of book.final.questionIds) exclude.add(id);
  }

  const { questionIds, transferQuestionIds } = pickCheckpointQuestions({
    questions: pack.questions.map((q) => ({
      id: q.id,
      kind: q.kind,
      knowledgeUnits: q.knowledgeUnits,
    })),
    excludeQuestionIds: exclude,
    preferKuIds: kuIds,
    maxQuestions: 8,
    preferTransfer: true,
  });

  if (questionIds.length < 4) {
    return {
      ok: false,
      error:
        "Málo neviděných otázek pro weekly checkpoint (≥4). Pokračuj v učení nebo přidej obsah.",
    };
  }

  const assessment = await createExperimentAssessment({
    learnerId,
    kind: "weekly",
    packSlug: pack.slug,
    questionIds,
    transferQuestionIds,
    topicsCovered: [...topics].slice(0, 20),
    objectiveKuIds: [...kuIds].slice(0, 40),
    noteCs: `${BETA_EXPERIMENT_FRAMING.design}: weekly checkpoint z témat posledních 7 dní + transfer položky.`,
  });
  if (!assessment) return { ok: false, error: "Uložení assessmentu selhalo." };

  revalidatePath("/app/progress/experiment");
  return {
    ok: true,
    assessmentId: assessment.id,
    packSlug: pack.slug,
    questionCount: questionIds.length,
    transferCount: transferQuestionIds.length,
    href: `/app/tests/otazky/${pack.slug}?experiment=${assessment.id}`,
  };
}

/**
 * Final assessment: same learning objectives (baseline KU / areas), different questions.
 */
export async function createFinalAssessmentAction(): Promise<CreateResult> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
  const learner = await getLearner(learnerId);
  if (!learner) return { ok: false, error: "Learner nenalezen." };

  const book = await getOrCreateExperimentBook({
    learnerId,
    targetDate: learner.profile.targetDate,
  });
  if (!book.baseline) {
    return {
      ok: false,
      error: "Nejdřív dokonči vstupní diagnostiku (baseline).",
    };
  }
  if (book.final) {
    return {
      ok: true,
      assessmentId: book.final.id,
      packSlug: book.final.packSlug,
      questionCount: book.final.questionIds.length,
      transferCount: book.final.transferQuestionIds.length,
      href: `/app/tests/otazky/${book.final.packSlug}?experiment=${book.final.id}`,
    };
  }

  const packs = await listQuestionPacks();
  const pack = packs.find((p) => p.slug === book.baseline!.packSlug) ?? packs[0];
  if (!pack) return { ok: false, error: "Chybí question pack." };

  const exclude = new Set(book.seenQuestionIds);
  for (const a of book.assessments) {
    for (const id of a.questionIds) exclude.add(id);
  }

  const preferKuIds = new Set(book.baseline.objectiveKuIds);
  const { questionIds, transferQuestionIds } = pickCheckpointQuestions({
    questions: pack.questions.map((q) => ({
      id: q.id,
      kind: q.kind,
      knowledgeUnits: q.knowledgeUnits,
    })),
    excludeQuestionIds: exclude,
    preferKuIds,
    maxQuestions: 10,
    preferTransfer: true,
  });

  if (questionIds.length < 6) {
    return {
      ok: false,
      error:
        "Málo neviděných otázek pro final (≥6). Potřebuješ širší pool než baseline.",
    };
  }

  const assessment = await createExperimentAssessment({
    learnerId,
    kind: "final",
    packSlug: pack.slug,
    questionIds,
    transferQuestionIds,
    topicsCovered: book.baseline.topicMastery.map((t) => t.title),
    objectiveKuIds: book.baseline.objectiveKuIds,
    noteCs: `${BETA_EXPERIMENT_FRAMING.design}: final — stejné objectives jako baseline, jiné otázky.`,
  });
  if (!assessment) return { ok: false, error: "Uložení final selhalo." };

  revalidatePath("/app/progress/experiment");
  return {
    ok: true,
    assessmentId: assessment.id,
    packSlug: pack.slug,
    questionCount: questionIds.length,
    transferCount: transferQuestionIds.length,
    href: `/app/tests/otazky/${pack.slug}?experiment=${assessment.id}`,
  };
}

export async function getExperimentAssessmentAction(assessmentId: string) {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { assessment: null, learnerId: null };
  const book = await getExperimentBook(learnerId);
  if (!book) return { assessment: null, learnerId };
  const assessment =
    book.assessments.find((a) => a.id === assessmentId) ??
    (book.final?.id === assessmentId ? book.final : null);
  return { assessment, learnerId, book };
}
