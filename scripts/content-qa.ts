#!/usr/bin/env npx tsx
/**
 * CLI: npm run content-qa
 * Scans ingested KU proposals → QA items with auto flags.
 * Never auto-verifies or auto-corrects facts.
 */

import { runContentQaPipeline } from "../src/server/content-qa/pipeline";
import { listQaItems } from "../src/server/content-qa/store";

async function main() {
  console.log("Starting content QA pipeline…");
  const result = await runContentQaPipeline({ actor: "cli" });

  console.log("\n=== Content QA result ===");
  console.log(`runId:               ${result.runId}`);
  console.log(`scanned:             ${result.scanned}`);
  console.log(`created:             ${result.created}`);
  console.log(`updated:             ${result.updated}`);
  console.log(`flagged (auto):      ${result.flagged}`);
  console.log(`clean → expert:      ${result.cleanPendingReview}`);

  const items = await listQaItems();
  const byStatus = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.validationStatus] = (acc[item.validationStatus] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\nBy status:");
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`  ${status}: ${count}`);
  }

  const suspicious = items.filter((i) =>
    i.flags.some(
      (f) =>
        f.code === "death_before_birth" ||
        f.code === "impossible_chronology" ||
        f.code === "conflicting_data" ||
        f.code === "similar_entity_conflict" ||
        f.code === "duplicate_statement",
    ),
  );

  if (suspicious.length) {
    console.log(`\nSuspicious (${suspicious.length}):`);
    for (const item of suspicious.slice(0, 25)) {
      const codes = item.flags.map((f) => f.code).join(", ");
      console.log(`  - ${item.title}: ${codes}`);
      console.log(`    SOURCE: ${item.sourceStatement.slice(0, 120)}`);
    }
  }

  console.log("\nArtifacts: data/content-qa/");
  console.log("Admin: /admin/reviews");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
