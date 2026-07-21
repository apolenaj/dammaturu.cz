import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { processLearnerMaterial } from "@/server/learner-materials/process";
import {
  createUploadingMaterial,
  deleteLearnerMaterial,
  findMaterialByContentSha,
} from "@/server/learner-materials/store";

const LEARNER = "pipeline_test_learner";

afterEach(async () => {
  const root = path.join(process.cwd(), "data", "learner-materials", LEARNER);
  await fs.rm(root, { recursive: true, force: true });
});

describe("learner ingestion pipeline (integration)", () => {
  it("stores original, extracts, chunks, and returns ready Czech message", async () => {
    const body = Buffer.from(
      [
        "1. Romantismus",
        "",
        "Karel Hynek Mácha napsal skladbu Máj v roce 1836. Je to klíčové dílo českého romantismu.",
        "",
        "2. Realismus",
        "",
        "Jan Neruda psal Povídky malostranské. Realismus popisuje všední život.",
      ].join("\n"),
      "utf8",
    );

    const created = await createUploadingMaterial({
      learnerId: LEARNER,
      title: "ČJL poznámky",
      originalFilename: "cjl.txt",
      format: "txt",
      mimeType: "text/plain",
      buffer: body,
    });
    expect(created.kind).toBe("created");
    if (created.kind !== "created") return;

    const processed = await processLearnerMaterial(created.material);
    expect(processed.status).toBe("ready");
    expect(processed.statusMessage).toMatch(/^Dokument připraven — nalezeno /);
    expect(processed.statusMessage).toMatch(/témat/);
    expect(processed.statusMessage).toMatch(/znalostní/);
    expect(processed.topicCount).toBeGreaterThanOrEqual(1);
    expect(processed.knowledgePointCount).toBeGreaterThanOrEqual(1);
    expect(processed.knowledgeUnits?.length).toBe(
      processed.knowledgePointCount,
    );
    const ku = processed.knowledgeUnits?.[0];
    expect(ku?.provenance.documentId).toBe(created.material.id);
    expect(ku?.provenance.sourceText.length).toBeGreaterThan(0);
    expect(ku?.reviewStatus).toBe("needs_review");
    expect(processed.chunks?.length).toBeGreaterThanOrEqual(1);
    expect(processed.chunks?.[0]?.sourceRef).toContain("material:");
    expect(processed.diagnostics?.extractOk).toBe(true);
    expect(processed.diagnostics?.issues ?? []).not.toContain("extract_failed");
  });

  it("deduplicates identical uploads", async () => {
    const body = Buffer.from(
      "Opakovaný dokument o Erbenovi a Kytici s dostatkem textu pro ready stav.",
      "utf8",
    );
    const first = await createUploadingMaterial({
      learnerId: LEARNER,
      title: "A",
      originalFilename: "a.txt",
      format: "txt",
      mimeType: "text/plain",
      buffer: body,
    });
    expect(first.kind).toBe("created");

    const second = await createUploadingMaterial({
      learnerId: LEARNER,
      title: "B",
      originalFilename: "b.txt",
      format: "txt",
      mimeType: "text/plain",
      buffer: body,
    });
    expect(second.kind).toBe("duplicate");
    if (first.kind === "created" && second.kind === "duplicate") {
      expect(second.material.id).toBe(first.material.id);
    }

    const found = await findMaterialByContentSha(
      LEARNER,
      first.kind === "created" ? first.material.contentSha256 : "",
    );
    expect(found?.id).toBe(
      first.kind === "created" ? first.material.id : undefined,
    );
  });

  it("marks empty text as needs_attention", async () => {
    const created = await createUploadingMaterial({
      learnerId: LEARNER,
      title: "Prázdný",
      originalFilename: "empty.txt",
      format: "txt",
      mimeType: "text/plain",
      buffer: Buffer.from("   \n", "utf8"),
    });
    expect(created.kind).toBe("created");
    if (created.kind !== "created") return;

    const processed = await processLearnerMaterial(created.material);
    expect(processed.status).toBe("needs_attention");
    expect(processed.diagnostics?.issues).toContain("empty_document");
    await deleteLearnerMaterial(LEARNER, created.material.id);
  });

  it("handles malformed PDF without silent success", async () => {
    const created = await createUploadingMaterial({
      learnerId: LEARNER,
      title: "Broken",
      originalFilename: "broken.pdf",
      format: "pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nnot really a pdf", "utf8"),
    });
    expect(created.kind).toBe("created");
    if (created.kind !== "created") return;

    const processed = await processLearnerMaterial(created.material);
    expect(["needs_attention", "failed"]).toContain(processed.status);
    expect(processed.status).not.toBe("ready");
    const issues = processed.diagnostics?.issues ?? [];
    expect(
      issues.includes("malformed_pdf") || issues.includes("extract_failed"),
    ).toBe(true);
  });
});
