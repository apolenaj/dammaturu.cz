import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  index,
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

export const masteryLevelEnum = pgEnum("mastery_level", [
  "unknown",
  "exposed",
  "recall_fragile",
  "recall_stable",
  "proficient",
  "mastered",
]);

export const examFormatEnum = pgEnum("exam_format", [
  "oral",
  "written",
  "either",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [uniqueIndex("subjects_slug_uidx").on(t.slug)],
);

export const curricula = pgTable(
  "curricula",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    targetExam: varchar("target_exam", { length: 120 }),
    status: publishStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("curricula_subject_slug_uidx").on(t.subjectId, t.slug),
    index("curricula_subject_idx").on(t.subjectId),
  ],
);

/** Curriculum module (e.g. A. Jazyk, B. Literární směry). */
export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    code: varchar("code", { length: 8 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: text("summary"),
    orderIndex: integer("order_index").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("modules_curriculum_slug_uidx").on(t.curriculumId, t.slug),
    uniqueIndex("modules_curriculum_code_uidx").on(t.curriculumId, t.code),
    index("modules_curriculum_order_idx").on(t.curriculumId, t.orderIndex),
  ],
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id").references(() => modules.id, {
      onDelete: "restrict",
    }),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: text("summary"),
    orderIndex: integer("order_index").notNull().default(0),
    examRelevance: examRelevanceEnum("exam_relevance")
      .notNull()
      .default("medium"),
    status: publishStatusEnum("status").notNull().default("draft"),
    /** Filenames from content/source-materials linked to this topic. */
    sourceFilenames: text("source_filenames")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("topics_curriculum_slug_uidx").on(t.curriculumId, t.slug),
    index("topics_curriculum_order_idx").on(t.curriculumId, t.orderIndex),
    index("topics_module_idx").on(t.moduleId),
  ],
);

/** Topic dependency graph — learning order edges. */
export const topicPrerequisites = pgTable(
  "topic_prerequisites",
  {
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    prerequisiteTopicId: uuid("prerequisite_topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.topicId, t.prerequisiteTopicId] }),
    index("topic_prereq_prerequisite_idx").on(t.prerequisiteTopicId),
  ],
);

export const subtopics = pgTable(
  "subtopics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: text("summary"),
    orderIndex: integer("order_index").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("subtopics_topic_slug_uidx").on(t.topicId, t.slug),
    index("subtopics_topic_order_idx").on(t.topicId, t.orderIndex),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subtopicId: uuid("subtopic_id")
      .notNull()
      .references(() => subtopics.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    objectiveSummary: text("objective_summary"),
    estimatedMinutes: integer("estimated_minutes"),
    orderIndex: integer("order_index").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("lessons_subtopic_slug_uidx").on(t.subtopicId, t.slug),
    index("lessons_subtopic_order_idx").on(t.subtopicId, t.orderIndex),
  ],
);

export const knowledgeUnits = pgTable(
  "knowledge_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    subtopicId: uuid("subtopic_id").references(() => subtopics.id, {
      onDelete: "set null",
    }),
    lessonId: uuid("lesson_id").references(() => lessons.id, {
      onDelete: "set null",
    }),
    kind: kuKindEnum("kind").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    statement: text("statement").notNull(),
    explanation: text("explanation"),
    importance: integer("importance").notNull().default(3),
    difficulty: integer("difficulty").notNull().default(3),
    examRelevance: examRelevanceEnum("exam_relevance")
      .notNull()
      .default("medium"),
    confidence: numeric("confidence", { precision: 3, scale: 2 })
      .notNull()
      .default("0.80"),
    reviewStatus: publishStatusEnum("review_status")
      .notNull()
      .default("draft"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("knowledge_units_topic_slug_uidx").on(t.topicId, t.slug),
    index("knowledge_units_topic_idx").on(t.topicId),
    index("knowledge_units_kind_idx").on(t.kind),
    index("knowledge_units_review_idx").on(t.reviewStatus),
    index("knowledge_units_importance_idx").on(t.importance),
  ],
);

export const knowledgeUnitPrerequisites = pgTable(
  "knowledge_unit_prerequisites",
  {
    knowledgeUnitId: uuid("knowledge_unit_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
    prerequisiteId: uuid("prerequisite_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.knowledgeUnitId, t.prerequisiteId] }),
    index("ku_prereq_prerequisite_idx").on(t.prerequisiteId),
  ],
);

export const kuFacts = pgTable("ku_facts", {
  knowledgeUnitId: uuid("knowledge_unit_id")
    .primaryKey()
    .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
  assertion: text("assertion").notNull(),
  context: text("context"),
});

export const kuConcepts = pgTable("ku_concepts", {
  knowledgeUnitId: uuid("knowledge_unit_id")
    .primaryKey()
    .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
  definition: text("definition").notNull(),
  scopeNote: text("scope_note"),
});

export const kuPersons = pgTable("ku_persons", {
  knowledgeUnitId: uuid("knowledge_unit_id")
    .primaryKey()
    .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  birthYear: integer("birth_year"),
  deathYear: integer("death_year"),
  roles: text("roles")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
});

export const kuWorks = pgTable("ku_works", {
  knowledgeUnitId: uuid("knowledge_unit_id")
    .primaryKey()
    .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
  workTitle: varchar("work_title", { length: 300 }).notNull(),
  workType: varchar("work_type", { length: 80 }),
  yearPublished: integer("year_published"),
  authorKuId: uuid("author_ku_id").references(() => knowledgeUnits.id, {
    onDelete: "set null",
  }),
});

export const kuEvents = pgTable("ku_events", {
  knowledgeUnitId: uuid("knowledge_unit_id")
    .primaryKey()
    .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
  eventName: varchar("event_name", { length: 300 }).notNull(),
  yearStart: integer("year_start"),
  yearEnd: integer("year_end"),
  location: varchar("location", { length: 200 }),
});

export const kuTerms = pgTable("ku_terms", {
  knowledgeUnitId: uuid("knowledge_unit_id")
    .primaryKey()
    .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
  lemma: varchar("lemma", { length: 120 }).notNull(),
  definition: text("definition").notNull(),
  languageCode: varchar("language_code", { length: 8 }).notNull().default("cs"),
});

export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromKuId: uuid("from_ku_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
    toKuId: uuid("to_ku_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
    type: relationshipTypeEnum("type").notNull(),
    note: text("note"),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("relationships_edge_uidx").on(t.fromKuId, t.toKuId, t.type),
    index("relationships_to_idx").on(t.toKuId),
  ],
);

export const sourceDocuments = pgTable(
  "source_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filename: varchar("filename", { length: 500 }).notNull(),
    storagePath: varchar("storage_path", { length: 1000 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    contentSha256: varchar("content_sha256", { length: 64 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }),
    wordCountEst: integer("word_count_est"),
    ownershipNote: varchar("ownership_note", { length: 500 }),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("source_documents_sha_uidx").on(t.contentSha256),
    uniqueIndex("source_documents_path_uidx").on(t.storagePath),
  ],
);

export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    textSha256: varchar("text_sha256", { length: 64 }).notNull(),
    charStart: integer("char_start"),
    charEnd: integer("char_end"),
    headingPath: varchar("heading_path", { length: 500 }),
  },
  (t) => [
    uniqueIndex("source_chunks_doc_index_uidx").on(
      t.sourceDocumentId,
      t.chunkIndex,
    ),
    index("source_chunks_doc_idx").on(t.sourceDocumentId),
  ],
);

export const knowledgeUnitProvenance = pgTable(
  "knowledge_unit_provenance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    knowledgeUnitId: uuid("knowledge_unit_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
    sourceChunkId: uuid("source_chunk_id")
      .notNull()
      .references(() => sourceChunks.id, { onDelete: "restrict" }),
    quote: text("quote"),
    isPrimary: boolean("is_primary").notNull().default(true),
  },
  (t) => [
    uniqueIndex("ku_provenance_uidx").on(t.knowledgeUnitId, t.sourceChunkId),
    index("ku_provenance_chunk_idx").on(t.sourceChunkId),
  ],
);

export const learningObjectives = pgTable(
  "learning_objectives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    examRelevance: examRelevanceEnum("exam_relevance")
      .notNull()
      .default("medium"),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("learning_objectives_code_uidx").on(t.curriculumId, t.code),
  ],
);

export const learningObjectiveKnowledgeUnits = pgTable(
  "learning_objective_knowledge_units",
  {
    learningObjectiveId: uuid("learning_objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    knowledgeUnitId: uuid("knowledge_unit_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.learningObjectiveId, t.knowledgeUnitId] }),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: questionTypeEnum("type").notNull(),
    stem: text("stem").notNull(),
    status: publishStatusEnum("status").notNull().default("draft"),
    difficulty: integer("difficulty"),
    estimatedSeconds: integer("estimated_seconds"),
    ...timestamps,
  },
  (t) => [index("questions_status_idx").on(t.status)],
);

export const questionKnowledgeUnits = pgTable(
  "question_knowledge_units",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    knowledgeUnitId: uuid("knowledge_unit_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.questionId, t.knowledgeUnitId] }),
    index("question_kus_ku_idx").on(t.knowledgeUnitId),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    orderIndex: integer("order_index"),
    normalizedKey: varchar("normalized_key", { length: 500 }),
  },
  (t) => [index("answers_question_idx").on(t.questionId)],
);

export const explanations = pgTable("explanations", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  answerId: uuid("answer_id").references(() => answers.id, {
    onDelete: "set null",
  }),
  body: text("body").notNull(),
  sourceChunkId: uuid("source_chunk_id").references(() => sourceChunks.id, {
    onDelete: "set null",
  }),
});

export const flashcards = pgTable("flashcards", {
  id: uuid("id").primaryKey().defaultRandom(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  status: publishStatusEnum("status").notNull().default("draft"),
  difficulty: integer("difficulty"),
  ...timestamps,
});

export const flashcardKnowledgeUnits = pgTable(
  "flashcard_knowledge_units",
  {
    flashcardId: uuid("flashcard_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    knowledgeUnitId: uuid("knowledge_unit_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.flashcardId, t.knowledgeUnitId] }),
    index("flashcard_kus_ku_idx").on(t.knowledgeUnitId),
  ],
);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    exerciseKind: varchar("exercise_kind", { length: 80 }).notNull(),
    instructions: text("instructions"),
  },
  (t) => [uniqueIndex("exercises_question_uidx").on(t.questionId)],
);

export const examQuestions = pgTable(
  "exam_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    examFormat: examFormatEnum("exam_format").notNull().default("either"),
    weight: integer("weight").notNull().default(3),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("exam_questions_question_uidx").on(t.questionId)],
);

export const masteryStates = pgTable(
  "mastery_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: varchar("learner_id", { length: 64 }).notNull(),
    knowledgeUnitId: uuid("knowledge_unit_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
    level: masteryLevelEnum("level").notNull().default("unknown"),
    stability: numeric("stability", { precision: 10, scale: 4 }),
    difficulty: numeric("difficulty", { precision: 10, scale: 4 }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    correctStreak: integer("correct_streak").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    evidenceCount: integer("evidence_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("mastery_states_learner_ku_uidx").on(
      t.learnerId,
      t.knowledgeUnitId,
    ),
    index("mastery_states_due_idx").on(t.learnerId, t.dueAt),
  ],
);
