#!/usr/bin/env npx tsx
/** CLI: npm run seed:story-reconstruction */

import { seedStoryReconstruction } from "../src/server/story-reconstruction/seed";

async function main() {
  console.log("Seeding Story Reconstruction (verified SOURCE only)…");
  const { pack, count } = await seedStoryReconstruction();
  console.log("\n=== Story Reconstruction seed ===");
  console.log(`packs:    ${count}`);
  console.log(`slug:     ${pack.slug}`);
  console.log(`title:    ${pack.title}`);
  console.log(
    `stories:  ${pack.stories.map((s) => s.workTitle).join(" · ")}`,
  );
  console.log(`evidence: ${Object.keys(pack.evidence).length} verified FINALs`);
  console.log("\nUI: /app/learn/rekonstrukce-pribehu/literarni-dej");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
