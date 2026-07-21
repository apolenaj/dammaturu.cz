#!/usr/bin/env npx tsx
/** CLI: npm run seed:literary-works */

import { seedLiteraryWorks } from "../src/server/literary-work/seed";

async function main() {
  console.log("Seeding literary works (Máj, Kytice, Babička)…");
  const result = await seedLiteraryWorks();
  console.log(`
=== Literary works seed ===
count: ${result.count}
slugs: ${result.slugs.join(", ")}

UI: /app/learn/dilo
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
