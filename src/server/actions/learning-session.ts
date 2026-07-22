"use server";

import {
  DONT_KNOW_TOKEN,
  explainSimplyFromSource,
  gradeLearningResponse,
  learningItemSchema,
  type LearningGradeResult,
  type LearningItem,
  type LearningSession,
  type SimpleExplanation,
} from "@/domain/learning/learning-session-engine";
import { getStudyContentEntry } from "@/server/study-content/registry";
import { buildCatalogLearningSession } from "@/server/learning-session/build-from-catalog";
import { atomsFromCatalogEntry } from "@/server/learning-session/build-from-catalog";
import { applyLearningSessionSchedule } from "@/server/learning-session/schedule-store";
import {
  markUnitCompleted,
  touchStudyContentOpen,
} from "@/server/study-content/progress-store";
import { resolveLearnerIdForAction } from "@/server/viewer-session";

export async function startCatalogLearningSessionAction(input: {
  sourceId: string;
  preferUnitId?: string | null;
}): Promise<
  | { ok: true; session: LearningSession }
  | { ok: false; error: string }
> {
  try {
    const learnerId = await resolveLearnerIdForAction();
    if (!learnerId) {
      return { ok: false, error: "Chybí studijní session." };
    }
    const entry = await getStudyContentEntry(input.sourceId);
    if (!entry || !entry.parseComplete) {
      return {
        ok: false,
        error:
          "Materiál nemá spolehlivý extrahovaný text. Použij „Zobrazit původní materiál“.",
      };
    }
    const session = buildCatalogLearningSession({
      learnerId,
      entry,
      preferUnitId: input.preferUnitId,
      maxAtoms: 3,
    });
    if (!session || session.items.length === 0) {
      return {
        ok: false,
        error: "Z tohoto materiálu zatím nelze sestavit učební jednotky.",
      };
    }
    await touchStudyContentOpen({ learnerId, sourceId: input.sourceId });
    try {
      const { emitLessonStart } = await import("@/server/product-analytics/emit");
      await emitLessonStart({
        learnerKey: learnerId,
        featureId: "catalog_learning",
        topicSlug: input.sourceId.slice(0, 120),
      });
    } catch (analyticsError) {
      console.error("[learning-session] analytics emit failed", analyticsError);
    }
    return { ok: true, session };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Nepovedlo se spustit.",
    };
  }
}

export async function submitLearningSessionAnswerAction(input: {
  item: LearningItem;
  studentAnswer: string;
}): Promise<
  | { ok: true; grade: LearningGradeResult }
  | { ok: false; error: string }
> {
  try {
    const learnerId = await resolveLearnerIdForAction();
    if (!learnerId) {
      return { ok: false, error: "Chybí studijní session." };
    }

    const parsed = learningItemSchema.safeParse(input.item);
    if (!parsed.success) {
      return { ok: false, error: "Neplatná položka session." };
    }

    const base = gradeLearningResponse({
      item: parsed.data as LearningItem,
      rawAnswer: input.studentAnswer,
    });

    let scheduledDueAt: string | null = null;
    if (
      parsed.data.stepKind === "primary" ||
      parsed.data.stepKind === "follow_up" ||
      parsed.data.stepKind === "confidence"
    ) {
      const { dueAt } = await applyLearningSessionSchedule({
        learnerId,
        atomId: parsed.data.atomId,
        grade: base.reviewGrade,
      });
      scheduledDueAt = dueAt;
    }

    if (
      parsed.data.stepKind === "follow_up" &&
      (base.result === "correct" || base.result === "partial")
    ) {
      await markUnitCompleted({
        learnerId,
        sourceId: parsed.data.source.sourceId,
        unitId: parsed.data.atomId,
      });
    }

    // Persist real mistakes into Moje chyby (primary + follow-up only).
    if (
      (parsed.data.stepKind === "primary" ||
        parsed.data.stepKind === "follow_up") &&
      (base.result === "incorrect" || base.result === "partial")
    ) {
      const { ingestMeaningfulMistake } = await import(
        "@/server/error-memory/ingest"
      );
      const displayAnswer =
        input.studentAnswer === DONT_KNOW_TOKEN
          ? "Nevím"
          : input.studentAnswer.trim().slice(0, 500) || "—";
      await ingestMeaningfulMistake({
        learnerId,
        question: parsed.data.prompt.slice(0, 500),
        studentAnswer: displayAnswer,
        correctConcept: parsed.data.idealAnswer.slice(0, 500),
        knowledgeUnit: {
          id: parsed.data.atomId,
          title: (
            parsed.data.source.sourceTitle || parsed.data.prompt
          ).slice(0, 160),
        },
        source: "materials_study",
        result: base.result === "partial" ? "partial" : "incorrect",
        coverage: base.coverage,
        whatWasWrong: base.whatWasWrong,
        whyWrong: base.conciseExplanation.slice(0, 600),
        sourceLabel: parsed.data.source.sourceTitle,
        sourceExcerpt: parsed.data.source.excerpt.slice(0, 900),
      });
    }

    const { emitRetrievalAnswerEvents } = await import(
      "@/server/product-analytics/emit"
    );
    void emitRetrievalAnswerEvents({
      learnerKey: learnerId,
      result: base.result,
      featureId: "catalog_learning",
      topicSlug: parsed.data.source.sourceId.slice(0, 120),
    }).catch((analyticsError) => {
      console.error("[learning-session] analytics emit failed", analyticsError);
    });

    return {
      ok: true,
      grade: { ...base, scheduledDueAt },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Nepovedlo se hodnotit.",
    };
  }
}

export async function explainSimplyAction(input: {
  sourceId: string;
  atomId: string;
}): Promise<
  | { ok: true; explanation: SimpleExplanation }
  | { ok: false; error: string }
> {
  try {
    const entry = await getStudyContentEntry(input.sourceId);
    if (!entry) return { ok: false, error: "Materiál nenalezen." };
    const atoms = atomsFromCatalogEntry(entry);
    const atom = atoms.find((a) => a.id === input.atomId);
    if (!atom) return { ok: false, error: "Jednotka nenalezena." };
    return { ok: true, explanation: explainSimplyFromSource(atom) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Vysvětlení selhalo.",
    };
  }
}
