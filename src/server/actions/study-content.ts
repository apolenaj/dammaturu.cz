"use server";

import {
  toListItem,
  type StudyContentEntry,
  type StudyContentListItem,
  type StudyContentProgress,
} from "@/domain/study-content/registry";
import {
  getStudyContentEntry,
  listCatalogMaterials,
  listCatalogTopics,
  validateInventoryCoverage,
} from "@/server/study-content/registry";
import {
  getStudyContentProgress,
  listProgressForLearner,
  markChunkCompleted,
  markUnitCompleted,
  recordQuickTestResult,
  touchStudyContentOpen,
} from "@/server/study-content/progress-store";
import {
  buildLearnSteps,
  buildQuickTestFromEntry,
  type CatalogLearnStep,
  type CatalogQuickTestItem,
} from "@/server/study-content/session-build";
import { resolveLearnerIdForAction } from "@/server/viewer-session";

export async function listStudyCatalogAction(input?: {
  topic?: string | null;
  query?: string | null;
}): Promise<{
  learnerId: string | null;
  subject: string;
  topics: string[];
  materials: StudyContentListItem[];
  progressBySourceId: Record<string, StudyContentProgress>;
}> {
  const learnerId = await resolveLearnerIdForAction();
  const [materials, topics, progressList] = await Promise.all([
    listCatalogMaterials({
      subjectSlug: "cjl",
      topic: input?.topic,
      query: input?.query,
    }),
    listCatalogTopics("cjl"),
    learnerId ? listProgressForLearner(learnerId) : Promise.resolve([]),
  ]);

  const progressBySourceId: Record<string, StudyContentProgress> = {};
  for (const p of progressList) {
    progressBySourceId[p.sourceId] = p;
  }

  return {
    learnerId,
    subject: "Český jazyk a literatura",
    topics,
    materials,
    progressBySourceId,
  };
}

export async function getStudyCatalogDetailAction(sourceId: string): Promise<{
  entry: StudyContentEntry | null;
  listItem: StudyContentListItem | null;
  progress: StudyContentProgress | null;
  learnSteps: CatalogLearnStep[];
  quickTest: CatalogQuickTestItem[];
  learnerId: string | null;
}> {
  const learnerId = await resolveLearnerIdForAction();
  const entry = await getStudyContentEntry(sourceId);
  if (!entry) {
    return {
      entry: null,
      listItem: null,
      progress: null,
      learnSteps: [],
      quickTest: [],
      learnerId,
    };
  }

  let progress: StudyContentProgress | null = null;
  if (learnerId) {
    progress = await touchStudyContentOpen({ learnerId, sourceId });
  }

  return {
    entry,
    listItem: toListItem(entry),
    progress,
    learnSteps: buildLearnSteps(entry),
    quickTest: buildQuickTestFromEntry(entry),
    learnerId,
  };
}

export async function markCatalogChunkReadAction(input: {
  sourceId: string;
  chunkId: string;
  chunkIndex: number;
}): Promise<{ ok: true; progress: StudyContentProgress } | { ok: false; error: string }> {
  const learnerId = await resolveLearnerIdForAction();
  if (!learnerId) return { ok: false, error: "Chybí studijní session." };
  const progress = await markChunkCompleted({
    learnerId,
    sourceId: input.sourceId,
    chunkId: input.chunkId,
    chunkIndex: input.chunkIndex,
  });
  return { ok: true, progress };
}

export async function markCatalogUnitDoneAction(input: {
  sourceId: string;
  unitId: string;
}): Promise<{ ok: true; progress: StudyContentProgress } | { ok: false; error: string }> {
  const learnerId = await resolveLearnerIdForAction();
  if (!learnerId) return { ok: false, error: "Chybí studijní session." };
  const progress = await markUnitCompleted({
    learnerId,
    sourceId: input.sourceId,
    unitId: input.unitId,
  });
  return { ok: true, progress };
}

export async function submitCatalogQuickTestAction(input: {
  sourceId: string;
  itemId: string;
  answeredTrue: boolean;
  correctIsTrue: boolean;
}): Promise<
  | {
      ok: true;
      correct: boolean;
      progress: StudyContentProgress;
    }
  | { ok: false; error: string }
> {
  const learnerId = await resolveLearnerIdForAction();
  if (!learnerId) return { ok: false, error: "Chybí studijní session." };
  void input.itemId;
  const correct = input.answeredTrue === input.correctIsTrue;
  const progress = await recordQuickTestResult({
    learnerId,
    sourceId: input.sourceId,
    correct,
  });
  return { ok: true, correct, progress };
}

export async function getCatalogProgressAction(
  sourceId: string,
): Promise<StudyContentProgress | null> {
  const learnerId = await resolveLearnerIdForAction();
  if (!learnerId) return null;
  return getStudyContentProgress(learnerId, sourceId);
}

export async function validateStudyInventoryAction() {
  return validateInventoryCoverage();
}
