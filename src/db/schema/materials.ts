/**
 * StudyMaterial — catalog wrapper over Document (source_documents).
 * Supports platform (CERMAT), school, and user-owned uploads.
 */
import {
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { sourceDocuments, subjects } from "@/db/schema/content";
import { exams, schoolProfiles, users } from "@/db/schema/identity";
import {
  materialKindEnum,
  materialOwnerTypeEnum,
  publishStatusEnum,
  timestamps,
} from "@/db/schema/enums";

export const studyMaterials = pgTable(
  "study_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    ownerType: materialOwnerTypeEnum("owner_type").notNull().default("platform"),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    schoolProfileId: uuid("school_profile_id").references(
      () => schoolProfiles.id,
      { onDelete: "set null" },
    ),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    examId: uuid("exam_id").references(() => exams.id, {
      onDelete: "set null",
    }),
    materialKind: materialKindEnum("material_kind").notNull().default("other"),
    languageCode: varchar("language_code", { length: 8 }).notNull().default("cs"),
    /** 1:1 primary document when ingested. */
    sourceDocumentId: uuid("source_document_id").references(
      () => sourceDocuments.id,
      { onDelete: "set null" },
    ),
    status: publishStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("study_materials_document_uidx").on(t.sourceDocumentId),
    index("study_materials_owner_user_idx").on(t.ownerUserId),
    index("study_materials_subject_idx").on(t.subjectId),
    index("study_materials_exam_idx").on(t.examId),
    index("study_materials_owner_type_idx").on(t.ownerType),
  ],
);
