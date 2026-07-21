#!/usr/bin/env npx tsx
/** CLI: npm run seed:beta-telemetry */

import { seedBetaTelemetry } from "../src/server/beta-telemetry/seed";

async function main() {
  console.log("Seeding private beta telemetry…");
  const result = await seedBetaTelemetry({ reset: true });
  console.log(`
=== Beta telemetry seed ===
learnerKey: ${result.learnerKey}
events:     ${result.eventCount}

UI: /admin/analytics
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
