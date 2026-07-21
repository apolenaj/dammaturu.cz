#!/usr/bin/env npx tsx
/**
 * CLI: npm run seed:curriculum
 * Materializes ČJL BETA into data/curriculum/ (+ Postgres if DATABASE_URL).
 */

import { getTopicDependencyGraph } from "../src/server/curriculum/build";
import { seedCjlBetaCurriculum } from "../src/server/curriculum/seed";

async function main() {
  console.log("Seeding curriculum: Český jazyk a literatura – BETA…");
  const { pack, storage } = await seedCjlBetaCurriculum();

  const topicCount = pack.modules.reduce((n, m) => n + m.topics.length, 0);
  console.log("\n=== Curriculum seed ===");
  console.log(`storage:     ${storage}`);
  console.log(`subject:     ${pack.subject.title} (${pack.subject.slug})`);
  console.log(`curriculum:  ${pack.curriculum.title}`);
  console.log(`modules:     ${pack.modules.length}`);
  console.log(`topics:      ${topicCount}`);
  console.log(`dep edges:   ${pack.topicPrerequisites.length}`);

  console.log("\nModules:");
  for (const mod of pack.modules) {
    console.log(`  ${mod.code}. ${mod.title} (${mod.topics.length} topics)`);
    for (const t of mod.topics) {
      const deps =
        t.prerequisiteSlugs.length > 0
          ? ` ← ${t.prerequisiteSlugs.join(", ")}`
          : "";
      console.log(`     - ${t.slug}${deps}`);
    }
  }

  const graph = getTopicDependencyGraph(pack);
  const roots = graph.filter((n) => n.prerequisiteTopicIds.length === 0);
  console.log(`\nGraph roots (no prereqs): ${roots.map((r) => r.slug).join(", ")}`);
  console.log("\nArtifacts: data/curriculum/cjl-beta.json");
  console.log("Admin/App: /admin/content · /app/topics");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
