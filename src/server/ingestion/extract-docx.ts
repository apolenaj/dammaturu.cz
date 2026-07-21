import { promises as fs } from "node:fs";
import mammoth from "mammoth";
import type {
  ExtractedBlock,
  ExtractedDocument,
} from "@/server/ingestion/types";

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

/**
 * Extract text + logical structure from DOCX via Mammoth HTML.
 * Original file is read-only — never written back.
 */
export async function extractDocx(
  absolutePath: string,
  fallbackTitle: string,
): Promise<ExtractedDocument> {
  const buffer = await fs.readFile(absolutePath);
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  const blocks: ExtractedBlock[] = [];
  const blockRegex =
    /<(h[1-6]|p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1]!.toLowerCase();
    const text = stripTags(match[2] ?? "");
    if (!text) continue;

    if (tag.startsWith("h")) {
      blocks.push({
        type: "heading",
        level: Number(tag.slice(1)),
        text,
      });
    } else if (tag === "li") {
      blocks.push({ type: "list_item", text });
    } else {
      blocks.push({ type: "paragraph", text });
    }
  }

  if (blocks.length === 0) {
    const plain = stripTags(html);
    if (plain) {
      for (const part of plain.split(/\n+/)) {
        const t = part.trim();
        if (t) blocks.push({ type: "paragraph", text: t });
      }
    }
  }

  const titleFromHeading = blocks.find((b) => b.type === "heading")?.text;
  const plainText = blocks.map((b) => b.text).join("\n\n");

  return {
    title: titleFromHeading ?? fallbackTitle.replace(/\.docx$/i, ""),
    blocks,
    plainText,
  };
}
