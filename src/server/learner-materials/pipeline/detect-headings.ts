import type { ExtractedBlock } from "@/server/ingestion/types";
import { normalizeCzechText } from "@/server/learner-materials/pipeline/normalize-cs";

const HEADING_LINE =
  /^(?:#{1,6}\s+|(?:\d+(?:\.\d+){0,3}|[IVXLC]{1,6})[\.)]\s+|[A-F][\.)]\s+)/;

/** ALL-CAPS / Title Case short lines often mark section heads in plain text/PDF. */
function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 100) return false;
  if (t.endsWith(".") && t.length > 40) return false;
  if (HEADING_LINE.test(t)) return true;
  const letters = t.replace(/[^A-Za-zÁ-ž]/g, "");
  if (letters.length < 3) return false;
  const upper = letters.replace(/[^A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, "").length;
  if (upper / letters.length >= 0.85 && t.split(/\s+/).length <= 12) return true;
  // Title Case: majority of words capitalized
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 10) {
    const capped = words.filter((w) =>
      /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(w),
    ).length;
    if (capped / words.length >= 0.7 && !t.includes(",")) return true;
  }
  return false;
}

function headingLevelFromLine(line: string): number {
  const hash = line.match(/^(#{1,6})\s+/);
  if (hash) return hash[1]!.length;
  if (/^[A-F][\.)]\s+/.test(line)) return 1;
  if (/^\d+\.\d+/.test(line)) return 2;
  if (/^\d+[\.)]\s+/.test(line)) return 1;
  if (/^[IVXLC]{1,6}[\.)]\s+/.test(line)) return 1;
  return 2;
}

/**
 * Promote likely headings in plain paragraph streams (TXT / PDF).
 * DOCX already carries structural headings — leave them.
 */
export function detectHeadingsInBlocks(
  blocks: ExtractedBlock[],
  opts?: { promotePlain?: boolean },
): ExtractedBlock[] {
  const promotePlain = opts?.promotePlain ?? true;
  const out: ExtractedBlock[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      out.push({
        ...block,
        text: normalizeCzechText(block.text),
        level: block.level ?? 1,
      });
      continue;
    }

    const text = normalizeCzechText(block.text);
    if (!text) continue;

    if (promotePlain && block.type === "paragraph" && looksLikeHeading(text)) {
      out.push({
        type: "heading",
        level: headingLevelFromLine(text),
        text: text.replace(HEADING_LINE, "").trim() || text,
      });
      continue;
    }

    // Split multi-line paragraphs that start with a heading-like first line
    if (promotePlain && block.type === "paragraph" && text.includes("\n")) {
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 2 && looksLikeHeading(lines[0]!)) {
        out.push({
          type: "heading",
          level: headingLevelFromLine(lines[0]!),
          text: lines[0]!.replace(HEADING_LINE, "").trim() || lines[0]!,
        });
        const rest = lines.slice(1).join("\n");
        if (rest) out.push({ type: "paragraph", text: rest });
        continue;
      }
    }

    out.push({ ...block, text });
  }

  return out;
}

export function collectHeadingTitles(blocks: ExtractedBlock[]): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const b of blocks) {
    if (b.type !== "heading") continue;
    const key = b.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(b.text);
  }
  return titles;
}
