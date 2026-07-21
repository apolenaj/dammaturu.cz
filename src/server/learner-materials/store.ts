import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  KnowledgeExtractionSummary,
  LearnerKnowledgeUnit,
} from "@/domain/learning/learner-knowledge";
import {
  learnerMaterialSchema,
  toListItem,
  type LearnerMaterial,
  type LearnerMaterialListItem,
  type MaterialChunk,
  type MaterialDiagnostics,
  type MaterialFormat,
  type MaterialStatus,
  type MaterialTopic,
} from "@/domain/learning/learner-materials";
import { assertSafeId } from "@/server/safe-id";

const ROOT = path.join(process.cwd(), "data", "learner-materials");

function learnerDir(learnerId: string): string {
  assertSafeId(learnerId, "learner id");
  return path.join(ROOT, learnerId);
}

function metaPath(learnerId: string, id: string): string {
  assertSafeId(learnerId, "learner id");
  assertSafeId(id, "material id");
  return path.join(learnerDir(learnerId), "meta", `${id}.json`);
}

function filesDir(learnerId: string): string {
  return path.join(learnerDir(learnerId), "files");
}

export function materialFilePath(
  learnerId: string,
  storageFilename: string,
): string {
  assertSafeId(learnerId, "learner id");
  if (!/^[a-zA-Z0-9._-]+$/.test(storageFilename)) {
    throw new Error("Neplatný název souboru");
  }
  return path.join(filesDir(learnerId), storageFilename);
}

async function ensureLearnerDirs(learnerId: string): Promise<void> {
  const base = learnerDir(learnerId);
  await fs.mkdir(path.join(base, "meta"), { recursive: true });
  await fs.mkdir(path.join(base, "files"), { recursive: true });
}

export function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function listLearnerMaterials(
  learnerId: string,
): Promise<LearnerMaterialListItem[]> {
  await ensureLearnerDirs(learnerId);
  const metaDir = path.join(learnerDir(learnerId), "meta");
  let names: string[];
  try {
    names = await fs.readdir(metaDir);
  } catch {
    return [];
  }

  const items: LearnerMaterial[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(metaDir, name), "utf8");
      const parsed = learnerMaterialSchema.safeParse(JSON.parse(raw));
      if (parsed.success) items.push(parsed.data);
    } catch {
      // skip corrupt
    }
  }

  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return items.map(toListItem);
}

export async function getLearnerMaterial(
  learnerId: string,
  id: string,
): Promise<LearnerMaterial | null> {
  try {
    const raw = await fs.readFile(metaPath(learnerId, id), "utf8");
    const parsed = learnerMaterialSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Find an existing material with the same content hash (duplicate upload). */
export async function findMaterialByContentSha(
  learnerId: string,
  contentSha256: string,
): Promise<LearnerMaterial | null> {
  await ensureLearnerDirs(learnerId);
  const metaDir = path.join(learnerDir(learnerId), "meta");
  let names: string[];
  try {
    names = await fs.readdir(metaDir);
  } catch {
    return null;
  }

  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(metaDir, name), "utf8");
      const parsed = learnerMaterialSchema.safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.contentSha256 === contentSha256) {
        return parsed.data;
      }
    } catch {
      // skip
    }
  }
  return null;
}

async function writeMaterial(record: LearnerMaterial): Promise<void> {
  await ensureLearnerDirs(record.learnerId);
  const tmp = `${metaPath(record.learnerId, record.id)}.tmp`;
  const payload = `${JSON.stringify(record, null, 2)}\n`;
  await fs.writeFile(tmp, payload, "utf8");
  await fs.rename(tmp, metaPath(record.learnerId, record.id));
}

export type CreateMaterialInput = {
  learnerId: string;
  title: string;
  originalFilename: string;
  format: MaterialFormat;
  mimeType: string;
  buffer: Buffer;
};

export type CreateMaterialResult =
  | { kind: "created"; material: LearnerMaterial }
  | { kind: "duplicate"; material: LearnerMaterial };

/**
 * Safely store the original bytes, verify hash after write.
 * Deduplicates by content SHA for the same learner.
 */
export async function createUploadingMaterial(
  input: CreateMaterialInput,
): Promise<CreateMaterialResult> {
  await ensureLearnerDirs(input.learnerId);
  const contentSha256 = sha256Buffer(input.buffer);

  const existing = await findMaterialByContentSha(
    input.learnerId,
    contentSha256,
  );
  if (existing) {
    return { kind: "duplicate", material: existing };
  }

  const id = randomUUID();
  const storageFilename = `${id}.${input.format}`;
  const now = new Date().toISOString();
  const dest = materialFilePath(input.learnerId, storageFilename);

  const tmpPath = `${dest}.tmp`;
  await fs.writeFile(tmpPath, input.buffer);
  const written = await fs.readFile(tmpPath);
  if (sha256Buffer(written) !== contentSha256) {
    await fs.unlink(tmpPath).catch(() => undefined);
    throw new Error("Uložení selhalo — kontrolní součet se neshoduje.");
  }
  await fs.rename(tmpPath, dest);

  const record: LearnerMaterial = {
    id,
    learnerId: input.learnerId,
    title: input.title.slice(0, 240),
    originalFilename: input.originalFilename.slice(0, 500),
    format: input.format,
    mimeType: input.mimeType.slice(0, 120),
    byteSize: input.buffer.byteLength,
    contentSha256,
    storageFilename,
    status: "uploading",
    statusMessage: null,
    plainTextLength: 0,
    chunkCount: 0,
    topicCount: 0,
    knowledgePointCount: 0,
    createdAt: now,
    updatedAt: now,
    processedAt: null,
  };

  await writeMaterial(record);
  return { kind: "created", material: record };
}

export async function updateMaterialStatus(
  learnerId: string,
  id: string,
  patch: {
    status: MaterialStatus;
    statusMessage?: string | null;
    plainTextLength?: number;
    chunkCount?: number;
    topicCount?: number;
    knowledgePointCount?: number;
    chunks?: MaterialChunk[];
    topics?: MaterialTopic[];
    knowledgeUnits?: LearnerKnowledgeUnit[];
    knowledgeExtraction?: KnowledgeExtractionSummary;
    diagnostics?: MaterialDiagnostics;
    duplicateOfId?: string | null;
    processedAt?: string | null;
    title?: string;
  },
): Promise<LearnerMaterial | null> {
  const existing = await getLearnerMaterial(learnerId, id);
  if (!existing) return null;

  const next: LearnerMaterial = {
    ...existing,
    status: patch.status,
    statusMessage:
      patch.statusMessage !== undefined
        ? patch.statusMessage
        : existing.statusMessage,
    plainTextLength: patch.plainTextLength ?? existing.plainTextLength,
    chunkCount: patch.chunkCount ?? existing.chunkCount,
    topicCount: patch.topicCount ?? existing.topicCount,
    knowledgePointCount:
      patch.knowledgePointCount ?? existing.knowledgePointCount,
    chunks: patch.chunks ?? existing.chunks,
    topics: patch.topics ?? existing.topics,
    knowledgeUnits: patch.knowledgeUnits ?? existing.knowledgeUnits,
    knowledgeExtraction:
      patch.knowledgeExtraction ?? existing.knowledgeExtraction,
    diagnostics: patch.diagnostics ?? existing.diagnostics,
    duplicateOfId:
      patch.duplicateOfId !== undefined
        ? patch.duplicateOfId
        : existing.duplicateOfId,
    processedAt:
      patch.processedAt !== undefined ? patch.processedAt : existing.processedAt,
    title: patch.title ?? existing.title,
    updatedAt: new Date().toISOString(),
  };

  // Drop heavy bodies from disk when not ready/needs_attention
  if (next.status === "failed" || next.status === "uploading") {
    delete next.chunks;
    delete next.knowledgeUnits;
  }

  await writeMaterial(next);
  return next;
}

export async function renameLearnerMaterial(
  learnerId: string,
  id: string,
  title: string,
): Promise<LearnerMaterial | null> {
  const trimmed = title.trim().slice(0, 240);
  if (!trimmed) return null;
  const existing = await getLearnerMaterial(learnerId, id);
  if (!existing) return null;
  const next: LearnerMaterial = {
    ...existing,
    title: trimmed,
    updatedAt: new Date().toISOString(),
  };
  await writeMaterial(next);
  return next;
}

export async function deleteLearnerMaterial(
  learnerId: string,
  id: string,
): Promise<boolean> {
  const existing = await getLearnerMaterial(learnerId, id);
  if (!existing) return false;
  try {
    await fs.unlink(materialFilePath(learnerId, existing.storageFilename));
  } catch {
    // file may already be gone
  }
  try {
    await fs.unlink(
      path.join(learnerDir(learnerId), "meta", `${id}.overflow.txt`),
    );
  } catch {
    // optional
  }
  try {
    await fs.unlink(metaPath(learnerId, id));
  } catch {
    return false;
  }
  return true;
}
