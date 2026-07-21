#!/usr/bin/env npx tsx
/** CLI: npm run seed:match-arena */

import { seedMatchArena } from "../src/server/match-arena/seed";

async function main() {
  console.log("Seeding Match Arena…");
  const { pack, count } = await seedMatchArena();
  console.log("\n=== Match Arena seed ===");
  console.log(`packs:  ${count}`);
  console.log(`slug:   ${pack.slug}`);
  console.log(`title:  ${pack.title}`);
  console.log(`pairs:  ${pack.pairs.length}`);
  console.log(`rounds: ${pack.rounds.map((r) => r.title).join(" · ")}`);
  console.log("\nUI: /app/learn/match-arena/literarni-pary");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
