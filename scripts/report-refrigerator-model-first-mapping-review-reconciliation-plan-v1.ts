import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1 } from "./lib/refrigerator-model-first-mapping-review-reconciliation-plan-v1";
import { REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1 } from "./lib/refrigerator-model-first-batch-resolver-v1";

/**
 * Read-only mapping-review reconciliation plan JSON stdout.
 * jq proof (flat): `.inspect_summary`
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseManifestArg(): string {
  const idx = process.argv.indexOf("--manifest");
  if (idx === -1) return REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1;
  const value = process.argv[idx + 1];
  if (!value?.trim()) {
    throw new Error("Missing value for --manifest");
  }
  return value.trim();
}

function main(): void {
  const manifestRelPath = parseManifestArg();
  const report = buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
    rootDir,
    manifestRelPath,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
