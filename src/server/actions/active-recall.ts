"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  RecallGrade,
  RecallPack,
  RecallProgress,
} from "@/domain/learning/active-recall";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getRecallPackBySlug,
  getRecallProgress,
  listRecallPacks,
  resetRecallProgress,
  submitRecallAnswer,
} from "@/server/active-recall/store";
import { recordReadinessPractice } from "@/server/readiness/record-practice";
import { markTodayMissionStepFromActivity } from "@/server/daily-dashboard/mission-progress";

export async function listRecallPacksAction(): Promise<RecallPack[]> {
  return listRecallPacks();
}

export async function getRecallSessionAction(slug: string): Promise<{
  pack: RecallPack | null;
  progress: RecallProgress | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getRecallPackBySlug(slug);
  const progress =
    learnerId && pack ? await getRecallProgress(learnerId, pack.id) : null;
  return { pack, progress, learnerId };
}

type Ok = {
  ok: true;
  progress: RecallProgress;
  grade: RecallGrade;
};
type Fail = { ok: false; error: string };

export async function submitRecallAnswerAction(input: {
  packSlug: string;
  promptId: string;
  answer: string;
  inputMode: "text" | "speech";
}): Promise<Ok | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getRecallPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const { progress, grade } = await submitRecallAnswer({
      learnerId,
      pack,
      promptId: input.promptId,
      answer: input.answer,
      inputMode: input.inputMode,
    });
    track("active_recall_submit", {
      packSlug: input.packSlug,
      result: grade.result,
      coverage: grade.coverage,
      matched: grade.matched.length,
      missing: grade.missing.length,
      inputMode: input.inputMode,
    });
    const prompt = pack.prompts.find((p) => p.id === input.promptId);
    const units =
      prompt?.keyPoints.map((k) => ({
        id: k.knowledgeUnitId,
        title: k.knowledgeUnitTitle,
      })) ?? [];
    if (units.length > 0) {
      await recordReadinessPractice({
        learnerId,
        units,
        correctness:
          grade.result === "correct"
            ? "correct"
            : grade.result === "partial"
              ? "partial"
              : "incorrect",
        kind: "practice",
      });
    }
    await markTodayMissionStepFromActivity({
      learnerId,
      stepKind: "learn",
    });
    const { mapToExperimentMethod } = await import(
      "@/server/beta-experiment/map-method"
    );
    const { recordExperimentActivity } = await import(
      "@/server/beta-experiment/record"
    );
    await recordExperimentActivity({
      learnerId,
      method: mapToExperimentMethod("active_recall"),
      topicSlug: input.packSlug,
      itemId: input.promptId,
      knowledgeUnits: units,
      correct: grade.result === "correct",
      partial: grade.result === "partial",
      score01: grade.coverage,
      minutes: 3,
      kind: "practice",
    });
    revalidatePath(`/app/learn/vybavovani/${input.packSlug}`);
    revalidatePath("/app/dashboard");
    revalidatePath("/app/progress");
    revalidatePath("/app/progress/experiment");
    return { ok: true, progress, grade };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function resetRecallProgressAction(input: {
  packSlug: string;
}): Promise<{ ok: true; progress: RecallProgress } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getRecallPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const progress = await resetRecallProgress({ learnerId, pack });
    revalidatePath(`/app/learn/vybavovani/${input.packSlug}`);
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
