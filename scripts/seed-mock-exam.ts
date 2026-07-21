#!/usr/bin/env tsx
/** CLI: npm run seed:mock-exam */
import { seedMockExam } from "../src/server/mock-exam/seed";

async function main() {
  const result = await seedMockExam();
  console.log(`Zkouška nanečisto seeded: ${result.topicCount} topics`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
