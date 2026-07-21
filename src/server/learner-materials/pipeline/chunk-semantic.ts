import { createHash, randomUUID } from "node:crypto";
import type { ExtractedBlock } from "@/server/ingestion/types";
import { normalizeCzechText } from "@/server/learner-materials/pipeline/normalize-cs";

export type SemanticChunk = {
  id: string;
  chunkIndex: number;
  text: string;
  textSha256: string;
  headingPath: string | null;
  /** Breadcrumb of nested headings. */
  sectionPath: string[];
  pageStart: number | null;
  pageEnd: number | null;
  charStart: number;
  charEnd: number;
  sourceRef: string;
};

export type PageAwareBlock = ExtractedBlock & {
  page?: number | null;
};

const TARGET_CHARS = 850;
const MAX_CHARS = 3500;
const HARD_MAX_CHUNKS = 4000;

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function sourceRefFor(params: {
  materialId: string;
  chunkIndex: number;
  pageStart: number | null;
  sectionPath: string[];
}): string {
  const parts = [`material:${params.materialId}`, `chunk:${params.chunkIndex}`];
  if (params.pageStart != null) parts.push(`page:${params.pageStart}`);
  if (params.sectionPath.length) {
    parts.push(`section:${params.sectionPath.join("/")}`);
  }
  return parts.join("|");
}

/** Returns any text that could not be chunked (hard max). */
function flush(
  parts: string[],
  ctx: {
    sectionPath: string[];
    pageStart: number | null;
    pageEnd: number | null;
    materialId: string;
  },
  chunks: SemanticChunk[],
  cursor: { value: number },
): string {
  const text = normalizeCzechText(parts.join("\n\n"));
  if (!text) return "";

  const pushSlice = (
    slice: string,
    pageStart: number | null,
    pageEnd: number | null,
  ): boolean => {
    if (chunks.length >= HARD_MAX_CHUNKS) return false;
    const start = cursor.value;
    const end = start + slice.length;
    const chunkIndex = chunks.length;
    chunks.push({
      id: randomUUID(),
      chunkIndex,
      text: slice,
      textSha256: sha256Text(slice),
      headingPath: ctx.sectionPath[ctx.sectionPath.length - 1] ?? null,
      sectionPath: [...ctx.sectionPath],
      pageStart,
      pageEnd,
      charStart: start,
      charEnd: end,
      sourceRef: sourceRefFor({
        materialId: ctx.materialId,
        chunkIndex,
        pageStart,
        sectionPath: ctx.sectionPath,
      }),
    });
    cursor.value = end + 2;
    return true;
  };

  if (text.length <= MAX_CHARS) {
    return pushSlice(text, ctx.pageStart, ctx.pageEnd) ? "" : text;
  }

  let offset = 0;
  while (offset < text.length) {
    if (chunks.length >= HARD_MAX_CHUNKS) {
      return text.slice(offset).trim();
    }
    let end = Math.min(offset + MAX_CHARS, text.length);
    if (end < text.length) {
      const window = text.slice(offset, end);
      const breakAt = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("? "),
        window.lastIndexOf("! "),
      );
      if (breakAt > MAX_CHARS * 0.4) {
        end = offset + breakAt + 1;
      }
    }
    const slice = text.slice(offset, end).trim();
    if (slice && !pushSlice(slice, ctx.pageStart, ctx.pageEnd)) {
      return text.slice(offset).trim();
    }
    offset = end;
  }
  return "";
}

/**
 * Semantic chunks by heading sections + size targets.
 * Preserves page range when blocks carry page numbers.
 */
export function chunkSemanticBlocks(
  blocks: PageAwareBlock[],
  materialId: string,
): {
  chunks: SemanticChunk[];
  truncated: boolean;
  omittedChars: number;
  omittedText: string;
} {
  const chunks: SemanticChunk[] = [];
  const cursor = { value: 0 };
  const headingStack: { level: number; title: string }[] = [];
  let buffer: string[] = [];
  let pageStart: number | null = null;
  let pageEnd: number | null = null;
  let truncated = false;
  const omittedParts: string[] = [];

  const sectionPath = () => headingStack.map((h) => h.title);

  const flushBuffer = () => {
    if (!buffer.length) return;
    if (chunks.length >= HARD_MAX_CHUNKS) {
      const leftover = buffer.join("\n\n");
      if (leftover) {
        truncated = true;
        omittedParts.push(leftover);
      }
      buffer = [];
      pageStart = null;
      pageEnd = null;
      return;
    }
    const remainder = flush(
      buffer,
      {
        sectionPath: sectionPath(),
        pageStart,
        pageEnd,
        materialId,
      },
      chunks,
      cursor,
    );
    if (remainder) {
      truncated = true;
      omittedParts.push(remainder);
    }
    buffer = [];
    pageStart = null;
    pageEnd = null;
  };

  let pastLimit = false;
  for (const block of blocks) {
    if (pastLimit || chunks.length >= HARD_MAX_CHUNKS) {
      pastLimit = true;
      truncated = true;
      if (block.type === "heading") {
        omittedParts.push(`# ${block.text}`);
      } else if (block.text) {
        omittedParts.push(block.text);
      }
      continue;
    }

    if (block.type === "heading") {
      flushBuffer();
      if (chunks.length >= HARD_MAX_CHUNKS) {
        pastLimit = true;
        truncated = true;
        omittedParts.push(`# ${block.text}`);
        continue;
      }
      const level = block.level ?? 1;
      while (
        headingStack.length &&
        headingStack[headingStack.length - 1]!.level >= level
      ) {
        headingStack.pop();
      }
      headingStack.push({ level, title: block.text });
      continue;
    }

    const page = block.page ?? null;
    if (page != null) {
      if (pageStart == null) pageStart = page;
      pageEnd = page;
    }
    buffer.push(block.text);
    if (buffer.join("\n\n").length >= TARGET_CHARS) {
      flushBuffer();
    }
  }
  flushBuffer();

  const omittedText = omittedParts.join("\n\n").trim();
  return {
    chunks,
    truncated,
    omittedChars: omittedText.length,
    omittedText,
  };
}

export const semanticChunkLimits = {
  targetChars: TARGET_CHARS,
  maxChars: MAX_CHARS,
  hardMaxChunks: HARD_MAX_CHUNKS,
} as const;
