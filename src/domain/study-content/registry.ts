/**
 * Canonical Study Content Registry — types + inventory manifest.
 * Source of truth for every repository study document discovered in CONTENT_INVENTORY.md.
 * Do not invent materials; every entry is factual from disk / ingestion.
 */

import { z } from "zod";

export const DEFAULT_STUDY_SUBJECT = "Český jazyk a literatura";
export const DEFAULT_STUDY_SUBJECT_SLUG = "cjl";

export const studySourceTypes = [
  "docx",
  "pdf",
  "txt",
  "markdown",
  "json_pack",
  "embedded_seed",
  "other",
] as const;

export type StudySourceType = (typeof studySourceTypes)[number];

/**
 * How the item appears for students:
 * - available: discoverable + interactive in Moje materiály
 * - available_with_warning: usable, but parsing/QA flagged
 * - unavailable: not shown as studyable; reason required
 * - excluded: not a student study document (docs, runtime uploads, etc.)
 */
export const studyContentStatuses = [
  "available",
  "available_with_warning",
  "unavailable",
  "excluded",
] as const;

export type StudyContentStatus = (typeof studyContentStatuses)[number];

export const studyContentProvenanceSchema = z.object({
  inventoryPath: z.string().min(1).max(500),
  originalFilename: z.string().min(1).max(300),
  contentSha256: z.string().length(64).nullable(),
  ingestionDocumentId: z.string().min(1).max(64).nullable(),
  relativeSourcePath: z.string().min(1).max(500),
  mimeType: z.string().max(120).nullable(),
  sizeBytes: z.number().int().min(0).nullable(),
  importedAt: z.string().datetime().nullable().optional(),
  pipelineStatus: z.string().max(64).nullable(),
  headingPaths: z.array(z.string().max(500)).max(80),
  chunkCount: z.number().int().min(0),
  knowledgeUnitCount: z.number().int().min(0),
  warnings: z.array(z.string().max(400)).max(40),
});

export type StudyContentProvenance = z.infer<
  typeof studyContentProvenanceSchema
>;

export const studyContentChunkSchema = z.object({
  id: z.string().min(1).max(64),
  chunkIndex: z.number().int().min(0),
  text: z.string().min(1),
  headingPath: z.string().max(500).nullable(),
  charStart: z.number().int().min(0).nullable(),
  charEnd: z.number().int().min(0).nullable(),
  textSha256: z.string().max(64).nullable().optional(),
});

export type StudyContentChunk = z.infer<typeof studyContentChunkSchema>;

export const studyContentUnitSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(240),
  statement: z.string().min(1).max(2000),
  kind: z.string().max(40),
  topicSlug: z.string().max(120),
  sourceChunkIds: z.array(z.string()).max(20),
  confidence: z.number().min(0).max(1),
  examRelevance: z.string().max(40).optional(),
});

export type StudyContentUnit = z.infer<typeof studyContentUnitSchema>;

export const studyContentEntrySchema = z.object({
  sourceId: z.string().min(3).max(80),
  title: z.string().min(1).max(240),
  subject: z.string().min(1).max(120),
  subjectSlug: z.string().min(1).max(40),
  topic: z.string().min(1).max(200),
  subtopic: z.string().max(200).nullable(),
  sourceType: z.enum(studySourceTypes),
  contentStatus: z.enum(studyContentStatuses),
  /** Factual reason when not fully available — never silent. */
  unavailableReason: z.string().max(500).nullable(),
  /** Parsed plain text assembled from chunks only (never invented). */
  parsedText: z.string().max(500_000),
  parseComplete: z.boolean(),
  chunks: z.array(studyContentChunkSchema).max(500),
  knowledgeUnits: z.array(studyContentUnitSchema).max(500),
  provenance: studyContentProvenanceSchema,
  /** Deep links into existing interactive surfaces (experiences, lessons). */
  relatedHrefs: z
    .array(
      z.object({
        label: z.string().max(120),
        href: z.string().max(200),
      }),
    )
    .max(12),
  topics: z.array(z.string().max(200)).max(24),
});

export type StudyContentEntry = z.infer<typeof studyContentEntrySchema>;

export type StudyContentListItem = {
  sourceId: string;
  title: string;
  subject: string;
  subjectSlug: string;
  topic: string;
  subtopic: string | null;
  sourceType: StudySourceType;
  contentStatus: StudyContentStatus;
  unavailableReason: string | null;
  parseComplete: boolean;
  chunkCount: number;
  knowledgeUnitCount: number;
  topics: string[];
  relatedHrefCount: number;
  originalFilename: string;
};

/** Progress for “continue where you stopped”. */
export type StudyContentProgress = {
  learnerId: string;
  sourceId: string;
  lastChunkIndex: number;
  completedChunkIds: string[];
  completedUnitIds: string[];
  quickTestAttempts: number;
  quickTestCorrect: number;
  lastOpenedAt: string;
  updatedAt: string;
};

/**
 * Exhaustive inventory rows from CONTENT_INVENTORY.md §B.
 * Every row must resolve to student UI OR an explicit factual reason.
 */
export type InventoryManifestRow = {
  sourceId: string;
  /** Path as listed in the audit / on disk */
  inventoryPath: string;
  title: string;
  subject: string;
  subjectSlug: string;
  topic: string;
  subtopic: string | null;
  sourceType: StudySourceType;
  /** Expected disposition — runtime may downgrade if file/ingest missing */
  intent: "student_catalog" | "excluded" | "derived_activity";
  exclusionReason?: string;
  relatedHrefs?: Array<{ label: string; href: string }>;
  /** Known QA / parse notes from inventory */
  knownWarnings?: string[];
};

/** The 12 allowlisted ČJL DOCX — primary student catalog. */
export const CATALOG_DOCX_MANIFEST: InventoryManifestRow[] = [
  {
    sourceId: "cjl-homonyma",
    inventoryPath:
      "content/source-materials/Co jsou to homonyma x slova mnohoznačná.docx",
    title: "Homonyma × slova mnohoznačná",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Jazyk / lexikologie",
    subtopic: "Homonyma a polysémie",
    sourceType: "docx",
    intent: "student_catalog",
    relatedHrefs: [
      { label: "Lekce Homonyma — úvod", href: "/app/learn/homonyma-uvod" },
    ],
  },
  {
    sourceId: "cjl-realismus",
    inventoryPath: "content/source-materials/1. Realismus.docx",
    title: "1. Realismus",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Literární směry",
    subtopic: "Realismus — obecné znaky",
    sourceType: "docx",
    intent: "student_catalog",
    relatedHrefs: [
      { label: "Rychle pochopit — Realismus", href: "/app/learn/rychle/realismus" },
    ],
  },
  {
    sourceId: "cjl-realismus-francie",
    inventoryPath: "content/source-materials/2. Realismus ve Francii.docx",
    title: "Realismus ve Francii",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Literární směry",
    subtopic: "Realismus ve Francii",
    sourceType: "docx",
    intent: "student_catalog",
  },
  {
    sourceId: "cjl-realismus-rusko",
    inventoryPath: "content/source-materials/3. Realismus v Rusku.docx",
    title: "Realismus v Rusku",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Literární směry",
    subtopic: "Realismus v Rusku",
    sourceType: "docx",
    intent: "student_catalog",
  },
  {
    sourceId: "cjl-realismus-anglie",
    inventoryPath:
      "content/source-materials/4. Realismus v Anglii a další autoři.docx",
    title: "Realismus v Anglii a další autoři",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Literární směry",
    subtopic: "Realismus v Anglii",
    sourceType: "docx",
    intent: "student_catalog",
  },
  {
    sourceId: "cjl-narodni-obrozeni",
    inventoryPath: "content/source-materials/Národní obrození v Čechách.docx",
    title: "Národní obrození v Čechách",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Národní obrození",
    subtopic: null,
    sourceType: "docx",
    intent: "student_catalog",
    relatedHrefs: [
      {
        label: "Příběh — Národní obrození",
        href: "/app/learn/pribeh/narodni-obrozeni",
      },
    ],
  },
  {
    sourceId: "cjl-romantismus",
    inventoryPath: "content/source-materials/Romantismus - hl. znaky.docx",
    title: "Romantismus — hlavní znaky",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Literární směry",
    subtopic: "Romantismus",
    sourceType: "docx",
    intent: "student_catalog",
  },
  {
    sourceId: "cjl-maj",
    inventoryPath: "content/source-materials/Máj.docx",
    title: "Máj",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Literární díla",
    subtopic: "K. H. Mácha",
    sourceType: "docx",
    intent: "student_catalog",
    relatedHrefs: [
      { label: "Máj — exam prep", href: "/app/learn/maj" },
      { label: "Rozbor díla", href: "/app/learn/dilo/maj" },
    ],
  },
  {
    sourceId: "cjl-kytice",
    inventoryPath: "content/source-materials/Kytice.docx",
    title: "Kytice",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Literární díla",
    subtopic: "K. J. Erben",
    sourceType: "docx",
    intent: "student_catalog",
    relatedHrefs: [
      { label: "Kytice — experience", href: "/app/learn/kytice" },
      { label: "Rozbor díla", href: "/app/learn/dilo/kytice" },
    ],
  },
  {
    sourceId: "cjl-babicka",
    inventoryPath: "content/source-materials/Babička.docx",
    title: "Babička",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Literární díla",
    subtopic: "Božena Němcová",
    sourceType: "docx",
    intent: "student_catalog",
    relatedHrefs: [
      { label: "Babička — experience", href: "/app/learn/babicka" },
      { label: "Rozbor díla", href: "/app/learn/dilo/babicka" },
    ],
  },
  {
    sourceId: "cjl-jirasek",
    inventoryPath: "content/source-materials/11. A. Jirásek.docx",
    title: "Alois Jirásek",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Autoři",
    subtopic: "A. Jirásek",
    sourceType: "docx",
    intent: "student_catalog",
  },
  {
    sourceId: "cjl-ceske-drama-19",
    inventoryPath:
      "content/source-materials/12. České drama 2. pol 19. stol.docx",
    title: "České drama 2. poloviny 19. století",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Drama",
    subtopic: "2. polovina 19. století",
    sourceType: "docx",
    intent: "student_catalog",
    knownWarnings: [
      "Content QA: chronologie Stroupežnický (death_before_birth) — ověř fakta ve zdroji.",
    ],
  },
];

/**
 * Non-catalog inventory classes from the audit — must never be silently ignored.
 */
export const EXPLICIT_EXCLUSION_MANIFEST: InventoryManifestRow[] = [
  {
    sourceId: "excl-repo-pdf-none",
    inventoryPath: "(none — 0 PDF in repository study trees)",
    title: "PDF studijní korpus",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "—",
    subtopic: null,
    sourceType: "pdf",
    intent: "excluded",
    exclusionReason:
      "V repozitáři není žádný PDF studijní soubor. PDF podporujeme jen jako learner upload za běhu.",
  },
  {
    sourceId: "excl-repo-csv-none",
    inventoryPath: "(none — 0 CSV datasets)",
    title: "CSV datasety",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "—",
    subtopic: null,
    sourceType: "other",
    intent: "excluded",
    exclusionReason: "V repozitáři neexistují CSV studijní datasety.",
  },
  {
    sourceId: "excl-docs-markdown",
    inventoryPath: "docs/**/*.md",
    title: "Markdown dokumentace produktu",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "—",
    subtopic: null,
    sourceType: "markdown",
    intent: "excluded",
    exclusionReason:
      "Soubory v docs/ jsou interní dokumentace produktu, ne maturitní studijní materiál.",
  },
  {
    sourceId: "excl-learner-uploads-runtime",
    inventoryPath: "data/learner-materials/**",
    title: "Runtime learner uploads (TXT/PDF/DOCX)",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "—",
    subtopic: null,
    sourceType: "txt",
    intent: "excluded",
    exclusionReason:
      "Per-learner nahrávky nejsou kanonický korpus; zobrazují se v sekci Nahrané materiály po uploadu.",
  },
  {
    sourceId: "derived-question-engine-cjl",
    inventoryPath: "src/server/question-engine/packs/cjl-otazky.ts",
    title: "Question Engine — ČJL",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Testy",
    subtopic: "Literární historie",
    sourceType: "embedded_seed",
    intent: "derived_activity",
    exclusionReason:
      "Odvozený balíček otázek (ne primární zdroj). Dostupný v Testech; primární zdroje jsou DOCX v katalogu.",
    relatedHrefs: [
      { label: "Otevřít test ČJL", href: "/app/tests/otazky/cjl-otazky" },
    ],
  },
  {
    sourceId: "derived-flashcards-cjl",
    inventoryPath: "src/server/flashcards/packs/cjl-literarni.ts",
    title: "Flashcards — ČJL literární",
    subject: DEFAULT_STUDY_SUBJECT,
    subjectSlug: DEFAULT_STUDY_SUBJECT_SLUG,
    topic: "Opakování",
    subtopic: null,
    sourceType: "embedded_seed",
    intent: "derived_activity",
    exclusionReason:
      "Odvozené kartičky. Dostupné v Opakování; text vychází z kurikula/DOCX, není samostatný zdrojový dokument.",
    relatedHrefs: [{ label: "Opakování", href: "/app/review" }],
  },
];

export const FULL_INVENTORY_MANIFEST: InventoryManifestRow[] = [
  ...CATALOG_DOCX_MANIFEST,
  ...EXPLICIT_EXCLUSION_MANIFEST,
];

export function toListItem(entry: StudyContentEntry): StudyContentListItem {
  return {
    sourceId: entry.sourceId,
    title: entry.title,
    subject: entry.subject,
    subjectSlug: entry.subjectSlug,
    topic: entry.topic,
    subtopic: entry.subtopic,
    sourceType: entry.sourceType,
    contentStatus: entry.contentStatus,
    unavailableReason: entry.unavailableReason,
    parseComplete: entry.parseComplete,
    chunkCount: entry.chunks.length,
    knowledgeUnitCount: entry.knowledgeUnits.length,
    topics: entry.topics,
    relatedHrefCount: entry.relatedHrefs.length,
    originalFilename: entry.provenance.originalFilename,
  };
}

export const contentStatusLabelsCs: Record<StudyContentStatus, string> = {
  available: "Připraveno ke studiu",
  available_with_warning: "Ke studiu (s upozorněním)",
  unavailable: "Dočasně nedostupné",
  excluded: "Není studijní materiál",
};
