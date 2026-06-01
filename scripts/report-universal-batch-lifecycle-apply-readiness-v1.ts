/**
 * Universal batch lifecycle apply-readiness discovery — stdout JSON only (read-only).
 *
 *   npm run buckparts:universal-batch-lifecycle-apply-readiness
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildUniversalBatchLifecycleApplyReadinessV1 } from "./lib/universal-batch-lifecycle-apply-readiness-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildUniversalBatchLifecycleApplyReadinessV1({
    rootDir: REPO_ROOT,
    now: () => new Date(),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
