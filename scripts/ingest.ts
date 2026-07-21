#!/usr/bin/env npx tsx
/**
 * CLI: npm run ingest
 * Options:
 *   --file "Máj.docx"   only one file
 *   --dry-discover      list discovered files without ingest
 */

import path from "node:path";
import { discoverSourceDocuments } from "../src/server/ingestion/discover";
import { runIngestionPipeline } from "../src/server/ingestion/pipeline";

async function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  const onlyFilename =
    fileIdx >= 0 && args[fileIdx + 1] ? args[fileIdx + 1] : undefined;
  const dryDiscover = args.includes("--dry-discover");

  if (dryDiscover) {
    const docs = await discoverSourceDocuments();
    console.log(`Discovered ${docs.length} file(s) in content/source-materials:\n`);
    for (const d of docs) {
      const mark = d.allowed ? "OK " : "NO ";
      console.log(
        `  [${mark}] ${d.filename}${d.rejectReason ? ` — ${d.rejectReason}` : ""}`,
      );
    }
    return;
  }

  console.log("Starting matura DOCX ingestion…");
  console.log(`cwd: ${process.cwd()}`);
  console.log(`sources: ${path.join("content", "source-materials")}`);
  if (onlyFilename) console.log(`filter: ${onlyFilename}`);

  const result = await runIngestionPipeline({
    actor: "cli",
    onlyFilename,
  });

  console.log("\n=== Ingestion result ===");
  console.log(`runId:      ${result.runId}`);
  console.log(`discovered: ${result.discovered}`);
  console.log(`imported:   ${result.imported}`);
  console.log(`updated:    ${result.updated}`);
  console.log(`unchanged:  ${result.unchanged}`);
  console.log(`rejected:   ${result.skippedNotAllowed}`);
  console.log(`failed:     ${result.failed}`);

  if (result.rejected.length) {
    console.log("\nRejected:");
    for (const r of result.rejected) {
      console.log(`  - ${r.filename}: ${r.reason}`);
    }
  }

  if (result.errors.length) {
    console.log("\nErrors:");
    for (const e of result.errors) {
      console.log(`  - ${e.filename}: ${e.error}`);
    }
    process.exitCode = 1;
  }

  console.log("\nDocuments (pipelineStatus=needs_review):");
  for (const d of result.documents) {
    console.log(
      `  - ${d.filename}: chunks=${d.chunks.length}, topics=${d.topics.length}, kus=${d.knowledgeUnits.length}, v${d.version}`,
    );
  }

  console.log("\nArtifacts: data/ingestion/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
