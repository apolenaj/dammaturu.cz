import {
  buildCoverageReport,
  renderCermatCoverageMarkdown,
  type CoverageEvidenceRow,
  type CermatCoverageReport,
} from "@/domain/cermat-curriculum/coverage";
import {
  mapCermatCategoryToRequirementIds,
  mapKnowledgeUnitToRequirementIds,
} from "@/domain/cermat-curriculum/ku-mapping";
import { CATALOG_DOCX_MANIFEST } from "@/domain/study-content/registry";
import { getStudyContentRegistry } from "@/server/study-content/registry";
import { buildCermatCjlPrepPack } from "@/server/cermat-prep/pack";

/**
 * Build CERMAT coverage report from live catalog KUs + CERMAT practice pack.
 */
export async function buildCermatCoverageReport(): Promise<CermatCoverageReport> {
  const registry = await getStudyContentRegistry();
  const catalog = registry.filter((e) =>
    CATALOG_DOCX_MANIFEST.some((m) => m.sourceId === e.sourceId),
  );

  const evidence: CoverageEvidenceRow[] = [];
  const kuMappings: CermatCoverageReport["kuMappings"] = [];

  for (const entry of catalog) {
    evidence.push({
      kind: "source",
      id: entry.sourceId,
      labelCs: entry.title,
      requirementIds: mapKnowledgeUnitToRequirementIds({
        knowledgeUnitId: `source:${entry.sourceId}`,
        title: entry.title,
        statement: entry.topic,
        sourceId: entry.sourceId,
        sourceTitle: entry.title,
        sourceTopic: entry.topic,
        laneHint: "catalog",
      }),
      sourceSupportingCs: `Moje materiály katalog · ${entry.title} (${entry.sourceId})`,
    });

    for (const ku of entry.knowledgeUnits) {
      const requirementIds = mapKnowledgeUnitToRequirementIds({
        knowledgeUnitId: ku.id,
        title: ku.title,
        statement: ku.statement,
        kind: ku.kind,
        topicSlug: ku.topicSlug,
        sourceId: entry.sourceId,
        sourceTitle: entry.title,
        sourceTopic: entry.topic,
        laneHint: "catalog",
      });
      kuMappings.push({
        knowledgeUnitId: ku.id,
        title: ku.title,
        sourceId: entry.sourceId,
        requirementIds,
      });
      if (requirementIds.length > 0) {
        evidence.push({
          kind: "knowledge_unit",
          id: ku.id,
          labelCs: ku.title,
          requirementIds,
          sourceSupportingCs: `KU · ${entry.title} · ${ku.title}`,
        });
      }
    }
  }

  const pack = buildCermatCjlPrepPack();
  for (const item of pack.items) {
    const requirementIds = mapCermatCategoryToRequirementIds(item.category);
    evidence.push({
      kind: "cermat_item",
      id: item.id,
      labelCs: item.stemCs.slice(0, 80),
      requirementIds,
      sourceSupportingCs: `CERMAT příprava pack · ${item.category} · ${item.id}`,
    });
  }

  evidence.push({
    kind: "note",
    id: "lane-separation",
    labelCs: "Oddělení produktových režimů",
    requirementIds: [],
    sourceSupportingCs:
      "Moje materiály ≠ CERMAT příprava; školní ústní materiály nepočítají jako pokrytí didaktického testu.",
  });

  return buildCoverageReport({ evidence, kuMappings });
}

export async function generateCermatCoverageMarkdown(): Promise<string> {
  const report = await buildCermatCoverageReport();
  return renderCermatCoverageMarkdown(report);
}
