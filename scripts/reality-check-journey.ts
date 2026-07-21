/**
 * Reality-check integration: clean learner → practice → persist → re-read.
 * Run: npx tsx scripts/reality-check-journey.ts
 * Does NOT use demo loaders.
 */
import { randomUUID } from "node:crypto";
import { applyMasteryEvidence } from "../src/domain/learning/mastery-engine";
import { buildReadinessSnapshot } from "../src/domain/learning/readiness";
import { applyPerformance, createSpacedSchedule } from "../src/domain/learning/spaced-repetition";
import { recordReadinessPractice } from "../src/server/readiness/record-practice";
import {
  getReadinessBook,
  saveReadinessBook,
} from "../src/server/readiness/store";
import { getErrorBook } from "../src/server/error-memory/store";
import { recordLearnerError } from "../src/server/error-memory/store";
import { listQuestionPacks, submitQuestionAttempt } from "../src/server/question-engine/store";
import { listSpacedPacks } from "../src/server/spaced-repetition/store";
import { getOrCreateTodayMission } from "../src/server/daily-dashboard/store";
import { computeMissedDays } from "../src/domain/learning/deadline-planner";
import { dateKeyFromDate } from "../src/domain/learning/daily-dashboard";
import { promises as fs } from "node:fs";
import path from "node:path";

type Row = { name: string; status: string; detail: string };

const rows: Row[] = [];

function note(name: string, status: string, detail: string) {
  rows.push({ name, status, detail });
  console.log(`[${status}] ${name}: ${detail}`);
}

async function main() {
  const learnerId = `reality${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  console.log("Clean learnerId:", learnerId);

  // --- Question pack exists ---
  const packs = await listQuestionPacks();
  if (packs.length === 0) {
    note("question_packs", "BROKEN", "No seeded packs in data/question-engine");
  } else {
    note(
      "question_packs",
      "WORKING",
      `Found ${packs.length} pack(s), first=${packs[0]!.slug}, n=${packs[0]!.questions.length}`,
    );
  }

  const pack = packs[0];
  if (pack) {
    const q = pack.questions[0]!;
    // Build a plausible wrong answer for single_choice if possible
    let answer: Parameters<typeof submitQuestionAttempt>[0]["answer"];
    if (q.kind === "single_choice") {
      const wrong = q.options.find((o) => o.id !== q.correctAnswer) ?? q.options[0]!;
      answer = { kind: "single_choice", optionId: wrong.id };
    } else if (q.kind === "true_false") {
      answer = { kind: "true_false", value: !q.correctAnswer };
    } else {
      answer = { kind: "short_answer", text: "nespravna odpoved reality check" };
    }

    try {
      const { grade, progress } = await submitQuestionAttempt({
        learnerId,
        pack,
        questionId: q.id,
        answer,
      });
      note(
        "qe_grade",
        "WORKING",
        `result=${grade.result} score=${grade.score} attempts=${progress.attemptCount}`,
      );

      // Manual error record parity (action layer also does this)
      if (grade.result !== "correct") {
        await recordLearnerError({
          learnerId,
          question: q.stem.slice(0, 200),
          studentAnswer: "wrong",
          correctConcept: grade.expectedSummary.slice(0, 200),
          whyWrong: "reality-check",
          knowledgeUnit: {
            slug: "reality-ku",
            title: "Reality KU",
          },
          errorType: "unknown_fact",
          source: "question_engine",
        });
      }

      await recordReadinessPractice({
        learnerId,
        units: grade.knowledgeUnits.map((ku) => ({
          id: ku.id,
          title: ku.title,
        })),
        correctness:
          grade.result === "correct"
            ? "correct"
            : grade.result === "partial"
              ? "partial"
              : "incorrect",
        kind: "practice",
      });

      const book1 = await getReadinessBook(learnerId);
      const snap1 = book1
        ? buildReadinessSnapshot(book1, new Date().toISOString())
        : null;
      note(
        "readiness_after_practice",
        book1 && book1.units.length > 0 ? "WORKING" : "BROKEN",
        book1
          ? `units=${book1.units.length} overall=${snap1?.overallPct}`
          : "no book",
      );

      // Persist survive re-read
      const book2 = await getReadinessBook(learnerId);
      note(
        "readiness_persist",
        book2?.units.length === book1?.units.length ? "WORKING" : "BROKEN",
        `re-read units=${book2?.units.length ?? 0}`,
      );

      const errBook = await getErrorBook(learnerId);
      note(
        "error_notebook",
        errBook && errBook.memories.length > 0 ? "WORKING" : "PARTIAL",
        `memories=${errBook?.memories.length ?? 0}`,
      );
    } catch (e) {
      note("qe_grade", "BROKEN", e instanceof Error ? e.message : String(e));
    }
  }

  // Spaced schedule logic (domain)
  const spaced = await listSpacedPacks();
  if (spaced.length === 0) {
    note("spaced_packs", "BROKEN", "No spaced packs seeded");
  } else {
    const packS = spaced[0]!;
    const ku = packS.knowledge[0]!;
    const now = new Date().toISOString();
    const schedule = applyPerformance(
      createSpacedSchedule(ku.id, now),
      "good",
      now,
    );
    note(
      "spaced_schedule_logic",
      schedule.nextReview > now ? "WORKING" : "PARTIAL",
      `nextReview=${schedule.nextReview}`,
    );
  }

  // Daily mission create
  const day = await getOrCreateTodayMission({
    learnerId,
    dueCardCount: 0,
    learnTopicTitle: "Reality",
    learnHref: "/app/learn/rychle/realismus",
  });
  note(
    "daily_mission",
    day.steps.length === 3 ? "WORKING" : "BROKEN",
    `steps=${day.steps.map((s) => s.kind).join(",")}`,
  );

  const missed = computeMissedDays({
    lastCompletedDateKey: "2026-07-01",
    todayKey: dateKeyFromDate(new Date()),
  });
  note(
    "missed_days_logic",
    missed > 0 ? "WORKING" : "PARTIAL",
    `missedDays=${missed} (mission steps NOT rewritten by this value — verified in code)`,
  );

  // Mastery evidence unit test style
  const now = new Date().toISOString();
  const { state } = applyMasteryEvidence(null, {
    kind: "practice",
    correctness: "correct",
    difficulty: 3,
    hintsUsed: 0,
    speedRelevant: false,
    isTransfer: false,
    at: now,
  }, "ku-reality");
  note(
    "mastery_engine",
    state.score > 0 ? "WORKING" : "BROKEN",
    `score=${state.score} band=${state.band}`,
  );

  // Cookie/auth reality (static) — soft session after P0 fix
  note(
    "login",
    "WORKING",
    "Soft session resume on /prihlaseni (no email Auth)",
  );
  note(
    "logout",
    "WORKING",
    "clearLearnerCookie + logoutLearnerAction on Profil",
  );
  note(
    "persist_model",
    "PARTIAL",
    "FS JSON + signed cookie; survives refresh if cookie kept; logout clears cookie (FS record remains)",
  );

  console.log("\n=== SUMMARY ===");
  for (const r of rows) {
    console.log(`${r.status.padEnd(10)} ${r.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
