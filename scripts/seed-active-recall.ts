#!/usr/bin/env npx tsx
/** CLI: npm run seed:active-recall */

import { seedActiveRecall } from "../src/server/active-recall/seed";

async function main() {
  console.log("Seeding active recall…");
  const { pack, count } = await seedActiveRecall();
  console.log("\n=== Active recall seed ===");
  console.log(`packs:   ${count}`);
  console.log(`slug:    ${pack.slug}`);
  console.log(`title:   ${pack.title}`);
  console.log(`prompts: ${pack.prompts.length}`);
  console.log(
    `KUs:     ${pack.prompts.reduce((n, p) => n + p.keyPoints.length, 0)}`,
  );
  console.log("\nUI: /app/learn/vybavovani/literarni-vybavovani");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
