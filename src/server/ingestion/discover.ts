import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  evaluateDocumentEligibility,
} from "@/server/ingestion/allowlist";
import type { DiscoveredDocument } from "@/server/ingestion/types";

export const SOURCE_MATERIALS_DIR = path.join(
  process.cwd(),
  "content",
  "source-materials",
);

export function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function newId(): string {
  return randomUUID();
}

export async function discoverSourceDocuments(
  rootDir = SOURCE_MATERIALS_DIR,
): Promise<DiscoveredDocument[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(rootDir);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
  }

  const docs: DiscoveredDocument[] = [];

  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const absolutePath = path.join(rootDir, name);
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) continue;

    const ext = path.extname(name).toLowerCase();
    const eligibility = evaluateDocumentEligibility(name);

    docs.push({
      absolutePath,
      relativePath: path.join("content", "source-materials", name),
      filename: name,
      extension: ext,
      sizeBytes: stat.size,
      allowed: eligibility.allowed,
      rejectReason: eligibility.reason,
    });
  }

  return docs.sort((a, b) => a.filename.localeCompare(b.filename, "cs"));
}
