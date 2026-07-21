/**
 * Shared enum + timestamp helpers for production schema.
 * Content and learner modules import from here to avoid cycles.
 */
import {
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";

export const publishStatusEnum = pgEnum("publish_status", [
  "draft",
  "needs_review",
  "published",
  "archived",
]);

export const kuKindEnum = pgEnum("ku_kind", [
  "fact",
  "concept",
  "person",
  "work",
  "event",
  "term",
  "other",
]);

export const examRelevanceEnum = pgEnum("exam_relevance", [
  "none",
  "low",
  "medium",
  "high",
  "critical",
]);

export const relationshipTypeEnum = pgEnum("relationship_type", [
  "prerequisite",
  "related",
  "part_of",
  "contrasts_with",
  "example_of",
  "authored",
  "occurs_in",
  "defined_as",
  "caused_by",
  "influenced",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "mcq",
  "multi_select",
  "short_answer",
  "cloze",
  "true_false",
  "oral_prompt",
  "ordering",
]);

/** Legacy discrete levels — kept for lesson-engine migration; engine uses score+band. */
export const masteryLevelEnum = pgEnum("mastery_level", [
  "unknown",
  "exposed",
  "recall_fragile",
  "recall_stable",
  "proficient",
  "mastered",
]);

/** Canonical mastery bands (D-031 mastery engine). */
export const masteryBandEnum = pgEnum("mastery_band", [
  "not_seen",
  "introduced",
  "learning",
  "familiar",
  "strong",
  "mastered",
  "at_risk",
]);

export const examFormatEnum = pgEnum("exam_format", [
  "oral",
  "written",
  "either",
]);

export const schoolTypeEnum = pgEnum("school_type", [
  "gymnazium",
  "ss_odborna",
  "ss_prakticka",
  "jine",
]);

export const preferredStudyTimeEnum = pgEnum("preferred_study_time", [
  "morning",
  "afternoon",
  "evening",
  "flexible",
]);

export const studyModeEnum = pgEnum("study_mode", [
  "standard",
  "intensive",
]);

export const examAuthorityEnum = pgEnum("exam_authority", [
  "cermat",
  "school",
  "ministry",
  "other",
]);

export const materialOwnerTypeEnum = pgEnum("material_owner_type", [
  "platform",
  "user",
  "school",
]);

export const materialKindEnum = pgEnum("material_kind", [
  "cermat",
  "textbook",
  "worksheet",
  "notes",
  "handout",
  "other",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "active",
  "paused",
  "completed",
  "withdrawn",
]);

export const studySessionKindEnum = pgEnum("study_session_kind", [
  "question_engine",
  "flashcards",
  "active_recall",
  "spaced_review",
  "mistake_practice",
  "mock_exam",
  "lesson",
  "diagnostic",
  "other",
]);

export const attemptCorrectnessEnum = pgEnum("attempt_correctness", [
  "incorrect",
  "partial",
  "correct",
  "skipped",
]);

export const mistakeStatusEnum = pgEnum("mistake_status", [
  "new",
  "weak",
  "improving",
  "mastered",
]);

export const mistakeTypeEnum = pgEnum("mistake_type", [
  "forgot_fact",
  "confused_concepts",
  "partial_answer",
  "wrong_author",
  "wrong_literary_period",
  "weak_explanation",
  "repeated_mistake",
  "other",
]);

export const reviewItemKindEnum = pgEnum("review_item_kind", [
  "knowledge_unit",
  "flashcard",
  "question",
]);

export const dailyStepKindEnum = pgEnum("daily_step_kind", [
  "learn",
  "review",
  "test",
]);

export const mockExamBandEnum = pgEnum("mock_exam_band", [
  "weak",
  "partial",
  "strong",
]);

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};
