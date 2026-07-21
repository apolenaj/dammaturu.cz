import {
  isSupportedFormat,
  type LearnerMaterial,
  type MaterialFormat,
} from "@/domain/learning/learner-materials";
import {
  extractLearnerDocument,
  type LearnerExtractResult,
} from "@/server/learner-materials/pipeline/extract";
import {
  applyIngestionResult,
  runLearnerIngestionPipeline,
} from "@/server/learner-materials/pipeline/run";
import { updateMaterialStatus } from "@/server/learner-materials/store";

/** @deprecated Prefer extractLearnerDocument — kept for existing tests. */
export async function extractMaterialBuffer(
  format: MaterialFormat,
  buffer: Buffer,
  title: string,
): Promise<LearnerExtractResult> {
  return extractLearnerDocument(format, buffer, title);
}

/**
 * Run extraction + semantic ingestion for an already-stored material.
 * Sets Ready only when enough text was extracted.
 */
export async function processLearnerMaterial(
  material: LearnerMaterial,
): Promise<LearnerMaterial> {
  if (!isSupportedFormat(material.format)) {
    const failed =
      (await updateMaterialStatus(material.learnerId, material.id, {
        status: "failed",
        statusMessage:
          "Formát zatím není podporovaný (obrázky a PPTX připravujeme).",
        plainTextLength: 0,
        chunkCount: 0,
        topicCount: 0,
        knowledgePointCount: 0,
        chunks: [],
        topics: [],
        knowledgeUnits: [],
        diagnostics: {
          extractOk: false,
          pageCount: null,
          pagesWithText: null,
          headingCount: 0,
          topicCount: 0,
          knowledgePointCount: 0,
          plainTextLength: 0,
          chunkCount: 0,
          truncated: false,
          omittedChars: 0,
          contentLossRisk: "none",
          warnings: ["Nepodporovaný formát."],
          issues: ["unsupported_format"],
        },
        processedAt: new Date().toISOString(),
      })) ?? material;
    return failed;
  }

  await updateMaterialStatus(material.learnerId, material.id, {
    status: "processing",
    statusMessage: null,
  });

  const result = await runLearnerIngestionPipeline({
    ...material,
    status: "processing",
  });

  return applyIngestionResult(material, result);
}
