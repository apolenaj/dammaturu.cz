/** CLI: npm run seed:learning-analytics */
import { seedLearningAnalytics } from "../src/server/learning-analytics/seed";

async function main() {
  const result = await seedLearningAnalytics({ reset: true });
  console.log(
    `Seeded ${result.eventCount} learning analytics events for ${result.learnerKey}`,
  );
  console.log("UI: /admin/analytics");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
