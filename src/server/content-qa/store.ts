import { promises as fs } from "node:fs";
import path from "node:path";
import { newId } from "@/server/ingestion/discover";
import { appendAudit } from "@/server/ingestion/store";
import type {
  ContentQaItem,
  ContentQaRunResult,
} from "@/server/content-qa/types";

export const CONTENT_QA_DIR = path.join(process.cwd(), "data", "content-qa");
const ITEMS_DIR = path.join(CONTENT_QA_DIR, "items");
const INDEX_PATH = path.join(CONTENT_QA_DIR, "index.json");
const LAST_RUN_PATH = path.join(CONTENT_QA_DIR, "last-run.json");

async function ensureDirs() {
  await fs.mkdir(ITEMS_DIR, { recursive: true });
}

function itemPath(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Neplatné QA item id");
  return path.join(ITEMS_DIR, `${id}.json`);
}

type QaIndex = {
  byKnowledgeUnitId: Record<string, string>;
};

async function loadIndex(): Promise<QaIndex> {
  try {
    return JSON.parse(await fs.readFile(INDEX_PATH, "utf8")) as QaIndex;
  } catch {
    return { byKnowledgeUnitId: {} };
  }
}

async function saveIndex(index: QaIndex): Promise<void> {
  await ensureDirs();
  await fs.writeFile(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export async function getQaItem(id: string): Promise<ContentQaItem | null> {
  try {
    return JSON.parse(await fs.readFile(itemPath(id), "utf8")) as ContentQaItem;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getQaItemByKnowledgeUnitId(
  knowledgeUnitId: string,
): Promise<ContentQaItem | null> {
  const index = await loadIndex();
  const id = index.byKnowledgeUnitId[knowledgeUnitId];
  if (!id) return null;
  return getQaItem(id);
}

export async function listQaItems(): Promise<ContentQaItem[]> {
  await ensureDirs();
  const files = await fs.readdir(ITEMS_DIR);
  const items: ContentQaItem[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const item = await getQaItem(file.replace(/\.json$/, ""));
    if (item) items.push(item);
  }
  return items.sort((a, b) => {
    const flagDelta = b.flags.length - a.flags.length;
    if (flagDelta !== 0) return flagDelta;
    return a.title.localeCompare(b.title, "cs");
  });
}

export async function saveQaItem(item: ContentQaItem): Promise<void> {
  await ensureDirs();
  const tmp = `${itemPath(item.id)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(item, null, 2)}\n`, "utf8");
  await fs.rename(tmp, itemPath(item.id));
  const index = await loadIndex();
  index.byKnowledgeUnitId[item.knowledgeUnitId] = item.id;
  await saveIndex(index);
}

export async function saveQaLastRun(result: ContentQaRunResult): Promise<void> {
  await ensureDirs();
  await fs.writeFile(
    LAST_RUN_PATH,
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
}

export async function getQaLastRun(): Promise<ContentQaRunResult | null> {
  try {
    return JSON.parse(
      await fs.readFile(LAST_RUN_PATH, "utf8"),
    ) as ContentQaRunResult;
  } catch {
    return null;
  }
}

export async function auditQaChange(
  action: string,
  item: ContentQaItem,
  detail: string,
  actor: "cli" | "admin" | "system" = "admin",
): Promise<void> {
  await appendAudit({
    actor,
    action,
    documentId: item.documentId,
    filename: item.filename,
    detail,
    meta: {
      qaItemId: item.id,
      knowledgeUnitId: item.knowledgeUnitId,
      validationStatus: item.validationStatus,
    },
  });
}

export function createQaItemId(): string {
  return newId().replace(/-/g, "");
}
