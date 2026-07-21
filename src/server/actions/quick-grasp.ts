"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  computeQuickGraspStats,
  type QuickGraspPack,
  type QuickGraspProgress,
} from "@/domain/learning/quick-grasp";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getQuickGraspPackBySlug,
  getQuickGraspProgress,
  listQuickGraspPacks,
  recordCheckpointAnswer,
  recordMicroAnswer,
} from "@/server/quick-grasp/store";

export async function listQuickGraspAction(): Promise<QuickGraspPack[]> {
  return listQuickGraspPacks();
}

export async function getQuickGraspSessionAction(slug: string): Promise<{
  pack: QuickGraspPack | null;
  progress: QuickGraspProgress | null;
  learnerId: string | null;
  stats: ReturnType<typeof computeQuickGraspStats> | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getQuickGraspPackBySlug(slug);
  const progress =
    learnerId && pack
      ? await getQuickGraspProgress(learnerId, pack.id)
      : null;
  const stats = pack ? computeQuickGraspStats(pack, progress) : null;
  return { pack, progress, learnerId, stats };
}

export type QuickGraspActionResult =
  | {
      ok: true;
      progress: QuickGraspProgress;
      stats: ReturnType<typeof computeQuickGraspStats>;
    }
  | { ok: false; error: string };

export async function answerMicroAction(input: {
  packSlug: string;
  stepId: string;
  choiceIndex: number;
}): Promise<QuickGraspActionResult> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) {
      return { ok: false, error: "Nejdřív dokonči onboarding." };
    }
    const pack = await getQuickGraspPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Pack nenalezen." };
    const step = pack.steps.find((s) => s.id === input.stepId);
    if (!step || step.type !== "micro") {
      return { ok: false, error: "Mikroblok nenalezen." };
    }
    const correct = input.choiceIndex === step.check.correctIndex;
    const progress = await recordMicroAnswer({
      learnerId,
      pack,
      stepId: input.stepId,
      choiceIndex: input.choiceIndex,
      correct,
    });
    track("quick_grasp_answer", {
      packSlug: input.packSlug,
      kind: "micro",
      correct,
      successRate:
        progress.checksAnswered > 0
          ? progress.checksCorrect / progress.checksAnswered
          : null,
    });
    if (progress.status === "completed") {
      const { markTodayMissionStepFromActivity } = await import(
        "@/server/daily-dashboard/mission-progress"
      );
      await markTodayMissionStepFromActivity({
        learnerId,
        stepKind: "learn",
      });
    }
    revalidatePath(`/app/learn/rychle/${input.packSlug}`);
    revalidatePath("/app/learn");
    revalidatePath("/app/dashboard");
    return {
      ok: true,
      progress,
      stats: computeQuickGraspStats(pack, progress),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function answerCheckpointAction(input: {
  packSlug: string;
  stepId: string;
  itemId: string;
  choiceIndex: number;
  answeredItemIds: string[];
}): Promise<QuickGraspActionResult> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) {
      return { ok: false, error: "Nejdřív dokonči onboarding." };
    }
    const pack = await getQuickGraspPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Pack nenalezen." };
    const step = pack.steps.find((s) => s.id === input.stepId);
    if (!step || step.type !== "checkpoint") {
      return { ok: false, error: "Checkpoint nenalezen." };
    }
    const item = step.items.find((i) => i.id === input.itemId);
    if (!item) return { ok: false, error: "Položka nenalezena." };
    const correct = input.choiceIndex === item.correctIndex;
    const progress = await recordCheckpointAnswer({
      learnerId,
      pack,
      stepId: input.stepId,
      answeredItemIds: input.answeredItemIds,
      correct,
    });
    track("quick_grasp_answer", {
      packSlug: input.packSlug,
      kind: "checkpoint",
      correct,
      successRate:
        progress.checksAnswered > 0
          ? progress.checksCorrect / progress.checksAnswered
          : null,
    });
    const { mapToExperimentMethod } = await import(
      "@/server/beta-experiment/map-method"
    );
    const { recordExperimentActivity } = await import(
      "@/server/beta-experiment/record"
    );
    await recordExperimentActivity({
      learnerId,
      method: mapToExperimentMethod("quick_grasp"),
      topicSlug: input.packSlug,
      itemId: input.itemId,
      correct,
      score01: correct ? 1 : 0,
      minutes: 1,
      kind: progress.status === "completed" ? "lesson" : "practice",
    });
    if (progress.status === "completed") {
      const { markTodayMissionStepFromActivity } = await import(
        "@/server/daily-dashboard/mission-progress"
      );
      await markTodayMissionStepFromActivity({
        learnerId,
        stepKind: "learn",
      });
    }
    revalidatePath(`/app/learn/rychle/${input.packSlug}`);
    revalidatePath("/app/learn");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/progress/experiment");
    return {
      ok: true,
      progress,
      stats: computeQuickGraspStats(pack, progress),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
