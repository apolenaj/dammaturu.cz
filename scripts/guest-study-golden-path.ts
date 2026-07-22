/**
 * Server-side guest study golden path (no browser).
 * Validates guest learner id → same stores as authenticated → progress survives.
 *
 * Run: npx tsx scripts/guest-study-golden-path.ts
 */
import { createGuestLearnerId, isGuestLearnerId } from "../src/server/guest/guest-id";
import { ensureGuestLearner } from "../src/server/guest/ensure-guest-learner";
import { getLearner } from "../src/server/learner-store";
import { getQuickGraspPackBySlug, recordMicroAnswer } from "../src/server/quick-grasp/store";
import {
  getQuestionPackBySlug,
  getQuestionProgress,
  submitQuestionAttempt,
} from "../src/server/question-engine/store";
import { getErrorBook, getOrCreateErrorBook } from "../src/server/error-memory/store";
import { ingestMeaningfulMistake } from "../src/server/error-memory/ingest";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const guestId = createGuestLearnerId();
  assert(isGuestLearnerId(guestId), "guest id shape");

  const learner = await ensureGuestLearner(guestId);
  assert(learner.id === guestId, "learner id");
  assert(learner.profile.subjects.includes("cjl"), "ČJL default subject");

  const again = await getLearner(guestId);
  assert(again, "learner persists on disk");

  const qg = await getQuickGraspPackBySlug("realismus");
  assert(qg, "quick-grasp pack realismus seeded");
  const micro = qg.steps.find((s) => s.type === "micro");
  assert(micro && micro.type === "micro", "micro step");
  const progress = await recordMicroAnswer({
    learnerId: guestId,
    pack: qg,
    stepId: micro.id,
    choiceIndex: 0,
    correct: false,
  });
  assert(progress.checksAnswered >= 1, "quick-grasp progress saved");

  const pack = await getQuestionPackBySlug("cjl-otazky");
  assert(pack, "question pack seeded");
  const q = pack.questions.find((x) => x.kind === "single_choice");
  assert(q && q.kind === "single_choice", "single_choice question");
  const wrong = q.options.find((o) => !("correct" in o) || !(o as { correct?: boolean }).correct);
  // Prefer known wrong labels from seed
  const wrongOpt =
    q.options.find((o) => /Allegorie|Automatické|Cit a subjektivita/i.test(o.label)) ??
    q.options[0]!;

  const { progress: qp, grade } = await submitQuestionAttempt({
    learnerId: guestId,
    pack,
    questionId: q.id,
    answer: { kind: "single_choice", optionId: wrongOpt.id },
  });
  assert(qp.completedQuestionIds.includes(q.id), "question progress saved");
  assert(grade.result === "incorrect" || grade.result === "partial" || grade.result === "correct", "graded");

  if (grade.result !== "correct") {
    await ingestMeaningfulMistake({
      learnerId: guestId,
      question: q.stem.slice(0, 200),
      studentAnswer: wrongOpt.label,
      correctConcept: grade.expectedSummary.slice(0, 200),
      knowledgeUnit: {
        slug: pack.slug,
        title: pack.title,
      },
      source: "question_engine",
      result: grade.result,
    });
  }

  await getOrCreateErrorBook(guestId);
  const book = await getErrorBook(guestId);
  assert(book, "error book exists");

  const qp2 = await getQuestionProgress(guestId, pack.id);
  assert(qp2?.completedQuestionIds.includes(q.id), "progress survives re-read");

  const learner2 = await getLearner(guestId);
  assert(learner2?.studyPlan.dailyMinutes, "study plan survives");

  console.log(
    JSON.stringify(
      {
        ok: true,
        guestId: guestId.slice(0, 10) + "…",
        quickGraspAnswered: progress.checksAnswered,
        questionsCompleted: qp2?.completedQuestionIds.length ?? 0,
        mistakes: book?.memories?.length ?? 0,
        grade: grade.result,
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
