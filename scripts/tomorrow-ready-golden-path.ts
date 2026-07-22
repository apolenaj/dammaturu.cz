/**
 * P0 release readiness — anonymous guest golden path (server + HTTP).
 * Covers catalog, learning session, testing engine, mistakes, schedule, progress.
 * Run: npx tsx scripts/tomorrow-ready-golden-path.ts
 */
import { createGuestLearnerId, isGuestLearnerId } from "../src/server/guest/guest-id";
import { ensureGuestLearner } from "../src/server/guest/ensure-guest-learner";
import { getLearner } from "../src/server/learner-store";
import {
  getStudyContentEntry,
  listCatalogMaterials,
} from "../src/server/study-content/registry";
import { CATALOG_DOCX_MANIFEST } from "../src/domain/study-content/registry";
import { buildCatalogLearningSession } from "../src/server/learning-session/build-from-catalog";
import {
  DONT_KNOW_TOKEN,
  gradeLearningResponse,
} from "../src/domain/learning/learning-session-engine";
import { applyLearningSessionSchedule } from "../src/server/learning-session/schedule-store";
import {
  buildTestingSession,
  gradeTestingAnswer,
  DONT_KNOW_TOKEN as TEST_DONT_KNOW,
} from "../src/domain/learning/testing-engine";
import { buildTestingPool } from "../src/server/testing-engine/build-pool";
import { ingestMeaningfulMistake } from "../src/server/error-memory/ingest";
import { getErrorBook, getOrCreateErrorBook } from "../src/server/error-memory/store";
import { getReadinessBook } from "../src/server/readiness/store";
import { recordReadinessPractice } from "../src/server/readiness/record-practice";
import { buildProgressEvidenceView } from "../src/domain/learning/progress-evidence";
import { promises as fs } from "node:fs";
import path from "node:path";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`P0 FAIL: ${msg}`);
}

async function main() {
  const blockers: string[] = [];
  const guestId = createGuestLearnerId();
  assert(isGuestLearnerId(guestId), "guest id shape");

  const learner = await ensureGuestLearner(guestId);
  assert(learner.id === guestId, "ensure guest learner");
  assert(
    (await getLearner(guestId))?.id === guestId,
    "guest learner persists",
  );

  // Catalog: every inventory DOCX row appears in Moje materiály catalog
  const inventoryRows = CATALOG_DOCX_MANIFEST;
  const materials = await listCatalogMaterials({
    subjectSlug: "cjl",
    includeUnavailable: true,
  });
  assert(materials.length >= inventoryRows.length, `catalog count ${materials.length} < inventory ${inventoryRows.length}`);
  for (const row of inventoryRows) {
    const hit = materials.find((m) => m.sourceId === row.sourceId);
    if (!hit) blockers.push(`Missing catalog entry: ${row.sourceId}`);
  }

  const available = (
    await Promise.all(
      materials.map(async (m) => {
        const e = await getStudyContentEntry(m.sourceId);
        return e;
      }),
    )
  ).filter(
    (e): e is NonNullable<typeof e> =>
      Boolean(e?.parseComplete && e.chunks.length > 0),
  );
  assert(available.length >= 1, "at least one parse-complete source");

  const primary =
    available.find((e) => e.knowledgeUnits.length > 0) ?? available[0]!;
  const secondary =
    available.find((e) => e.sourceId !== primary.sourceId) ?? primary;

  // Learning session — answer ≥5 steps with feedback
  const learnSession = buildCatalogLearningSession({
    learnerId: guestId,
    entry: primary,
    maxAtoms: 3,
  });
  assert(learnSession && learnSession.items.length >= 5, "learning session ≥5 items");

  let answered = 0;
  let sawFeedback = false;
  for (const item of learnSession!.items) {
    if (item.stepKind === "micro") continue;
    if (answered >= 5) break;
    const raw =
      item.choices.length > 0
        ? (item.choices.find((c) => !c.correct)?.id ??
          item.choices[0]!.id)
        : answered === 0
          ? DONT_KNOW_TOKEN
          : item.idealAnswer;
    const grade = gradeLearningResponse({ item, rawAnswer: raw });
    assert(grade.conciseExplanation.length > 5, "learning feedback explanation");
    assert(grade.source.excerpt.length > 5, "learning feedback source");
    sawFeedback = true;
    await applyLearningSessionSchedule({
      learnerId: guestId,
      atomId: item.atomId,
      grade: grade.reviewGrade,
    });
    if (grade.result !== "correct") {
      await ingestMeaningfulMistake({
        learnerId: guestId,
        question: item.prompt.slice(0, 500),
        studentAnswer: raw.slice(0, 500) || "—",
        correctConcept: item.idealAnswer.slice(0, 500),
        knowledgeUnit: {
          id: item.atomId,
          title: item.prompt.slice(0, 80),
        },
        source: "question_engine",
        result: grade.result === "partial" ? "partial" : "incorrect",
        sourceLabel: item.source.sourceTitle,
        sourceExcerpt: item.source.excerpt.slice(0, 900),
      });
    }
    answered += 1;
  }
  assert(answered >= 5, `answered ${answered} learning items`);
  assert(sawFeedback, "feedback produced");

  // Mistake book
  await getOrCreateErrorBook(guestId);
  const book = await getErrorBook(guestId);
  assert(book && book.memories.length >= 1, "mistake in Moje chyby");

  // Schedule file exists
  const schedPath = path.join(
    process.cwd(),
    "data",
    "learning-session-schedule",
    `${guestId}.json`,
  );
  const schedRaw = await fs.readFile(schedPath, "utf8");
  const sched = JSON.parse(schedRaw) as { entries: Record<string, { dueAt: string }> };
  assert(Object.keys(sched.entries).length >= 1, "review scheduled");

  // Persist check
  const book2 = await getErrorBook(guestId);
  assert(
    (book2?.memories.length ?? 0) >= 1,
    "progress remains after re-read (mistakes)",
  );

  // Second topic + testing engine (quick test)
  const pool = buildTestingPool({
    catalog: [secondary],
    materials: [],
    errorBook: book2,
    readinessBook: await getReadinessBook(guestId),
  });
  const testSession = buildTestingSession({
    learnerId: guestId,
    mode: "quick_5",
    pool,
  });
  assert(testSession && testSession.questions.length >= 1, "quick_5 session");

  let testAnswered = 0;
  for (const q of testSession!.questions) {
    const raw =
      q.choices.length > 0
        ? (q.choices.find((c) => c.id !== q.validatedAnswer.correctChoiceId)
            ?.id ?? TEST_DONT_KNOW)
        : TEST_DONT_KNOW;
    const grade = gradeTestingAnswer({ question: q, rawAnswer: raw });
    assert(grade.correctiveFeedback.length > 3, "test corrective feedback");
    await applyLearningSessionSchedule({
      learnerId: guestId,
      atomId: q.knowledgeUnitId,
      grade: grade.reviewGrade,
    });
    await recordReadinessPractice({
      learnerId: guestId,
      units: [{ id: q.knowledgeUnitId, title: q.topic }],
      correctness: grade.result,
      kind: "practice",
      difficulty: q.difficulty,
    });
    if (grade.result !== "correct") {
      await ingestMeaningfulMistake({
        learnerId: guestId,
        question: q.stem.slice(0, 500),
        studentAnswer: String(raw).slice(0, 500),
        correctConcept: q.validatedAnswer.canonical.slice(0, 500),
        knowledgeUnit: { id: q.knowledgeUnitId, title: q.topic },
        source: "question_engine",
        sourceLabel: q.provenance.sourceTitle,
        sourceExcerpt: q.provenance.excerpt.slice(0, 900),
      });
    }
    testAnswered += 1;
  }
  assert(testAnswered >= 1, "completed quick test");

  // Progress view
  const readiness = await getReadinessBook(guestId);
  const progress = buildProgressEvidenceView({
    units: (readiness?.units ?? []).map((u) => ({
      id: u.id,
      title: u.title,
      topic: u.areaId,
      examWeight: u.examWeight,
      state: u.state,
    })),
    errorBook: await getErrorBook(guestId),
  });
  assert(progress.disclaimerCs.length > 10, "progress disclaimer");
  assert(
    !/npm run seed/i.test(progress.disclaimerCs),
    "no seed CLI in progress",
  );

  // Seed message scan on catalog unavailable reasons
  for (const m of materials) {
    if (m.unavailableReason && /npm run/i.test(m.unavailableReason)) {
      blockers.push(`Seed/CLI leak in catalog: ${m.sourceId}`);
    }
  }

  if (blockers.length) {
    console.error(JSON.stringify({ ok: false, blockers }, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        guestId: guestId.slice(0, 12) + "…",
        catalogCount: materials.length,
        inventoryCount: inventoryRows.length,
        primarySource: primary.sourceId,
        secondarySource: secondary.sourceId,
        learningAnswers: answered,
        mistakes: (await getErrorBook(guestId))?.memories.length ?? 0,
        scheduledCards: Object.keys(sched.entries).length,
        quickTestAnswers: testAnswered,
        progressUnits: progress.totalUnits,
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
