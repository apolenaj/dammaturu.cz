#!/usr/bin/env npx tsx
/** CLI: npm run seed:kdo-jsem */

import { seedKdoJsem } from "../src/server/kdo-jsem/seed";

async function main() {
  console.log("Seeding Kdo jsem? (verified SOURCE only)…");
  const { pack, count } = await seedKdoJsem();
  console.log("\n=== Kdo jsem? seed ===");
  console.log(`packs:     ${count}`);
  console.log(`slug:      ${pack.slug}`);
  console.log(`title:     ${pack.title}`);
  console.log(`mysteries: ${pack.mysteries.map((m) => m.answerName).join(" · ")}`);
  console.log(`evidence:  ${Object.keys(pack.evidence).length} verified FINALs`);
  console.log("\nUI: /app/learn/kdo-jsem/literarni-osobnosti");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
