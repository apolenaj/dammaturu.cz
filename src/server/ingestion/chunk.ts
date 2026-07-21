import { newId, sha256Text } from "@/server/ingestion/discover";
import type {
  ExtractedBlock,
  ExtractedDocument,
  IngestedChunk,
} from "@/server/ingestion/types";

const TARGET_CHUNK_CHARS = 900;
const MAX_CHUNK_CHARS = 12000;

function flushBuffer(
  parts: string[],
  headingPath: string | null,
  chunks: IngestedChunk[],
  cursor: { value: number },
): void {
  const text = parts.join("\n\n").trim();
  if (!text) return;

  // Split oversized buffers
  if (text.length <= MAX_CHUNK_CHARS) {
    const start = cursor.value;
    const end = start + text.length;
    chunks.push({
      id: newId(),
      chunkIndex: chunks.length,
      text,
      textSha256: sha256Text(text),
      headingPath,
      charStart: start,
      charEnd: end,
    });
    cursor.value = end + 2;
    return;
  }

  let offset = 0;
  while (offset < text.length) {
    const slice = text.slice(offset, offset + MAX_CHUNK_CHARS);
    const start = cursor.value;
    const end = start + slice.length;
    chunks.push({
      id: newId(),
      chunkIndex: chunks.length,
      text: slice,
      textSha256: sha256Text(slice),
      headingPath,
      charStart: start,
      charEnd: end,
    });
    cursor.value = end + 2;
    offset += MAX_CHUNK_CHARS;
  }
}

/**
 * Split extracted structure into SourceChunks by heading sections,
 * keeping headingPath and approximate char offsets.
 */
export function chunkExtractedDocument(
  doc: ExtractedDocument,
): IngestedChunk[] {
  const chunks: IngestedChunk[] = [];
  const cursor = { value: 0 };
  let headingPath: string | null = null;
  let buffer: string[] = [];

  const pushBlock = (block: ExtractedBlock) => {
    if (block.type === "heading") {
      flushBuffer(buffer, headingPath, chunks, cursor);
      buffer = [];
      headingPath = block.text;
      return;
    }
    buffer.push(block.text);
    const joined = buffer.join("\n\n");
    if (joined.length >= TARGET_CHUNK_CHARS) {
      flushBuffer(buffer, headingPath, chunks, cursor);
      buffer = [];
    }
  };

  for (const block of doc.blocks) {
    pushBlock(block);
  }
  flushBuffer(buffer, headingPath, chunks, cursor);

  if (chunks.length === 0 && doc.plainText.trim()) {
    flushBuffer([doc.plainText.trim()], null, chunks, cursor);
  }

  return chunks;
}
