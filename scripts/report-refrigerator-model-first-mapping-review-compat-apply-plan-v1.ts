import path from "node:path";
import { fileURLToPath } from "node:url";

import { REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1 } from "./lib/refrigerator-model-first-batch-resolver-v1";
import { buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1 } from "./lib/refrigerator-model-first-mapping-review-compat-apply-plan-v1";

/**
 * Read-only approval-gated compat apply plan JSON stdout.
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
  const plan = buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1({
    rootDir,
    manifestRelPath,
  });
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

main();
