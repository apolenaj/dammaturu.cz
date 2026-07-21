import { deterministicUuid } from "@/server/curriculum/ids";
import {
  curriculumDefinitionSchema,
  curriculumPackSchema,
  type CurriculumDefinition,
  type CurriculumPack,
} from "@/server/curriculum/types";

const NS = "dammaturu.curriculum";

/**
 * Materialize a curriculum definition into a validated pack with stable IDs
 * and resolved topic dependency edges.
 */
export function buildCurriculumPack(
  definition: CurriculumDefinition,
  seededAt = new Date().toISOString(),
): CurriculumPack {
  const def = curriculumDefinitionSchema.parse(definition);
  const subjectId = deterministicUuid(NS, `subject:${def.subject.slug}`);
  const curriculumId = deterministicUuid(
    NS,
    `curriculum:${def.subject.slug}:${def.curriculum.slug}`,
  );

  const topicIdBySlug = new Map<string, string>();
  for (const mod of def.modules) {
    for (const topic of mod.topics) {
      if (topicIdBySlug.has(topic.slug)) {
        throw new Error(`Duplicitní topic slug: ${topic.slug}`);
      }
      topicIdBySlug.set(
        topic.slug,
        deterministicUuid(NS, `topic:${def.curriculum.slug}:${topic.slug}`),
      );
    }
  }

  const modules = def.modules.map((mod) => {
    const moduleId = deterministicUuid(
      NS,
      `module:${def.curriculum.slug}:${mod.slug}`,
    );
    return {
      id: moduleId,
      curriculumId,
      slug: mod.slug,
      code: mod.code,
      title: mod.title,
      summary: mod.summary,
      orderIndex: mod.orderIndex,
      status: mod.status,
      topics: mod.topics.map((topic) => {
        const topicId = topicIdBySlug.get(topic.slug)!;
        for (const pre of topic.prerequisiteSlugs) {
          if (!topicIdBySlug.has(pre)) {
            throw new Error(
              `Topic ${topic.slug} odkazuje na neznámý prerequisite ${pre}`,
            );
          }
        }
        return {
          id: topicId,
          curriculumId,
          moduleId,
          slug: topic.slug,
          title: topic.title,
          summary: topic.summary,
          orderIndex: topic.orderIndex,
          examRelevance: topic.examRelevance,
          status: topic.status,
          sourceFilenames: topic.sourceFilenames,
          prerequisiteSlugs: topic.prerequisiteSlugs,
        };
      }),
    };
  });

  const topicPrerequisites = modules.flatMap((mod) =>
    mod.topics.flatMap((topic) =>
      topic.prerequisiteSlugs.map((preSlug) => ({
        topicId: topic.id,
        prerequisiteTopicId: topicIdBySlug.get(preSlug)!,
      })),
    ),
  );

  // Cycle check (Kahn)
  const indegree = new Map<string, number>();
  const edges = new Map<string, string[]>();
  for (const id of topicIdBySlug.values()) {
    indegree.set(id, 0);
    edges.set(id, []);
  }
  for (const e of topicPrerequisites) {
    edges.get(e.prerequisiteTopicId)!.push(e.topicId);
    indegree.set(e.topicId, (indegree.get(e.topicId) ?? 0) + 1);
  }
  const queue = [...indegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([id]) => id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift()!;
    visited += 1;
    for (const next of edges.get(id) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  if (visited !== topicIdBySlug.size) {
    throw new Error("Topic dependency graph obsahuje cyklus.");
  }

  const pack = {
    subject: {
      id: subjectId,
      slug: def.subject.slug,
      title: def.subject.title,
      description: def.subject.description,
      status: def.subject.status,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
    curriculum: {
      id: curriculumId,
      subjectId,
      slug: def.curriculum.slug,
      title: def.curriculum.title,
      description: def.curriculum.description,
      targetExam: def.curriculum.targetExam,
      status: def.curriculum.status,
      version: def.curriculum.version,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
    modules,
    topicPrerequisites,
    seededAt,
    definitionVersion: def.definitionVersion,
  };

  return curriculumPackSchema.parse(pack);
}

/** Flat list of topics with prerequisite topic IDs for graph views. */
export function getTopicDependencyGraph(pack: CurriculumPack): Array<{
  topicId: string;
  slug: string;
  title: string;
  moduleCode: string;
  prerequisiteTopicIds: string[];
}> {
  const prereqMap = new Map<string, string[]>();
  for (const e of pack.topicPrerequisites) {
    const list = prereqMap.get(e.topicId) ?? [];
    list.push(e.prerequisiteTopicId);
    prereqMap.set(e.topicId, list);
  }
  return pack.modules.flatMap((mod) =>
    mod.topics.map((t) => ({
      topicId: t.id,
      slug: t.slug,
      title: t.title,
      moduleCode: mod.code,
      prerequisiteTopicIds: prereqMap.get(t.id) ?? [],
    })),
  );
}
