import path from "node:path";
import { fileURLToPath } from "node:url";

import { REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1 } from "./lib/refrigerator-model-first-batch-resolver-v1";
import {
  REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_APPROVAL_PHRASE_V1,
  runRefrigeratorModelFirstCompatApplyExecutorV1,
} from "./lib/refrigerator-model-first-mapping-review-compat-apply-executor-v1";

/**
 * Apply approved refrigerator QA compatibility_mappings.csv cleanup (20-model batch only).
 *
 * Dry run (default):
 *   npx tsx scripts/apply-refrigerator-model-first-mapping-review-compat-v1.ts
 *
 * Apply (requires exact approval phrase via --approval or APPROVAL env):
 *   APPROVAL="I approve the refrigerator QA compatibility cleanup for the 20-model batch only" \
 *     npx tsx scripts/apply-refrigerator-model-first-mapping-review-compat-v1.ts --apply
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseManifestArg(): string {
  const idx = process.argv.indexOf("--manifest");
  if (idx === -1) return REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1;
  const value = process.argv[idx + 1];
  if (!value?.trim()) throw new Error("Missing value for --manifest");
  return value.trim();
}

function parseApprovalPhrase(): string | null {
  const idx = process.argv.indexOf("--approval");
  if (idx !== -1) {
    const value = process.argv[idx + 1];
    if (!value?.trim()) throw new Error("Missing value for --approval");
    return value.trim();
  }
  return process.env.APPROVAL?.trim() ?? null;
}

function main(): void {
  const manifestRelPath = parseManifestArg();
  const apply = process.argv.includes("--apply");
  const approvalPhrase = parseApprovalPhrase();

  const result = runRefrigeratorModelFirstCompatApplyExecutorV1({
    rootDir,
    manifestRelPath,
    mode: apply ? "apply" : "dry_run",
    approvalPhrase,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (result.apply_status === "BLOCKED") {
    process.exit(1);
  }
}

main();
