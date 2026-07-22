import { z } from "zod";
import type { OnboardingInput } from "@/domain/onboarding/schema";
import { schoolTypeLabels } from "@/domain/onboarding/schema";

/**
 * School Exam Profile (D-051).
 * Czech maturity = common CERMAT didactic component + school-dependent oral/writing.
 * Sources are never mixed without an explicit label:
 *   CERMAT · Škola · Moje materiály (student)
 */

export const requirementSources = ["cermat", "school", "student"] as const;
export type RequirementSource = (typeof requirementSources)[number];

export const requirementSourceLabelsCs: Record<RequirementSource, string> = {
  cermat: "CERMAT",
  school: "Škola",
  student: "Moje materiály",
};

export const requirementSourceHintsCs: Record<RequirementSource, string> = {
  cermat:
    "Společná didaktická část maturity — stejná napříč školami (katalog CERMAT).",
  school:
    "Požadavky konkrétní školy — ústní, seznam literatury, instrukce učitele, kritéria.",
  student:
    "Tvoje výběr a poznámky — vybrané knihy a vlastní podklady. Nejsou oficiální požadavky školy ani CERMAT.",
};

export const examRequirementCategories = [
  "didactic",
  "oral",
  "writing",
  "literature",
  "other",
] as const;
export type ExamRequirementCategory =
  (typeof examRequirementCategories)[number];

export const examRequirementCategoryLabelsCs: Record<
  ExamRequirementCategory,
  string
> = {
  didactic: "Didaktický test",
  oral: "Ústní zkouška",
  writing: "Písemná práce",
  literature: "Literatura",
  other: "Ostatní",
};

/** Uploadable document slots for school / student layers. */
export const schoolExamDocKinds = [
  "school_maturity_requirements",
  "literature_list",
  "selected_books",
  "teacher_instructions",
  "oral_exam_structure",
  "writing_criteria",
] as const;
export type SchoolExamDocKind = (typeof schoolExamDocKinds)[number];

export const schoolExamDocKindLabelsCs: Record<SchoolExamDocKind, string> = {
  school_maturity_requirements: "Školní maturitní požadavky",
  literature_list: "Seznam literatury (škola)",
  selected_books: "Moje vybrané knihy",
  teacher_instructions: "Instrukce učitele",
  oral_exam_structure: "Struktura ústní zkoušky",
  writing_criteria: "Kritéria písemné práce",
};

export const schoolExamDocKindHintsCs: Record<SchoolExamDocKind, string> = {
  school_maturity_requirements:
    "Oficiální / školní dokument s požadavky na maturitu z ČJL.",
  literature_list: "Kánon / seznam děl schválený školou.",
  selected_books: "Knihy, které sis vybral/a k ústní — tvoje volba.",
  teacher_instructions: "Pokyny od učitele (formát, čas, očekávání).",
  oral_exam_structure: "Jak u vás probíhá ústní (části, čas, hodnotící list).",
  writing_criteria: "Školní / učitelova kritéria slohu (ne CERMAT katalog).",
};

/** Which layer owns each upload kind — never ambiguous. */
export const schoolExamDocKindSource: Record<
  SchoolExamDocKind,
  Exclude<RequirementSource, "cermat">
> = {
  school_maturity_requirements: "school",
  literature_list: "school",
  selected_books: "student",
  teacher_instructions: "school",
  oral_exam_structure: "school",
  writing_criteria: "school",
};

export const schoolExamDocStatuses = [
  "uploading",
  "ready",
  "failed",
] as const;
export type SchoolExamDocStatus = (typeof schoolExamDocStatuses)[number];

export const schoolExamDocumentSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(schoolExamDocKinds),
  source: z.enum(["school", "student"]),
  sourceLabelCs: z.string().min(1).max(40),
  title: z.string().min(1).max(240),
  originalFilename: z.string().min(1).max(500),
  format: z.enum(["pdf", "docx", "txt"]),
  mimeType: z.string().min(1).max(120),
  byteSize: z.number().int().min(0),
  contentSha256: z.string().length(64),
  storageFilename: z.string().min(1).max(200),
  status: z.enum(schoolExamDocStatuses),
  statusMessage: z.string().max(400).nullable(),
  noteCs: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SchoolExamDocument = z.infer<typeof schoolExamDocumentSchema>;

export const selectedBookSchema = z.object({
  id: z.string().min(1).max(64),
  titleCs: z.string().min(1).max(200),
  authorCs: z.string().max(160).optional(),
  noteCs: z.string().max(400).optional(),
});

export type SelectedBook = z.infer<typeof selectedBookSchema>;

export const schoolExamProfileSchema = z.object({
  learnerId: z.string().min(1).max(64),
  schoolType: z.enum([
    "gymnazium",
    "ss_odborna",
    "ss_prakticka",
    "jine",
  ]),
  schoolName: z.string().max(240).nullable(),
  subjectSlug: z.literal("cjl"),
  documents: z.array(schoolExamDocumentSchema).max(40),
  selectedBooks: z.array(selectedBookSchema).max(40),
  studentNotesCs: z.string().max(2000).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SchoolExamProfile = z.infer<typeof schoolExamProfileSchema>;

export type CermatRequirementItem = {
  id: string;
  category: ExamRequirementCategory;
  titleCs: string;
  detailCs: string;
};

/**
 * Curated CERMAT ČJL didactic / common layer.
 * High-level, honest catalog — not a scraped fake syllabus.
 */
export const CERMAT_CJL_REQUIREMENTS: CermatRequirementItem[] = [
  {
    id: "cermat-cjl-dt-1.1",
    category: "didactic",
    titleCs: "1.1 Pravopis (CERMAT katalog)",
    detailCs:
      "Ovládá pravidla českého pravopisu — společná část, didaktický test 2025/2026.",
  },
  {
    id: "cermat-cjl-dt-1.2",
    category: "didactic",
    titleCs: "1.2 Slovotvorba a morfologie",
    detailCs:
      "Slovotvorná a morfologická analýza slovního tvaru (katalog CERMAT §1.2).",
  },
  {
    id: "cermat-cjl-dt-1.3",
    category: "didactic",
    titleCs: "1.3 Význam pojmenování",
    detailCs:
      "Význam v kontextu, synonyma/antonyma, obraznost (katalog CERMAT §1.3).",
  },
  {
    id: "cermat-cjl-dt-1.4",
    category: "didactic",
    titleCs: "1.4 Syntax věty a souvětí",
    detailCs:
      "Syntaktická analýza věty jednoduché a souvětí (katalog CERMAT §1.4).",
  },
  {
    id: "cermat-cjl-dt-1.5",
    category: "didactic",
    titleCs: "1.5 Porozumění textu",
    detailCs:
      "Porozumění celému textu i jeho částem (katalog CERMAT §1.5).",
  },
  {
    id: "cermat-cjl-dt-1.6",
    category: "didactic",
    titleCs: "1.6 Charakter / funkce / styl textu",
    detailCs:
      "Účel, funkce, funkční styl a komunikační situace (katalog CERMAT §1.6).",
  },
  {
    id: "cermat-cjl-dt-1.7",
    category: "didactic",
    titleCs: "1.7 Výstavba textu / koheze",
    detailCs:
      "Analýza výstavby výpovědi a textu (katalog CERMAT §1.7).",
  },
  {
    id: "cermat-cjl-dt-1.8",
    category: "didactic",
    titleCs: "1.8 Literární historie",
    detailCs:
      "Orientace ve vývoji české a světové literatury / směry (katalog CERMAT §1.8). Ne školní ústní seznam.",
  },
  {
    id: "cermat-cjl-dt-1.9",
    category: "didactic",
    titleCs: "1.9 Literární teorie",
    detailCs:
      "Aplikace literární teorie na text (katalog CERMAT §1.9). Ne školní ústní seznam.",
  },
  {
    id: "cermat-not-oral-list",
    category: "oral",
    titleCs: "Ústní není CERMAT seznam",
    detailCs:
      "Ústní zkouška a školní seznam literatury nejsou součástí společného CERMAT didaktického testu — doplň je ve vrstvě Škola / Moje materiály.",
  },
];

export type LabeledRequirement = {
  id: string;
  source: RequirementSource;
  sourceLabelCs: string;
  category: ExamRequirementCategory;
  categoryLabelCs: string;
  titleCs: string;
  detailCs: string;
  documentId?: string;
};

export type SchoolExamSourceSection = {
  source: RequirementSource;
  sourceLabelCs: string;
  hintCs: string;
  requirements: LabeledRequirement[];
  documents: SchoolExamDocument[];
  emptyCs: string | null;
};

export type SchoolExamProfileCompleteness = {
  uploadedKinds: SchoolExamDocKind[];
  missingRecommendedKinds: SchoolExamDocKind[];
  selectedBooksCount: number;
  readyDocumentCount: number;
  pct: number;
  summaryCs: string;
};

export type SchoolExamProfileView = {
  schoolTypeLabelCs: string;
  schoolName: string | null;
  subjectLabelCs: string;
  philosophyCs: string;
  sections: SchoolExamSourceSection[];
  completeness: SchoolExamProfileCompleteness;
  selectedBooks: SelectedBook[];
  studentNotesCs: string | null;
  updatedAt: string;
};

export const schoolExamProfileConfig = {
  maxFileBytes: 12 * 1024 * 1024,
  maxDocuments: 24,
  maxSelectedBooks: 40,
  supportedFormats: ["pdf", "docx", "txt"] as const,
  /** Recommended school-layer uploads for a usable oral/writing profile. */
  recommendedSchoolKinds: [
    "school_maturity_requirements",
    "literature_list",
    "oral_exam_structure",
    "writing_criteria",
  ] as SchoolExamDocKind[],
} as const;

export function emptySchoolExamProfile(
  learnerId: string,
  schoolType: OnboardingInput["schoolType"],
  nowIso: string,
): SchoolExamProfile {
  return {
    learnerId,
    schoolType,
    schoolName: null,
    subjectSlug: "cjl",
    documents: [],
    selectedBooks: [],
    studentNotesCs: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function labelSource(source: RequirementSource): string {
  return requirementSourceLabelsCs[source];
}

function cermatRequirementsAsLabeled(): LabeledRequirement[] {
  return CERMAT_CJL_REQUIREMENTS.map((r) => ({
    id: r.id,
    source: "cermat" as const,
    sourceLabelCs: requirementSourceLabelsCs.cermat,
    category: r.category,
    categoryLabelCs: examRequirementCategoryLabelsCs[r.category],
    titleCs: r.titleCs,
    detailCs: r.detailCs,
  }));
}

function documentAsRequirement(doc: SchoolExamDocument): LabeledRequirement {
  const category: ExamRequirementCategory =
    doc.kind === "literature_list" || doc.kind === "selected_books"
      ? "literature"
      : doc.kind === "oral_exam_structure"
        ? "oral"
        : doc.kind === "writing_criteria"
          ? "writing"
          : doc.kind === "school_maturity_requirements"
            ? "other"
            : "other";
  return {
    id: `doc-${doc.id}`,
    source: doc.source,
    sourceLabelCs: doc.sourceLabelCs,
    category,
    categoryLabelCs: examRequirementCategoryLabelsCs[category],
    titleCs: schoolExamDocKindLabelsCs[doc.kind],
    detailCs:
      doc.status === "ready"
        ? doc.noteCs?.trim() ||
          `Nahráno: ${doc.originalFilename} · zdroj ${doc.sourceLabelCs}.`
        : doc.statusMessage ??
          `Soubor ${doc.originalFilename} — stav: ${doc.status}.`,
    documentId: doc.id,
  };
}

export function computeCompleteness(
  profile: SchoolExamProfile,
): SchoolExamProfileCompleteness {
  const ready = profile.documents.filter((d) => d.status === "ready");
  const uploadedKinds = [
    ...new Set(ready.map((d) => d.kind)),
  ] as SchoolExamDocKind[];
  const missingRecommendedKinds =
    schoolExamProfileConfig.recommendedSchoolKinds.filter(
      (k) => !uploadedKinds.includes(k),
    );
  const hasSelected =
    profile.selectedBooks.length > 0 ||
    uploadedKinds.includes("selected_books");
  const slots =
    schoolExamProfileConfig.recommendedSchoolKinds.length + 1; // + selected books
  const filled =
    schoolExamProfileConfig.recommendedSchoolKinds.length -
    missingRecommendedKinds.length +
    (hasSelected ? 1 : 0);
  const pct = Math.round((filled / slots) * 100);
  const summaryCs =
    missingRecommendedKinds.length === 0 && hasSelected
      ? "Profil maturity je doplněný — CERMAT, škola i tvoje výběr jsou oddělené."
      : `Doplň školní podklady (${missingRecommendedKinds.length} doporučených chybí)${
          hasSelected ? "" : " a vybrané knihy"
        }. CERMAT vrstva je vždy k dispozici.`;
  return {
    uploadedKinds,
    missingRecommendedKinds,
    selectedBooksCount: profile.selectedBooks.length,
    readyDocumentCount: ready.length,
    pct,
    summaryCs,
  };
}

/**
 * Build student-facing view — three labeled sections, never merged.
 */
export function buildSchoolExamProfileView(
  profile: SchoolExamProfile,
): SchoolExamProfileView {
  const bySource = (source: RequirementSource) =>
    profile.documents.filter((d) => d.source === source);

  const schoolDocs = bySource("school");
  const studentDocs = bySource("student");

  const schoolReqs = schoolDocs.map(documentAsRequirement);
  const studentReqs = [
    ...studentDocs.map(documentAsRequirement),
    ...profile.selectedBooks.map((b) => ({
      id: `book-${b.id}`,
      source: "student" as const,
      sourceLabelCs: requirementSourceLabelsCs.student,
      category: "literature" as const,
      categoryLabelCs: examRequirementCategoryLabelsCs.literature,
      titleCs: b.titleCs,
      detailCs: [b.authorCs, b.noteCs].filter(Boolean).join(" · ") ||
        "Vybraná kniha (student) — ne školní seznam.",
    })),
  ];

  const sections: SchoolExamSourceSection[] = [
    {
      source: "cermat",
      sourceLabelCs: requirementSourceLabelsCs.cermat,
      hintCs: requirementSourceHintsCs.cermat,
      requirements: cermatRequirementsAsLabeled(),
      documents: [],
      emptyCs: null,
    },
    {
      source: "school",
      sourceLabelCs: requirementSourceLabelsCs.school,
      hintCs: requirementSourceHintsCs.school,
      requirements: schoolReqs,
      documents: schoolDocs,
      emptyCs:
        schoolDocs.length === 0
          ? "Zatím žádné školní dokumenty. Nahraj požadavky, seznam literatury, strukturu ústní nebo kritéria slohu."
          : null,
    },
    {
      source: "student",
      sourceLabelCs: requirementSourceLabelsCs.student,
      hintCs: requirementSourceHintsCs.student,
      requirements: studentReqs,
      documents: studentDocs,
      emptyCs:
        studentReqs.length === 0
          ? "Zatím žádné tvoje materiály k maturitě. Přidej vybrané knihy nebo nahraj jejich seznam."
          : null,
    },
  ];

  return {
    schoolTypeLabelCs: schoolTypeLabels[profile.schoolType],
    schoolName: profile.schoolName,
    subjectLabelCs: "Český jazyk a literatura",
    philosophyCs:
      "CERMAT, škola a tvoje materiály držíme odděleně — nikdy je nemícháme bez označení zdroje.",
    sections,
    completeness: computeCompleteness(profile),
    selectedBooks: profile.selectedBooks,
    studentNotesCs: profile.studentNotesCs,
    updatedAt: profile.updatedAt,
  };
}

export function assertDocKindSource(
  kind: SchoolExamDocKind,
  source: RequirementSource,
): void {
  if (source === "cermat") {
    throw new Error("CERMAT vrstvu nelze nahrát jako soubor studenta.");
  }
  const expected = schoolExamDocKindSource[kind];
  if (source !== expected) {
    throw new Error(
      `Dokument „${schoolExamDocKindLabelsCs[kind]}“ patří do vrstvy ${requirementSourceLabelsCs[expected]}, ne ${requirementSourceLabelsCs[source]}.`,
    );
  }
}
