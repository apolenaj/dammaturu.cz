#!/usr/bin/env npx tsx
/** CLI: npm run seed:quick-grasp */

import { computeQuickGraspStats } from "../src/domain/learning/quick-grasp";
import { seedQuickGrasp } from "../src/server/quick-grasp/seed";

async function main() {
  console.log("Seeding Rychle pochopit…");
  const { pack, count } = await seedQuickGrasp();
  const stats = computeQuickGraspStats(pack, null);
  console.log("\n=== Quick grasp seed ===");
  console.log(`packs: ${count}`);
  console.log(`slug:  ${pack.slug}`);
  console.log(`title: ${pack.title}`);
  console.log(`steps: ${pack.steps.length} (${stats.label})`);
  console.log(`time:  ${stats.remainingLabel} (full pack)`);
  for (const step of pack.steps) {
    if (step.type === "micro") {
      console.log(`  · micro  ${step.title} (~${Math.round(step.estimatedSeconds / 60)} min)`);
    } else {
      console.log(`  · CHECK  ${step.title} (${step.items.length} Q)`);
    }
  }
  console.log("\nUI: /app/learn/rychle/realismus");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
