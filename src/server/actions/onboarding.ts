"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  onboardingInputSchema,
  type OnboardingInput,
} from "@/domain/onboarding/schema";
import { buildStudyPlan } from "@/domain/onboarding/study-plan";
import { track } from "@/lib/analytics";
import { getAuthIdentity } from "@/server/learner-session";
import { upsertLearner, getLearner } from "@/server/learner-store";
import { recordProductEvent } from "@/server/product-analytics/store";

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
      code?: string;
    };

export async function saveOnboardingAction(
  raw: unknown,
): Promise<OnboardingActionResult> {
  const identity = await getAuthIdentity();
  if (!identity) {
    return {
      ok: false,
      error: "Nejdřív se přihlas nebo zaregistruj.",
      code: "unauthorized",
    };
  }

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
    const existing = await getLearner(identity.learnerId);
    const studyPlan = buildStudyPlan(profile);
    const record = await upsertLearner({
      id: identity.learnerId,
      profile,
      studyPlan,
    });

    track(existing ? "onboarding_updated" : "onboarding_completed", {
      learnerId: record.id,
      mode: profile.studyMode,
      subjects: profile.subjects.length,
      wantsDiagnostic: profile.wantsDiagnostic,
      dailyMinutes: profile.dailyMinutes,
    });
    if (!existing) {
      await recordProductEvent({
        learnerKey: record.id,
        event: "onboarding_completed",
        funnelStep: "onboarding_completed",
      });
    }
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
  const identity = await getAuthIdentity();
  if (!identity) return null;
  return getLearner(identity.learnerId);
}

/** Used by onboarding page when unauthenticated — redirect to registrace. */
export async function requireOnboardingAccessAction(): Promise<{
  learnerId: string;
  email: string | null;
}> {
  const identity = await getAuthIdentity();
  if (!identity) {
    redirect("/registrace?next=/onboarding");
  }
  return { learnerId: identity.learnerId, email: identity.email };
}
