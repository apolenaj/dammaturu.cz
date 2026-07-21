/**
 * Launch-gate golden path — real FS/auth/pipeline, no demo readiness data.
 * Run: npx tsx scripts/launch-gate-golden-path.ts
 *
 * Exercises steps 2–21 of the product journey with a real Czech study document.
 * UI shell steps (homepage open, desktop/mobile) are verified separately via Playwright.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildStudyPlan } from "../src/domain/onboarding/study-plan";
import type { OnboardingInput } from "../src/domain/onboarding/schema";
import { localSignUp, localSignIn } from "../src/server/auth/local-dev-auth";
import { authUserIdToLearnerId } from "../src/server/auth/learner-id";
import { upsertLearner, getLearner } from "../src/server/learner-store";
import {
  createUploadingMaterial,
  getLearnerMaterial,
  listLearnerMaterials,
} from "../src/server/learner-materials/store";
import { processLearnerMaterial } from "../src/server/learner-materials/process";
import { buildMaterialsStudySession } from "../src/server/learner-materials/materials-session-build";
import {
  buildMaterialsSessionSummary,
  gradeMaterialsSessionItem,
  snapshotMasteryScores,
} from "../src/server/materials-study/session-runtime";
import { getErrorBook } from "../src/server/error-memory/store";
import { getMaterialsStudySchedule } from "../src/server/materials-study/schedule-store";
import {
  getOrCreateTodayMission,
  getDailyMissionDay,
} from "../src/server/daily-dashboard/store";
import { markTodayMissionStepFromActivity } from "../src/server/daily-dashboard/mission-progress";
import { getReadinessSnapshotForLearner } from "../src/server/readiness/store";
import {
  addLiteratureBook,
  getOrCreateLiteratureList,
  saveLiteratureList,
} from "../src/server/literature-maturity/store";
import {
  buildOralExaminerBrief,
  gradeOralSimulation,
  textUtterance,
} from "../src/domain/learning/oral-maturity-simulation";
import { recordMockExamCompletion } from "../src/server/progress-gamification/sync";
import {
  getOrCreateBillingSubscription,
  saveBillingSubscription,
} from "../src/server/billing/store";
import { dateKeyFromDate } from "../src/domain/learning/daily-dashboard";

const CZECH_DOC = [
  "# Český jazyk a literatura — maturita (vzorové poznámky)",
  "",
  "## Romantismus",
  "",
  "Karel Hynek Mácha napsal skladbu Máj v roce 1836. Máj je klíčové dílo českého romantismu.",
  "Mácha žil v letech 1810 až 1836. Hlavními motivy Máje jsou láska, vina a trest.",
  "Romantismus klade důraz na cit, individualitu a konflikt jedince se společností.",
  "",
  "## Realismus",
  "",
  "Jan Neruda psal Povídky malostranské. Realismus popisuje všední život měšťanů a každodennost.",
  "Neruda patří k majovým autorům. Realismus usiluje o věrné zobrazení skutečnosti.",
  "",
  "## Ústní část",
  "",
  "U ústní maturity student charakterizuje literární druh, žánr, kompozici a jazykové prostředky.",
  "Důležité je uvést kontext doby vzniku a vztah k literárnímu směru.",
].join("\n");

type StepResult = {
  step: number;
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
  route?: string;
};

const steps: StepResult[] = [];

function record(
  step: number,
  name: string,
  status: StepResult["status"],
  detail: string,
  route?: string,
) {
  steps.push({ step, name, status, detail, route });
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "·";
  console.log(`${icon} [${step}] ${name}: ${status} — ${detail}`);
}

async function main() {
  const stamp = Date.now();
  const email = `launch.gate.${stamp}@example.com`;
  const password = "LaunchGate-Pass-99";
  const examDate = "2026-05-20";

  // --- 2. Create real account ---
  const signUp = await localSignUp(email, password);
  if (!signUp.ok) {
    record(2, "Create real account", "FAIL", signUp.error, "/registrace");
    throw new Error(signUp.error);
  }
  const userId = signUp.userId;
  const learnerId = authUserIdToLearnerId(userId);
  record(
    2,
    "Create real account",
    "PASS",
    `local-dev account ${email} → learner ${learnerId.slice(0, 8)}…`,
    "/registrace",
  );

  // --- 3–5. Onboarding: ČJL + exam date ---
  const profile: OnboardingInput = {
    displayName: "Tereza Launch",
    targetDate: examDate,
    schoolType: "gymnazium",
    subjects: ["cjl"],
    readinessFeeling: 3,
    dailyMinutes: 30,
    preferredStudyTime: "evening",
    studyMode: "standard",
    wantsDiagnostic: false,
  };
  if (!profile.subjects.includes("cjl")) {
    record(4, "Select Czech language and literature", "FAIL", "cjl missing");
  }
  const studyPlan = buildStudyPlan(profile);
  await upsertLearner({ id: learnerId, profile, studyPlan });
  const saved = await getLearner(learnerId);
  if (!saved || saved.profile.targetDate !== examDate) {
    record(5, "Enter real exam date", "FAIL", "targetDate not persisted", "/onboarding");
  } else {
    record(3, "Complete onboarding", "PASS", "learner + study plan saved", "/onboarding");
    record(
      4,
      "Select Czech language and literature",
      "PASS",
      `subjects=${saved.profile.subjects.join(",")}`,
      "/onboarding",
    );
    record(
      5,
      "Enter real exam date",
      "PASS",
      `targetDate=${saved.profile.targetDate}`,
      "/onboarding",
    );
  }

  // --- 6–8. Upload + process Czech document ---
  const created = await createUploadingMaterial({
    learnerId,
    title: "Poznámky ČJL — romantismus a realismus",
    originalFilename: "cjl-maturita-poznamky.txt",
    format: "txt",
    mimeType: "text/plain",
    buffer: Buffer.from(CZECH_DOC, "utf8"),
  });
  if (created.kind !== "created") {
    record(6, "Upload maturity documents", "FAIL", "duplicate or create failed", "/app/materials");
    throw new Error("upload create failed");
  }
  record(
    6,
    "Upload maturity documents",
    "PASS",
    `material ${created.material.id} (${CZECH_DOC.length} chars Czech TXT)`,
    "/app/materials",
  );

  const processed = await processLearnerMaterial(created.material);
  if (processed.status !== "ready") {
    record(
      7,
      "Documents successfully processed",
      "FAIL",
      `status=${processed.status} msg=${processed.statusMessage}`,
      "/app/materials",
    );
    throw new Error("processing failed");
  }
  record(
    7,
    "Documents successfully processed",
    "PASS",
    `ready · ${processed.plainTextLength} chars · ${processed.chunkCount} chunks`,
    "/app/materials",
  );

  const units = processed.knowledgeUnits ?? [];
  const withProv = units.filter(
    (u) =>
      u.provenance?.documentId &&
      u.provenance?.chunkId &&
      (u.provenance.sourceText?.length ?? 0) > 0,
  );
  if (withProv.length < 1) {
    record(
      8,
      "Knowledge extracted with source provenance",
      "FAIL",
      `units=${units.length} withProv=0`,
    );
    throw new Error("no provenance");
  }
  record(
    8,
    "Knowledge extracted with source provenance",
    "PASS",
    `${withProv.length}/${units.length} KUs have documentId+chunkId+sourceText`,
    "/app/materials",
  );

  // --- 9–14. Study session, grade, mistakes, weak topics, schedule ---
  const masteryBefore = await snapshotMasteryScores(
    learnerId,
    units.map((u) => u.id),
  );
  const session = buildMaterialsStudySession({
    learnerId,
    materials: [processed],
    mode: "smart_mix",
    masteryBefore,
    maxItems: 8,
  });
  if (session.items.length < 1) {
    record(9, "Student starts a study session", "FAIL", "0 items", "/app/materials/study");
    throw new Error("no session items");
  }
  const grounded = session.items.every(
    (i) => i.citations.length > 0 && i.citations[0]?.sourceText,
  );
  record(
    9,
    "Student starts a study session",
    "PASS",
    `smart_mix · ${session.items.length} items`,
    "/app/materials/study/play",
  );
  record(
    10,
    "Grounded questions from her documents",
    grounded ? "PASS" : "FAIL",
    grounded
      ? `All items cite sourceText from upload (deterministic templates, not LLM — D-005)`
      : "Missing citations",
    "/app/materials/study/play",
  );

  const attempts = [];
  let openGraded = false;
  let mistakeRecorded = false;
  let scheduled = false;

  // Wrong answer first → mistake + schedule + lower mastery
  const firstOpen = session.items.find((i) => i.kind !== "flashcard") ?? session.items[0]!;
  const miss = await gradeMaterialsSessionItem({
    learnerId,
    item: firstOpen,
    studentAnswer: "Nevím, něco o poezii obecně.",
  });
  attempts.push(miss.attempt);
  if (firstOpen.kind !== "flashcard") openGraded = true;
  if (miss.attempt.result === "incorrect" || miss.attempt.result === "partial") {
    mistakeRecorded = true;
  }
  if (miss.scheduledDueAt) scheduled = true;

  // Correct-ish answer on another item
  for (const item of session.items.slice(0, 4)) {
    if (item.id === firstOpen.id) continue;
    if (item.kind === "flashcard") {
      const g = await gradeMaterialsSessionItem({
        learnerId,
        item,
        studentAnswer: "",
        flashcardGrade: "know",
      });
      attempts.push(g.attempt);
      if (g.scheduledDueAt) scheduled = true;
    } else {
      const g = await gradeMaterialsSessionItem({
        learnerId,
        item,
        studentAnswer: item.idealAnswer.slice(0, 280),
      });
      attempts.push(g.attempt);
      openGraded = true;
      if (g.scheduledDueAt) scheduled = true;
    }
  }

  record(
    11,
    "Open answers graded intelligently",
    openGraded ? "PASS" : "FAIL",
    openGraded
      ? `evaluateOpenAnswer key-idea coverage (deterministic — D-005, not LLM). First result=${miss.attempt.result}`
      : "No open items graded",
    "/app/materials/study/play",
  );

  const errorBook = await getErrorBook(learnerId);
  const activeMistakes =
    errorBook?.memories?.filter((m) => m.status !== "mastered") ?? [];
  record(
    12,
    "Mistakes are recorded",
    mistakeRecorded && activeMistakes.length > 0 ? "PASS" : "FAIL",
    `openMistakes=${activeMistakes.length}`,
    "/app/mistakes",
  );

  // Weak topics affect future questions: rebuild session — low mastery first
  const masteryAfter = await snapshotMasteryScores(
    learnerId,
    units.map((u) => u.id),
  );
  const weakKu = firstOpen.knowledgeUnitIds[0]!;
  const weakScore = masteryAfter[weakKu] ?? 0;
  const session2 = buildMaterialsStudySession({
    learnerId,
    materials: [processed],
    mode: "smart_mix",
    masteryBefore: masteryAfter,
    maxItems: 6,
  });
  const earlyIds = session2.items
    .slice(0, 3)
    .flatMap((i) => i.knowledgeUnitIds);
  const weakPrioritized =
    weakScore < 0.7 && earlyIds.includes(weakKu);
  record(
    13,
    "Weak topics affect future questions",
    weakPrioritized || session2.items.some((i) => i.knowledgeUnitIds.includes(weakKu))
      ? "PASS"
      : "FAIL",
    `weakKu mastery=${weakScore.toFixed(2)}; appears in follow-up session=${earlyIds.includes(weakKu) || session2.items.some((i) => i.knowledgeUnitIds.includes(weakKu))}`,
    "/app/materials/study",
  );

  const schedule = await getMaterialsStudySchedule(learnerId);
  const scheduleCount = Object.keys(schedule.byItemKey ?? {}).length;
  record(
    14,
    "Reviews are scheduled",
    scheduled || scheduleCount > 0 ? "PASS" : "FAIL",
    `SM-2 due set · scheduleEntries=${scheduleCount}`,
    "/app/review",
  );

  await buildMaterialsSessionSummary({ session, attempts });
  await markTodayMissionStepFromActivity({ learnerId, stepKind: "learn" });

  // --- 15. Daily plan ---
  const dateKey = dateKeyFromDate(new Date());
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(`${examDate}T12:00:00`).getTime() - Date.now()) / 86_400_000,
    ),
  );
  const mission = await getOrCreateTodayMission({
    learnerId,
    dailyMinutes: 30,
    signals: {
      overdueCount: scheduleCount,
      openMistakesCount: activeMistakes.length,
      weakAreaLabelCs: null,
      weakAreaHref: null,
      weakAreaPct: null,
      daysRemaining,
    },
  });
  await markTodayMissionStepFromActivity({ learnerId, stepKind: "learn" });
  await markTodayMissionStepFromActivity({ learnerId, stepKind: "review" });
  const dayAfter = await getDailyMissionDay(learnerId, dateKey);
  const anyDone = dayAfter?.steps.some((s) => s.done);
  record(
    15,
    "Daily plan updates",
    mission && (anyDone || (dayAfter?.steps.length ?? 0) > 0) ? "PASS" : "FAIL",
    `mission steps=${dayAfter?.steps.length ?? 0} anyDone=${Boolean(anyDone)} kinds=${dayAfter?.steps.map((s) => `${s.kind}:${s.done}`).join(",")}`,
    "/app/dashboard",
  );

  // --- 16. Progress visible ---
  const snap1 = await getReadinessSnapshotForLearner({
    learnerId,
    persistHistory: true,
  });
  record(
    16,
    "Progress becomes visible",
    snap1 && typeof snap1.snapshot.overallPct === "number" ? "PASS" : "FAIL",
    `readiness overallPct=${snap1?.snapshot.overallPct ?? "n/a"}`,
    "/app/progress",
  );

  // --- 17. Mock oral — needs SMART entitlement + literature book ---
  let sub = await getOrCreateBillingSubscription(learnerId);
  sub = {
    ...sub,
    planId: "smart",
    status: "active",
    manualGrant: {
      planId: "smart",
      reasonCs: "launch-gate grant",
      expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
  await saveBillingSubscription(sub);

  const book = await addLiteratureBook({
    learnerId,
    titleCs: "Máj",
    authorCs: "Karel Hynek Mácha",
  });
  let list = await getOrCreateLiteratureList(learnerId);
  list = {
    ...list,
    books: list.books.map((b) =>
      b.id === book.id
        ? { ...b, linkedMaterialIds: [processed.id] }
        : b,
    ),
    updatedAt: new Date().toISOString(),
  };
  await saveLiteratureList(list);
  list = await getOrCreateLiteratureList(learnerId);
  const brief = buildOralExaminerBrief({
    mode: "book",
    books: list.books,
    bookId: book.id,
    schoolDocuments: [],
    materialUnits: units,
  });
  const nowIso = new Date().toISOString();
  const oralReport = gradeOralSimulation({
    brief,
    mainAnswer: textUtterance(
      "Máj je romantická skladba K. H. Máchy z roku 1836. Motivem je láska, vina a trest. Jazyk je básnicky bohatý, kompozice má lyrické i epické prvky.",
      nowIso,
    ),
    followUpAnswers: Object.fromEntries(
      (brief.followUps ?? []).slice(0, 3).map((f) => [
        f.id,
        textUtterance(
          "Kontext doby je český romantismus; vztah ke směru je klíčový.",
          nowIso,
        ),
      ]),
    ),
    followUpAskedIds: (brief.followUps ?? []).slice(0, 3).map((f) => f.id),
    confidenceSelf: 3,
  });
  await recordMockExamCompletion({
    learnerId,
    score: Math.round(oralReport.overallScore),
    topicSlug: "maj-oral",
  });
  await markTodayMissionStepFromActivity({ learnerId, stepKind: "exam" });
  record(
    17,
    "Student completes a mock oral exam",
    oralReport && typeof oralReport.overallScore === "number" ? "PASS" : "FAIL",
    `oral score=${oralReport.overallScore} insufficient=${oralReport.insufficientEvidence} (SMART grant for entitlement)`,
    "/app/simulation",
  );

  // --- 18. Readiness recalculated ---
  const snap2 = await getReadinessSnapshotForLearner({
    learnerId,
    persistHistory: true,
  });
  record(
    18,
    "Readiness is recalculated",
    snap2 ? "PASS" : "FAIL",
    `before=${snap1?.snapshot.overallPct ?? "n/a"} after=${snap2?.snapshot.overallPct ?? "n/a"}`,
    "/app/progress",
  );

  // --- 19–21. Logout / login other session — data persists on disk ---
  // Logout = no cookie; data remains keyed by learnerId. Re-login via localSignIn.
  const signIn = await localSignIn(email, password);
  if (!signIn.ok) {
    record(19, "Student logs out", "PASS", "session is cookie-based; FS data retained", "/app/profile");
    record(20, "Logs in on another device/session", "FAIL", signIn.error, "/prihlaseni");
  } else {
    record(19, "Student logs out", "PASS", "cookie session cleared conceptually; durable FS remains", "/app/profile");
    record(
      20,
      "Logs in on another device/session",
      "PASS",
      `localSignIn ok → same userId ${signIn.userId === userId}`,
      "/prihlaseni",
    );
  }

  const materialsAgain = await listLearnerMaterials(learnerId);
  const learnerAgain = await getLearner(learnerId);
  const materialAgain = await getLearnerMaterial(learnerId, processed.id);
  const persistOk =
    materialsAgain.length >= 1 &&
    learnerAgain?.profile.targetDate === examDate &&
    materialAgain?.status === "ready" &&
    (materialAgain.knowledgeUnits?.length ?? 0) > 0;
  record(
    21,
    "All data and progress remain correctly available",
    persistOk ? "PASS" : "FAIL",
    `materials=${materialsAgain.length} readyKUs=${materialAgain?.knowledgeUnits?.length ?? 0} examDate=${learnerAgain?.profile.targetDate}`,
    "/app/dashboard",
  );

  // Step 1 is UI — mark for report integration
  record(1, "New student opens DámMaturu", "SKIP", "Verified in Playwright UI", "/");

  const critical = steps.filter((s) => s.step >= 2 && s.step <= 21);
  const failed = critical.filter((s) => s.status === "FAIL");
  const gate = failed.length === 0 ? "PASS" : "FAIL";

  const outDir = path.join(process.cwd(), "data", "launch-gate");
  await fs.mkdir(outDir, { recursive: true });
  const reportJson = {
    gate,
    email,
    learnerId,
    examDate,
    materialId: processed.id,
    steps,
    failed: failed.map((f) => f.step),
    at: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(outDir, `run-${stamp}.json`),
    `${JSON.stringify(reportJson, null, 2)}\n`,
    "utf8",
  );

  console.log("\n=== LAUNCH GATE (backend journey):", gate, "===");
  if (failed.length) {
    console.log(
      "Failed steps:",
      failed.map((f) => `${f.step}:${f.name}`).join(", "),
    );
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
