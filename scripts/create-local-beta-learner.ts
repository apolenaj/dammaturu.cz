/**
 * Create local beta learner for manual testing.
 * Run: npx tsx scripts/create-local-beta-learner.ts
 */
import { upsertLearner } from "../src/server/learner-store";
import { signLearnerId } from "../src/server/safe-id";
import { buildStudyPlan } from "../src/domain/onboarding/study-plan";
import type { OnboardingInput } from "../src/domain/onboarding/schema";

async function main() {
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
    id: "localbeta_dev_account01",
    profile,
    studyPlan,
  });
  const cookie = signLearnerId(record.id);
  console.log(
    JSON.stringify(
      {
        learnerId: record.id,
        displayName: record.profile.displayName,
        cookieName: "dm_learner_id",
        cookieValue: cookie,
        note: "Beta nemá email/heslo — session = signed cookie po onboardingu.",
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
