import {
  getCurriculumPack,
  getDefaultCurriculumPack,
  listCurriculumSummaries,
} from "@/server/curriculum/store";
import {
  getTopicDependencyGraph,
} from "@/server/curriculum/build";
import type { CurriculumPack } from "@/server/curriculum/types";

/**
 * Curriculum repository — UI and services read here only.
 * Never hardcode modules/topics in pages.
 */
export async function getActiveCurriculum(): Promise<CurriculumPack | null> {
  return getDefaultCurriculumPack();
}

export async function getCurriculumBySlug(
  slug: string,
): Promise<CurriculumPack | null> {
  return getCurriculumPack(slug);
}

export async function listCurricula() {
  return listCurriculumSummaries();
}

export async function getActiveTopicGraph() {
  const pack = await getActiveCurriculum();
  if (!pack) return null;
  return {
    curriculum: pack.curriculum,
    graph: getTopicDependencyGraph(pack),
  };
}
