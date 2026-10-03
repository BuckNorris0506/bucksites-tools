/**
 * Executive Runtime Worker Registry v1 CLI.
 * Stdout JSON only (see docs/BuckParts-JSON-STDOUT-CONTRACT.md).
 * Observe-only projection. Does not dispatch, write, schedule, or create ODRs.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildExecutiveRuntimeWorkerRegistryV1,
  workerRegistrySucceededV1,
} from "./lib/buckparts-executive-runtime-worker-registry-v1";

export function main(rootDir = process.cwd()): void {
  const snapshot = buildExecutiveRuntimeWorkerRegistryV1({ rootDir });
  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
  if (!workerRegistrySucceededV1(snapshot)) process.exitCode = 1;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  try {
    main();
  } catch (error) {
    console.error("[executive-runtime-worker-registry-v1] failed", error);
    process.exit(1);
  }
}
