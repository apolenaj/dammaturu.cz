#!/usr/bin/env npx tsx
/** CLI: npm run seed:connection-map */

import { seedConnectionMap } from "../src/server/connection-map/seed";

async function main() {
  console.log("Seeding connection map…");
  const { pack, count } = await seedConnectionMap();
  console.log("\n=== Connection map seed ===");
  console.log(`packs:  ${count}`);
  console.log(`slug:   ${pack.slug}`);
  console.log(`title:  ${pack.title}`);
  console.log(`nodes:  ${pack.nodes.length}`);
  console.log(`edges:  ${pack.edges.length}`);
  console.log(`paths:  ${pack.paths.length}`);
  console.log(`roots:  ${pack.rootSlugs.join(" · ")}`);
  console.log("\nUI: /app/learn/mapa-souvislosti/literarni-souvislosti");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
