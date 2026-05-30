import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRefrigeratorModelFirstBatchResolverV1 } from "./lib/refrigerator-model-first-batch-resolver-v1";

/**
 * Read-only refrigerator model-first batch resolver JSON stdout.
 * jq proof (flat): `.inspect_summary`
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_MANIFEST_REL =
  "data/fridge/batch-production/model-first-input-v1/fridge-models-batch-v1.json";

function parseManifestArg(): string {
  const idx = process.argv.indexOf("--manifest");
  if (idx === -1) return DEFAULT_MANIFEST_REL;
  const value = process.argv[idx + 1];
  if (!value?.trim()) {
    throw new Error("Missing value for --manifest");
  }
  return value.trim();
}

function main(): void {
  const manifestRelPath = parseManifestArg();
  const report = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir,
    manifestRelPath,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
