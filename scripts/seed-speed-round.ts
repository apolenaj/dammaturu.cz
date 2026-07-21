#!/usr/bin/env npx tsx
/** CLI: npm run seed:speed-round */

import { seedSpeedRound } from "../src/server/speed-round/seed";
import { speedQuestionKindLabelsCs } from "../src/domain/learning/speed-round";

async function main() {
  console.log("Seeding Speed Round…");
  const { pack, count } = await seedSpeedRound();
  const byKind = pack.questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.kind] = (acc[q.kind] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\n=== Speed Round seed ===");
  console.log(`packs:     ${count}`);
  console.log(`slug:      ${pack.slug}`);
  console.log(`questions: ${pack.questions.length}`);
  console.log(`duration:  ${pack.durationMs / 1000}s`);
  console.log(
    `kinds:     ${Object.entries(byKind)
      .map(
        ([k, n]) =>
          `${speedQuestionKindLabelsCs[k as keyof typeof speedQuestionKindLabelsCs]} ${n}`,
      )
      .join(" · ")}`,
  );
  console.log("\nUI: /app/learn/speed-round/cjl-speed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
