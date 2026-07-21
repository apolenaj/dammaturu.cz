import { promises as fs } from "node:fs";
import path from "node:path";
import { newId } from "@/server/ingestion/discover";
import type {
  AuditLogEntry,
  IngestedSourceDocument,
  IngestionRunResult,
} from "@/server/ingestion/types";

export const INGESTION_DATA_DIR = path.join(
  process.cwd(),
  "data",
  "ingestion",
);

const DOCUMENTS_DIR = path.join(INGESTION_DATA_DIR, "documents");
const AUDIT_PATH = path.join(INGESTION_DATA_DIR, "audit-log.jsonl");
const LAST_RUN_PATH = path.join(INGESTION_DATA_DIR, "last-run.json");
const INDEX_PATH = path.join(INGESTION_DATA_DIR, "index.json");

async function ensureDirs() {
  await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
}

function documentPath(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Neplatné document id");
  }
  return path.join(DOCUMENTS_DIR, `${id}.json`);
}

export type IngestionIndex = {
  byRelativePath: Record<string, string>;
  byContentSha: Record<string, string>;
};

export async function loadIndex(): Promise<IngestionIndex> {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw) as IngestionIndex;
  } catch {
    return { byRelativePath: {}, byContentSha: {} };
  }
}

async function saveIndex(index: IngestionIndex): Promise<void> {
  await ensureDirs();
  await fs.writeFile(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export async function getDocument(
  id: string,
): Promise<IngestedSourceDocument | null> {
  try {
    const raw = await fs.readFile(documentPath(id), "utf8");
    return JSON.parse(raw) as IngestedSourceDocument;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function listDocuments(): Promise<IngestedSourceDocument[]> {
  await ensureDirs();
  const files = await fs.readdir(DOCUMENTS_DIR);
  const docs: IngestedSourceDocument[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const doc = await getDocument(file.replace(/\.json$/, ""));
    if (doc) docs.push(doc);
  }
  return docs.sort((a, b) => a.filename.localeCompare(b.filename, "cs"));
}

export async function saveDocument(
  doc: IngestedSourceDocument,
): Promise<void> {
  await ensureDirs();
  const tmp = `${documentPath(doc.id)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  await fs.rename(tmp, documentPath(doc.id));

  const index = await loadIndex();
  index.byRelativePath[doc.relativePath] = doc.id;
  index.byContentSha[doc.contentSha256] = doc.id;
  await saveIndex(index);
}

export async function findDocumentByPath(
  relativePath: string,
): Promise<IngestedSourceDocument | null> {
  const index = await loadIndex();
  const id = index.byRelativePath[relativePath];
  if (!id) return null;
  return getDocument(id);
}

export async function appendAudit(
  entry: Omit<AuditLogEntry, "id" | "at"> & { at?: string },
): Promise<AuditLogEntry> {
  await ensureDirs();
  const full: AuditLogEntry = {
    id: newId(),
    at: entry.at ?? new Date().toISOString(),
    action: entry.action,
    actor: entry.actor,
    documentId: entry.documentId,
    filename: entry.filename,
    detail: entry.detail,
    meta: entry.meta,
  };
  await fs.appendFile(AUDIT_PATH, `${JSON.stringify(full)}\n`, "utf8");
  return full;
}

export async function readAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  try {
    const raw = await fs.readFile(AUDIT_PATH, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const entries = lines.map((line) => JSON.parse(line) as AuditLogEntry);
    return entries.slice(-limit).reverse();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
  }
}

export async function saveLastRun(result: IngestionRunResult): Promise<void> {
  await ensureDirs();
  await fs.writeFile(
    LAST_RUN_PATH,
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
}

export async function getLastRun(): Promise<IngestionRunResult | null> {
  try {
    const raw = await fs.readFile(LAST_RUN_PATH, "utf8");
    return JSON.parse(raw) as IngestionRunResult;
  } catch {
    return null;
  }
}
