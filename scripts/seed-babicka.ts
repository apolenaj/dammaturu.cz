#!/usr/bin/env tsx
/** CLI: npm run seed:babicka */
import { seedBabickaExperience } from "../src/server/babicka-experience/seed";

async function main() {
  const result = await seedBabickaExperience();
  console.log(
    `Babička experience seeded: ${result.kuCount} KU, ${result.activityCount} activities`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
