#!/usr/bin/env npx tsx
/** CLI: npm run seed:najdi-nesmysl */

import { seedNajdiNesmysl } from "../src/server/najdi-nesmysl/seed";
import { nonsenseCategoryLabelsCs } from "../src/domain/learning/najdi-nesmysl";

async function main() {
  console.log("Seeding Najdi nesmysl…");
  const { pack, count } = await seedNajdiNesmysl();
  const byCat = pack.rounds.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\n=== Najdi nesmysl seed ===");
  console.log(`packs:  ${count}`);
  console.log(`slug:   ${pack.slug}`);
  console.log(`rounds: ${pack.rounds.length}`);
  console.log(
    `cats:   ${Object.entries(byCat)
      .map(([k, n]) => `${nonsenseCategoryLabelsCs[k as keyof typeof nonsenseCategoryLabelsCs]} ${n}`)
      .join(" · ")}`,
  );
  console.log("\nUI: /app/learn/najdi-nesmysl/cjl-nesmysl");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
