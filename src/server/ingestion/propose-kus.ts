import { getAllowlistEntry } from "@/server/ingestion/allowlist";
import { newId } from "@/server/ingestion/discover";
import type {
  ExtractedDocument,
  IngestedChunk,
  ProposedKnowledgeUnit,
  ProposedTopic,
} from "@/server/ingestion/types";

const PERSON_RE =
  /\b([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]+){0,3})\s*\((\d{3,4})\s*[–—-]\s*(\d{3,4}|[?？])\)/u;

const DEFINITION_RE =
  /^(.{3,80}?)\s+(jsou|je|znamená|označuje|pochází)\s+.{10,}/i;

function guessKind(
  text: string,
): ProposedKnowledgeUnit["kind"] {
  if (PERSON_RE.test(text)) return "person";
  if (/\b(román|balada|komedie|drama|povídek|báseň|dílo)\b/i.test(text)) {
    return "work";
  }
  if (DEFINITION_RE.test(text) || /\bhomonym/i.test(text)) return "term";
  if (/\b(znak|rys|charakteristik|princip)\b/i.test(text)) return "concept";
  return "fact";
}

function titleFromStatement(statement: string): string {
  const clean = statement.replace(/\s+/g, " ").trim();
  if (clean.length <= 80) return clean;
  return `${clean.slice(0, 77).trim()}…`;
}

/**
 * Heuristically propose KnowledgeUnits from chunks.
 * Always reviewStatus=needs_review — never verified/published.
 */
export function proposeKnowledgeUnits(params: {
  filename: string;
  extracted: ExtractedDocument;
  chunks: IngestedChunk[];
  topics: ProposedTopic[];
}): ProposedKnowledgeUnit[] {
  const { filename, chunks, topics } = params;
  const primaryTopic = topics[0]?.slug ?? "tema";
  const entry = getAllowlistEntry(filename);
  const baseTags = entry?.domainTags ?? ["cjl"];
  const proposals: ProposedKnowledgeUnit[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    // Short person/year lines are first-class (often < 40 chars)
    for (const line of chunk.text.split(/\n+/)) {
      const trimmed = line.trim();
      if (trimmed.length < 12 || trimmed.length > 120) continue;
      const personOnly = PERSON_RE.exec(trimmed);
      PERSON_RE.lastIndex = 0;
      if (
        personOnly &&
        personOnly[0] &&
        Math.abs(personOnly[0].length - trimmed.length) <= 2
      ) {
        const key = trimmed.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          proposals.push({
            id: newId(),
            topicSlug: primaryTopic,
            kind: "person",
            title: personOnly[1]!.trim(),
            statement: trimmed,
            importance: 4,
            difficulty: 2,
            confidence: 0.4,
            examRelevance: "high",
            tags: [...baseTags, "person"],
            sourceChunkIds: [chunk.id],
            reviewStatus: "needs_review",
          });
          if (proposals.length >= 40) return proposals;
        }
      }
    }

    const sentences = chunk.text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 40 && s.length <= 400);

    for (const sentence of sentences.slice(0, 8)) {
      const key = sentence.toLowerCase().slice(0, 120);
      if (seen.has(key)) continue;
      seen.add(key);

      const kind = guessKind(sentence);
      const person = sentence.match(PERSON_RE);

      proposals.push({
        id: newId(),
        topicSlug: primaryTopic,
        kind,
        title: person
          ? person[1]!.trim()
          : titleFromStatement(sentence),
        statement: sentence,
        importance: kind === "concept" || kind === "term" ? 4 : 3,
        difficulty: 2,
        confidence: 0.35,
        examRelevance: "medium",
        tags: [...baseTags, kind],
        sourceChunkIds: [chunk.id],
        reviewStatus: "needs_review",
      });

      if (proposals.length >= 40) {
        return proposals;
      }
    }
  }

  // Ensure at least one proposal per document for review queue visibility
  if (proposals.length === 0 && chunks[0]) {
    const text = chunks[0].text.slice(0, 280).trim();
    proposals.push({
      id: newId(),
      topicSlug: primaryTopic,
      kind: "other",
      title: titleFromStatement(text || primaryTopic),
      statement: text || `Dokument ${filename} vyžaduje ruční rozklad na KU.`,
      importance: 3,
      difficulty: 2,
      confidence: 0.2,
      examRelevance: "low",
      tags: baseTags,
      sourceChunkIds: [chunks[0].id],
      reviewStatus: "needs_review",
    });
  }

  return proposals;
}
