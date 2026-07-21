#!/usr/bin/env npx tsx
/** CLI: npm run seed:story-mode */

import { seedStoryMode } from "../src/server/story-mode/seed";

async function main() {
  console.log("Seeding Story Mode (verified facts only)…");
  const { pack, count } = await seedStoryMode();
  console.log("\n=== Story Mode seed ===");
  console.log(`packs:    ${count}`);
  console.log(`slug:     ${pack.slug}`);
  console.log(`title:    ${pack.title}`);
  console.log(`beats:    ${pack.beats.length}`);
  console.log(`evidence: ${Object.keys(pack.evidence).length} verified FINALs`);
  for (const beat of pack.beats) {
    console.log(`  · ${beat.type.padEnd(16)} ${beat.title}`);
  }
  console.log("\nUI: /app/learn/pribeh/narodni-obrozeni");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
