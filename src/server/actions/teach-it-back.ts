"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  TeachGrade,
  TeachPack,
  TeachProgress,
} from "@/domain/learning/teach-it-back";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getTeachPackBySlug,
  getTeachProgress,
  listTeachPacks,
  resetTeachProgress,
  submitTeachAnswer,
} from "@/server/teach-it-back/store";

export async function listTeachPacksAction(): Promise<TeachPack[]> {
  return listTeachPacks();
}

export async function getTeachSessionAction(slug: string): Promise<{
  pack: TeachPack | null;
  progress: TeachProgress | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getTeachPackBySlug(slug);
  const progress =
    learnerId && pack ? await getTeachProgress(learnerId, pack.id) : null;
  return { pack, progress, learnerId };
}

type Ok = {
  ok: true;
  progress: TeachProgress;
  grade: TeachGrade;
};
type Fail = { ok: false; error: string };

export async function submitTeachAnswerAction(input: {
  packSlug: string;
  promptId: string;
  answer: string;
  inputMode: "text" | "speech";
}): Promise<Ok | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getTeachPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const { progress, grade } = await submitTeachAnswer({
      learnerId,
      pack,
      promptId: input.promptId,
      answer: input.answer,
      inputMode: input.inputMode,
    });
    track("teach_it_back_submit", {
      packSlug: input.packSlug,
      result: grade.result,
      coverage: grade.checklistCoverage,
      explained: grade.explainedWell.length,
      missing: grade.missing.length,
      inaccurate: grade.inaccurate.length,
      wordCount: grade.wordCount,
      lengthWithoutSubstance: grade.lengthWithoutSubstance,
      inputMode: input.inputMode,
    });
    const { mapToExperimentMethod } = await import(
      "@/server/beta-experiment/map-method"
    );
    const { recordExperimentActivity } = await import(
      "@/server/beta-experiment/record"
    );
    await recordExperimentActivity({
      learnerId,
      method: mapToExperimentMethod("teach_it_back"),
      topicSlug: input.packSlug,
      itemId: input.promptId,
      correct: grade.result === "strong",
      partial: grade.result === "partial",
      score01: grade.checklistCoverage,
      minutes: 4,
      kind: "practice",
    });
    revalidatePath(`/app/learn/nauc-zpatky/${input.packSlug}`);
    revalidatePath("/app/progress/experiment");
    return { ok: true, progress, grade };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function resetTeachProgressAction(input: {
  packSlug: string;
}): Promise<{ ok: true; progress: TeachProgress } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getTeachPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const progress = await resetTeachProgress({ learnerId, pack });
    revalidatePath(`/app/learn/nauc-zpatky/${input.packSlug}`);
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
