import { BETA_TARGET_DATE } from "@/domain/onboarding/schema";
import type { OnboardingInput } from "@/domain/onboarding/schema";
import { buildStudyPlan } from "@/domain/onboarding/study-plan";
import { GUEST_DISPLAY_NAME_DEFAULT } from "@/domain/viewer/types";
import { isGuestLearnerId } from "@/server/guest/guest-id";
import {
  getLearner,
  upsertLearner,
  type LearnerRecord,
} from "@/server/learner-store";

/** In-flight ensure — collapses parallel layout/page calls for the same guest. */
const ensureInFlight = new Map<string, Promise<LearnerRecord>>();

/** Default Czech matura prep profile for guests who skip personalization. */
export function defaultGuestOnboardingInput(
  overrides: Partial<OnboardingInput> = {},
): OnboardingInput {
  return {
    displayName: GUEST_DISPLAY_NAME_DEFAULT,
    targetDate: BETA_TARGET_DATE,
    schoolType: "gymnazium",
    subjects: ["cjl"],
    readinessFeeling: 3,
    dailyMinutes: 25,
    preferredStudyTime: "flexible",
    studyMode: "standard",
    wantsDiagnostic: false,
    ...overrides,
  };
}

/**
 * Ensure a LearnerRecord exists for a guest (or any) learnerId.
 * Idempotent — does not overwrite an existing personalized profile.
 */
export async function ensureGuestLearner(
  learnerId: string,
): Promise<LearnerRecord> {
  if (!isGuestLearnerId(learnerId) && !/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }

  const existing = await getLearner(learnerId);
  if (existing) return existing;

  const inflight = ensureInFlight.get(learnerId);
  if (inflight) return inflight;

  const task = (async () => {
    const again = await getLearner(learnerId);
    if (again) return again;
    const profile = defaultGuestOnboardingInput();
    const studyPlan = buildStudyPlan(profile);
    return upsertLearner({ id: learnerId, profile, studyPlan });
  })().finally(() => {
    ensureInFlight.delete(learnerId);
  });

  ensureInFlight.set(learnerId, task);
  return task;
}

/**
 * Apply optional personalization onto a guest (or authenticated) profile.
 * Empty fields fall back to defaults so skip always yields a valid plan.
 */
export async function upsertViewerLearnerProfile(
  learnerId: string,
  partial: Partial<OnboardingInput>,
): Promise<LearnerRecord> {
  const existing = await getLearner(learnerId);
  const base = existing?.profile ?? defaultGuestOnboardingInput();
  const profile = defaultGuestOnboardingInput({
    ...base,
    ...partial,
    displayName:
      partial.displayName?.trim() ||
      base.displayName ||
      GUEST_DISPLAY_NAME_DEFAULT,
    subjects:
      partial.subjects?.length ? partial.subjects : base.subjects.length
        ? base.subjects
        : ["cjl"],
  });
  const studyPlan = buildStudyPlan(profile);
  return upsertLearner({ id: learnerId, profile, studyPlan });
}
