#!/usr/bin/env npx tsx
/**
 * CLI: npm run seed:lessons
 */

import { seedLessonEngine } from "../src/server/lesson-engine/seed";

async function main() {
  console.log("Seeding Lesson Engine…");
  const { lesson, count } = await seedLessonEngine();
  console.log("\n=== Lesson seed ===");
  console.log(`lessons: ${count}`);
  console.log(`slug:    ${lesson.slug}`);
  console.log(`title:   ${lesson.title}`);
  console.log(`blocks:  ${lesson.blocks.length}`);
  console.log(
    `types:   ${[...new Set(lesson.blocks.map((b) => b.type))].join(", ")}`,
  );
  console.log("\nArtifacts: data/lessons/");
  console.log("Player: /app/learn");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
