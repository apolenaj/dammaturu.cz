#!/usr/bin/env tsx
/** CLI: npm run seed:maj */
import { seedMajExamPrep } from "../src/server/maj-exam-prep/seed";

async function main() {
  const result = await seedMajExamPrep();
  console.log(
    `Máj exam prep seeded: ${result.kuCount} KU, ${result.activityCount} activities`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
