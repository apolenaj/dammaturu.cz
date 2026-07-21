/**
 * Local Auth helper — creates a user + learner for manual browser testing.
 * Prefer UI: /registrace. This script only seeds auth-local + learner files.
 *
 * Run: npx tsx scripts/create-local-beta-learner.ts
 */
import { localSignUp } from "../src/server/auth/local-dev-auth";
import { authUserIdToLearnerId } from "../src/server/auth/learner-id";
import { upsertLearner } from "../src/server/learner-store";
import { buildStudyPlan } from "../src/domain/onboarding/study-plan";
import type { OnboardingInput } from "../src/domain/onboarding/schema";

async function main() {
  const email = process.env.LOCAL_BETA_EMAIL ?? "localbeta@example.com";
  const password = process.env.LOCAL_BETA_PASSWORD ?? "localbeta-password";

  let userId: string;
  const signUp = await localSignUp(email, password);
  if (signUp.ok) {
    userId = signUp.userId;
  } else if (signUp.code === "existing_account") {
    const { localSignIn } = await import("../src/server/auth/local-dev-auth");
    const signIn = await localSignIn(email, password);
    if (!signIn.ok) {
      throw new Error(
        `Účet ${email} existuje, ale heslo nesedí. Změň LOCAL_BETA_PASSWORD.`,
      );
    }
    userId = signIn.userId;
  } else {
    throw new Error(signUp.error);
  }

  const learnerId = authUserIdToLearnerId(userId);
  const profile: OnboardingInput = {
    displayName: "LocalBeta",
    targetDate: "2026-08-31",
    schoolType: "gymnazium",
    subjects: ["cjl"],
    readinessFeeling: 3,
    dailyMinutes: 25,
    preferredStudyTime: "evening",
    studyMode: "standard",
    wantsDiagnostic: true,
  };
  const studyPlan = buildStudyPlan(profile);
  const record = await upsertLearner({
    id: learnerId,
    profile,
    studyPlan,
  });

  console.log(
    JSON.stringify(
      {
        email,
        password,
        userId,
        learnerId: record.id,
        displayName: record.profile.displayName,
        note: "Přihlas se na /prihlaseni (local-dev Auth, dokud není Supabase).",
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
