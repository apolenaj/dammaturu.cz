import { describe, expect, it } from "vitest";
import {
  evaluateDocumentEligibility,
  getAllowlistEntry,
} from "@/server/ingestion/allowlist";
import { chunkExtractedDocument } from "@/server/ingestion/chunk";
import type { ExtractedDocument } from "@/server/ingestion/types";

describe("ingestion allowlist", () => {
  it("allows known matura DOCX", () => {
    const result = evaluateDocumentEligibility("Máj.docx");
    expect(result.allowed).toBe(true);
    expect(getAllowlistEntry("Máj.docx")?.topicHint).toMatch(/Máj/);
  });

  it("rejects unrelated DOCX", () => {
    const result = evaluateDocumentEligibility("TVOŘENÍ SLOV teorie i PL.docx");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/allowlist/);
  });

  it("rejects non-docx", () => {
    const result = evaluateDocumentEligibility("poznamky.pdf");
    expect(result.allowed).toBe(false);
  });
});

describe("chunkExtractedDocument", () => {
  it("preserves heading path across sections", () => {
    const doc: ExtractedDocument = {
      title: "Test",
      plainText: "a",
      blocks: [
        { type: "heading", level: 1, text: "Realismus" },
        {
          type: "paragraph",
          text: "A".repeat(200) + " první odstavec o realismu a jeho znacích.",
        },
        {
          type: "paragraph",
          text: "B".repeat(200) + " druhý odstavec s dalšími detaily k tématu.",
        },
        { type: "heading", level: 2, text: "Francie" },
        {
          type: "paragraph",
          text: "C".repeat(200) + " Balzac a kritický realismus ve Francii.",
        },
      ],
    };

    const chunks = chunkExtractedDocument(doc);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.some((c) => c.headingPath === "Realismus")).toBe(true);
    expect(chunks.some((c) => c.headingPath === "Francie")).toBe(true);
    expect(chunks.every((c) => c.textSha256.length === 64)).toBe(true);
  });
});
