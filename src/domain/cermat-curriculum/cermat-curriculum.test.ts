import { describe, expect, it } from "vitest";
import {
  CERMAT_COMPLETE_PREP_CLAIM_FORBIDDEN_CS,
  CERMAT_DIDACTIC_REQUIREMENTS,
  CERMAT_CURRICULUM_TITLE_CS,
  cermatCoverageAreas,
  productLaneLabelsCs,
} from "@/domain/cermat-curriculum/requirements";
import {
  mapCermatCategoryToRequirementIds,
  mapKnowledgeUnitToRequirementIds,
  SOURCE_ID_REQUIREMENT_MAP,
} from "@/domain/cermat-curriculum/ku-mapping";
import {
  buildCoverageReport,
  classifyAreaStatus,
  classifyRequirementStatus,
} from "@/domain/cermat-curriculum/coverage";

describe("CERMAT curriculum model 2025/2026", () => {
  it("exposes nine didactic requirement IDs 1.1–1.9", () => {
    expect(CERMAT_DIDACTIC_REQUIREMENTS).toHaveLength(9);
    expect(CERMAT_DIDACTIC_REQUIREMENTS.map((r) => r.catalogCode)).toEqual([
      "1.1",
      "1.2",
      "1.3",
      "1.4",
      "1.5",
      "1.6",
      "1.7",
      "1.8",
      "1.9",
    ]);
    expect(CERMAT_CURRICULUM_TITLE_CS).toMatch(/CERMAT/);
    expect(productLaneLabelsCs.moje_materialy).toBe("Moje materiály");
    expect(productLaneLabelsCs.cermat_priprava).toBe("CERMAT příprava");
  });

  it("covers all eight matrix areas via requirements", () => {
    const areas = new Set(
      CERMAT_DIDACTIC_REQUIREMENTS.map((r) => r.coverageArea),
    );
    for (const area of cermatCoverageAreas) {
      expect(areas.has(area)).toBe(true);
    }
  });

  it("maps catalog sources and allows zero IDs", () => {
    expect(SOURCE_ID_REQUIREMENT_MAP["cjl-homonyma"]).toContain(
      "cermat-cjl-dt-1.3",
    );
    expect(
      mapKnowledgeUnitToRequirementIds({
        knowledgeUnitId: "x",
        title: "Nesouvisející poznámka",
        statement: "Bez signálu",
      }),
    ).toEqual([]);
  });

  it("maps CERMAT practice categories to official IDs", () => {
    expect(mapCermatCategoryToRequirementIds("orthography")).toEqual([
      "cermat-cjl-dt-1.1",
    ]);
    expect(mapCermatCategoryToRequirementIds("syntax")).toEqual([
      "cermat-cjl-dt-1.4",
    ]);
  });

  it("never marks complete prep when requirements are missing", () => {
    const report = buildCoverageReport({
      evidence: [],
      kuMappings: [],
    });
    expect(report.claimsCompletePrep).toBe(false);
    expect(report.forbiddenClaimCs).toBe(
      CERMAT_COMPLETE_PREP_CLAIM_FORBIDDEN_CS,
    );
    expect(report.summary.missingRequirements).toBe(9);
    expect(classifyRequirementStatus({ evidenceCount: 0, distinctSourceKinds: 0, hasDedicatedPractice: false })).toBe(
      "missing",
    );
    expect(classifyAreaStatus(["partial", "missing"])).toBe("partial");
  });
});
