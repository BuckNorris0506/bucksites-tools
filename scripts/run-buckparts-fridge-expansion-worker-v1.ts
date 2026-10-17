/**
 * Fridge Expansion Worker v1 CLI.
 * Stdout JSON only (see docs/BuckParts-JSON-STDOUT-CONTRACT.md).
 * Sequences existing fridge generators for one unregistered proven model, then stops.
 * Does not dispatch, apply, or mutate production CSVs.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFridgeExpansionWorkerV1,
  fridgeExpansionWorkerSucceededV1,
} from "./lib/buckparts-fridge-expansion-worker-v1";

export async function main(rootDir = process.cwd()): Promise<void> {
  const snapshot = await buildFridgeExpansionWorkerV1({
    rootDir,
    writeArtifacts: process.argv.includes("--write-artifacts"),
    skipTests: process.argv.includes("--skip-tests"),
  });
  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
  if (!fridgeExpansionWorkerSucceededV1(snapshot)) process.exitCode = 1;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error("[fridge-expansion-worker-v1] failed", error);
    process.exit(1);
  });
}
