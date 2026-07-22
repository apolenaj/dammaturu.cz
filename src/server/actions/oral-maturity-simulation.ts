"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  buildOralExaminerBrief,
  buildOralSelectView,
  gradeOralSimulation,
  textUtterance,
  type OralExaminerBrief,
  type OralSimulationMode,
  type OralSimulationSelectView,
  type OralUtterance,
} from "@/domain/learning/oral-maturity-simulation";
import {
  enrichOralReport,
  type OralExaminerPersonality,
} from "@/domain/learning/oral-examiner-personality";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getOrCreateLiteratureList } from "@/server/literature-maturity/store";
import { getSchoolExamProfile } from "@/server/school-exam-profile/store";
import {
  getLearnerMaterial,
  listLearnerMaterials,
} from "@/server/learner-materials/store";
import { practiceLiteratureBook } from "@/server/literature-maturity/store";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";

type Fail = { ok: false; error: string };

async function loadMaterialUnitsForBook(input: {
  learnerId: string;
  linkedMaterialIds: string[];
  bookTitleCs: string;
}): Promise<LearnerKnowledgeUnit[]> {
  const items = await listLearnerMaterials(input.learnerId);
  const readyIds = new Set(
    items.filter((m) => m.status === "ready").map((m) => m.id),
  );
  const ids =
    input.linkedMaterialIds.length > 0
      ? input.linkedMaterialIds.filter((id) => readyIds.has(id))
      : [...readyIds];

  const units: LearnerKnowledgeUnit[] = [];
  const titleNorm = input.bookTitleCs.trim().toLowerCase();
  for (const id of ids.slice(0, 12)) {
    const mat = await getLearnerMaterial(input.learnerId, id);
    if (!mat?.knowledgeUnits) continue;
    for (const u of mat.knowledgeUnits) {
      const work = u.grounded.literaryWork?.trim().toLowerCase();
      if (work && work.includes(titleNorm.slice(0, 12))) {
        units.push(u);
      } else if (input.linkedMaterialIds.includes(id)) {
        units.push(u);
      }
    }
  }
  return units.slice(0, 16);
}

export async function getOralSimulationSelectAction(): Promise<{
  view: OralSimulationSelectView | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { view: null, learnerId: null };
  const list = await getOrCreateLiteratureList(learnerId);
  return { view: buildOralSelectView(list.books), learnerId };
}

export async function startOralSimulationAction(input: {
  mode: OralSimulationMode;
  bookId?: string | null;
}): Promise<
  | { ok: true; brief: OralExaminerBrief }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const list = await getOrCreateLiteratureList(learnerId);
    if (list.books.length === 0) {
      return {
        ok: false,
        error: "Nejdřív přidej knihy v Seznamu literatury.",
      };
    }
    if (input.mode === "book" && !input.bookId) {
      return { ok: false, error: "Vyber konkrétní knihu." };
    }

    const provisional = buildOralExaminerBrief({
      mode: input.mode,
      books: list.books,
      bookId: input.bookId,
    });
    const book = list.books.find((b) => b.id === provisional.bookId);
    const school = await getSchoolExamProfile(learnerId);
    const materialUnits = book
      ? await loadMaterialUnitsForBook({
          learnerId,
          linkedMaterialIds: book.linkedMaterialIds,
          bookTitleCs: book.titleCs,
        })
      : [];

    const brief = buildOralExaminerBrief({
      mode: input.mode,
      books: list.books,
      bookId: input.bookId,
      schoolDocuments: school?.documents ?? [],
      materialUnits,
    });

    track("oral_simulation_started", {
      mode: input.mode,
      evidenceSufficient: brief.evidenceSufficient,
      checklist: brief.checklist.length,
    });
    const { recordProductEvent } = await import(
      "@/server/product-analytics/store"
    );
    await recordProductEvent({
      learnerKey: learnerId,
      event: "simulation_start",
      featureId: "oral_simulation",
      topicSlug: (input.mode ?? "oral").slice(0, 120),
    });
    return { ok: true, brief };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function gradeOralSimulationAction(input: {
  mode: OralSimulationMode;
  bookId: string | null;
  mainAnswerText: string;
  mainModality?: "text" | "voice";
  followUpAnswers: Record<string, string>;
  followUpAskedIds: string[];
  confidenceSelf: number;
  personality?: OralExaminerPersonality;
}): Promise<
  | {
      ok: true;
      report: ReturnType<typeof enrichOralReport>;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const list = await getOrCreateLiteratureList(learnerId);
    const school = await getSchoolExamProfile(learnerId);
    const book = list.books.find((b) => b.id === input.bookId);
    const materialUnits = book
      ? await loadMaterialUnitsForBook({
          learnerId,
          linkedMaterialIds: book.linkedMaterialIds,
          bookTitleCs: book.titleCs,
        })
      : [];

    const brief = buildOralExaminerBrief({
      mode: input.mode,
      books: list.books,
      bookId: input.bookId,
      schoolDocuments: school?.documents ?? [],
      materialUnits,
    });

    const now = new Date().toISOString();
    const modality = input.mainModality ?? "text";
    const mainAnswer: OralUtterance = {
      modality,
      textCs: input.mainAnswerText,
      audioRef: null,
      durationMs: null,
      capturedAt: now,
    };
    const followUpAnswers: Record<string, OralUtterance> = {};
    for (const [id, text] of Object.entries(input.followUpAnswers)) {
      followUpAnswers[id] = textUtterance(text, now);
    }

    const base = gradeOralSimulation({
      brief,
      mainAnswer,
      followUpAnswers,
      followUpAskedIds: input.followUpAskedIds,
      confidenceSelf: input.confidenceSelf,
    });

    const personality = input.personality ?? "standard_teacher";
    const report = enrichOralReport({
      report: base,
      mainAnswerText: input.mainAnswerText,
      personality,
      bookHref: brief.relatedLearnHref,
    });

    if (brief.bookId && !report.insufficientEvidence) {
      await practiceLiteratureBook({
        learnerId,
        bookId: brief.bookId,
      });
    }

    // Readiness + progress after a real oral attempt (D-063 / launch gate).
    const { recordMockExamCompletion } = await import(
      "@/server/progress-gamification/sync"
    );
    await recordMockExamCompletion({
      learnerId,
      score: Math.round(report.overallScore),
      topicSlug: (brief.bookTitleCs ?? brief.mode ?? "oral")
        .toString()
        .slice(0, 120)
        .toLowerCase()
        .replace(/\s+/g, "-"),
    });
    const { markTodayMissionStepFromActivity } = await import(
      "@/server/daily-dashboard/mission-progress"
    );
    await markTodayMissionStepFromActivity({
      learnerId,
      stepKind: "exam",
    });

    track("oral_simulation_graded", {
      mode: input.mode,
      score: report.overallScore,
      insufficient: report.insufficientEvidence,
      modality,
      personality,
    });
    const { recordProductEvent } = await import(
      "@/server/product-analytics/store"
    );
    await recordProductEvent({
      learnerKey: learnerId,
      event: "simulation_complete",
      featureId: "oral_simulation",
      topicSlug: (brief.bookTitleCs ?? brief.mode ?? "oral")
        .toString()
        .slice(0, 120)
        .toLowerCase()
        .replace(/\s+/g, "-"),
    });
    revalidatePath("/app/simulation");
    revalidatePath("/app/literature");
    revalidatePath("/app/progress");
    revalidatePath("/app/dashboard");
    return { ok: true, report };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
