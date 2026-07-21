#!/usr/bin/env npx tsx
/** CLI: npm run seed:timeline */

import { seedTimeline } from "../src/server/timeline/seed";

async function main() {
  console.log("Seeding interactive timeline…");
  const { pack, count } = await seedTimeline();
  console.log("\n=== Timeline seed ===");
  console.log(`packs:  ${count}`);
  console.log(`slug:   ${pack.slug}`);
  console.log(`title:  ${pack.title}`);
  console.log(`events: ${pack.events.length}`);
  console.log(`zooms:  ${pack.zoomPresets.map((z) => z.label).join(" · ")}`);
  console.log("\nUI: /app/learn/casova-osa/literarni-historie");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
