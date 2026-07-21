/**
 * Educational content model — atomic knowledge for adaptive learning.
 * Runtime validation via Zod; DB via Drizzle (`src/db/schema`).
 */

import { z } from "zod";

export const publishStatuses = [
  "draft",
  "needs_review",
  "published",
  "archived",
] as const;

export const kuKinds = [
  "fact",
  "concept",
  "person",
  "work",
  "event",
  "term",
  "other",
] as const;

export const examRelevanceValues = [
  "none",
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const relationshipTypes = [
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
] as const;

export const questionTypes = [
  "mcq",
  "multi_select",
  "short_answer",
  "cloze",
  "true_false",
  "oral_prompt",
  "ordering",
] as const;

export const masteryLevels = [
  "unknown",
  "exposed",
  "recall_fragile",
  "recall_stable",
  "proficient",
  "mastered",
] as const;

export const publishStatusSchema = z.enum(publishStatuses);
export const kuKindSchema = z.enum(kuKinds);
export const examRelevanceSchema = z.enum(examRelevanceValues);
export const relationshipTypeSchema = z.enum(relationshipTypes);
export const questionTypeSchema = z.enum(questionTypes);
export const masteryLevelSchema = z.enum(masteryLevels);

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug musí být kebab-case");

const rating1to5 = z.number().int().min(1).max(5);
const confidence0to1 = z.number().min(0).max(1);

export const subjectSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  status: publishStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const curriculumSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullable(),
  targetExam: z.string().max(120).nullable(),
  status: publishStatusSchema,
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const topicSchema = z.object({
  id: z.string().uuid(),
  curriculumId: z.string().uuid(),
  moduleId: z.string().uuid().nullable(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).nullable(),
  orderIndex: z.number().int().min(0),
  examRelevance: examRelevanceSchema,
  status: publishStatusSchema,
  sourceFilenames: z.array(z.string().min(1).max(260)).default([]),
});

export const moduleSchema = z.object({
  id: z.string().uuid(),
  curriculumId: z.string().uuid(),
  slug: slugSchema,
  code: z
    .string()
    .trim()
    .min(1)
    .max(8)
    .regex(/^[A-Z0-9]+$/, "module code musí být A–Z / 0–9"),
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).nullable(),
  orderIndex: z.number().int().min(0),
  status: publishStatusSchema,
});

export const topicPrerequisiteSchema = z.object({
  topicId: z.string().uuid(),
  prerequisiteTopicId: z.string().uuid(),
});

export const subtopicSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).nullable(),
  orderIndex: z.number().int().min(0),
  status: publishStatusSchema,
});

export const lessonSchema = z.object({
  id: z.string().uuid(),
  subtopicId: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  objectiveSummary: z.string().max(2000).nullable(),
  estimatedMinutes: z.number().int().min(1).max(180).nullable(),
  orderIndex: z.number().int().min(0),
  status: publishStatusSchema,
});

/** Atomic unit of mastery — never a whole markdown document. */
export const knowledgeUnitSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid().nullable(),
  subtopicId: z.string().uuid().nullable(),
  topicId: z.string().uuid(),
  kind: kuKindSchema,
  slug: slugSchema,
  title: z.string().min(1).max(240),
  /** Short canonical statement (atomic). */
  statement: z.string().min(1).max(2000),
  explanation: z.string().max(8000).nullable(),
  importance: rating1to5,
  difficulty: rating1to5,
  examRelevance: examRelevanceSchema,
  /** Editorial/model confidence that the statement is correct (0–1). */
  confidence: confidence0to1,
  reviewStatus: publishStatusSchema,
  tags: z.array(z.string().min(1).max(64)).max(32),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const knowledgeUnitPrerequisiteSchema = z.object({
  knowledgeUnitId: z.string().uuid(),
  prerequisiteId: z.string().uuid(),
});

export const factSchema = z.object({
  knowledgeUnitId: z.string().uuid(),
  assertion: z.string().min(1).max(2000),
  context: z.string().max(2000).nullable(),
});

export const conceptSchema = z.object({
  knowledgeUnitId: z.string().uuid(),
  definition: z.string().min(1).max(4000),
  scopeNote: z.string().max(2000).nullable(),
});

export const personSchema = z.object({
  knowledgeUnitId: z.string().uuid(),
  fullName: z.string().min(1).max(200),
  birthYear: z.number().int().nullable(),
  deathYear: z.number().int().nullable(),
  roles: z.array(z.string().max(80)).max(16),
});

export const workSchema = z.object({
  knowledgeUnitId: z.string().uuid(),
  workTitle: z.string().min(1).max(300),
  workType: z.string().max(80).nullable(),
  yearPublished: z.number().int().nullable(),
  authorKuId: z.string().uuid().nullable(),
});

export const eventSchema = z.object({
  knowledgeUnitId: z.string().uuid(),
  eventName: z.string().min(1).max(300),
  yearStart: z.number().int().nullable(),
  yearEnd: z.number().int().nullable(),
  location: z.string().max(200).nullable(),
});

export const termSchema = z.object({
  knowledgeUnitId: z.string().uuid(),
  lemma: z.string().min(1).max(120),
  definition: z.string().min(1).max(4000),
  languageCode: z.string().min(2).max(8).default("cs"),
});

export const relationshipSchema = z.object({
  id: z.string().uuid(),
  fromKuId: z.string().uuid(),
  toKuId: z.string().uuid(),
  type: relationshipTypeSchema,
  note: z.string().max(1000).nullable(),
  status: publishStatusSchema,
});

export const sourceDocumentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1).max(500),
  storagePath: z.string().min(1).max(1000),
  title: z.string().min(1).max(300),
  contentSha256: z.string().length(64),
  mimeType: z.string().max(120).nullable(),
  wordCountEst: z.number().int().nullable(),
  ownershipNote: z.string().max(500).nullable(),
  importedAt: z.string().datetime(),
});

/** Atomic slice of a source — not the whole document as one blob for mastery. */
export const sourceChunkSchema = z.object({
  id: z.string().uuid(),
  sourceDocumentId: z.string().uuid(),
  chunkIndex: z.number().int().min(0),
  text: z.string().min(1).max(12000),
  textSha256: z.string().length(64),
  charStart: z.number().int().min(0).nullable(),
  charEnd: z.number().int().min(0).nullable(),
  headingPath: z.string().max(500).nullable(),
});

export const knowledgeUnitProvenanceSchema = z.object({
  id: z.string().uuid(),
  knowledgeUnitId: z.string().uuid(),
  sourceChunkId: z.string().uuid(),
  quote: z.string().max(2000).nullable(),
  isPrimary: z.boolean(),
});

export const learningObjectiveSchema = z.object({
  id: z.string().uuid(),
  curriculumId: z.string().uuid(),
  code: z.string().min(1).max(64),
  title: z.string().min(1).max(300),
  description: z.string().max(4000).nullable(),
  examRelevance: examRelevanceSchema,
  status: publishStatusSchema,
});

export const learningObjectiveKuSchema = z.object({
  learningObjectiveId: z.string().uuid(),
  knowledgeUnitId: z.string().uuid(),
});

export const questionSchema = z.object({
  id: z.string().uuid(),
  type: questionTypeSchema,
  stem: z.string().min(1).max(4000),
  status: publishStatusSchema,
  difficulty: rating1to5.nullable(),
  estimatedSeconds: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/** Every question MUST link to ≥1 KnowledgeUnit (enforced in DB + app). */
export const questionKnowledgeUnitSchema = z.object({
  questionId: z.string().uuid(),
  knowledgeUnitId: z.string().uuid(),
  isPrimary: z.boolean(),
});

export const answerSchema = z.object({
  id: z.string().uuid(),
  questionId: z.string().uuid(),
  body: z.string().min(1).max(4000),
  isCorrect: z.boolean(),
  orderIndex: z.number().int().min(0).nullable(),
  normalizedKey: z.string().max(500).nullable(),
});

export const explanationSchema = z.object({
  id: z.string().uuid(),
  questionId: z.string().uuid(),
  answerId: z.string().uuid().nullable(),
  body: z.string().min(1).max(8000),
  sourceChunkId: z.string().uuid().nullable(),
});

export const flashcardSchema = z.object({
  id: z.string().uuid(),
  front: z.string().min(1).max(2000),
  back: z.string().min(1).max(4000),
  status: publishStatusSchema,
  difficulty: rating1to5.nullable(),
});

export const flashcardKnowledgeUnitSchema = z.object({
  flashcardId: z.string().uuid(),
  knowledgeUnitId: z.string().uuid(),
  isPrimary: z.boolean(),
});

export const exerciseSchema = z.object({
  id: z.string().uuid(),
  questionId: z.string().uuid(),
  exerciseKind: z.string().min(1).max(80),
  instructions: z.string().max(2000).nullable(),
});

export const examQuestionSchema = z.object({
  id: z.string().uuid(),
  questionId: z.string().uuid(),
  examFormat: z.enum(["oral", "written", "either"]),
  weight: rating1to5,
  notes: z.string().max(2000).nullable(),
});

export const masteryStateSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  knowledgeUnitId: z.string().uuid(),
  level: masteryLevelSchema,
  stability: z.number().nullable(),
  difficulty: z.number().nullable(),
  dueAt: z.string().datetime().nullable(),
  lastAttemptAt: z.string().datetime().nullable(),
  correctStreak: z.number().int().min(0),
  lapses: z.number().int().min(0),
  evidenceCount: z.number().int().min(0),
  updatedAt: z.string().datetime(),
});

export type Subject = z.infer<typeof subjectSchema>;
export type Curriculum = z.infer<typeof curriculumSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Subtopic = z.infer<typeof subtopicSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type KnowledgeUnit = z.infer<typeof knowledgeUnitSchema>;
export type Fact = z.infer<typeof factSchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type Person = z.infer<typeof personSchema>;
export type Work = z.infer<typeof workSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Term = z.infer<typeof termSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type SourceDocument = z.infer<typeof sourceDocumentSchema>;
export type SourceChunk = z.infer<typeof sourceChunkSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type Explanation = z.infer<typeof explanationSchema>;
export type Flashcard = z.infer<typeof flashcardSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExamQuestion = z.infer<typeof examQuestionSchema>;
export type LearningObjective = z.infer<typeof learningObjectiveSchema>;
export type MasteryState = z.infer<typeof masteryStateSchema>;
