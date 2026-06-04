#!/usr/bin/env node
/**
 * Read-only fridge safe-link batch factory — stdout JSON + draft writes.
 *
 *   npm run buckparts:fridge-safe-link-batch-factory
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFridgeSafeLinkBatchFactoryV1,
  writeFridgeSafeLinkBatchFactoryDraftsV1,
} from "./lib/fridge-safe-link-batch-factory-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildFridgeSafeLinkBatchFactoryV1({ rootDir: REPO_ROOT });
  const written = writeFridgeSafeLinkBatchFactoryDraftsV1({ rootDir: REPO_ROOT, report });
  process.stderr.write(
    `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only batch factory; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
