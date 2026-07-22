"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  onboardingInputSchema,
  type OnboardingInput,
} from "@/domain/onboarding/schema";
import { buildStudyPlan } from "@/domain/onboarding/study-plan";
import { track } from "@/lib/analytics";
import {
  defaultGuestOnboardingInput,
  ensureGuestLearner,
  upsertViewerLearnerProfile,
} from "@/server/guest/ensure-guest-learner";
import { getAuthIdentity } from "@/server/learner-session";
import { upsertLearner, getLearner } from "@/server/learner-store";
import { recordProductEvent } from "@/server/product-analytics/store";
import {
  getViewerSession,
  requireViewerSession,
} from "@/server/viewer-session";

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
  const viewer = await requireViewerSession();

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
    const existing = await getLearner(viewer.learnerId);
    const studyPlan = buildStudyPlan(profile);
    const record = await upsertLearner({
      id: viewer.learnerId,
      profile,
      studyPlan,
    });

    track(existing ? "onboarding_updated" : "onboarding_completed", {
      learnerId: record.id,
      mode: profile.studyMode,
      subjects: profile.subjects.length,
      wantsDiagnostic: profile.wantsDiagnostic,
      dailyMinutes: profile.dailyMinutes,
      viewerKind: viewer.kind,
    });
    if (!existing) {
      await recordProductEvent({
        learnerKey: record.id,
        event: "onboarding_completed",
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

/** Skip personalization — save defaults (merged with any draft fields) and study. */
export async function skipOnboardingAction(
  partial?: Partial<OnboardingInput>,
): Promise<OnboardingActionResult> {
  try {
    const viewer = await requireViewerSession();
    const profile = defaultGuestOnboardingInput({
      ...partial,
      displayName:
        partial?.displayName?.trim() ||
        defaultGuestOnboardingInput().displayName,
    });
    const record = await upsertViewerLearnerProfile(viewer.learnerId, profile);
    track("onboarding_skipped", {
      learnerId: record.id,
      viewerKind: viewer.kind,
    });
    revalidatePath("/app/dashboard");
    revalidatePath("/app/learn");
    revalidatePath("/app/plan");
    revalidatePath("/onboarding");
    return {
      ok: true,
      learnerId: record.id,
      wantsDiagnostic: false,
      updated: true,
    };
  } catch (error) {
    console.error("[onboarding] skip failed", error);
    return {
      ok: false,
      error: "Přeskočení se nepovedlo. Zkus to znovu.",
    };
  }
}

export async function getCurrentLearnerAction() {
  const viewer = await getViewerSession({ createGuestIfMissing: false });
  if (!viewer) return null;
  if (viewer.kind === "guest") {
    await ensureGuestLearner(viewer.learnerId);
  }
  return getLearner(viewer.learnerId);
}

/** Optional personalization — guests and authenticated users both allowed. */
export async function requireOnboardingAccessAction(): Promise<{
  learnerId: string;
  email: string | null;
  kind: "authenticated" | "guest";
}> {
  const viewer = await getViewerSession({ createGuestIfMissing: false });
  if (!viewer) {
    redirect("/app/learn");
  }
  if (viewer.kind === "guest") {
    await ensureGuestLearner(viewer.learnerId);
  }
  return {
    learnerId: viewer.learnerId,
    email: viewer.email,
    kind: viewer.kind,
  };
}

/** @deprecated Prefer requireOnboardingAccessAction — kept for call sites. */
export async function requireAuthForOnboarding() {
  const auth = await getAuthIdentity();
  if (!auth) redirect("/onboarding");
  return auth;
}
