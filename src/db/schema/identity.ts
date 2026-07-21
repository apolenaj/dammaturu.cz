/**
 * Identity & enrollment — User, StudentProfile, SchoolProfile, Exam.
 * users.id is expected to match Supabase auth.users.id in production.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { subjects } from "@/db/schema/content";
import {
  enrollmentStatusEnum,
  examAuthorityEnum,
  examFormatEnum,
  preferredStudyTimeEnum,
  publishStatusEnum,
  schoolTypeEnum,
  studyModeEnum,
  timestamps,
} from "@/db/schema/enums";

/** User — app identity row (Auth uid). */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: varchar("email", { length: 320 }),
    displayName: varchar("display_name", { length: 120 }),
    locale: varchar("locale", { length: 16 }).notNull().default("cs-CZ"),
    countryCode: varchar("country_code", { length: 2 }).notNull().default("CZ"),
    /**
     * Hyphen-stripped auth uid used by FS learner stores (D-013 bridge).
     * Always 32 hex chars when set.
     */
    learnerKey: varchar("learner_key", { length: 64 }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_learner_key_uidx").on(t.learnerKey),
    uniqueIndex("users_email_uidx").on(t.email),
    index("users_country_idx").on(t.countryCode),
  ],
);

/** SchoolProfile — school-specific maturity requirements (JSONB). */
export const schoolProfiles = pgTable(
  "school_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 240 }).notNull(),
    schoolType: schoolTypeEnum("school_type").notNull().default("jine"),
    region: varchar("region", { length: 120 }),
    countryCode: varchar("country_code", { length: 2 }).notNull().default("CZ"),
    /** Free-form requirements: oral topics, written parts, school rules. */
    requirements: jsonb("requirements")
      .notNull()
      .default(sql`'{}'::jsonb`),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("school_profiles_country_idx").on(t.countryCode),
    index("school_profiles_type_idx").on(t.schoolType),
  ],
);

/** Exam — CERMAT / school / other maturity exam definition. */
export const exams = pgTable(
  "exams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    countryCode: varchar("country_code", { length: 2 }).notNull().default("CZ"),
    authority: examAuthorityEnum("authority").notNull().default("cermat"),
    examYear: integer("exam_year"),
    format: examFormatEnum("format").notNull().default("either"),
    officialCode: varchar("official_code", { length: 80 }),
    /** Catalog requirements (weights, parts, topic lists). */
    requirements: jsonb("requirements")
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("exams_slug_uidx").on(t.slug),
    index("exams_country_authority_idx").on(t.countryCode, t.authority),
  ],
);

/** Exam ↔ Subject (one exam can span multiple subjects). */
export const examSubjects = pgTable(
  "exam_subjects",
  {
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    weight: integer("weight").notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.examId, t.subjectId] }),
    index("exam_subjects_subject_idx").on(t.subjectId),
  ],
);

/** StudentProfile — 1:1 with User; onboarding + school link. */
export const studentProfiles = pgTable(
  "student_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolProfileId: uuid("school_profile_id").references(
      () => schoolProfiles.id,
      { onDelete: "set null" },
    ),
    schoolType: schoolTypeEnum("school_type").notNull().default("jine"),
    targetExamDate: date("target_exam_date"),
    dailyMinutes: integer("daily_minutes").notNull().default(25),
    preferredStudyTime: preferredStudyTimeEnum("preferred_study_time")
      .notNull()
      .default("flexible"),
    studyMode: studyModeEnum("study_mode").notNull().default("standard"),
    readinessFeeling: integer("readiness_feeling"),
    wantsDiagnostic: boolean("wants_diagnostic").notNull().default(true),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    ...timestamps,
  },
  (t) => [index("student_profiles_school_idx").on(t.schoolProfileId)],
);

/** One student · multiple subjects (and optional exam/curriculum). */
export const subjectEnrollments = pgTable(
  "subject_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    examId: uuid("exam_id").references(() => exams.id, {
      onDelete: "set null",
    }),
    curriculumId: uuid("curriculum_id"),
    targetDate: date("target_date"),
    status: enrollmentStatusEnum("status").notNull().default("active"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("subject_enrollments_user_subject_uidx").on(
      t.userId,
      t.subjectId,
    ),
    index("subject_enrollments_user_idx").on(t.userId),
    index("subject_enrollments_subject_idx").on(t.subjectId),
  ],
);
