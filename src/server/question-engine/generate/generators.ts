import { randomUUID } from "node:crypto";
import { deterministicUuid } from "@/server/curriculum/ids";
import type { EngineQuestion } from "@/domain/learning/question-engine";
import type { FlashcardItem } from "@/domain/learning/flashcards";
import {
  difficultyBandToScore,
  type GeneratedQuestion,
  type GeneratedQuestionKind,
  type QuestionDifficultyBand,
  type VerifiedKnowledgeUnitInput,
} from "@/domain/learning/question-generation";
import {
  assertAnswersSupported,
  buildExplanation,
  extractYears,
  fingerprintQuestion,
  isAnswerSupportedBySource,
  isStatementGrounded,
  slugifyPart,
  sourceLabelFromEvidence,
} from "@/server/question-engine/generate/support";

const NS = "dammaturu.qg.item";

function stableId(seed: string): string {
  return deterministicUuid(NS, seed);
}

function kuRef(unit: VerifiedKnowledgeUnitInput) {
  return { id: unit.id, title: unit.title.slice(0, 160) };
}

function optId(prefix: string, label: string): string {
  return `${prefix}-${slugifyPart(label, 20)}`;
}

type GenCtx = {
  unit: VerifiedKnowledgeUnitInput;
  pool: VerifiedKnowledgeUnitInput[];
  band: QuestionDifficultyBand;
};

type Draft = Omit<GeneratedQuestion, "id"> & { id?: string };

function wrap(params: {
  generationKind: GeneratedQuestionKind;
  band: QuestionDifficultyBand;
  unitIds: string[];
  correctAnswer: GeneratedQuestion["correctAnswer"];
  rubricCriteria: string[];
  keyTerms: string[];
  evidence: VerifiedKnowledgeUnitInput["sourceEvidence"];
  stem: string;
  answerKey: string;
  engineQuestion?: EngineQuestion;
  flashcard?: FlashcardItem;
  notes?: string;
}): Draft {
  return {
    id: stableId(
      fingerprintQuestion({
        generationKind: params.generationKind,
        stem: params.stem,
        answerKey: params.answerKey,
      }),
    ),
    generationKind: params.generationKind,
    difficultyBand: params.band,
    difficulty: difficultyBandToScore(params.band),
    knowledgeUnitIds: params.unitIds,
    correctAnswer: params.correctAnswer,
    gradingRubric: {
      fullCreditCriteria: params.rubricCriteria,
      keyTerms: params.keyTerms,
      partialThreshold: 0.35,
      fullThreshold: 0.85,
      notes: params.notes,
    },
    sourceEvidence: params.evidence,
    fingerprint: fingerprintQuestion({
      generationKind: params.generationKind,
      stem: params.stem,
      answerKey: params.answerKey,
    }),
    engineQuestion: params.engineQuestion,
    flashcard: params.flashcard,
  };
}

function otherUnits(
  ctx: GenCtx,
  pred: (u: VerifiedKnowledgeUnitInput) => boolean,
): VerifiedKnowledgeUnitInput[] {
  return ctx.pool.filter((u) => u.id !== ctx.unit.id && pred(u));
}

/** Open answer / short answer from verified statement. */
export function genOpenAnswer(ctx: GenCtx): Draft | null {
  const { unit, band } = ctx;
  if (!isStatementGrounded(unit.statement, unit.sourceEvidence)) return null;

  let stem: string;
  let accepted: string[];
  let keyTerms: string[];

  if (unit.author && isAnswerSupportedBySource(unit.author, unit.sourceEvidence)) {
    stem =
      band === "exam-like" || band === "hard"
        ? `Uveď autora zmíněného v ověřeném materiálu k tématu „${unit.title}“.`
        : `Kdo je autorem podle materiálu u „${unit.title}“?`;
    accepted = [unit.author];
    keyTerms = unit.author.split(/\s+/).filter((w) => w.length >= 3);
  } else if (
    unit.literaryWork &&
    isAnswerSupportedBySource(unit.literaryWork, unit.sourceEvidence)
  ) {
    stem = `Jaké dílo uvádí materiál u „${unit.title}“?`;
    accepted = [unit.literaryWork];
    keyTerms = unit.literaryWork.split(/\s+/).filter((w) => w.length >= 2);
  } else if (extractYears(unit.sourceEvidence.quote)[0]) {
    const year = extractYears(unit.sourceEvidence.quote)[0]!;
    stem = `Jaký rok uvádí zdroj u „${unit.title}“?`;
    accepted = [year];
    keyTerms = [year];
  } else {
    const words = unit.statement.split(/\s+/).slice(0, 6).join(" ");
    stem = `Doplň klíčový údaj ze zdroje k „${unit.title}“ (stručně).`;
    accepted = [unit.statement.slice(0, 120)];
    keyTerms = unit.statement
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 4)
      .slice(0, 5);
    if (!assertAnswersSupported(keyTerms, unit.sourceEvidence)) return null;
    void words;
  }

  if (!assertAnswersSupported(accepted, unit.sourceEvidence)) return null;

  const explanation = buildExplanation({
    core: `Správná odpověď vychází z ověřeného tvrzení: ${unit.statement}`,
    evidence: unit.sourceEvidence,
  });

  const engineQuestion: EngineQuestion = {
    id: randomUUID(),
    slug: `oa-${slugifyPart(unit.title)}-${band}`.slice(0, 120),
    kind: "short_answer",
    stem,
    difficulty: difficultyBandToScore(band),
    knowledgeUnits: [kuRef(unit)],
    explanation,
    source: sourceLabelFromEvidence(unit.sourceEvidence),
    examRelevance: unit.examRelevance ?? "medium",
    correctAnswer: {
      accepted: accepted.map((a) => a.slice(0, 120)),
      keyTerms: keyTerms.map((t) => t.slice(0, 80)).slice(0, 10),
    },
    distractors: [],
  };

  return wrap({
    generationKind: "open_answer",
    band,
    unitIds: [unit.id],
    correctAnswer: { accepted, keyTerms },
    rubricCriteria: accepted,
    keyTerms,
    evidence: unit.sourceEvidence,
    stem,
    answerKey: accepted.join("|"),
    engineQuestion,
  });
}

/** Multiple choice — distractors only from other verified units. */
export function genMultipleChoice(ctx: GenCtx): Draft | null {
  const { unit, band, pool } = ctx;
  const correctLabel =
    unit.definition?.slice(0, 200) ||
    unit.statement.slice(0, 200);
  if (!isAnswerSupportedBySource(
    correctLabel.split(/\s+/).slice(0, 4).join(" "),
    unit.sourceEvidence,
  ) && !isStatementGrounded(unit.statement, unit.sourceEvidence)) {
    return null;
  }

  const distractorPool = otherUnits(ctx, (u) =>
    Boolean(u.statement && u.statement !== unit.statement),
  ).slice(0, 8);

  if (distractorPool.length < 2) return null;

  const correctId = "c0";
  const options = [
    { id: correctId, label: correctLabel.slice(0, 400) },
    ...distractorPool.slice(0, 3).map((u, i) => ({
      id: `d${i + 1}`,
      label: (u.definition || u.statement).slice(0, 400),
    })),
  ];

  const stem =
    band === "easy"
      ? `Která formulace odpovídá ověřenému materiálu o „${unit.title}“?`
      : `Vyber tvrzení, které je přímo podložené zdrojem k „${unit.title}“.`;

  const explanation = buildExplanation({
    core: `Správná volba opakuje ověřené tvrzení. Ostatní volby patří k jiným znalostním jednotkám — nejsou odpovědí na tuto otázku.`,
    evidence: unit.sourceEvidence,
  });

  const engineQuestion: EngineQuestion = {
    id: randomUUID(),
    slug: `mc-${slugifyPart(unit.title)}-${band}`.slice(0, 120),
    kind: "single_choice",
    stem,
    difficulty: difficultyBandToScore(band),
    knowledgeUnits: [kuRef(unit)],
    explanation,
    source: sourceLabelFromEvidence(unit.sourceEvidence),
    examRelevance: unit.examRelevance ?? "high",
    options,
    correctAnswer: correctId,
    distractors: options.filter((o) => o.id !== correctId).map((o) => o.id),
  };

  void pool;
  return wrap({
    generationKind: "multiple_choice",
    band,
    unitIds: [unit.id],
    correctAnswer: correctId,
    rubricCriteria: [correctLabel.slice(0, 160)],
    keyTerms: unit.statement
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 4)
      .slice(0, 6),
    evidence: unit.sourceEvidence,
    stem,
    answerKey: correctLabel.slice(0, 80),
    engineQuestion,
  });
}

export function genTrueFalse(ctx: GenCtx): Draft | null {
  const { unit, band } = ctx;
  if (!isStatementGrounded(unit.statement, unit.sourceEvidence)) return null;

  // Prefer true claims — answer is supported by source verbatim
  const stem = `${unit.statement.replace(/\.$/, "")}.`;
  if (stem.length < 12 || stem.length > 400) return null;

  const explanation = buildExplanation({
    core: `Tvrzení je pravdivé podle ověřeného zdroje.`,
    evidence: unit.sourceEvidence,
  });

  const engineQuestion: EngineQuestion = {
    id: randomUUID(),
    slug: `tf-${slugifyPart(unit.title)}-${band}`.slice(0, 120),
    kind: "true_false",
    stem: band === "exam-like" ? `Posuď pravdivost: ${stem}` : stem,
    difficulty: difficultyBandToScore(band),
    knowledgeUnits: [kuRef(unit)],
    explanation,
    source: sourceLabelFromEvidence(unit.sourceEvidence),
    examRelevance: unit.examRelevance ?? "medium",
    correctAnswer: true,
    distractors: [],
  };

  const keyTerms = [
    ...extractYears(unit.statement),
    ...(unit.author?.split(/\s+/).slice(-1) ?? []),
  ]
    .filter(Boolean)
    .slice(0, 6);
  if (keyTerms.length === 0) keyTerms.push("pravda");

  return wrap({
    generationKind: "true_false",
    band,
    unitIds: [unit.id],
    correctAnswer: true,
    rubricCriteria: ["Pravda — tvrzení je ve zdroji."],
    keyTerms,
    evidence: unit.sourceEvidence,
    stem: engineQuestion.stem,
    answerKey: "true",
    engineQuestion,
  });
}

export function genFillBlank(ctx: GenCtx): Draft | null {
  const { unit, band } = ctx;
  const quote = unit.sourceEvidence.quote.trim();
  if (quote.length < 20) return null;

  let blank = "";
  let template = "";

  if (unit.author && quote.includes(unit.author)) {
    blank = unit.author;
    template = quote.replace(unit.author, "___");
  } else if (unit.literaryWork && quote.includes(unit.literaryWork)) {
    blank = unit.literaryWork;
    template = quote.replace(unit.literaryWork, "___");
  } else {
    const year = extractYears(quote)[0];
    if (year) {
      blank = year;
      template = quote.replace(year, "___");
    }
  }

  if (!blank || !template.includes("___")) return null;
  if (!isAnswerSupportedBySource(blank, unit.sourceEvidence)) return null;
  // Avoid trivial: blank must not be the entire quote
  if (blank.length >= quote.length - 5) return null;

  const stem =
    band === "easy" ? "Doplň chybějící údaj ze zdroje." : "Doplň podle ověřeného úryvku.";

  const explanation = buildExplanation({
    core: `Doplněk „${blank}“ je přímo ve zdroji.`,
    evidence: unit.sourceEvidence,
  });

  const engineQuestion: EngineQuestion = {
    id: randomUUID(),
    slug: `fb-${slugifyPart(unit.title)}-${band}`.slice(0, 120),
    kind: "fill_blank",
    stem,
    template: template.slice(0, 600),
    difficulty: difficultyBandToScore(band),
    knowledgeUnits: [kuRef(unit)],
    explanation,
    source: sourceLabelFromEvidence(unit.sourceEvidence),
    examRelevance: unit.examRelevance ?? "medium",
    correctAnswer: [blank.slice(0, 80)],
    distractors: [],
  };

  return wrap({
    generationKind: "fill_blank",
    band,
    unitIds: [unit.id],
    correctAnswer: [blank],
    rubricCriteria: [blank],
    keyTerms: [blank],
    evidence: unit.sourceEvidence,
    stem: `${stem} ${template}`,
    answerKey: blank,
    engineQuestion,
  });
}

export function genExplainOwnWords(ctx: GenCtx): Draft | null {
  const { unit, band } = ctx;
  if (!isStatementGrounded(unit.statement, unit.sourceEvidence)) return null;

  const keyPoints = [
    unit.author,
    unit.literaryWork,
    unit.literaryMovement,
    ...extractYears(unit.statement),
    unit.concept,
  ]
    .filter((x): x is string => Boolean(x))
    .filter((x) => isAnswerSupportedBySource(x, unit.sourceEvidence))
    .slice(0, 6);

  // Need at least 2 key points for long_answer schema
  if (keyPoints.length < 2) {
    const tokens = unit.statement
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 5)
      .filter((w) => isAnswerSupportedBySource(w, unit.sourceEvidence))
      .slice(0, 4);
    keyPoints.push(...tokens);
  }
  const unique = [...new Set(keyPoints)].slice(0, 8);
  if (unique.length < 2) return null;

  const stem =
    band === "exam-like"
      ? `Vysvětli vlastními slovy (podle zdroje) podstatu „${unit.title}“ a uveď klíčové údaje.`
      : `Vysvětli vlastními slovy, co říká materiál o „${unit.title}“.`;

  const explanation = buildExplanation({
    core: `Hodnotí se pokrytí klíčových bodů ze zdroje: ${unique.join("; ")}.`,
    evidence: unit.sourceEvidence,
  });

  const engineQuestion: EngineQuestion = {
    id: randomUUID(),
    slug: `la-${slugifyPart(unit.title)}-${band}`.slice(0, 120),
    kind: "long_answer",
    stem,
    difficulty: difficultyBandToScore(band),
    knowledgeUnits: [kuRef(unit)],
    explanation,
    source: sourceLabelFromEvidence(unit.sourceEvidence),
    examRelevance: unit.examRelevance ?? "high",
    correctAnswer: {
      keyPoints: unique.map((k) => k.slice(0, 160)),
    },
    distractors: [],
  };

  return wrap({
    generationKind: "explain_own_words",
    band,
    unitIds: [unit.id],
    correctAnswer: { keyPoints: unique },
    rubricCriteria: unique,
    keyTerms: unique,
    evidence: unit.sourceEvidence,
    stem,
    answerKey: unique.join("|"),
    engineQuestion,
    notes: "Částečná znalost = některé keyPoints ano.",
  });
}

export function genIdentifyAuthorWork(ctx: GenCtx): Draft | null {
  const { unit, band } = ctx;
  const author = unit.author;
  const work = unit.literaryWork;
  if (!author || !work) return null;
  if (!isAnswerSupportedBySource(author, unit.sourceEvidence)) return null;
  if (!isAnswerSupportedBySource(work, unit.sourceEvidence)) return null;

  const distractorAuthors = otherUnits(ctx, (u) => Boolean(u.author)).map(
    (u) => u.author!,
  );
  const distractorWorks = otherUnits(ctx, (u) => Boolean(u.literaryWork)).map(
    (u) => u.literaryWork!,
  );

  if (distractorAuthors.length < 1 || distractorWorks.length < 1) {
    // Fall back to short answer identify
    const stem = `Kdo napsal dílo ${work} (podle ověřeného materiálu)?`;
    const explanation = buildExplanation({
      core: `Autor je ${author}; údaj je ve zdroji.`,
      evidence: unit.sourceEvidence,
    });
    const engineQuestion: EngineQuestion = {
      id: randomUUID(),
      slug: `id-${slugifyPart(work)}-${band}`.slice(0, 120),
      kind: "short_answer",
      stem,
      difficulty: difficultyBandToScore(band),
      knowledgeUnits: [kuRef(unit)],
      explanation,
      source: sourceLabelFromEvidence(unit.sourceEvidence),
      examRelevance: unit.examRelevance ?? "high",
      correctAnswer: {
        accepted: [author],
        keyTerms: author.split(/\s+/).filter((w) => w.length >= 3),
      },
      distractors: [],
    };
    return wrap({
      generationKind: "identify_author_work",
      band,
      unitIds: [unit.id],
      correctAnswer: { accepted: [author], keyTerms: [author] },
      rubricCriteria: [author, work],
      keyTerms: [author, work],
      evidence: unit.sourceEvidence,
      stem,
      answerKey: `${author}|${work}`,
      engineQuestion,
    });
  }

  const authors = [
    { id: optId("a", author), label: author },
    ...distractorAuthors.slice(0, 3).map((a) => ({
      id: optId("a", a),
      label: a,
    })),
  ];
  const works = [
    { id: optId("w", work), label: work },
    ...distractorWorks.slice(0, 3).map((w) => ({
      id: optId("w", w),
      label: w,
    })),
  ];

  // Dedupe labels
  const uniqAuthors = [
    ...new Map(authors.map((a) => [a.label, a])).values(),
  ].slice(0, 6);
  const uniqWorks = [
    ...new Map(works.map((w) => [w.label, w])).values(),
  ].slice(0, 8);
  if (uniqAuthors.length < 2 || uniqWorks.length < 2) return null;

  const authorOpt = uniqAuthors.find((a) => a.label === author)!;
  const workOpt = uniqWorks.find((w) => w.label === work)!;
  const correctAnswer: Record<string, string> = {
    [authorOpt.id]: workOpt.id,
  };

  // Add one more verified pair if available
  const extra = otherUnits(
    ctx,
    (u) => Boolean(u.author && u.literaryWork),
  )[0];
  if (extra?.author && extra.literaryWork) {
    const ea = uniqAuthors.find((a) => a.label === extra.author);
    const ew = uniqWorks.find((w) => w.label === extra.literaryWork);
    if (ea && ew) correctAnswer[ea.id] = ew.id;
  }

  const stem = "Spáruj autora s dílem podle ověřených materiálů.";
  const explanation = buildExplanation({
    core: `Správné párování vychází jen z ověřených vztahů autor–dílo ve zdrojích.`,
    evidence: unit.sourceEvidence,
  });

  const unitIds = [unit.id];
  if (extra) unitIds.push(extra.id);

  const engineQuestion: EngineQuestion = {
    id: randomUUID(),
    slug: `aw-${slugifyPart(author)}-${band}`.slice(0, 120),
    kind: "author_work_pairing",
    stem,
    difficulty: difficultyBandToScore(band),
    knowledgeUnits: unitIds.map((id) => {
      const u = ctx.pool.find((p) => p.id === id) ?? unit;
      return kuRef(u);
    }),
    explanation,
    source: sourceLabelFromEvidence(unit.sourceEvidence),
    examRelevance: "high",
    authors: uniqAuthors,
    works: uniqWorks,
    correctAnswer,
    distractors: [],
  };

  return wrap({
    generationKind: "identify_author_work",
    band,
    unitIds,
    correctAnswer,
    rubricCriteria: Object.entries(correctAnswer).map(([a, w]) => {
      const al = uniqAuthors.find((x) => x.id === a)?.label ?? a;
      const wl = uniqWorks.find((x) => x.id === w)?.label ?? w;
      return `${al} → ${wl}`;
    }),
    keyTerms: [author, work],
    evidence: unit.sourceEvidence,
    stem,
    answerKey: `${author}->${work}`,
    engineQuestion,
  });
}

export function genMatching(ctx: GenCtx): Draft | null {
  // Prefer movement / concept matching when we have ≥2 pairs
  const pairs = [ctx.unit, ...otherUnits(ctx, () => true)]
    .filter(
      (u) =>
        u.literaryMovement &&
        isAnswerSupportedBySource(u.literaryMovement, u.sourceEvidence) &&
        (u.author || u.literaryWork || u.concept || u.title),
    )
    .slice(0, 5);

  if (pairs.length < 2) return null;

  const left = pairs.map((u, i) => ({
    id: `l${i}`,
    label: (u.author || u.literaryWork || u.concept || u.title).slice(0, 400),
  }));
  const rightLabels = [
    ...new Set(pairs.map((u) => u.literaryMovement!)),
  ];
  if (rightLabels.length < 2) return null;
  const right = rightLabels.map((label, i) => ({
    id: `r${i}`,
    label: label.slice(0, 400),
  }));

  const correctAnswer: Record<string, string> = {};
  for (let i = 0; i < pairs.length; i++) {
    const mov = pairs[i]!.literaryMovement!;
    const r = right.find((x) => x.label === mov);
    if (r) correctAnswer[left[i]!.id] = r.id;
  }
  if (Object.keys(correctAnswer).length < 2) return null;

  const stem = "Přiřaď položku k literárnímu směru podle zdrojů.";
  const primary = pairs[0]!;
  const explanation = buildExplanation({
    core: "Přiřazení vychází z ověřených zmínek směru ve zdrojových úryvcích.",
    evidence: primary.sourceEvidence,
  });

  const engineQuestion: EngineQuestion = {
    id: randomUUID(),
    slug: `match-${slugifyPart(primary.title)}-${ctx.band}`.slice(0, 120),
    kind: "matching",
    stem,
    difficulty: difficultyBandToScore(ctx.band),
    knowledgeUnits: pairs.slice(0, 4).map(kuRef),
    explanation,
    source: sourceLabelFromEvidence(primary.sourceEvidence),
    examRelevance: "high",
    left,
    right,
    correctAnswer,
    distractors: [],
  };

  return wrap({
    generationKind: "matching",
    band: ctx.band,
    unitIds: pairs.map((p) => p.id),
    correctAnswer,
    rubricCriteria: left.map(
      (l) =>
        `${l.label} → ${right.find((r) => r.id === correctAnswer[l.id])?.label ?? "?"}`,
    ),
    keyTerms: rightLabels,
    evidence: primary.sourceEvidence,
    stem,
    answerKey: Object.values(correctAnswer).join("|"),
    engineQuestion,
  });
}

export function genOrdering(ctx: GenCtx): Draft | null {
  const dated = [ctx.unit, ...otherUnits(ctx, () => true)]
    .map((u) => {
      const year = extractYears(u.datePeriod || u.statement || u.sourceEvidence.quote)[0];
      return year ? { unit: u, year: Number(year) } : null;
    })
    .filter((x): x is { unit: VerifiedKnowledgeUnitInput; year: number } =>
      Boolean(x),
    )
    .sort((a, b) => a.year - b.year);

  // unique years
  const unique: typeof dated = [];
  const seenYears = new Set<number>();
  for (const row of dated) {
    if (seenYears.has(row.year)) continue;
    seenYears.add(row.year);
    unique.push(row);
  }
  if (unique.length < 3) return null;

  const slice = unique.slice(0, 5);
  const items = slice.map((row, i) => ({
    id: `i${i}`,
    label: `${row.unit.title} (${row.year})`.slice(0, 400),
    yearHint: row.year,
  }));
  const correctAnswer = items.map((i) => i.id);

  const stem = "Seřaď události / díla chronologicky podle ověřených letopočtů.";
  const explanation = buildExplanation({
    core: `Správné pořadí podle let: ${slice.map((s) => s.year).join(" → ")}.`,
    evidence: slice[0]!.unit.sourceEvidence,
  });

  const engineQuestion: EngineQuestion = {
    id: randomUUID(),
    slug: `ord-${slugifyPart(ctx.unit.title)}-${ctx.band}`.slice(0, 120),
    kind: "timeline_ordering",
    stem,
    difficulty: difficultyBandToScore(ctx.band),
    knowledgeUnits: slice.map((s) => kuRef(s.unit)),
    explanation,
    source: sourceLabelFromEvidence(slice[0]!.unit.sourceEvidence),
    examRelevance: "high",
    items,
    correctAnswer,
    distractors: [],
  };

  return wrap({
    generationKind: "ordering",
    band: ctx.band,
    unitIds: slice.map((s) => s.unit.id),
    correctAnswer,
    rubricCriteria: slice.map((s) => `${s.year}: ${s.unit.title}`),
    keyTerms: slice.map((s) => String(s.year)),
    evidence: slice[0]!.unit.sourceEvidence,
    stem,
    answerKey: slice.map((s) => s.year).join(">"),
    engineQuestion,
  });
}

export function genFlashcard(ctx: GenCtx): Draft | null {
  const { unit, band } = ctx;
  if (!isStatementGrounded(unit.statement, unit.sourceEvidence)) return null;

  const front =
    unit.kind === "person" && unit.author
      ? unit.author
      : unit.literaryWork || unit.concept || unit.title;
  const back = unit.statement.slice(0, 800);
  if (!isAnswerSupportedBySource(
    front.split(/\s+/).slice(0, 2).join(" "),
    unit.sourceEvidence,
  ) && !unit.sourceEvidence.quote.toLowerCase().includes(front.slice(0, 8).toLowerCase())) {
    // front still ok if it's the title used in material
    if (!isStatementGrounded(back, unit.sourceEvidence)) return null;
  }

  const flashcard: FlashcardItem = {
    id: stableId(`fc|${unit.id}|${front}`),
    slug: `fc-${slugifyPart(front)}-${band}`.slice(0, 120),
    type:
      unit.kind === "person"
        ? "author_work"
        : unit.kind === "work"
          ? "work_author"
          : unit.kind === "term" || unit.kind === "concept"
            ? "term_definition"
            : "question_answer",
    front: front.slice(0, 400),
    back,
    context: unit.literaryMovement ?? undefined,
    hint: unit.datePeriod ?? undefined,
    tags: ["generated", band, unit.kind],
  };

  return wrap({
    generationKind: "flashcard",
    band,
    unitIds: [unit.id],
    correctAnswer: { front, back },
    rubricCriteria: [back.slice(0, 160)],
    keyTerms: back
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 4)
      .slice(0, 6),
    evidence: unit.sourceEvidence,
    stem: front,
    answerKey: back.slice(0, 80),
    flashcard,
  });
}

export function genLiteraryContext(ctx: GenCtx): Draft | null {
  const { unit, band } = ctx;
  const movement = unit.literaryMovement;
  if (!movement) return null;
  if (!isAnswerSupportedBySource(movement, unit.sourceEvidence)) return null;

  const otherMovements = [
    ...new Set(
      otherUnits(ctx, (u) => Boolean(u.literaryMovement)).map(
        (u) => u.literaryMovement!,
      ),
    ),
  ].filter((m) => m !== movement);

  if (otherMovements.length < 2) return null;

  const correctId = "m0";
  const options = [
    { id: correctId, label: movement },
    ...otherMovements.slice(0, 3).map((m, i) => ({
      id: `m${i + 1}`,
      label: m,
    })),
  ];

  const subject = unit.author || unit.literaryWork || unit.title;
  const stem =
    band === "exam-like"
      ? `Do kterého literárního kontextu / směru patří „${subject}“ podle ověřeného materiálu?`
      : `K jakému literárnímu směru patří „${subject}“ (dle zdroje)?`;

  const explanation = buildExplanation({
    core: `Zdroj řadí „${subject}“ ke směru ${movement}.`,
    evidence: unit.sourceEvidence,
  });

  const engineQuestion: EngineQuestion = {
    id: randomUUID(),
    slug: `ctx-${slugifyPart(subject)}-${band}`.slice(0, 120),
    kind: "single_choice",
    stem,
    difficulty: difficultyBandToScore(band),
    knowledgeUnits: [kuRef(unit)],
    explanation,
    source: sourceLabelFromEvidence(unit.sourceEvidence),
    examRelevance: "critical",
    options,
    correctAnswer: correctId,
    distractors: options.filter((o) => o.id !== correctId).map((o) => o.id),
  };

  return wrap({
    generationKind: "literary_context",
    band,
    unitIds: [unit.id],
    correctAnswer: correctId,
    rubricCriteria: [movement],
    keyTerms: [movement, subject],
    evidence: unit.sourceEvidence,
    stem,
    answerKey: movement,
    engineQuestion,
  });
}

export const GENERATORS: Array<{
  kind: GeneratedQuestionKind;
  run: (ctx: GenCtx) => Draft | null;
}> = [
  { kind: "open_answer", run: genOpenAnswer },
  { kind: "multiple_choice", run: genMultipleChoice },
  { kind: "true_false", run: genTrueFalse },
  { kind: "fill_blank", run: genFillBlank },
  { kind: "explain_own_words", run: genExplainOwnWords },
  { kind: "identify_author_work", run: genIdentifyAuthorWork },
  { kind: "matching", run: genMatching },
  { kind: "ordering", run: genOrdering },
  { kind: "flashcard", run: genFlashcard },
  { kind: "literary_context", run: genLiteraryContext },
];
