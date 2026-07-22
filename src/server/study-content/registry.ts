import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  CATALOG_DOCX_MANIFEST,
  EXPLICIT_EXCLUSION_MANIFEST,
  FULL_INVENTORY_MANIFEST,
  toListItem,
  type InventoryManifestRow,
  type StudyContentChunk,
  type StudyContentEntry,
  type StudyContentListItem,
  type StudyContentUnit,
} from "@/domain/study-content/registry";
import {
  findDocumentByPath,
  getDocument,
  listDocuments,
} from "@/server/ingestion/store";
import type { IngestedSourceDocument } from "@/server/ingestion/types";
import { assertPathInsideRoot } from "@/server/safe-path";

function filenameFromPath(inventoryPath: string): string {
  const parts = inventoryPath.split("/");
  return parts[parts.length - 1] ?? inventoryPath;
}

async function fileExists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

function chunksFromDoc(doc: IngestedSourceDocument): StudyContentChunk[] {
  return doc.chunks.map((c) => ({
    id: c.id,
    chunkIndex: c.chunkIndex,
    text: c.text,
    headingPath: c.headingPath,
    charStart: c.charStart,
    charEnd: c.charEnd,
    textSha256: c.textSha256 ?? null,
  }));
}

function unitsFromDoc(doc: IngestedSourceDocument): StudyContentUnit[] {
  return (doc.knowledgeUnits ?? []).map((u) => ({
    id: u.id,
    title: u.title,
    statement: u.statement,
    kind: u.kind,
    topicSlug: u.topicSlug,
    sourceChunkIds: u.sourceChunkIds,
    confidence: u.confidence,
    examRelevance: u.examRelevance,
  }));
}

function parsedTextFromChunks(chunks: StudyContentChunk[]): string {
  return chunks
    .slice()
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((c) => {
      const head = c.headingPath ? `## ${c.headingPath}\n\n` : "";
      return `${head}${c.text.trim()}`;
    })
    .join("\n\n---\n\n");
}

function resolveCatalogEntry(
  row: InventoryManifestRow,
  doc: IngestedSourceDocument | null,
  fileOnDisk: boolean,
): StudyContentEntry {
  const originalFilename = filenameFromPath(row.inventoryPath);
  const warnings = [...(row.knownWarnings ?? [])];

  if (!fileOnDisk) {
    return {
      sourceId: row.sourceId,
      title: row.title,
      subject: row.subject,
      subjectSlug: row.subjectSlug,
      topic: row.topic,
      subtopic: row.subtopic,
      sourceType: row.sourceType,
      contentStatus: "unavailable",
      unavailableReason: `Soubor chybí na disku: ${row.inventoryPath}`,
      parsedText: "",
      parseComplete: false,
      chunks: [],
      knowledgeUnits: [],
      provenance: {
        inventoryPath: row.inventoryPath,
        originalFilename,
        contentSha256: null,
        ingestionDocumentId: null,
        relativeSourcePath: row.inventoryPath,
        mimeType: null,
        sizeBytes: null,
        pipelineStatus: null,
        headingPaths: [],
        chunkCount: 0,
        knowledgeUnitCount: 0,
        warnings,
      },
      relatedHrefs: row.relatedHrefs ?? [],
      topics: [row.topic, row.subtopic].filter(Boolean) as string[],
    };
  }

  if (!doc) {
    return {
      sourceId: row.sourceId,
      title: row.title,
      subject: row.subject,
      subjectSlug: row.subjectSlug,
      topic: row.topic,
      subtopic: row.subtopic,
      sourceType: row.sourceType,
      contentStatus: "unavailable",
      unavailableReason:
        "Text materiálu ještě není připravený k interaktivnímu učení. Použij „Zobrazit původní materiál“.",
      parsedText: "",
      parseComplete: false,
      chunks: [],
      knowledgeUnits: [],
      provenance: {
        inventoryPath: row.inventoryPath,
        originalFilename,
        contentSha256: null,
        ingestionDocumentId: null,
        relativeSourcePath: row.inventoryPath,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: null,
        pipelineStatus: null,
        headingPaths: [],
        chunkCount: 0,
        knowledgeUnitCount: 0,
        warnings,
      },
      relatedHrefs: row.relatedHrefs ?? [],
      topics: [row.topic, row.subtopic].filter(Boolean) as string[],
    };
  }

  const chunks = chunksFromDoc(doc);
  const knowledgeUnits = unitsFromDoc(doc);
  const parsedText = parsedTextFromChunks(chunks);
  const parseComplete = chunks.length > 0 && parsedText.trim().length > 0;
  warnings.push(...(doc.warnings ?? []));

  let contentStatus: StudyContentEntry["contentStatus"] = "available";
  let unavailableReason: string | null = null;

  if (!parseComplete) {
    contentStatus = "unavailable";
    unavailableReason =
      "Extrakce textu selhala nebo je prázdná — použij „Zobrazit původní materiál“.";
  } else if (warnings.length > 0 || doc.pipelineStatus === "needs_review") {
    contentStatus = "available_with_warning";
  }

  const topicTitles = [
    row.topic,
    row.subtopic,
    ...(doc.topics ?? []).map((t) => t.title),
  ].filter((x): x is string => Boolean(x));

  return {
    sourceId: row.sourceId,
    title: row.title || doc.title,
    subject: row.subject,
    subjectSlug: row.subjectSlug,
    topic: row.topic,
    subtopic: row.subtopic,
    sourceType: row.sourceType,
    contentStatus,
    unavailableReason,
    parsedText,
    parseComplete,
    chunks,
    knowledgeUnits,
    provenance: {
      inventoryPath: row.inventoryPath,
      originalFilename: doc.filename || originalFilename,
      contentSha256: doc.contentSha256,
      ingestionDocumentId: doc.id,
      relativeSourcePath: doc.relativePath || row.inventoryPath,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      importedAt: doc.importedAt,
      pipelineStatus: doc.pipelineStatus,
      headingPaths: [
        ...new Set(
          chunks
            .map((c) => c.headingPath)
            .filter((h): h is string => Boolean(h)),
        ),
      ],
      chunkCount: chunks.length,
      knowledgeUnitCount: knowledgeUnits.length,
      warnings,
    },
    relatedHrefs: row.relatedHrefs ?? [],
    topics: [...new Set(topicTitles)],
  };
}

function resolveExcludedOrDerived(
  row: InventoryManifestRow,
): StudyContentEntry {
  const status =
    row.intent === "derived_activity" ? "excluded" : "excluded";
  return {
    sourceId: row.sourceId,
    title: row.title,
    subject: row.subject,
    subjectSlug: row.subjectSlug,
    topic: row.topic,
    subtopic: row.subtopic,
    sourceType: row.sourceType,
    contentStatus: status,
    unavailableReason:
      row.exclusionReason ??
      "Položka není kanonický studijní zdroj pro Moje materiály.",
    parsedText: "",
    parseComplete: false,
    chunks: [],
    knowledgeUnits: [],
    provenance: {
      inventoryPath: row.inventoryPath,
      originalFilename: filenameFromPath(row.inventoryPath),
      contentSha256: null,
      ingestionDocumentId: null,
      relativeSourcePath: row.inventoryPath,
      mimeType: null,
      sizeBytes: null,
      pipelineStatus: null,
      headingPaths: [],
      chunkCount: 0,
      knowledgeUnitCount: 0,
      warnings: row.knownWarnings ?? [],
    },
    relatedHrefs: row.relatedHrefs ?? [],
    topics: [row.topic, row.subtopic].filter(Boolean) as string[],
  };
}

/** Full registry resolution — catalog DOCX + explicit exclusions.
 * Request-memoized so list/detail/home don't re-walk the catalog repeatedly.
 */
export const getStudyContentRegistry = cache(
  async (): Promise<StudyContentEntry[]> => {
    const entries: StudyContentEntry[] = [];

    for (const row of CATALOG_DOCX_MANIFEST) {
      const abs = assertPathInsideRoot(
        path.join(process.cwd(), row.inventoryPath),
      );
      const onDisk = await fileExists(abs);
      const doc =
        (await findDocumentByPath(row.inventoryPath)) ??
        (await findDocumentByFilename(filenameFromPath(row.inventoryPath)));
      entries.push(resolveCatalogEntry(row, doc, onDisk));
    }

    for (const row of EXPLICIT_EXCLUSION_MANIFEST) {
      entries.push(resolveExcludedOrDerived(row));
    }

    return entries;
  },
);

async function findDocumentByFilename(
  filename: string,
): Promise<IngestedSourceDocument | null> {
  const docs = await listDocuments();
  return (
    docs.find(
      (d) =>
        d.filename === filename ||
        d.relativePath.endsWith(`/${filename}`) ||
        d.relativePath.endsWith(filename),
    ) ?? null
  );
}

export async function getStudyContentEntry(
  sourceId: string,
): Promise<StudyContentEntry | null> {
  const all = await getStudyContentRegistry();
  return all.find((e) => e.sourceId === sourceId) ?? null;
}

/** Student-facing catalog only (ČJL DOCX that can appear in Moje materiály). */
export async function listCatalogMaterials(options?: {
  subjectSlug?: string;
  topic?: string | null;
  query?: string | null;
  includeUnavailable?: boolean;
}): Promise<StudyContentListItem[]> {
  const subjectSlug = options?.subjectSlug ?? "cjl";
  const topic = options?.topic?.trim() || null;
  const query = options?.query?.trim().toLowerCase() || null;
  const includeUnavailable = options?.includeUnavailable ?? true;

  const all = await getStudyContentRegistry();
  return all
    .filter((e) => {
      if (e.subjectSlug !== subjectSlug) return false;
      if (
        e.contentStatus === "excluded" &&
        !CATALOG_DOCX_MANIFEST.some((m) => m.sourceId === e.sourceId)
      ) {
        return false;
      }
      if (
        !includeUnavailable &&
        (e.contentStatus === "unavailable" || e.contentStatus === "excluded")
      ) {
        return false;
      }
      // Catalog rows only in main grid
      if (!CATALOG_DOCX_MANIFEST.some((m) => m.sourceId === e.sourceId)) {
        return false;
      }
      if (topic && e.topic !== topic && e.subtopic !== topic) {
        if (!e.topics.includes(topic)) return false;
      }
      if (query) {
        const hay = [
          e.title,
          e.topic,
          e.subtopic ?? "",
          e.provenance.originalFilename,
          ...e.topics,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    })
    .map(toListItem)
    .sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function listCatalogTopics(
  subjectSlug = "cjl",
): Promise<string[]> {
  const items = await listCatalogMaterials({ subjectSlug });
  const topics = new Set<string>();
  for (const item of items) {
    topics.add(item.topic);
    if (item.subtopic) topics.add(item.subtopic);
    for (const t of item.topics) topics.add(t);
  }
  return [...topics].sort((a, b) => a.localeCompare(b, "cs"));
}

export type InventoryValidationResult = {
  ok: boolean;
  totalManifest: number;
  studentUiCount: number;
  explicitlyAccounted: number;
  silentGaps: string[];
  rows: Array<{
    sourceId: string;
    inventoryPath: string;
    disposition: "student_ui" | "explicit_reason";
    contentStatus: string;
    reason: string | null;
  }>;
};

/**
 * Automated validation: every FULL_INVENTORY_MANIFEST row is either
 * A) available in student UI (catalog + parse) or
 * B) explicitly marked with a factual reason.
 */
export async function validateInventoryCoverage(): Promise<InventoryValidationResult> {
  const registry = await getStudyContentRegistry();
  const byId = new Map(registry.map((e) => [e.sourceId, e]));
  const rows: InventoryValidationResult["rows"] = [];
  const silentGaps: string[] = [];

  for (const m of FULL_INVENTORY_MANIFEST) {
    const entry = byId.get(m.sourceId);
    if (!entry) {
      silentGaps.push(m.sourceId);
      rows.push({
        sourceId: m.sourceId,
        inventoryPath: m.inventoryPath,
        disposition: "explicit_reason",
        contentStatus: "missing",
        reason: "Chybí v runtime registry — fatální mezera.",
      });
      continue;
    }

    const isCatalog = CATALOG_DOCX_MANIFEST.some(
      (c) => c.sourceId === m.sourceId,
    );
    const inStudentUi =
      isCatalog &&
      (entry.contentStatus === "available" ||
        entry.contentStatus === "available_with_warning");

    if (inStudentUi) {
      rows.push({
        sourceId: m.sourceId,
        inventoryPath: m.inventoryPath,
        disposition: "student_ui",
        contentStatus: entry.contentStatus,
        reason: null,
      });
      continue;
    }

    const reason = entry.unavailableReason;
    if (!reason) {
      silentGaps.push(m.sourceId);
      rows.push({
        sourceId: m.sourceId,
        inventoryPath: m.inventoryPath,
        disposition: "explicit_reason",
        contentStatus: entry.contentStatus,
        reason: null,
      });
      continue;
    }

    rows.push({
      sourceId: m.sourceId,
      inventoryPath: m.inventoryPath,
      disposition: "explicit_reason",
      contentStatus: entry.contentStatus,
      reason,
    });
  }

  // Orphan ingested docs not in manifest → also a silent gap
  const docs = await listDocuments();
  for (const doc of docs) {
    const covered = CATALOG_DOCX_MANIFEST.some(
      (m) =>
        m.inventoryPath === doc.relativePath ||
        filenameFromPath(m.inventoryPath) === doc.filename,
    );
    if (!covered) {
      silentGaps.push(`orphan-ingest:${doc.filename}`);
    }
  }

  const studentUiCount = rows.filter((r) => r.disposition === "student_ui")
    .length;
  const explicitlyAccounted = rows.filter(
    (r) => r.disposition === "explicit_reason" && r.reason,
  ).length;

  return {
    ok: silentGaps.length === 0,
    totalManifest: FULL_INVENTORY_MANIFEST.length,
    studentUiCount,
    explicitlyAccounted,
    silentGaps,
    rows,
  };
}

export async function getOriginalSourceAbsolutePath(
  sourceId: string,
): Promise<string | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(sourceId)) return null;
  const row = CATALOG_DOCX_MANIFEST.find((m) => m.sourceId === sourceId);
  if (!row) return null;
  // Manifest path must stay under cwd — never follow ../ escapes
  let abs: string;
  try {
    abs = assertPathInsideRoot(path.join(process.cwd(), row.inventoryPath));
  } catch {
    return null;
  }
  if (!(await fileExists(abs))) return null;
  return abs;
}

/** Re-export for tests */
export { getDocument };
