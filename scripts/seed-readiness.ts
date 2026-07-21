#!/usr/bin/env npx tsx
/** CLI: npm run seed:readiness */

import { seedReadiness } from "../src/server/readiness/seed";

async function main() {
  console.log("Seeding readiness (Připravenost)…");
  const result = await seedReadiness();
  console.log(`
=== Readiness seed ===
learner: ${result.learnerId}
units:   ${result.unitCount}
overall: ${result.overallPct} %

UI: /app/progress
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
