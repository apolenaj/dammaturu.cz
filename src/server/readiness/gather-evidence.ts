import { retrievability } from "@/domain/learning/fsrs";
import type { ReadinessEvidenceInput } from "@/domain/learning/readiness";
import { getReadinessBook } from "@/server/readiness/store";
import { listReadinessHistory } from "@/server/readiness/history-store";

/**
 * Gather real signals for evidence-based readiness.
 * Returns zeros/nulls when a source has no data — never invents scores.
 */
export async function gatherReadinessEvidence(
  learnerId: string,
): Promise<Omit<ReadinessEvidenceInput, "book" | "nowIso">> {
  const history = await listReadinessHistory(learnerId);

  let didacticEvidenceCount = 0;
  let didacticHits = 0;
  let didacticTotal = 0;

  const oralEvidenceCount = 0;
  const oralScoreSum = 0;
  const oralScoreN = 0;

  let writingEvidenceCount = 0;
  let writingScoreSum = 0;
  let writingScoreN = 0;

  let materialsEvidenceCount = 0;
  let materialsScoreSum = 0;
  let materialsScoreN = 0;

  let retentionEvidenceCount = 0;
  let retentionScoreSum = 0;
  let retentionScoreN = 0;

  let consistencyEvidenceCount = 0;
  let consistencyScorePct: number | null = null;

  // Mastery book evidence (baseline didactic)
  const book = await getReadinessBook(learnerId);
  if (book) {
    for (const u of book.units) {
      didacticEvidenceCount += u.state.evidenceCount;
      if (u.state.evidenceCount > 0) {
        didacticHits += (u.state.score / 100) * u.state.evidenceCount;
        didacticTotal += u.state.evidenceCount;
      }
    }
  }

  // Open-answer evals
  try {
    const { promises: fs } = await import("node:fs");
    const path = await import("node:path");
    const root = path.join(process.cwd(), "data", "open-answer-evals", learnerId);
    const indexPath = path.join(root, "index.jsonl");
    const raw = await fs.readFile(indexPath, "utf8");
    for (const line of raw.split("\n").filter(Boolean)) {
      const row = JSON.parse(line) as {
        source?: string;
        masteryCorrectness?: string;
      };
      const correct =
        row.masteryCorrectness === "correct"
          ? 1
          : row.masteryCorrectness === "partial"
            ? 0.5
            : 0;
      if (
        row.source === "question_engine" ||
        row.source === "grounded_study"
      ) {
        didacticEvidenceCount += 1;
        didacticHits += correct;
        didacticTotal += 1;
      }
      if (row.source === "materials_study_session") {
        materialsEvidenceCount += 1;
        materialsScoreSum += correct * 100;
        materialsScoreN += 1;
        writingEvidenceCount += 1;
        writingScoreSum += correct * 100;
        writingScoreN += 1;
      }
      if (row.source === "question_engine") {
        // long-form practice counts toward writing lightly
        writingEvidenceCount += 0; // already counted didactic
      }
    }
  } catch {
    // no evals yet
  }

  // Spaced repetition retention
  try {
    const { listSpacedPacks, getScheduleBook } = await import(
      "@/server/spaced-repetition/store"
    );
    const packs = await listSpacedPacks();
    const now = Date.now();
    for (const pack of packs.slice(0, 2)) {
      const schBook = await getScheduleBook(learnerId, pack.id);
      if (!schBook) continue;
      for (const sch of Object.values(schBook.byKnowledgeId)) {
        if (!sch.lastReviewed) continue;
        retentionEvidenceCount += Math.max(1, sch.reviewCount);
        const elapsed =
          (now - new Date(sch.lastReviewed).getTime()) /
          (1000 * 60 * 60 * 24);
        const r = retrievability(sch.stability, Math.max(0, elapsed));
        // Penalize lapses
        const score = Math.max(0, Math.min(100, r * 100 - sch.lapseCount * 4));
        retentionScoreSum += score;
        retentionScoreN += 1;
      }
    }
  } catch {
    // no SR pack
  }

  // Flashcard retention
  try {
    const { listFlashcardDecks, getOrCreateSchedule } = await import(
      "@/server/flashcards/store"
    );
    const decks = await listFlashcardDecks();
    const nowIso = new Date().toISOString();
    for (const deck of decks.slice(0, 3)) {
      const schedule = await getOrCreateSchedule(learnerId, deck);
      for (const entry of Object.values(schedule.byCardId)) {
        if (!entry.lastReviewedAt) continue;
        retentionEvidenceCount += Math.max(1, entry.repetitions);
        const stability = entry.stability ?? Math.max(0.4, entry.intervalDays);
        const elapsed =
          (new Date(nowIso).getTime() -
            new Date(entry.lastReviewedAt).getTime()) /
          (1000 * 60 * 60 * 24);
        const r = retrievability(stability, Math.max(0, elapsed));
        retentionScoreSum += Math.max(0, Math.min(100, r * 100 - entry.lapses * 5));
        retentionScoreN += 1;
      }
    }
  } catch {
    // no decks
  }

  // Materials schedule activity
  try {
    const { getMaterialsStudySchedule } = await import(
      "@/server/materials-study/schedule-store"
    );
    const schedule = await getMaterialsStudySchedule(learnerId);
    const entries = Object.values(schedule.byItemKey);
    materialsEvidenceCount += entries.filter((e) => e.lastReviewedAt).length;
    for (const e of entries) {
      if (!e.lastReviewedAt) continue;
      const stability = e.stability ?? Math.max(0.4, e.intervalDays);
      const score = Math.min(100, stability * 12 + e.repetitions * 8);
      materialsScoreSum += score;
      materialsScoreN += 1;
      retentionEvidenceCount += 1;
      retentionScoreSum += Math.min(100, score);
      retentionScoreN += 1;
    }
  } catch {
    // none
  }

  // Consistency from daily missions + streak
  try {
    const { getDailyStreak, getDailyMissionDay } = await import(
      "@/server/daily-dashboard/store"
    );
    const { dateKeyFromDate } = await import("@/domain/learning/daily-dashboard");
    const streak = await getDailyStreak(learnerId);
    let done = 0;
    let seen = 0;
    const now = new Date();
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const key = dateKeyFromDate(d);
      const day = await getDailyMissionDay(learnerId, key);
      if (!day) continue;
      seen += 1;
      if (day.steps.every((s) => s.done)) done += 1;
      else if (day.steps.some((s) => s.done)) done += 0.5;
    }
    consistencyEvidenceCount = Math.max(seen, streak?.currentStreak ?? 0);
    if (seen > 0) {
      consistencyScorePct = Math.round((done / seen) * 100);
    }
    if (streak && streak.currentStreak > 0) {
      const streakPct = Math.min(100, Math.round((streak.currentStreak / 14) * 100));
      consistencyScorePct =
        consistencyScorePct == null
          ? streakPct
          : Math.round(consistencyScorePct * 0.65 + streakPct * 0.35);
      consistencyEvidenceCount = Math.max(
        consistencyEvidenceCount,
        streak.currentStreak,
      );
    }
  } catch {
    // none
  }

  const didacticAccuracyPct =
    didacticTotal > 0
      ? Math.round((didacticHits / didacticTotal) * 100)
      : book && book.units.length > 0
        ? Math.round(
            book.units.reduce((s, u) => s + u.state.score, 0) / book.units.length,
          )
        : null;

  return {
    didacticEvidenceCount,
    didacticAccuracyPct,
    oralEvidenceCount,
    oralScorePct: oralScoreN > 0 ? Math.round(oralScoreSum / oralScoreN) : null,
    writingEvidenceCount,
    writingScorePct:
      writingScoreN > 0 ? Math.round(writingScoreSum / writingScoreN) : null,
    materialsEvidenceCount,
    materialsScorePct:
      materialsScoreN > 0
        ? Math.round(materialsScoreSum / materialsScoreN)
        : null,
    retentionEvidenceCount,
    retentionScorePct:
      retentionScoreN > 0
        ? Math.round(retentionScoreSum / retentionScoreN)
        : null,
    consistencyEvidenceCount,
    consistencyScorePct,
    history,
  };
}
