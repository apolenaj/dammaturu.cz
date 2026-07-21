import { buildCurriculumPack } from "@/server/curriculum/build";
import { cjlBetaDefinition } from "@/server/curriculum/definitions/cjl-beta";
import { saveCurriculumPack } from "@/server/curriculum/store";
import type { CurriculumPack } from "@/server/curriculum/types";
import { track } from "@/lib/analytics";

export type SeedCurriculumResult = {
  pack: CurriculumPack;
  /** Always writes DB-shaped JSON. Postgres when DATABASE_URL + migrations applied. */
  storage: "file" | "postgres+file";
};

/**
 * Seed CJL beta into curriculum store (DB-shaped documents).
 * UI must read via repository — never hardcode modules/topics.
 *
 * When `DATABASE_URL` is set, also upserts into Postgres (requires 0001 + 0002).
 */
export async function seedCjlBetaCurriculum(): Promise<SeedCurriculumResult> {
  const pack = buildCurriculumPack(cjlBetaDefinition);
  await saveCurriculumPack(pack);

  let storage: SeedCurriculumResult["storage"] = "file";

  if (process.env.DATABASE_URL) {
    try {
      await syncPackToPostgres(pack);
      storage = "postgres+file";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[curriculum] Postgres sync skipped/failed (file store OK): ${message}`,
      );
    }
  }

  track("curriculum_seeded", {
    slug: pack.curriculum.slug,
    modules: pack.modules.length,
    topics: pack.modules.reduce((n, m) => n + m.topics.length, 0),
    edges: pack.topicPrerequisites.length,
    storage,
  });

  return { pack, storage };
}

async function syncPackToPostgres(pack: CurriculumPack): Promise<void> {
  const { createDb } = await import("@/db/client");
  const { inArray } = await import("drizzle-orm");
  const {
    curricula,
    modules,
    subjects,
    topicPrerequisites,
    topics,
  } = await import("@/db/schema");

  const db = createDb();

  await db
    .insert(subjects)
    .values({
      id: pack.subject.id,
      slug: pack.subject.slug,
      title: pack.subject.title,
      description: pack.subject.description,
      status: pack.subject.status,
    })
    .onConflictDoUpdate({
      target: subjects.slug,
      set: {
        title: pack.subject.title,
        description: pack.subject.description,
        status: pack.subject.status,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(curricula)
    .values({
      id: pack.curriculum.id,
      subjectId: pack.subject.id,
      slug: pack.curriculum.slug,
      title: pack.curriculum.title,
      description: pack.curriculum.description,
      targetExam: pack.curriculum.targetExam,
      status: pack.curriculum.status,
      version: pack.curriculum.version,
    })
    .onConflictDoUpdate({
      target: [curricula.subjectId, curricula.slug],
      set: {
        title: pack.curriculum.title,
        description: pack.curriculum.description,
        targetExam: pack.curriculum.targetExam,
        status: pack.curriculum.status,
        version: pack.curriculum.version,
        updatedAt: new Date(),
      },
    });

  for (const mod of pack.modules) {
    await db
      .insert(modules)
      .values({
        id: mod.id,
        curriculumId: mod.curriculumId,
        slug: mod.slug,
        code: mod.code,
        title: mod.title,
        summary: mod.summary,
        orderIndex: mod.orderIndex,
        status: mod.status,
      })
      .onConflictDoUpdate({
        target: [modules.curriculumId, modules.slug],
        set: {
          code: mod.code,
          title: mod.title,
          summary: mod.summary,
          orderIndex: mod.orderIndex,
          status: mod.status,
          updatedAt: new Date(),
        },
      });

    for (const topic of mod.topics) {
      await db
        .insert(topics)
        .values({
          id: topic.id,
          curriculumId: topic.curriculumId,
          moduleId: topic.moduleId,
          slug: topic.slug,
          title: topic.title,
          summary: topic.summary,
          orderIndex: topic.orderIndex,
          examRelevance: topic.examRelevance,
          status: topic.status,
          sourceFilenames: topic.sourceFilenames,
        })
        .onConflictDoUpdate({
          target: [topics.curriculumId, topics.slug],
          set: {
            moduleId: topic.moduleId,
            title: topic.title,
            summary: topic.summary,
            orderIndex: topic.orderIndex,
            examRelevance: topic.examRelevance,
            status: topic.status,
            sourceFilenames: topic.sourceFilenames,
            updatedAt: new Date(),
          },
        });
    }
  }

  const topicIds = pack.modules.flatMap((m) => m.topics.map((t) => t.id));
  if (topicIds.length) {
    await db
      .delete(topicPrerequisites)
      .where(inArray(topicPrerequisites.topicId, topicIds));
    if (pack.topicPrerequisites.length) {
      await db.insert(topicPrerequisites).values(pack.topicPrerequisites);
    }
  }
}
