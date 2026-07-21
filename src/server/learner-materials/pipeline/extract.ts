import mammoth from "mammoth";
import {
  isSupportedFormat,
  type MaterialFormat,
} from "@/domain/learning/learner-materials";
import type { ExtractedBlock, ExtractedDocument } from "@/server/ingestion/types";
import type { PageAwareBlock } from "@/server/learner-materials/pipeline/chunk-semantic";
import { normalizeCzechText } from "@/server/learner-materials/pipeline/normalize-cs";

export type PageExtract = {
  page: number;
  text: string;
  charCount: number;
};

export type LearnerExtractResult = ExtractedDocument & {
  blocks: PageAwareBlock[];
  pages: PageExtract[];
  pageCount: number | null;
  /** Heuristic: many pages, almost no extractable text. */
  scannedSuspect: boolean;
  emptyDocument: boolean;
};

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocxBuffer(
  buffer: Buffer,
  fallbackTitle: string,
): Promise<LearnerExtractResult> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  const blocks: PageAwareBlock[] = [];
  const blockRegex = /<(h[1-6]|p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1]!.toLowerCase();
    const text = normalizeCzechText(stripTags(match[2] ?? ""));
    if (!text) continue;
    if (tag.startsWith("h")) {
      blocks.push({ type: "heading", level: Number(tag.slice(1)), text });
    } else if (tag === "li") {
      blocks.push({ type: "list_item", text });
    } else {
      blocks.push({ type: "paragraph", text });
    }
  }

  if (blocks.length === 0) {
    const plain = normalizeCzechText(stripTags(html));
    for (const part of plain.split(/\n+/)) {
      const t = part.trim();
      if (t) blocks.push({ type: "paragraph", text: t });
    }
  }

  const plainText = blocks.map((b) => b.text).join("\n\n");
  const titleFromHeading = blocks.find((b) => b.type === "heading")?.text;
  return {
    title: titleFromHeading ?? fallbackTitle.replace(/\.docx$/i, ""),
    blocks,
    plainText,
    pages: [],
    pageCount: null,
    scannedSuspect: false,
    emptyDocument: plainText.trim().length === 0,
  };
}

function extractTxtBuffer(buffer: Buffer, title: string): LearnerExtractResult {
  const plainText = normalizeCzechText(
    buffer.toString("utf8").replace(/^\uFEFF/, ""),
  );
  const blocks: PageAwareBlock[] = [];
  for (const part of plainText.split(/\n{2,}/)) {
    const t = part.trim();
    if (t) blocks.push({ type: "paragraph", text: t });
  }
  if (blocks.length === 0 && plainText.trim()) {
    blocks.push({ type: "paragraph", text: plainText.trim() });
  }
  return {
    title: title.replace(/\.txt$/i, ""),
    blocks,
    plainText: blocks.map((b) => b.text).join("\n\n"),
    pages: [],
    pageCount: null,
    scannedSuspect: false,
    emptyDocument: blocks.length === 0,
  };
}

async function extractPdfBuffer(
  buffer: Buffer,
  title: string,
): Promise<LearnerExtractResult> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const pages: PageExtract[] = (result.pages ?? []).map((p) => {
      const text = normalizeCzechText(p.text ?? "");
      return { page: p.num, text, charCount: text.length };
    });
    const pageCount = result.total ?? pages.length;
    const blocks: PageAwareBlock[] = [];

    for (const page of pages) {
      if (!page.text.trim()) continue;
      for (const part of page.text.split(/\n{2,}/)) {
        const t = part.trim();
        if (t) blocks.push({ type: "paragraph", text: t, page: page.page });
      }
    }

    // Fallback if page array empty but aggregate text exists
    if (blocks.length === 0) {
      const aggregate = normalizeCzechText(result.text ?? "");
      for (const part of aggregate.split(/\n{2,}/)) {
        const t = part.trim();
        if (t) blocks.push({ type: "paragraph", text: t });
      }
    }

    const plainText = blocks.map((b) => b.text).join("\n\n");
    const pagesWithText = pages.filter((p) => p.charCount > 0).length;
    const avgChars =
      pageCount > 0 ? plainText.length / pageCount : plainText.length;
    const scannedSuspect =
      pageCount >= 1 &&
      plainText.trim().length < 40 &&
      (pagesWithText === 0 || avgChars < 25);

    return {
      title: title.replace(/\.pdf$/i, ""),
      blocks,
      plainText,
      pages,
      pageCount,
      scannedSuspect,
      emptyDocument:
        pageCount === 0 ||
        (plainText.trim().length === 0 && pagesWithText === 0),
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export async function extractLearnerDocument(
  format: MaterialFormat,
  buffer: Buffer,
  title: string,
): Promise<LearnerExtractResult> {
  if (!isSupportedFormat(format)) {
    throw new UnsupportedFormatError(
      "Tento formát zatím neumíme zpracovat. Zkus PDF, DOCX nebo TXT.",
    );
  }
  if (format === "docx") return extractDocxBuffer(buffer, title);
  if (format === "txt") return extractTxtBuffer(buffer, title);
  return extractPdfBuffer(buffer, title);
}

export class UnsupportedFormatError extends Error {
  readonly code = "unsupported_format" as const;
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFormatError";
  }
}

export function isMalformedPdfError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : String(error);
  return (
    /InvalidPDF|FormatError|PasswordException|Unexpected|malformed|corrupt/i.test(
      name + " " + message,
    )
  );
}

/** Re-export block type for callers that only need structure. */
export type { ExtractedBlock };
