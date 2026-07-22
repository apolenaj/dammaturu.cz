import { describe, expect, it } from "vitest";
import {
  CATALOG_DOCX_MANIFEST,
  FULL_INVENTORY_MANIFEST,
} from "@/domain/study-content/registry";
import {
  listCatalogMaterials,
  validateInventoryCoverage,
} from "@/server/study-content/registry";
import { buildQuickTestFromEntry } from "@/server/study-content/session-build";
import { getStudyContentEntry } from "@/server/study-content/registry";

describe("StudyContentRegistry inventory coverage", () => {
  it("has stable unique sourceIds across the full manifest", () => {
    const ids = FULL_INVENTORY_MANIFEST.map((m) => m.sourceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("accounts for every inventory row (student UI or explicit reason)", async () => {
    const result = await validateInventoryCoverage();
    expect(result.silentGaps, result.silentGaps.join(", ")).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.totalManifest).toBe(FULL_INVENTORY_MANIFEST.length);
    expect(result.studentUiCount + result.explicitlyAccounted).toBe(
      result.totalManifest,
    );
  });

  it("exposes all 12 catalog DOCX in student Moje materiály list", async () => {
    const materials = await listCatalogMaterials({ subjectSlug: "cjl" });
    const available = materials.filter(
      (m) =>
        m.contentStatus === "available" ||
        m.contentStatus === "available_with_warning",
    );
    expect(available.length).toBe(CATALOG_DOCX_MANIFEST.length);
    for (const row of CATALOG_DOCX_MANIFEST) {
      expect(materials.some((m) => m.sourceId === row.sourceId)).toBe(true);
    }
  });

  it("builds quick test only from extracted units (no invented stems)", async () => {
    const entry = await getStudyContentEntry("cjl-realismus");
    expect(entry).toBeTruthy();
    const items = buildQuickTestFromEntry(entry!);
    for (const item of items) {
      expect(
        entry!.knowledgeUnits.some(
          (u) =>
            u.statement === item.statement ||
            entry!.knowledgeUnits.some((x) => x.statement === item.statement),
        ),
      ).toBe(true);
      if (item.sourceExcerpt) {
        expect(item.sourceExcerpt.length).toBeGreaterThan(0);
      }
    }
  });
});
