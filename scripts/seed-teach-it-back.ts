#!/usr/bin/env npx tsx
/** CLI: npm run seed:teach-it-back */

import { seedTeachItBack } from "../src/server/teach-it-back/seed";

async function main() {
  console.log("Seeding Teach It Back…");
  const { pack, count } = await seedTeachItBack();
  console.log("\n=== Teach It Back seed ===");
  console.log(`packs:   ${count}`);
  console.log(`slug:    ${pack.slug}`);
  console.log(`title:   ${pack.title}`);
  console.log(`prompts: ${pack.prompts.length}`);
  console.log(
    `checklist items: ${pack.prompts.reduce((n, p) => n + p.checklist.length, 0)}`,
  );
  console.log("\nUI: /app/learn/nauc-zpatky/cjl-teach-back");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
