#!/usr/bin/env npx tsx
/** CLI: npm run seed:kytice */

import { seedKyticeExperience } from "../src/server/kytice-experience/seed";
import { seedStoryReconstruction } from "../src/server/story-reconstruction/seed";

async function main() {
  console.log("Re-seeding story reconstruction (incl. Polednice + Poklad)…");
  await seedStoryReconstruction();
  console.log("Seeding Kytice experience…");
  const result = await seedKyticeExperience();
  console.log(`
=== Kytice experience ===
ballads:   ${result.balladCount}
recognize: ${result.gameCounts.recognize}
match:     ${result.gameCounts.match}
which:     ${result.gameCounts.which}

UI: /app/learn/kytice
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
