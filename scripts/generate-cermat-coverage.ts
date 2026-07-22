/**
 * Generate admin report CERMAT_COVERAGE.md from live catalog + CERMAT pack.
 * Usage: npm run report:cermat-coverage
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { generateCermatCoverageMarkdown } from "../src/server/cermat-curriculum/build-coverage";

async function main() {
  const md = await generateCermatCoverageMarkdown();
  const out = path.join(process.cwd(), "CERMAT_COVERAGE.md");
  await fs.writeFile(out, md, "utf8");
  console.log(`Wrote ${out} (${md.length} chars)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
