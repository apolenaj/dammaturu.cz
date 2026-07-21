import { dateKeyFromDate } from "@/domain/learning/daily-dashboard";
import {
  getDailyMissionDay,
  markDailyStepDone,
} from "@/server/daily-dashboard/store";

/** Mark today's mission step after a real learning session (not honor-only). */
export async function markTodayMissionStepFromActivity(input: {
  learnerId: string;
  stepKind: "learn" | "review" | "test";
}): Promise<void> {
  try {
    const dateKey = dateKeyFromDate(new Date());
    const day = await getDailyMissionDay(input.learnerId, dateKey);
    if (!day || day.completedAt) return;
    const step = day.steps.find((s) => s.kind === input.stepKind && !s.done);
    if (!step) return;
    await markDailyStepDone({
      learnerId: input.learnerId,
      dateKey,
      stepId: step.id,
    });
  } catch {
    // never block learning
  }
}
