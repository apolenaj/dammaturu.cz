#!/usr/bin/env npx tsx
/** CLI: npm run seed:spaced-repetition */

import { seedSpacedRepetition } from "../src/server/spaced-repetition/seed";

async function main() {
  console.log("Seeding spaced repetition pack…");
  const { pack, count } = await seedSpacedRepetition();
  console.log("\n=== Spaced repetition seed ===");
  console.log(`packs:     ${count}`);
  console.log(`slug:      ${pack.slug}`);
  console.log(`knowledge: ${pack.knowledge.length}`);
  console.log("\nUI: /app/review/mixed · Dashboard due CTA");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
