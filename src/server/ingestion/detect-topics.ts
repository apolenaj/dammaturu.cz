import { getAllowlistEntry } from "@/server/ingestion/allowlist";
import { newId } from "@/server/ingestion/discover";
import type {
  ExtractedDocument,
  ProposedTopic,
} from "@/server/ingestion/types";

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "tema";
}

/**
 * Propose topics from allowlist filename mapping + document headings.
 * Proposals only — status stays needs_review downstream.
 */
export function detectTopics(
  filename: string,
  extracted: ExtractedDocument,
): ProposedTopic[] {
  const topics: ProposedTopic[] = [];
  const seen = new Set<string>();

  const entry = getAllowlistEntry(filename);
  if (entry) {
    const slug = slugify(entry.topicHint);
    topics.push({
      id: newId(),
      slug,
      title: entry.topicHint,
      confidence: 0.92,
      source: "filename",
    });
    seen.add(slug);
  }

  for (const block of extracted.blocks) {
    if (block.type !== "heading" || (block.level ?? 1) > 2) continue;
    const slug = slugify(block.text);
    if (seen.has(slug)) continue;
    if (block.text.length < 4 || block.text.length > 120) continue;
    topics.push({
      id: newId(),
      slug,
      title: block.text,
      confidence: 0.55,
      source: "heading",
    });
    seen.add(slug);
    if (topics.length >= 6) break;
  }

  if (topics.length === 0) {
    topics.push({
      id: newId(),
      slug: slugify(extracted.title),
      title: extracted.title,
      confidence: 0.4,
      source: "heuristic",
    });
  }

  return topics;
}
