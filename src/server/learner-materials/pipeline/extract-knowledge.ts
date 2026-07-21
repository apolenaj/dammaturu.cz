import { randomUUID } from "node:crypto";
import type {
  examRelevanceValues,
  kuKinds,
} from "@/domain/content/schemas";
import type {
  GroundedFields,
  LearnerKnowledgeUnit,
  LearnerKuFlag,
} from "@/domain/learning/learner-knowledge";
import type { MaterialChunk, MaterialTopic } from "@/domain/learning/learner-materials";
import { normalizeCzechText } from "@/server/learner-materials/pipeline/normalize-cs";

type ExamRelevance = (typeof examRelevanceValues)[number];
type KuKind = (typeof kuKinds)[number];

/** Czech literary movements — matched only when the token appears in source. */
export const LITERARY_MOVEMENTS = [
  "romantismus",
  "realismus",
  "kritický realismus",
  "naturalismus",
  "klasicismus",
  "osvícenství",
  "baroko",
  "renesance",
  "národní obrození",
  "symbolismus",
  "dekadence",
  "impresionismus",
  "expresionismus",
  "poetismus",
  "surrealismus",
  "existencialismus",
  "modernismus",
  "avantgarda",
  "májovci",
  "ruchovci",
  "lumírovci",
] as const;

const PERSON_YEARS_RE =
  /\b([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]+){0,3})\s*\((\d{3,4})\s*[–—-]\s*(\d{3,4}|[?？])\)/u;

const DEFINITION_RE =
  /^(.{3,90}?)\s+(je|jsou|znamená|označuje|pochází z|se nazývá|nazýváme)\s+(.{12,})$/iu;

/** Everyday openers that look like “X je …” but are not definitions. */
const NON_TERM_SUBJECTS =
  /^(dnes|zítra|včera|to|toto|tamto|on|ona|ono|oni|ony|my|vy|já|tu|tam|tady|pak|tak|proto|ale|nebo|protože|když|jestli|ano|ne)\b/i;

function looksLikeDefinableTerm(subject: string): boolean {
  const t = subject.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (NON_TERM_SUBJECTS.test(t)) return false;
  if (/[.!?]$/.test(t)) return false;
  // Literary movements / -ismus / capitalized multi-word concepts
  if (detectMovement(t)) return true;
  if (/ismus\b|ismus$/i.test(t)) return true;
  if (/^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(t) && t.split(/\s+/).length <= 6) return true;
  if (/\b(pojem|znak|rys|princip|směr|období|žánr)\b/i.test(t)) return true;
  return false;
}

function definitionObjectLooksGrounded(object: string): boolean {
  // Prefer explanatory predicates over weather/chatter
  return (
    object.length >= 12 &&
    /\b(literárn|uměleck|směr|žánr|hnutí|období|styl|proud|škola|definic|označ|znamená|charakter|znak|rys)\w*/i.test(
      object,
    )
  );
}

const AUTHORED_RE =
  /\b([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]+){0,3})\s+(napsal[ai]?|napsala|je autorem|je autorkou|sepsal[ai]?)\s+(.+?)(?:\.|$)/iu;

const WORK_OF_RE =
  /\b([„"]?)([^„"\n]{2,80}?)\1\s+(napsal[ai]?|je dílem|je románem|je baladou|je povídkou)\s+([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'\s-]{2,60})/iu;

const BELONGS_MOVEMENT_RE =
  /\b(.{3,60}?)\s+(patří k|řadí se k|je představitelem|je představitelkou|spadá do)\s+(.{3,60}?)(?:\.|$)/iu;

const PERIOD_RE =
  /\b((?:v\s+)?(?:letech\s+)?\d{3,4}\s*[–—-]\s*\d{3,4}|(?:na\s+)?(?:přelomu|počátku|konci)\s+\d{1,2}\.\s*stol\.?|(?:v\s+)?\d{1,2}\.\s*století)/iu;

const WORK_GENRE_RE =
  /\b(román|balada|komedie|tragédie|drama|povídk\w*|báseň|básnická sbírka|epopej|novela|dílo)\b/i;

const EXAM_SIGNAL_RE =
  /\b(maturita|maturitní|zkoušk\w*|důležit\w*|klíčov\w*|zapamatuj|typická otázka|často se ptají)\b/i;

const MAX_UNITS = 200;
const MIN_STATEMENT = 18;
const MAX_STATEMENT = 400;

type Draft = Omit<LearnerKnowledgeUnit, "flags" | "flagNotes"> & {
  flags: LearnerKuFlag[];
  flagNotes: string[];
};

function titleFrom(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => normalizeCzechText(s))
    .filter((s) => s.length >= MIN_STATEMENT && s.length <= MAX_STATEMENT);
}

function detectMovement(text: string): string | null {
  const lower = text.toLowerCase();
  // Prefer longer phrases first
  const sorted = [...LITERARY_MOVEMENTS].sort((a, b) => b.length - a.length);
  for (const m of sorted) {
    if (lower.includes(m)) {
      return m.charAt(0).toUpperCase() + m.slice(1);
    }
  }
  return null;
}

function examRelevanceFromText(
  text: string,
  base: ExamRelevance,
): ExamRelevance {
  if (!EXAM_SIGNAL_RE.test(text)) return base;
  if (base === "none" || base === "low") return "medium";
  if (base === "medium") return "high";
  return base;
}

function topicContext(
  chunk: MaterialChunk,
  topics: MaterialTopic[],
): { topic: string | null; subtopic: string | null } {
  const path = chunk.sectionPath ?? [];
  if (path.length >= 2) {
    return { topic: path[0]!, subtopic: path[1]! };
  }
  if (path.length === 1) {
    return { topic: path[0]!, subtopic: null };
  }
  if (chunk.headingPath) {
    return { topic: chunk.headingPath, subtopic: null };
  }
  return { topic: topics[0]?.title ?? null, subtopic: null };
}

function pushUnit(
  out: Draft[],
  seen: Set<string>,
  unit: Draft,
): void {
  if (out.length >= MAX_UNITS) return;
  const key = `${unit.kind}|${unit.statement.toLowerCase().slice(0, 160)}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(unit);
}

function baseProvenance(
  documentId: string,
  chunk: MaterialChunk,
  sourceText: string,
  confidence: number,
) {
  return {
    documentId,
    chunkId: chunk.id,
    sourceRef: chunk.sourceRef ?? null,
    pageStart: chunk.pageStart ?? null,
    pageEnd: chunk.pageEnd ?? null,
    sectionPath: chunk.sectionPath ?? [],
    headingPath: chunk.headingPath ?? null,
    sourceText: sourceText.slice(0, 2000),
    confidence,
  };
}

function makeUnit(params: {
  documentId: string;
  chunk: MaterialChunk;
  topics: MaterialTopic[];
  kind: KuKind;
  title: string;
  statement: string;
  grounded: GroundedFields;
  confidence: number;
  importance: number;
  difficulty: number;
  examRelevance: ExamRelevance;
  tags: string[];
  flags?: LearnerKuFlag[];
  flagNotes?: string[];
}): Draft {
  const { topic, subtopic } = topicContext(params.chunk, params.topics);
  const examRelevance = examRelevanceFromText(
    params.statement,
    params.grounded.examRelevance ?? params.examRelevance,
  );
  return {
    id: randomUUID(),
    kind: params.kind,
    title: params.title.slice(0, 240),
    statement: params.statement.slice(0, 2000),
    grounded: {
      topic: params.grounded.topic ?? topic,
      subtopic: params.grounded.subtopic ?? subtopic,
      definition: params.grounded.definition ?? null,
      author: params.grounded.author ?? null,
      literaryWork: params.grounded.literaryWork ?? null,
      literaryMovement: params.grounded.literaryMovement ?? null,
      datePeriod: params.grounded.datePeriod ?? null,
      concept: params.grounded.concept ?? null,
      relationshipType: params.grounded.relationshipType ?? null,
      relationshipSubject: params.grounded.relationshipSubject ?? null,
      relationshipObject: params.grounded.relationshipObject ?? null,
      importantFact: params.grounded.importantFact ?? null,
      examRelevance,
    },
    provenance: baseProvenance(
      params.documentId,
      params.chunk,
      params.statement,
      params.confidence,
    ),
    flags: params.flags ?? [],
    flagNotes: params.flagNotes ?? [],
    reviewStatus: "needs_review",
    importance: params.importance,
    difficulty: params.difficulty,
    examRelevance,
    confidence: params.confidence,
    tags: params.tags,
  };
}

/**
 * Grounded extraction: emit a KU only when a pattern is supported by source text.
 * Does not invent facts; does not fabricate filler units.
 */
export function extractGroundedKnowledgeUnits(params: {
  documentId: string;
  chunks: MaterialChunk[];
  topics: MaterialTopic[];
}): LearnerKnowledgeUnit[] {
  const { documentId, chunks, topics } = params;
  const out: Draft[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const lines = chunk.text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

    // Person + years (often short bio lines)
    for (const line of lines) {
      if (line.length < 12 || line.length > 140) continue;
      PERSON_YEARS_RE.lastIndex = 0;
      const m = PERSON_YEARS_RE.exec(line);
      if (!m || !m[0]) continue;
      // Require the match to dominate the line (grounded bio line, not incidental)
      if (Math.abs(m[0].length - line.length) > 8) continue;
      const name = m[1]!.trim();
      const period = `${m[2]}–${m[3]}`;
      pushUnit(
        out,
        seen,
        makeUnit({
          documentId,
          chunk,
          topics,
          kind: "person",
          title: name,
          statement: line,
          grounded: {
            author: name,
            datePeriod: period,
            importantFact: line,
          },
          confidence: 0.62,
          importance: 4,
          difficulty: 2,
          examRelevance: "high",
          tags: ["cjl", "person", "author"],
        }),
      );
    }

    // Short authored lines: „Autor napsal Dílo.“
    for (const line of lines) {
      if (line.length < 10 || line.length > 200) continue;
      AUTHORED_RE.lastIndex = 0;
      const authoredLine = AUTHORED_RE.exec(line);
      if (!authoredLine) continue;
      const author = authoredLine[1]!.trim();
      const work = authoredLine[3]!.trim().replace(/[.,;:!?]+$/, "").trim();
      if (author.length < 3 || work.length < 2) continue;
      pushUnit(
        out,
        seen,
        makeUnit({
          documentId,
          chunk,
          topics,
          kind: "work",
          title: titleFrom(work, 80),
          statement: line,
          grounded: {
            author,
            literaryWork: work,
            literaryMovement: detectMovement(line) ?? detectMovement(
              (chunk.sectionPath ?? []).join(" "),
            ),
            relationshipType: "authored",
            relationshipSubject: author,
            relationshipObject: work,
            importantFact: line,
            datePeriod: PERIOD_RE.exec(line)?.[1] ?? null,
          },
          confidence: 0.58,
          importance: 4,
          difficulty: 2,
          examRelevance: "high",
          tags: ["cjl", "work", "authored"],
        }),
      );
    }

    for (const sentence of splitSentences(chunk.text).slice(0, 12)) {
      // Definition → term/concept
      DEFINITION_RE.lastIndex = 0;
      const def = DEFINITION_RE.exec(sentence);
      if (def) {
        const term = def[1]!.trim().replace(/^[–—-]\s*/, "");
        const object = def[3]!.trim();
        if (
          looksLikeDefinableTerm(term) &&
          definitionObjectLooksGrounded(object)
        ) {
          const definition = normalizeCzechText(`${term} ${def[2]} ${object}`);
          const movement = detectMovement(sentence);
          pushUnit(
            out,
            seen,
            makeUnit({
              documentId,
              chunk,
              topics,
              kind: /\b(znak|rys|princip|pojem|koncept)\b/i.test(sentence)
                ? "concept"
                : "term",
              title: titleFrom(term, 80),
              statement: sentence,
              grounded: {
                definition,
                concept: term,
                literaryMovement: movement,
                importantFact: sentence,
              },
              confidence: 0.55,
              importance: 4,
              difficulty: 2,
              examRelevance: "medium",
              tags: ["cjl", "definition"],
            }),
          );
          continue;
        }
      }

      // Authored relationship: Author napsal Work
      AUTHORED_RE.lastIndex = 0;
      const authored = AUTHORED_RE.exec(sentence);
      if (authored) {
        const author = authored[1]!.trim();
        const work = authored[3]!.trim().replace(/[„"].*/g, "").trim();
        if (author.length >= 3 && work.length >= 2) {
          pushUnit(
            out,
            seen,
            makeUnit({
              documentId,
              chunk,
              topics,
              kind: "work",
              title: titleFrom(work, 80),
              statement: sentence,
              grounded: {
                author,
                literaryWork: work,
                literaryMovement: detectMovement(sentence),
                relationshipType: "authored",
                relationshipSubject: author,
                relationshipObject: work,
                importantFact: sentence,
                datePeriod: PERIOD_RE.exec(sentence)?.[1] ?? null,
              },
              confidence: 0.58,
              importance: 4,
              difficulty: 2,
              examRelevance: "high",
              tags: ["cjl", "work", "authored"],
            }),
          );
          continue;
        }
      }

      // Work … napsal Author
      WORK_OF_RE.lastIndex = 0;
      const workOf = WORK_OF_RE.exec(sentence);
      if (workOf) {
        const work = workOf[2]!.trim();
        const author = workOf[4]!.trim();
        pushUnit(
          out,
          seen,
          makeUnit({
            documentId,
            chunk,
            topics,
            kind: "work",
            title: titleFrom(work, 80),
            statement: sentence,
            grounded: {
              author,
              literaryWork: work,
              literaryMovement: detectMovement(sentence),
              relationshipType: "authored",
              relationshipSubject: author,
              relationshipObject: work,
              importantFact: sentence,
            },
            confidence: 0.52,
            importance: 4,
            difficulty: 2,
            examRelevance: "high",
            tags: ["cjl", "work"],
          }),
        );
        continue;
      }

      // Belongs to movement
      BELONGS_MOVEMENT_RE.lastIndex = 0;
      const belongs = BELONGS_MOVEMENT_RE.exec(sentence);
      if (belongs) {
        const subject = belongs[1]!.trim();
        const objectRaw = belongs[3]!.trim();
        const movement = detectMovement(objectRaw) ?? detectMovement(sentence);
        if (movement) {
          pushUnit(
            out,
            seen,
            makeUnit({
              documentId,
              chunk,
              topics,
              kind: "concept",
              title: titleFrom(`${subject} → ${movement}`, 90),
              statement: sentence,
              grounded: {
                concept: subject,
                literaryMovement: movement,
                relationshipType: "part_of",
                relationshipSubject: subject,
                relationshipObject: movement,
                importantFact: sentence,
              },
              confidence: 0.5,
              importance: 3,
              difficulty: 2,
              examRelevance: "medium",
              tags: ["cjl", "movement"],
            }),
          );
          continue;
        }
      }

      // Period / event with explicit years or century + literary cue
      const period = PERIOD_RE.exec(sentence)?.[1] ?? null;
      const movement = detectMovement(sentence);
      if (period && (movement || WORK_GENRE_RE.test(sentence) || PERSON_YEARS_RE.test(sentence))) {
        PERSON_YEARS_RE.lastIndex = 0;
        pushUnit(
          out,
          seen,
          makeUnit({
            documentId,
            chunk,
            topics,
            kind: "event",
            title: titleFrom(period, 80),
            statement: sentence,
            grounded: {
              datePeriod: period,
              literaryMovement: movement,
              importantFact: sentence,
              author: PERSON_YEARS_RE.exec(sentence)?.[1] ?? null,
            },
            confidence: 0.48,
            importance: 3,
            difficulty: 2,
            examRelevance: "medium",
            tags: ["cjl", "period"],
          }),
        );
        continue;
      }

      // Literary work mention with genre keyword (must include a capitalized title-ish span)
      if (WORK_GENRE_RE.test(sentence)) {
        const quoted =
          sentence.match(/[„"]([^„"]{2,80})[“"]/)?.[1] ??
          sentence.match(/\b([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}]+){0,4})\b/u)?.[1];
        if (quoted && quoted.length >= 2) {
          pushUnit(
            out,
            seen,
            makeUnit({
              documentId,
              chunk,
              topics,
              kind: "work",
              title: titleFrom(quoted, 80),
              statement: sentence,
              grounded: {
                literaryWork: quoted,
                literaryMovement: movement,
                importantFact: sentence,
                datePeriod: period,
              },
              confidence: 0.42,
              importance: 3,
              difficulty: 2,
              examRelevance: "medium",
              tags: ["cjl", "work"],
              flags: ["low_confidence", "needs_human_review"],
              flagNotes: [
                "Žánrová zmínka — ověř název díla ve zdroji.",
              ],
            }),
          );
          continue;
        }
      }

      // Important fact: only when exam/importance signal is present in source
      if (EXAM_SIGNAL_RE.test(sentence) && sentence.length >= 40) {
        pushUnit(
          out,
          seen,
          makeUnit({
            documentId,
            chunk,
            topics,
            kind: "fact",
            title: titleFrom(sentence, 80),
            statement: sentence,
            grounded: {
              importantFact: sentence,
              literaryMovement: movement,
              datePeriod: period,
              examRelevance: "high",
            },
            confidence: 0.4,
            importance: 4,
            difficulty: 2,
            examRelevance: "high",
            tags: ["cjl", "exam-signal"],
            flags: ["needs_human_review"],
            flagNotes: [
              "Extrahováno kvůli maturitnímu/důležitostnímu signálu ve zdroji.",
            ],
          }),
        );
      }
    }
  }

  return out;
}
