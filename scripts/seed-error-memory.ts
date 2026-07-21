/** CLI: npm run seed:error-memory */
import { seedErrorMemory } from "@/server/error-memory/seed";

async function main() {
  console.log("Seeding error memory (Moje chyby)…");
  const result = await seedErrorMemory();
  console.log(`
=== Error memory seed ===
learner: ${result.learnerId}
errors:  ${result.count}

UI: /app/mistakes
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
