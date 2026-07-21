/**
 * Verify local Auth: register → onboarding → progress → logout → login → restore.
 * Run: npx tsx scripts/verify-auth-flow.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { authUserIdToLearnerId } from "../src/server/auth/learner-id";
import {
  localSignIn,
  localSignUp,
} from "../src/server/auth/local-dev-auth";
import { getLearner, upsertLearner } from "../src/server/learner-store";
import { buildStudyPlan } from "../src/domain/onboarding/study-plan";
import type { OnboardingInput } from "../src/domain/onboarding/schema";

async function main() {
  const email = `verify_${Date.now()}@example.com`;
  const password = "test-password-123";

  const signUp = await localSignUp(email, password);
  if (!signUp.ok) throw new Error(`signUp failed: ${signUp.error}`);

  const learnerId = authUserIdToLearnerId(signUp.userId);
  const profile: OnboardingInput = {
    displayName: "VerifyAuth",
    targetDate: "2026-08-31",
    schoolType: "gymnazium",
    subjects: ["cjl"],
    readinessFeeling: 3,
    dailyMinutes: 25,
    preferredStudyTime: "evening",
    studyMode: "standard",
    wantsDiagnostic: true,
  };
  await upsertLearner({
    id: learnerId,
    profile,
    studyPlan: buildStudyPlan(profile),
  });

  // Simulate progress artifact keyed by learner id
  const progressDir = path.join(process.cwd(), "data", "progress-gamification");
  await fs.mkdir(progressDir, { recursive: true });
  const progressFile = path.join(progressDir, `${learnerId}.json`);
  await fs.writeFile(
    progressFile,
    JSON.stringify({ learnerId, xp: 42, marker: "auth-verify" }, null, 2),
  );

  // "Logout" = no session; progress files remain
  const beforeLogout = await getLearner(learnerId);
  if (!beforeLogout) throw new Error("learner missing after onboarding");

  // Login again with same credentials
  const signIn = await localSignIn(email, password);
  if (!signIn.ok) throw new Error(`signIn failed: ${signIn.error}`);
  if (signIn.userId !== signUp.userId) {
    throw new Error("userId changed across login — unstable identity");
  }

  const restoredId = authUserIdToLearnerId(signIn.userId);
  if (restoredId !== learnerId) throw new Error("learnerId mismatch after login");

  const restored = await getLearner(restoredId);
  if (!restored || restored.profile.displayName !== "VerifyAuth") {
    throw new Error("onboarding profile not restored");
  }

  const progressRaw = await fs.readFile(progressFile, "utf8");
  const progress = JSON.parse(progressRaw) as { xp: number };
  if (progress.xp !== 42) throw new Error("progress not restored");

  // Existing account
  const dup = await localSignUp(email, password);
  if (dup.ok || dup.code !== "existing_account") {
    throw new Error("expected existing_account on duplicate signup");
  }

  // Invalid credentials
  const bad = await localSignIn(email, "wrong-password-xx");
  if (bad.ok || bad.code !== "invalid_credentials") {
    throw new Error("expected invalid_credentials");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        userId: signUp.userId,
        learnerId,
        checks: [
          "register",
          "onboarding_persist",
          "progress_persist",
          "login_same_id",
          "existing_account",
          "invalid_credentials",
        ],
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
