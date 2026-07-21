#!/usr/bin/env npx tsx
/** CLI: npm run seed:question-engine */

import { seedQuestionEngine } from "../src/server/question-engine/seed";

async function main() {
  console.log("Seeding question engine…");
  const { pack, count } = await seedQuestionEngine();
  const kinds = [...new Set(pack.questions.map((q) => q.kind))];
  console.log("\n=== Question engine seed ===");
  console.log(`packs:     ${count}`);
  console.log(`slug:      ${pack.slug}`);
  console.log(`title:     ${pack.title}`);
  console.log(`questions: ${pack.questions.length}`);
  console.log(`kinds:     ${kinds.length} — ${kinds.join(", ")}`);
  console.log("\nUI: /app/tests/otazky/cjl-otazky");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
