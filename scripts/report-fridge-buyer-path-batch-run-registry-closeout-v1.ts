/**
 * Owner-authorized fridge buyer-path batch run-registry closeout.
 *
 * Dry-run (assessment only, no disk write):
 *   npm run buckparts:fridge-buyer-path-batch-run-registry-closeout -- --run-id fridge-buyer-path-batch-run-v1-0fec4a7b623a
 *
 * Owner-confirmed write:
 *   npm run buckparts:fridge-buyer-path-batch-run-registry-closeout -- --owner-confirm-closeout --run-id fridge-buyer-path-batch-run-v1-0fec4a7b623a --registry-out data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessFridgeBuyerPathBatchRunRegistryCloseoutV1,
  FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1,
  parseFridgeCloseoutWriterCliArgsV1,
} from "./lib/fridge-buyer-path-batch-run-registry-closeout-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const cli = parseFridgeCloseoutWriterCliArgsV1(process.argv.slice(2));
  const assessment = assessFridgeBuyerPathBatchRunRegistryCloseoutV1({
    rootDir: REPO_ROOT,
    cli,
  });

  const payload: Record<string, unknown> = {
    ...assessment,
    recommended_next_action: assessment.would_write
      ? `Closeout registry written to ${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1}. Verify with npm run buckparts:batch-run-registry-intake and npm run buckparts:command-center.`
      : assessment.closeout_ready
        ? `Closeout preconditions PROVEN. Re-run with ${"--owner-confirm-closeout"} --run-id <run_id> --registry-out ${FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1} to record closeout on disk.`
        : `Closeout BLOCKED (${String(assessment.blockers.length)} blockers). No registry write.`,
  };

  if (assessment.would_write && assessment.closed_doc) {
    const abs = path.join(REPO_ROOT, FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(assessment.closed_doc, null, 2)}\n`, "utf8");
    payload.registry_written = true;
    payload.registry_out = FRIDGE_BUYER_PATH_BATCH_CLOSEOUT_CANONICAL_REGISTRY_REL_V1;
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  if (!assessment.closeout_ready) {
    process.exitCode = 1;
  }
}

main();
