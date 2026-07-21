/**
 * Learner runtime tables — mastery, attempts, sessions, mistakes,
 * schedules, plans, missions, mock exams, readiness snapshots.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import {
  flashcards,
  knowledgeUnits,
  questions,
  subjects,
} from "@/db/schema/content";
import {
  subjectEnrollments,
  users,
} from "@/db/schema/identity";
import {
  attemptCorrectnessEnum,
  dailyStepKindEnum,
  masteryBandEnum,
  masteryLevelEnum,
  mistakeStatusEnum,
  mistakeTypeEnum,
  mockExamBandEnum,
  publishStatusEnum,
  reviewItemKindEnum,
  studySessionKindEnum,
  timestamps,
} from "@/db/schema/enums";

/**
 * MasteryState — one row per user × knowledge unit.
 * Canonical: score 0–100 + band (D-031). `level` is legacy/derived.
 * `learner_id` kept for FS bridge until fully migrated.
 */
export const masteryStates = pgTable(
  "mastery_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    /** FS / auth bridge key (32 hex). Required until user_id backfilled. */
    learnerId: varchar("learner_id", { length: 64 }).notNull(),
    knowledgeUnitId: uuid("knowledge_unit_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 5, scale: 2 }).notNull().default("0"),
    band: masteryBandEnum("band").notNull().default("not_seen"),
    /** Legacy discrete level — do not use for new scoring. */
    level: masteryLevelEnum("level").notNull().default("unknown"),
    peakBand: masteryBandEnum("peak_band").notNull().default("not_seen"),
    stability: numeric("stability", { precision: 10, scale: 4 }),
    difficulty: numeric("difficulty", { precision: 10, scale: 4 }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastSuccessfulRecallAt: timestamp("last_successful_recall_at", {
      withTimezone: true,
    }),
    introducedAt: timestamp("introduced_at", { withTimezone: true }),
    correctStreak: integer("correct_streak").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    evidenceCount: integer("evidence_count").notNull().default(0),
    successfulRecalls: integer("successful_recalls").notNull().default(0),
    transferSuccesses: integer("transfer_successes").notNull().default(0),
    diagnosticAttempts: integer("diagnostic_attempts").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("mastery_states_learner_ku_uidx").on(
      t.learnerId,
      t.knowledgeUnitId,
    ),
    uniqueIndex("mastery_states_user_ku_uidx").on(t.userId, t.knowledgeUnitId),
    index("mastery_states_due_idx").on(t.learnerId, t.dueAt),
    index("mastery_states_user_due_idx").on(t.userId, t.dueAt),
    index("mastery_states_band_idx").on(t.band),
  ],
);

export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id").references(() => subjectEnrollments.id, {
      onDelete: "set null",
    }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    kind: studySessionKindEnum("kind").notNull().default("other"),
    packSlug: varchar("pack_slug", { length: 120 }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    meta: jsonb("meta")
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  (t) => [
    index("study_sessions_user_started_idx").on(t.userId, t.startedAt),
    index("study_sessions_kind_idx").on(t.kind),
  ],
);

export const questionAttempts = pgTable(
  "question_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").references(() => questions.id, {
      onDelete: "set null",
    }),
    knowledgeUnitId: uuid("knowledge_unit_id").references(
      () => knowledgeUnits.id,
      { onDelete: "set null" },
    ),
    sessionId: uuid("session_id").references(() => studySessions.id, {
      onDelete: "set null",
    }),
    /** Engine / pack question id when not yet in questions table. */
    externalQuestionKey: varchar("external_question_key", { length: 160 }),
    correctness: attemptCorrectnessEnum("correctness").notNull(),
    responseMs: integer("response_ms"),
    hintsUsed: integer("hints_used").notNull().default(0),
    answerPayload: jsonb("answer_payload")
      .notNull()
      .default(sql`'{}'::jsonb`),
    gradedAt: timestamp("graded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("question_attempts_user_graded_idx").on(t.userId, t.gradedAt),
    index("question_attempts_question_idx").on(t.questionId),
    index("question_attempts_ku_idx").on(t.knowledgeUnitId),
    index("question_attempts_session_idx").on(t.sessionId),
  ],
);

/** Mistake — durable ErrorMemory row. */
export const mistakes = pgTable(
  "mistakes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    knowledgeUnitId: uuid("knowledge_unit_id").references(
      () => knowledgeUnits.id,
      { onDelete: "set null" },
    ),
    questionId: uuid("question_id").references(() => questions.id, {
      onDelete: "set null",
    }),
    attemptId: uuid("attempt_id").references(() => questionAttempts.id, {
      onDelete: "set null",
    }),
    questionText: text("question_text").notNull(),
    studentAnswer: text("student_answer").notNull(),
    correctConcept: text("correct_concept").notNull(),
    whyWrong: text("why_wrong").notNull(),
    mistakeType: mistakeTypeEnum("mistake_type").notNull().default("other"),
    status: mistakeStatusEnum("status").notNull().default("new"),
    successStreak: integer("success_streak").notNull().default(0),
    practiceCount: integer("practice_count").notNull().default(0),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    recoveryAttempts: integer("recovery_attempts").notNull().default(0),
    firstOccurredAt: timestamp("first_occurred_at", { withTimezone: true }),
    lastOccurredAt: timestamp("last_occurred_at", { withTimezone: true }),
    masteredAt: timestamp("mastered_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    /** Denormalized KU slug/title for FS migration / soft links. */
    knowledgeSlug: varchar("knowledge_slug", { length: 120 }),
    knowledgeTitle: varchar("knowledge_title", { length: 160 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("mistakes_user_status_idx").on(t.userId, t.status),
    index("mistakes_user_occurred_idx").on(t.userId, t.occurredAt),
    index("mistakes_ku_idx").on(t.knowledgeUnitId),
  ],
);

/** ReviewSchedule — SM-2 / spaced item due queue. */
export const reviewSchedules = pgTable(
  "review_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemKind: reviewItemKindEnum("item_kind").notNull(),
    knowledgeUnitId: uuid("knowledge_unit_id").references(
      () => knowledgeUnits.id,
      { onDelete: "cascade" },
    ),
    flashcardId: uuid("flashcard_id").references(() => flashcards.id, {
      onDelete: "cascade",
    }),
    questionId: uuid("question_id").references(() => questions.id, {
      onDelete: "cascade",
    }),
    /** External pack item key when not UUID-backed. */
    externalItemKey: varchar("external_item_key", { length: 160 }),
    easeFactor: numeric("ease_factor", { precision: 6, scale: 3 })
      .notNull()
      .default("2.500"),
    intervalDays: numeric("interval_days", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("review_schedules_user_due_idx").on(t.userId, t.dueAt),
    index("review_schedules_ku_idx").on(t.knowledgeUnitId),
    uniqueIndex("review_schedules_user_ku_uidx").on(
      t.userId,
      t.knowledgeUnitId,
    ),
    uniqueIndex("review_schedules_user_flashcard_uidx").on(
      t.userId,
      t.flashcardId,
    ),
  ],
);

/** StudyPlan — generated plan snapshot (onboarding / replanner). */
export const studyPlans = pgTable(
  "study_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id").references(() => subjectEnrollments.id, {
      onDelete: "set null",
    }),
    targetDate: date("target_date"),
    dailyMinutes: integer("daily_minutes").notNull().default(25),
    mode: varchar("mode", { length: 32 }).notNull().default("standard"),
    daysRemaining: integer("days_remaining"),
    payload: jsonb("payload")
      .notNull()
      .default(sql`'{}'::jsonb`),
    isActive: boolean("is_active").notNull().default(true),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("study_plans_user_active_idx").on(t.userId, t.isActive),
    index("study_plans_enrollment_idx").on(t.enrollmentId),
  ],
);

export const dailyMissions = pgTable(
  "daily_missions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id").references(() => subjectEnrollments.id, {
      onDelete: "set null",
    }),
    /** Calendar date in student locale (YYYY-MM-DD). */
    dateKey: date("date_key").notNull(),
    steps: jsonb("steps")
      .notNull()
      .default(sql`'[]'::jsonb`),
    knowledgeStrengthened: integer("knowledge_strengthened")
      .notNull()
      .default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("daily_missions_user_date_uidx").on(t.userId, t.dateKey),
    index("daily_missions_date_idx").on(t.dateKey),
  ],
);

/** MockExam — pack / template definition. */
export const mockExams = pgTable(
  "mock_exams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    /** Topics, prompts, rubric config. */
    payload: jsonb("payload")
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [uniqueIndex("mock_exams_slug_uidx").on(t.slug)],
);

export const mockExamAttempts = pgTable(
  "mock_exam_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mockExamId: uuid("mock_exam_id")
      .notNull()
      .references(() => mockExams.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id").references(() => studySessions.id, {
      onDelete: "set null",
    }),
    overallScore: numeric("overall_score", { precision: 5, scale: 2 }),
    band: mockExamBandEnum("band"),
    dimensionScores: jsonb("dimension_scores")
      .notNull()
      .default(sql`'{}'::jsonb`),
    report: jsonb("report")
      .notNull()
      .default(sql`'{}'::jsonb`),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("mock_exam_attempts_user_idx").on(t.userId, t.completedAt),
    index("mock_exam_attempts_exam_idx").on(t.mockExamId),
  ],
);

/** ReadinessSnapshot — point-in-time readiness metrics. */
export const readinessSnapshots = pgTable(
  "readiness_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id").references(() => subjectEnrollments.id, {
      onDelete: "set null",
    }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    overallPct: numeric("overall_pct", { precision: 5, scale: 2 }).notNull(),
    areaBreakdown: jsonb("area_breakdown")
      .notNull()
      .default(sql`'{}'::jsonb`),
    weakAreas: jsonb("weak_areas")
      .notNull()
      .default(sql`'[]'::jsonb`),
    unitsCovered: integer("units_covered").notNull().default(0),
    unitsTotal: integer("units_total").notNull().default(0),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("readiness_snapshots_user_captured_idx").on(t.userId, t.capturedAt),
    index("readiness_snapshots_enrollment_idx").on(t.enrollmentId),
  ],
);

/** Re-export daily step kind for docs / typing convenience. */
export { dailyStepKindEnum };
