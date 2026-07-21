"use server";

import { revalidatePath } from "next/cache";
import {
  onboardingInputSchema,
  type OnboardingInput,
} from "@/domain/onboarding/schema";
import { buildStudyPlan } from "@/domain/onboarding/study-plan";
import { track } from "@/lib/analytics";
import {
  getLearnerIdFromCookies,
  setLearnerCookie,
} from "@/server/learner-session";
import { upsertLearner, getLearner } from "@/server/learner-store";

export type OnboardingActionResult =
  | {
      ok: true;
      learnerId: string;
      wantsDiagnostic: boolean;
      updated: boolean;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export async function saveOnboardingAction(
  raw: unknown,
): Promise<OnboardingActionResult> {
  const parsed = onboardingInputSchema.safeParse(raw);

  if (!parsed.success) {
    track("onboarding_save_failed", { reason: "validation" });
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_form";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key].push(issue.message);
    }
    return {
      ok: false,
      error: "Zkontroluj prosím vyplněné údaje.",
      fieldErrors,
    };
  }

  const profile: OnboardingInput = parsed.data;

  try {
    const existingId = await getLearnerIdFromCookies();
    const existing = existingId ? await getLearner(existingId) : null;
    const studyPlan = buildStudyPlan(profile);
    const record = await upsertLearner({
      id: existing?.id,
      profile,
      studyPlan,
    });

    await setLearnerCookie(record.id);

    track(existing ? "onboarding_updated" : "onboarding_completed", {
      learnerId: record.id,
      mode: profile.studyMode,
      subjects: profile.subjects.length,
      wantsDiagnostic: profile.wantsDiagnostic,
      dailyMinutes: profile.dailyMinutes,
    });
    track("study_plan_generated", {
      learnerId: record.id,
      daysRemaining: studyPlan.daysRemaining,
      firstMission: studyPlan.firstMission.kind,
    });
    if (profile.wantsDiagnostic) {
      track("onboarding_diagnostic_requested", { learnerId: record.id });
    }

    revalidatePath("/app/dashboard");
    revalidatePath("/app/plan");
    revalidatePath("/app/profile");
    revalidatePath("/onboarding");

    return {
      ok: true,
      learnerId: record.id,
      wantsDiagnostic: profile.wantsDiagnostic,
      updated: Boolean(existing),
    };
  } catch (error) {
    console.error("[onboarding] save failed", error);
    track("onboarding_save_failed", { reason: "storage" });
    return {
      ok: false,
      error: "Uložení se nepovedlo. Zkus to prosím znovu.",
    };
  }
}

export async function getCurrentLearnerAction() {
  const id = await getLearnerIdFromCookies();
  if (!id) return null;
  return getLearner(id);
}
