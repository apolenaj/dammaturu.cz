import {
  CERMAT_CATALOG_CITATION,
  CERMAT_COMPLETE_PREP_CLAIM_FORBIDDEN_CS,
  CERMAT_CURRICULUM_ID,
  CERMAT_CURRICULUM_TITLE_CS,
  CERMAT_DIDACTIC_REQUIREMENTS,
  CERMAT_HONEST_SCOPE_CS,
  CERMAT_SCHOOL_YEAR,
  cermatCoverageAreaLabelsCs,
  cermatCoverageAreas,
  type CermatCoverageArea,
  type CermatDidacticRequirementId,
  productLaneHintsCs,
  productLaneLabelsCs,
} from "@/domain/cermat-curriculum/requirements";

export const coverageStatuses = [
  "covered",
  "partial",
  "missing",
] as const;

export type CoverageStatus = (typeof coverageStatuses)[number];

export const coverageStatusLabelsCs: Record<CoverageStatus, string> = {
  covered: "Covered",
  partial: "Partially covered",
  missing: "Missing",
};

export type CoverageEvidenceRow = {
  kind: "knowledge_unit" | "cermat_item" | "source" | "note";
  id: string;
  labelCs: string;
  requirementIds: CermatDidacticRequirementId[];
  sourceSupportingCs: string;
};

export type RequirementCoverageRow = {
  requirementId: CermatDidacticRequirementId;
  catalogCode: string;
  titleCs: string;
  coverageArea: CermatCoverageArea;
  status: CoverageStatus;
  evidenceCount: number;
  supportingSources: string[];
  notesCs: string[];
};

export type AreaCoverageRow = {
  area: CermatCoverageArea;
  labelCs: string;
  requirementIds: CermatDidacticRequirementId[];
  status: CoverageStatus;
  supportingSources: string[];
  notesCs: string[];
};

export type CermatCoverageReport = {
  curriculumId: typeof CERMAT_CURRICULUM_ID;
  titleCs: typeof CERMAT_CURRICULUM_TITLE_CS;
  schoolYear: typeof CERMAT_SCHOOL_YEAR;
  generatedAt: string;
  catalog: typeof CERMAT_CATALOG_CITATION;
  honestScopeCs: typeof CERMAT_HONEST_SCOPE_CS;
  claimsCompletePrep: false;
  forbiddenClaimCs: typeof CERMAT_COMPLETE_PREP_CLAIM_FORBIDDEN_CS;
  productLanes: {
    moje_materialy: { labelCs: string; hintCs: string };
    cermat_priprava: { labelCs: string; hintCs: string };
  };
  requirements: RequirementCoverageRow[];
  areas: AreaCoverageRow[];
  kuMappings: Array<{
    knowledgeUnitId: string;
    title: string;
    sourceId: string | null;
    requirementIds: CermatDidacticRequirementId[];
  }>;
  summary: {
    coveredRequirements: number;
    partialRequirements: number;
    missingRequirements: number;
    coveredAreas: number;
    partialAreas: number;
    missingAreas: number;
    mappedKnowledgeUnits: number;
    unmappedKnowledgeUnits: number;
    totalKnowledgeUnits: number;
  };
};

/**
 * Thresholds are intentionally strict. Prefer partial over false “covered”.
 * Dedicated CERMAT practice items are required for a “covered” verdict —
 * catalog literary DOCX alone must not claim full national didactic coverage.
 */
export function classifyRequirementStatus(input: {
  evidenceCount: number;
  distinctSourceKinds: number;
  hasDedicatedPractice: boolean;
}): CoverageStatus {
  if (input.evidenceCount <= 0) return "missing";
  if (
    input.hasDedicatedPractice &&
    input.evidenceCount >= 4 &&
    input.distinctSourceKinds >= 1
  ) {
    return "covered";
  }
  return "partial";
}

export function classifyAreaStatus(
  requirementStatuses: CoverageStatus[],
): CoverageStatus {
  if (requirementStatuses.length === 0) return "missing";
  if (requirementStatuses.every((s) => s === "covered")) return "covered";
  if (requirementStatuses.every((s) => s === "missing")) return "missing";
  return "partial";
}

export function buildCoverageReport(input: {
  generatedAt?: string;
  evidence: CoverageEvidenceRow[];
  kuMappings: CermatCoverageReport["kuMappings"];
}): CermatCoverageReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const byReq = new Map<
    CermatDidacticRequirementId,
    CoverageEvidenceRow[]
  >();
  for (const req of CERMAT_DIDACTIC_REQUIREMENTS) {
    byReq.set(req.id, []);
  }
  for (const row of input.evidence) {
    for (const id of row.requirementIds) {
      byReq.get(id)?.push(row);
    }
  }

  const requirements: RequirementCoverageRow[] =
    CERMAT_DIDACTIC_REQUIREMENTS.map((req) => {
      const rows = byReq.get(req.id) ?? [];
      const sources = [
        ...new Set(rows.map((r) => r.sourceSupportingCs).filter(Boolean)),
      ].slice(0, 12);
      const kinds = new Set(rows.map((r) => r.kind));
      const hasDedicatedPractice = rows.some(
        (r) => r.kind === "cermat_item",
      );
      const status = classifyRequirementStatus({
        evidenceCount: rows.length,
        distinctSourceKinds: kinds.size,
        hasDedicatedPractice,
      });
      const notesCs: string[] = [];
      if (status === "missing") {
        notesCs.push(
          "V produktu zatím není spolehlivá evidence vázaná na tento požadavek katalogu.",
        );
      } else if (status === "partial") {
        notesCs.push(
          "Existuje částečná cvičná / katalogová opora — nestačí na tvrzení o úplném pokrytí.",
        );
      }
      if (
        req.id === "cermat-cjl-dt-1.8" ||
        req.id === "cermat-cjl-dt-1.9"
      ) {
        notesCs.push(
          "Literární katalog ČJL v Moje materiály podporuje přehled směrů/děl, ale nenahrazuje školní ústní seznam ani oficiální CERMAT zadání.",
        );
      }
      return {
        requirementId: req.id,
        catalogCode: req.catalogCode,
        titleCs: req.titleCs,
        coverageArea: req.coverageArea,
        status,
        evidenceCount: rows.length,
        supportingSources: sources,
        notesCs,
      };
    });

  const areas: AreaCoverageRow[] = cermatCoverageAreas.map((area) => {
    const reqs = requirements.filter((r) => r.coverageArea === area);
    const status = classifyAreaStatus(reqs.map((r) => r.status));
    const supportingSources = [
      ...new Set(reqs.flatMap((r) => r.supportingSources)),
    ];
    const notesCs = [
      ...new Set(reqs.flatMap((r) => r.notesCs)),
    ];
    return {
      area,
      labelCs: cermatCoverageAreaLabelsCs[area],
      requirementIds: reqs.map((r) => r.requirementId),
      status,
      supportingSources,
      notesCs,
    };
  });

  const mapped = input.kuMappings.filter((k) => k.requirementIds.length > 0);
  const unmapped = input.kuMappings.filter((k) => k.requirementIds.length === 0);

  return {
    curriculumId: CERMAT_CURRICULUM_ID,
    titleCs: CERMAT_CURRICULUM_TITLE_CS,
    schoolYear: CERMAT_SCHOOL_YEAR,
    generatedAt,
    catalog: CERMAT_CATALOG_CITATION,
    honestScopeCs: CERMAT_HONEST_SCOPE_CS,
    claimsCompletePrep: false,
    forbiddenClaimCs: CERMAT_COMPLETE_PREP_CLAIM_FORBIDDEN_CS,
    productLanes: {
      moje_materialy: {
        labelCs: productLaneLabelsCs.moje_materialy,
        hintCs: productLaneHintsCs.moje_materialy,
      },
      cermat_priprava: {
        labelCs: productLaneLabelsCs.cermat_priprava,
        hintCs: productLaneHintsCs.cermat_priprava,
      },
    },
    requirements,
    areas,
    kuMappings: input.kuMappings,
    summary: {
      coveredRequirements: requirements.filter((r) => r.status === "covered")
        .length,
      partialRequirements: requirements.filter((r) => r.status === "partial")
        .length,
      missingRequirements: requirements.filter((r) => r.status === "missing")
        .length,
      coveredAreas: areas.filter((a) => a.status === "covered").length,
      partialAreas: areas.filter((a) => a.status === "partial").length,
      missingAreas: areas.filter((a) => a.status === "missing").length,
      mappedKnowledgeUnits: mapped.length,
      unmappedKnowledgeUnits: unmapped.length,
      totalKnowledgeUnits: input.kuMappings.length,
    },
  };
}

export function renderCermatCoverageMarkdown(
  report: CermatCoverageReport,
): string {
  const lines: string[] = [];
  lines.push(`# CERMAT coverage — ${report.titleCs}`);
  lines.push("");
  lines.push(`> Internal admin report. School year **${report.schoolYear}**.`);
  lines.push(`> Generated: \`${report.generatedAt}\``);
  lines.push(`> Curriculum id: \`${report.curriculumId}\``);
  lines.push("");
  lines.push("## Authority");
  lines.push("");
  lines.push(`- **${report.catalog.titleCs}**`);
  lines.push(
    `- Catalog valid from school year ${report.catalog.validFromSchoolYear}; applied for didactic test **${report.catalog.appliedSchoolYear}** (per CERMAT katalogy page).`,
  );
  lines.push(`- ${report.catalog.authority}, č. j. ${report.catalog.documentId}`);
  lines.push(`- Source: ${report.catalog.sourceUrl}`);
  lines.push(`- PDF: ${report.catalog.pdfUrl}`);
  lines.push(`- ${report.catalog.scopeNoteCs}`);
  lines.push("");
  lines.push("## Product lanes (do not mix)");
  lines.push("");
  lines.push(
    `| Lane | Label | Meaning |`,
  );
  lines.push(`| --- | --- | --- |`);
  lines.push(
    `| A | ${report.productLanes.moje_materialy.labelCs} | ${report.productLanes.moje_materialy.hintCs} |`,
  );
  lines.push(
    `| B | ${report.productLanes.cermat_priprava.labelCs} | ${report.productLanes.cermat_priprava.hintCs} |`,
  );
  lines.push("");
  lines.push("## Honest claim gate");
  lines.push("");
  lines.push(`- \`claimsCompletePrep\`: **${report.claimsCompletePrep}**`);
  lines.push(
    `- Forbidden student-facing phrase while gaps remain: „${report.forbiddenClaimCs}“`,
  );
  lines.push(`- Scope: ${report.honestScopeCs}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(
    `| Requirements covered | partial | missing | Areas covered | partial | missing |`,
  );
  lines.push(`| ---: | ---: | ---: | ---: | ---: | ---: |`);
  lines.push(
    `| ${report.summary.coveredRequirements} | ${report.summary.partialRequirements} | ${report.summary.missingRequirements} | ${report.summary.coveredAreas} | ${report.summary.partialAreas} | ${report.summary.missingAreas} |`,
  );
  lines.push("");
  lines.push(
    `Knowledge units mapped: **${report.summary.mappedKnowledgeUnits}** / ${report.summary.totalKnowledgeUnits} (unmapped: ${report.summary.unmappedKnowledgeUnits}).`,
  );
  lines.push("");
  lines.push("## Coverage matrix (areas)");
  lines.push("");
  lines.push(`| Area | Status | Official IDs | Supporting sources |`);
  lines.push(`| --- | --- | --- | --- |`);
  for (const area of report.areas) {
    lines.push(
      `| ${area.labelCs} | **${area.status}** | ${area.requirementIds.map((id) => `\`${id}\``).join(", ")} | ${area.supportingSources.length ? area.supportingSources.join("; ") : "—"} |`,
    );
  }
  lines.push("");
  lines.push("### Covered areas");
  const coveredAreas = report.areas.filter((a) => a.status === "covered");
  if (coveredAreas.length === 0) {
    lines.push("- _(none — do not claim complete CERMAT preparation)_");
  } else {
    for (const a of coveredAreas) {
      lines.push(`- **${a.labelCs}** — ${a.supportingSources.join("; ") || "see requirements"}`);
    }
  }
  lines.push("");
  lines.push("### Partially covered areas");
  for (const a of report.areas.filter((x) => x.status === "partial")) {
    lines.push(
      `- **${a.labelCs}** — ${a.notesCs[0] ?? "partial evidence"} Sources: ${a.supportingSources.join("; ") || "—"}`,
    );
  }
  lines.push("");
  lines.push("### Missing areas");
  const missingAreas = report.areas.filter((a) => a.status === "missing");
  if (missingAreas.length === 0) {
    lines.push("- _(none)_");
  } else {
    for (const a of missingAreas) {
      lines.push(`- **${a.labelCs}** — no reliable mapped evidence yet`);
    }
  }
  lines.push("");
  lines.push("## Official requirements (§1 didactic test)");
  lines.push("");
  lines.push(
    `| Code | Requirement | Area | Status | Evidence | Supporting sources |`,
  );
  lines.push(`| --- | --- | --- | --- | ---: | --- |`);
  for (const r of report.requirements) {
    lines.push(
      `| ${r.catalogCode} | ${r.titleCs} (\`${r.requirementId}\`) | ${cermatCoverageAreaLabelsCs[r.coverageArea]} | **${r.status}** | ${r.evidenceCount} | ${r.supportingSources.join("; ") || "—"} |`,
    );
  }
  lines.push("");
  lines.push("## Knowledge unit → requirement map");
  lines.push("");
  lines.push(
    `Every existing catalog KU is listed. Empty requirement list means mapped to **zero** official IDs (allowed).`,
  );
  lines.push("");
  const mappedCount = report.kuMappings.filter(
    (k) => k.requirementIds.length > 0,
  ).length;
  const unmappedCount = report.kuMappings.length - mappedCount;
  lines.push(
    `Mapped: ${mappedCount} · Unmapped: ${unmappedCount} · Total: ${report.kuMappings.length}`,
  );
  lines.push("");
  lines.push("<details>");
  lines.push("<summary>Full KU mapping table (click to expand)</summary>");
  lines.push("");
  lines.push(`| KU id | Title | Source | Requirement IDs |`);
  lines.push(`| --- | --- | --- | --- |`);
  for (const ku of report.kuMappings) {
    lines.push(
      `| \`${ku.knowledgeUnitId}\` | ${escapeMd(ku.title)} | \`${ku.sourceId ?? "—"}\` | ${ku.requirementIds.length ? ku.requirementIds.map((id) => `\`${id}\``).join(", ") : "_(none)_"} |`,
    );
  }
  lines.push("");
  lines.push("</details>");
  lines.push("");
  lines.push("## Notes for editors");
  lines.push("");
  lines.push(
    "1. School oral literature lists and student uploads are **Moje materiály / Profil maturity**, not CERMAT didactic coverage.",
  );
  lines.push(
    "2. Cvičné CERMAT items must keep provenance labels; never present as official past papers unless true.",
  );
  lines.push(
    "3. Re-run `npm run report:cermat-coverage` after adding content.",
  );
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 120);
}
