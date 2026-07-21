/** CLI intentionally refuses fake data — Moje chyby is real-mistakes only. */
import { seedErrorMemory } from "@/server/error-memory/seed";

async function main() {
  console.error(
    "Seed chyb je vypnutý. Moje chyby ukládá jen skutečné odpovědi studenta.",
  );
  await seedErrorMemory();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
