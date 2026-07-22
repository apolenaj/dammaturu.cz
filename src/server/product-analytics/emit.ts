import {
  answerEventForResult,
  type ProductEventName,
} from "@/domain/product-analytics";
import { recordProductEvent } from "@/server/product-analytics/store";

type AnswerResult = "correct" | "partial" | "incorrect" | "wrong";

/**
 * Emit privacy-safe answer funnel events (retrieval → result → feedback).
 * Never pass free-text answers here.
 */
export async function emitRetrievalAnswerEvents(input: {
  learnerKey: string;
  result: AnswerResult;
  featureId: string;
  topicSlug?: string;
}): Promise<void> {
  const answerEvent = answerEventForResult(input.result);
  await recordProductEvent({
    learnerKey: input.learnerKey,
    event: "retrieval_attempt",
    featureId: input.featureId,
    topicSlug: input.topicSlug,
  });
  await recordProductEvent({
    learnerKey: input.learnerKey,
    event: answerEvent,
    featureId: input.featureId,
    topicSlug: input.topicSlug,
    correct: input.result === "correct",
  });
  await recordProductEvent({
    learnerKey: input.learnerKey,
    event: "feedback_view",
    featureId: input.featureId,
    topicSlug: input.topicSlug,
  });
  // Legacy aggregate for older dashboards
  await recordProductEvent({
    learnerKey: input.learnerKey,
    event: "question_answered",
    featureId: input.featureId,
    topicSlug: input.topicSlug,
    correct: input.result === "correct",
    count: 1,
  });
}

export async function emitLessonStart(input: {
  learnerKey: string;
  featureId: string;
  topicSlug?: string;
  alsoMaterialOpen?: boolean;
}): Promise<void> {
  if (input.alsoMaterialOpen !== false) {
    await recordProductEvent({
      learnerKey: input.learnerKey,
      event: "material_open",
      featureId: input.featureId,
      topicSlug: input.topicSlug,
    });
  }
  await recordProductEvent({
    learnerKey: input.learnerKey,
    event: "lesson_start",
    featureId: input.featureId,
    topicSlug: input.topicSlug,
  });
  await recordProductEvent({
    learnerKey: input.learnerKey,
    event: "study_session_started",
    featureId: input.featureId,
    topicSlug: input.topicSlug,
  });
}

export async function emitSimpleProductEvent(input: {
  learnerKey: string;
  event: ProductEventName;
  featureId?: string;
  topicSlug?: string;
  count?: number;
}): Promise<void> {
  await recordProductEvent({
    learnerKey: input.learnerKey,
    event: input.event,
    featureId: input.featureId,
    topicSlug: input.topicSlug,
    count: input.count,
  });
}
