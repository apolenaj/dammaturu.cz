import { z } from "zod";
import {
  gradeMockExam,
  mockExamDimensionLabelsCs,
  mockExamDimensions,
  mockExamPhaseLabelsCs,
  mockExamPhases,
  mockExamRubric,
  selectFollowUps,
  type MockExamChecklistItem,
  type MockExamFollowUp,
  type MockExamPhase,
  type MockExamReport,
  type MockExamTopic,
} from "@/domain/learning/mock-exam";
import {
  drawLiteratureBook,
  literatureFieldKeys,
  literatureFieldLabelsCs,
  weakestLiteratureBooks,
  type LiteratureBook,
  type LiteratureFieldKey,
  type LiteratureFieldValue,
} from "@/domain/learning/literature-maturity";
import type { SchoolExamDocument } from "@/domain/learning/school-exam-profile";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";

/**
 * Oral maturity simulation architecture (D-053).
 * Text-first; voice I/O plugs in via ports without changing grading.
 * Grading is evidence-based checklist + configured rubric — no LLM P0 (D-005),
 * never a fake school mark without explaining evidence.
 */

export const oralSimulationModes = [
  "book",
  "random_book",
  "weak_area",
  "full",
] as const;
export type OralSimulationMode = (typeof oralSimulationModes)[number];

export const oralSimulationModeLabelsCs: Record<OralSimulationMode, string> = {
  book: "Konkrétní kniha",
  random_book: "Náhodná kniha",
  weak_area: "Nejslabší oblast",
  full: "Plná simulace",
};

export const oralSimulationModeHintsCs: Record<OralSimulationMode, string> = {
  book: "Vyber dílo ze svého seznamu literatury.",
  random_book: "Vylosujeme knihu (slabší mají vyšší váhu).",
  weak_area: "Začni u knihy s nejnižším mastery.",
  full: "Delší příprava + širší checklist z dostupných ověřených podkladů.",
};

/** Session phases — same spine as mock exam; voice can mirror each step. */
export const oralSimulationPhases = mockExamPhases;
export type OralSimulationPhase = MockExamPhase;
export const oralSimulationPhaseLabelsCs = mockExamPhaseLabelsCs;

/** Answer / prompt modality — text is P0; voice uses the same transcript text. */
export const oralModalities = ["text", "voice"] as const;
export type OralModality = (typeof oralModalities)[number];

/**
 * Canonical utterance — always carries text for grading.
 * Voice capture must produce `textCs` (STT) before evaluate.
 */
export type OralUtterance = {
  modality: OralModality;
  textCs: string;
  /** Future: storage key for audio blob. */
  audioRef: string | null;
  durationMs: number | null;
  capturedAt: string;
};

export function textUtterance(textCs: string, nowIso: string): OralUtterance {
  return {
    modality: "text",
    textCs,
    audioRef: null,
    durationMs: null,
    capturedAt: nowIso,
  };
}

/**
 * Voice-ready ports — implement with Web Speech / cloud STT-TTS later.
 * Grading never reads audio directly; only `OralUtterance.textCs`.
 */
export type OralInputPort = {
  modality: OralModality;
  /** Capture student answer; voice implementations must return transcript text. */
  captureAnswer: (opts: {
    maxSeconds: number;
  }) => Promise<OralUtterance>;
};

export type OralOutputPort = {
  modality: OralModality;
  /** Present examiner prompt (on-screen text and/or TTS). */
  presentPrompt: (textCs: string) => Promise<void>;
};

export type OralEvidenceKind =
  | "verified_material"
  | "school_requirement"
  | "literature_field"
  | "rubric"
  | "insufficient";

export const oralEvidenceKindLabelsCs: Record<OralEvidenceKind, string> = {
  verified_material: "Ověřený materiál",
  school_requirement: "Školní požadavek",
  literature_field: "Karta díla",
  rubric: "Konfigurovaná rubrika",
  insufficient: "Nedostatek podkladů",
};

export type OralEvidenceRef = {
  kind: OralEvidenceKind;
  sourceLabelCs: string;
  /** Stable id (materialId, doc id, field key…). */
  refId: string;
  excerptCs: string;
};

export type OralChecklistItem = MockExamChecklistItem & {
  evidence: OralEvidenceRef[];
};

export type OralExaminerBrief = {
  mode: OralSimulationMode;
  bookId: string | null;
  bookTitleCs: string;
  promptCs: string;
  prepareSeconds: number;
  answerSeconds: number;
  checklist: OralChecklistItem[];
  followUps: MockExamFollowUp[];
  modelStructure: string[];
  /** True when we have enough verified checklist items to grade fairly. */
  evidenceSufficient: boolean;
  evidenceGapCs: string | null;
  evidenceSummaryCs: string[];
  relatedLearnHref: string | null;
};

export type OralDimensionEvidence = {
  dimension: (typeof mockExamDimensions)[number];
  labelCs: string;
  score: number;
  weight: number;
  rationaleCs: string;
  supportingEvidence: OralEvidenceRef[];
};

export type OralSimulationReport = MockExamReport & {
  mode: OralSimulationMode;
  bookTitleCs: string;
  dimensionEvidence: OralDimensionEvidence[];
  evidenceTrailCs: string[];
  gradedAgainstCs: string[];
  insufficientEvidence: boolean;
  /** Architecture flag for future voice replay. */
  answerModality: OralModality;
};

export const oralSimulationConfig = {
  minChecklistForGrade: 4,
  prepareSecondsDefault: 120,
  answerSecondsDefault: 180,
  prepareSecondsFull: 180,
  answerSecondsFull: 300,
  maxFollowUps: 3,
  rubric: mockExamRubric,
} as const;

export type BuildOralBriefInput = {
  mode: OralSimulationMode;
  books: LiteratureBook[];
  /** Optional explicit book for mode=book. */
  bookId?: string | null;
  schoolDocuments?: SchoolExamDocument[];
  /** Ready material KUs linked to the book (verified excerpts). */
  materialUnits?: LearnerKnowledgeUnit[];
  nowIso?: string;
};

function fieldToSynonyms(value: string): string[] {
  return value
    .split(/[,;·\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)
    .slice(0, 8);
}

function fieldCategoryFlags(key: LiteratureFieldKey): {
  isKeyFact: boolean;
  isStructure: boolean;
  isTerminology: boolean;
} {
  if (key === "author" || key === "themes" || key === "characters") {
    return { isKeyFact: true, isStructure: false, isTerminology: false };
  }
  if (key === "composition" || key === "narrator" || key === "genre") {
    return { isKeyFact: false, isStructure: true, isTerminology: false };
  }
  if (key === "literaryMovement" || key === "language") {
    return { isKeyFact: false, isStructure: false, isTerminology: true };
  }
  return { isKeyFact: false, isStructure: false, isTerminology: false };
}

function literatureFieldEvidence(
  key: LiteratureFieldKey,
  field: LiteratureFieldValue,
): OralEvidenceRef {
  const kind: OralEvidenceKind =
    field.source === "student_material"
      ? "verified_material"
      : field.source === "empty"
        ? "insufficient"
        : "literature_field";
  return {
    kind,
    sourceLabelCs:
      field.source === "student_material"
        ? oralEvidenceKindLabelsCs.verified_material
        : field.sourceLabelCs,
    refId: field.materialId ?? `field:${key}`,
    excerptCs: (field.valueCs ?? "").slice(0, 280),
  };
}

function checklistFromBook(book: LiteratureBook): OralChecklistItem[] {
  const items: OralChecklistItem[] = [];
  for (const key of literatureFieldKeys) {
    const field = book.fields[key];
    const value = field.valueCs?.trim();
    if (!value) continue;
    // Prefer verified material; still allow manual/platform as labeled evidence
    if (field.source === "empty") continue;
    const flags = fieldCategoryFlags(key);
    const evidence = [literatureFieldEvidence(key, field)];
    items.push({
      id: `field-${key}`,
      label: `${literatureFieldLabelsCs[key]}: ${value.slice(0, 80)}`,
      synonyms: fieldToSynonyms(value),
      required: flags.isKeyFact || key === "author" || key === "literaryMovement",
      isKeyFact: flags.isKeyFact,
      isStructure: flags.isStructure,
      isTerminology: flags.isTerminology,
      reviewHintCs: `Doplň ${literatureFieldLabelsCs[key].toLowerCase()} u „${book.titleCs}“.`,
      evidence,
    });
  }
  return items;
}

function checklistFromSchoolDocs(
  docs: SchoolExamDocument[],
): OralChecklistItem[] {
  const oralDocs = docs.filter(
    (d) =>
      d.source === "school" &&
      d.status === "ready" &&
      (d.kind === "oral_exam_structure" ||
        d.kind === "school_maturity_requirements" ||
        d.kind === "teacher_instructions"),
  );
  return oralDocs.slice(0, 4).map((d, i) => ({
    id: `school-doc-${d.id.slice(0, 8)}`,
    label: `Školní požadavek: ${d.title}`,
    synonyms: fieldToSynonyms(d.title),
    required: i === 0,
    isKeyFact: false,
    isStructure: d.kind === "oral_exam_structure",
    isTerminology: false,
    reviewHintCs: `Zkontroluj školní dokument „${d.title}“.`,
    evidence: [
      {
        kind: "school_requirement" as const,
        sourceLabelCs: oralEvidenceKindLabelsCs.school_requirement,
        refId: d.id,
        excerptCs: `${d.title} (${d.originalFilename})`,
      },
    ],
  }));
}

function checklistFromMaterialUnits(
  units: LearnerKnowledgeUnit[],
): OralChecklistItem[] {
  const items: OralChecklistItem[] = [];
  for (const u of units.slice(0, 8)) {
    const excerpt = u.provenance.sourceText?.trim() || u.statement;
    if (!excerpt || excerpt.length < 8) continue;
    const short = excerpt.slice(0, 100);
    items.push({
      id: `ku-${u.id.slice(0, 8)}`,
      label: u.title.slice(0, 120),
      synonyms: fieldToSynonyms(excerpt).slice(0, 6),
      required: u.examRelevance === "high" || u.examRelevance === "critical",
      isKeyFact: true,
      isStructure: false,
      isTerminology: u.kind === "term" || u.kind === "concept",
      reviewHintCs: `Vrať se k materiálu: ${u.title}`,
      evidence: [
        {
          kind: "verified_material",
          sourceLabelCs: oralEvidenceKindLabelsCs.verified_material,
          refId: u.provenance.documentId,
          excerptCs: excerpt.slice(0, 280),
        },
      ],
    });
    void short;
  }
  return items;
}

function modelStructureForBook(book: LiteratureBook): string[] {
  return [
    `Uveď dílo a autora (${book.titleCs}).`,
    "Zařaď do období / literárního směru.",
    "Stručně kompozice a vypravěč.",
    "Klíčové postavy a konflikt.",
    "Témata a motivy — 2–3 body.",
    "Jazyk / styl a význam v kontextu.",
    "Souvislost s dalšími autory (pokud víš).",
  ];
}

function resolveBook(
  mode: OralSimulationMode,
  books: LiteratureBook[],
  bookId?: string | null,
): LiteratureBook | null {
  if (books.length === 0) return null;
  if (mode === "book") {
    return books.find((b) => b.id === bookId) ?? books[0] ?? null;
  }
  if (mode === "weak_area") {
    return weakestLiteratureBooks(books, 1)[0] ?? null;
  }
  if (mode === "random_book") {
    return drawLiteratureBook(books);
  }
  // full — prefer weakest with some content, else first
  const withFields = books.filter((b) => b.mastery.fieldsFilled >= 2);
  if (withFields.length > 0) {
    return weakestLiteratureBooks(withFields, 1)[0] ?? withFields[0]!;
  }
  return books[0]!;
}

/**
 * Build examiner brief from literature + school + verified materials.
 * Does not invent checklist items without a labeled evidence source.
 */
export function buildOralExaminerBrief(
  input: BuildOralBriefInput,
): OralExaminerBrief {
  const book = resolveBook(input.mode, input.books, input.bookId);
  if (!book) {
    return {
      mode: input.mode,
      bookId: null,
      bookTitleCs: "—",
      promptCs: "Nejdřív přidej knihy do seznamu literatury.",
      prepareSeconds: oralSimulationConfig.prepareSecondsDefault,
      answerSeconds: oralSimulationConfig.answerSecondsDefault,
      checklist: [],
      followUps: [],
      modelStructure: [],
      evidenceSufficient: false,
      evidenceGapCs:
        "Bez seznamu literatury nelze sestavit evidenční checklist ani hodnotit.",
      evidenceSummaryCs: [],
      relatedLearnHref: "/app/literature",
    };
  }

  const fromBook = checklistFromBook(book);
  const fromSchool = checklistFromSchoolDocs(input.schoolDocuments ?? []);
  const fromMats = checklistFromMaterialUnits(input.materialUnits ?? []);

  // Prefer verified materials, then literature fields, then school structure
  const merged: OralChecklistItem[] = [];
  const seen = new Set<string>();
  for (const item of [...fromMats, ...fromBook, ...fromSchool]) {
    const key = item.label.toLowerCase().slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= 14) break;
  }

  const full = input.mode === "full";
  const prepareSeconds = full
    ? oralSimulationConfig.prepareSecondsFull
    : oralSimulationConfig.prepareSecondsDefault;
  const answerSeconds = full
    ? oralSimulationConfig.answerSecondsFull
    : oralSimulationConfig.answerSecondsDefault;

  const evidenceSufficient =
    merged.length >= oralSimulationConfig.minChecklistForGrade;

  const followUps: MockExamFollowUp[] = merged.slice(0, 10).map((item) => ({
    id: `fu-${item.id}`,
    checklistItemId: item.id,
    question: `Doplň: ${item.label.replace(/^[^:]+:\s*/, "").slice(0, 120)}?`,
  }));

  const evidenceSummaryCs = [
    ...new Set(
      merged.flatMap((m) => m.evidence.map((e) => e.sourceLabelCs)),
    ),
  ].map((label) => `Zdroj hodnocení: ${label}`);

  return {
    mode: input.mode,
    bookId: book.id,
    bookTitleCs: book.titleCs,
    promptCs: full
      ? `Plná ústní simulace: představ dílo „${book.titleCs}“ jako u maturity — kontext, kompozice, postavy, témata, jazyk.`
      : `Ústní zkouška: představ dílo „${book.titleCs}“ — autor, směr, kompozice, postavy, témata.`,
    prepareSeconds,
    answerSeconds,
    checklist: merged,
    followUps,
    modelStructure: modelStructureForBook(book),
    evidenceSufficient,
    evidenceGapCs: evidenceSufficient
      ? null
      : `Málo ověřených podkladů u „${book.titleCs}“ (${merged.length}/${oralSimulationConfig.minChecklistForGrade}). Doplň kartu díla nebo importuj materiály — bez toho neudělíme falešné skóre.`,
    evidenceSummaryCs,
    relatedLearnHref: `/app/literature/${book.id}`,
  };
}

/** Convert brief → MockExamTopic for shared timer/grade pipeline. */
export function briefToMockTopic(brief: OralExaminerBrief): MockExamTopic {
  const id =
    brief.bookId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      brief.bookId,
    )
      ? brief.bookId
      : "00000000-0000-4000-8000-000000000001";

  // Ensure minimum checklist shape for zod when insufficient — empty topic uses stubs marked insufficient
  const checklist = brief.checklist.map((item) => {
    const { evidence: _ignored, ...rest } = item;
    void _ignored;
    return rest;
  });
  let followUps = brief.followUps;
  if (checklist.length < 5) {
    const pad = 5 - checklist.length;
    for (let i = 0; i < pad; i++) {
      checklist.push({
        id: `pad-${i}`,
        label: "Podklad chybí — nedá se hodnotit",
        synonyms: [],
        required: false,
        isKeyFact: false,
        isStructure: false,
        isTerminology: false,
        reviewHintCs: "Doplň ověřené podklady ke knize.",
      });
    }
  }
  if (followUps.length < 3) {
    followUps = [
      ...followUps,
      ...checklist.slice(0, 3).map((c, i) => ({
        id: `fu-pad-${i}`,
        checklistItemId: c.id,
        question: "Co dalšího víš k tomuto bodu?",
      })),
    ].slice(0, 12);
  }

  return {
    id,
    slug: `oral-${(brief.bookTitleCs || "kniha")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40)}`,
    title: brief.bookTitleCs,
    subtitle: oralSimulationModeLabelsCs[brief.mode],
    workTitle: brief.bookTitleCs,
    prepareSeconds: brief.prepareSeconds,
    answerSeconds: brief.answerSeconds,
    prompt: brief.promptCs,
    checklist,
    followUps,
    inaccuracies: [],
    modelStructure:
      brief.modelStructure.length >= 4
        ? brief.modelStructure
        : [
            "Autor a dílo",
            "Směr a období",
            "Kompozice",
            "Postavy a témata",
          ],
    excellentAnswer:
      "Modelová odpověď vzniká z tvých ověřených podkladů — viz checklist a strukturu. Nejsme LLM examiner.",
    relatedLearnHref: brief.relatedLearnHref,
  };
}

function buildDimensionEvidence(
  report: MockExamReport,
  brief: OralExaminerBrief,
): OralDimensionEvidence[] {
  const byDimEvidence = (dim: (typeof mockExamDimensions)[number]) => {
    if (dim === "confidence") {
      return [
        {
          kind: "rubric" as const,
          sourceLabelCs: oralEvidenceKindLabelsCs.rubric,
          refId: "confidence-self",
          excerptCs: `Sebehodnocení ${report.confidenceSelf}/5 (váha ${(mockExamRubric.weights.confidence * 100).toFixed(0)} %).`,
        },
      ];
    }
    if (dim === "accuracy") {
      return report.inaccuracies.length === 0
        ? [
            {
              kind: "rubric" as const,
              sourceLabelCs: oralEvidenceKindLabelsCs.rubric,
              refId: "accuracy-clean",
              excerptCs: "V odpovědi nebyl detekován známý chybový vzor.",
            },
          ]
        : report.inaccuracies.map((inc) => ({
            kind: "rubric" as const,
            sourceLabelCs: oralEvidenceKindLabelsCs.rubric,
            refId: inc.id,
            excerptCs: `${inc.label} → ${inc.correction}`,
          }));
    }
    // coverage / key_facts / structure / terminology — from checklist evidence
    const relevant = brief.checklist.filter((c) => {
      if (dim === "coverage") return c.required;
      if (dim === "key_facts") return c.isKeyFact;
      if (dim === "structure") return c.isStructure;
      if (dim === "terminology") return c.isTerminology;
      return false;
    });
    const hitIds = new Set(report.explainedWell.map((h) => h.itemId));
    return relevant.flatMap((c) =>
      c.evidence.map((e) => ({
        ...e,
        excerptCs: `${hitIds.has(c.id) ? "✓" : "✗"} ${c.label} · ${e.excerptCs}`.slice(
          0,
          280,
        ),
      })),
    );
  };

  return mockExamDimensions.map((dim) => {
    const score = report.dimensions[dim];
    const supporting = byDimEvidence(dim);
    let rationaleCs = "";
    if (dim === "confidence") {
      rationaleCs = `Sebehodnocení ${report.confidenceSelf}/5 → ${score} bodů. Nemůže samo o sobě vytvořit „známku“.`;
    } else if (dim === "accuracy") {
      rationaleCs =
        report.inaccuracies.length === 0
          ? "Bez detekovaných nepřesností vůči známým vzorům."
          : `${report.inaccuracies.length} nepřesnost(i) dle vzorů — skóre sníženo.`;
    } else {
      const hits = supporting.filter((e) => e.excerptCs.startsWith("✓")).length;
      const total = supporting.length || 1;
      rationaleCs = `Shoda s evidencí: ${hits}/${total} bodů checklistu pro ${mockExamDimensionLabelsCs[dim]}.`;
    }
    return {
      dimension: dim,
      labelCs: mockExamDimensionLabelsCs[dim],
      score,
      weight: mockExamRubric.weights[dim],
      rationaleCs,
      supportingEvidence: supporting.slice(0, 8),
    };
  });
}

/**
 * Grade oral session. If evidence is insufficient, return report with
 * overallScore=0 and explicit gap — never invent a comforting fake grade.
 */
export function gradeOralSimulation(input: {
  brief: OralExaminerBrief;
  mainAnswer: OralUtterance;
  followUpAnswers: Record<string, OralUtterance>;
  followUpAskedIds: string[];
  confidenceSelf: number;
}): OralSimulationReport {
  const topic = briefToMockTopic(input.brief);
  const followUpAnswersText: Record<string, string> = {};
  for (const [id, u] of Object.entries(input.followUpAnswers)) {
    followUpAnswersText[id] = u.textCs;
  }

  if (!input.brief.evidenceSufficient) {
    const empty = gradeMockExam({
      topic,
      mainAnswer: input.mainAnswer.textCs,
      followUpAnswers: followUpAnswersText,
      followUpAskedIds: input.followUpAskedIds,
      confidenceSelf: input.confidenceSelf,
    });
    return {
      ...empty,
      overallScore: 0,
      band: "weak",
      strengths: [],
      missingPoints: [],
      toReview: [
        input.brief.evidenceGapCs ??
          "Doplň ověřené podklady před dalším hodnocením.",
      ],
      mode: input.brief.mode,
      bookTitleCs: input.brief.bookTitleCs,
      dimensionEvidence: [],
      evidenceTrailCs: [
        input.brief.evidenceGapCs ??
          "Nedostatek evidence — skóre nevydáváme.",
      ],
      gradedAgainstCs: [],
      insufficientEvidence: true,
      answerModality: input.mainAnswer.modality,
      disclaimerCs: `${mockExamRubric.disclaimerCs} Bez dostatečných ověřených podkladů neudělujeme skóre.`,
      isOfficialSchoolGrade: false,
    };
  }

  const base = gradeMockExam({
    topic,
    mainAnswer: input.mainAnswer.textCs,
    followUpAnswers: followUpAnswersText,
    followUpAskedIds: input.followUpAskedIds,
    confidenceSelf: input.confidenceSelf,
  });

  const dimensionEvidence = buildDimensionEvidence(base, input.brief);
  const gradedAgainstCs = [
    ...new Set(
      input.brief.checklist.flatMap((c) =>
        c.evidence.map((e) => e.sourceLabelCs),
      ),
    ),
    oralEvidenceKindLabelsCs.rubric,
  ];

  const evidenceTrailCs = [
    ...input.brief.evidenceSummaryCs,
    ...base.explainedWell.slice(0, 5).map(
      (h) => `Shoda: „${h.label}“ (přes „${h.matchedVia}“).`,
    ),
    ...base.missingPoints
      .slice(0, 5)
      .map((m) => `Chybí evidence v odpovědi: ${m.label}`),
    `Rubrika: vážený součet ${base.overallScore}/100 — není školní známka.`,
  ];

  return {
    ...base,
    mode: input.brief.mode,
    bookTitleCs: input.brief.bookTitleCs,
    dimensionEvidence,
    evidenceTrailCs,
    gradedAgainstCs,
    insufficientEvidence: false,
    answerModality: input.mainAnswer.modality,
    isOfficialSchoolGrade: false,
  };
}

export { selectFollowUps };

export type OralSimulationSelectView = {
  modes: Array<{
    mode: OralSimulationMode;
    labelCs: string;
    hintCs: string;
  }>;
  books: Array<{ id: string; titleCs: string; masteryScorePct: number }>;
  canStart: boolean;
  emptyCs: string | null;
  architectureNoteCs: string;
};

export function buildOralSelectView(
  books: LiteratureBook[],
): OralSimulationSelectView {
  return {
    modes: oralSimulationModes.map((mode) => ({
      mode,
      labelCs: oralSimulationModeLabelsCs[mode],
      hintCs: oralSimulationModeHintsCs[mode],
    })),
    books: books.map((b) => ({
      id: b.id,
      titleCs: b.titleCs,
      masteryScorePct: b.mastery.scorePct,
    })),
    canStart: books.length > 0,
    emptyCs:
      books.length === 0
        ? "Nejdřív přidej knihy v Seznamu literatury — simulace hodnotí jen proti tvým podkladům."
        : null,
    architectureNoteCs:
      "Text první. Hlas (STT/TTS) se napojí přes OralInputPort / OralOutputPort — hodnocení vždy běží z přepisu. Bez LLM examineru (D-005); evidence = materiály · škola · rubrika.",
  };
}

export const oralSimulationSessionSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  mode: z.enum(oralSimulationModes),
  bookId: z.string().uuid().nullable(),
  phase: z.enum(oralSimulationPhases),
  brief: z.object({
    mode: z.enum(oralSimulationModes),
    bookId: z.string().nullable(),
    bookTitleCs: z.string(),
    promptCs: z.string(),
    prepareSeconds: z.number().int(),
    answerSeconds: z.number().int(),
    evidenceSufficient: z.boolean(),
    evidenceGapCs: z.string().nullable(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OralSimulationSessionMeta = z.infer<
  typeof oralSimulationSessionSchema
>;
