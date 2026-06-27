#!/usr/bin/env node
/**
 * Manufacturer Browser Proof Batch Commit Assist v1
 *
 *   npm run buckparts:manufacturer-browser-proof-batch-commit-assist -- --manufacturer everydrop_whirlpool --guide
 *   npm run buckparts:manufacturer-browser-proof-batch-commit-assist -- --manufacturer everydrop_whirlpool --intake path/to/intake.json
 *   npm run buckparts:manufacturer-browser-proof-batch-commit-assist -- --manufacturer everydrop_whirlpool --intake path/to/intake.json --dry-run
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  commitManufacturerBrowserProofBatchV1,
  loadCommittedOwnerSessionPacketV1,
  MANUFACTURER_BROWSER_PROOF_BATCH_COMMIT_ASSIST_CONTRACT_V1,
  parseManufacturerBrowserProofBatchCommitIntakeV1,
  writeManufacturerBrowserProofBatchCommitAssistArtifactsV1,
} from "./lib/manufacturer-browser-proof-batch-commit-assist-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function main(): void {
  const manufacturer = argValue("--manufacturer");
  if (!manufacturer) {
    process.stderr.write(
      "Usage: --manufacturer <manufacturer_key> [--guide | --intake <path>] [--dry-run]\n",
    );
    process.exit(2);
  }

  const packet = loadCommittedOwnerSessionPacketV1({
    rootDir: REPO_ROOT,
    manufacturerKey: manufacturer,
  });
  if (!packet) {
    process.stderr.write(
      `Committed owner session packet missing for ${manufacturer}. Run npm run buckparts:manufacturer-browser-proof-execution-factory first.\n`,
    );
    process.exit(2);
  }

  const guideOnly = process.argv.includes("--guide");
  const intakePath = argValue("--intake");
  const dryRun = process.argv.includes("--dry-run");

  if (guideOnly) {
    const written = writeManufacturerBrowserProofBatchCommitAssistArtifactsV1({
      rootDir: REPO_ROOT,
      packet,
    });
    process.stderr.write(
      `Wrote guide ${written.guideRelPath} and intake template ${written.intakeTemplateRelPath}.\n`,
    );
    process.stdout.write(
      `${JSON.stringify({ manufacturer_key: packet.manufacturer_key, batch_id: packet.batch_id, slug_count: packet.slug_count }, null, 2)}\n`,
    );
    return;
  }

  if (!intakePath) {
    process.stderr.write("Provide --intake <path> for commit, or --guide for worksheet only.\n");
    process.exit(2);
  }

  const intakeAbs = path.isAbsolute(intakePath) ? intakePath : path.join(REPO_ROOT, intakePath);
  const intake = parseManufacturerBrowserProofBatchCommitIntakeV1(
    JSON.parse(readFileSync(intakeAbs, "utf8")) as unknown,
  );

  const report = commitManufacturerBrowserProofBatchV1({
    rootDir: REPO_ROOT,
    intake,
    dryRun,
  });
  const written = writeManufacturerBrowserProofBatchCommitAssistArtifactsV1({
    rootDir: REPO_ROOT,
    packet,
    completionReport: dryRun ? undefined : report,
  });

  process.stderr.write(
    `Batch commit assist complete for ${report.manufacturer_key}; proofs written=${String(report.browser_proofs_refreshed.filter((r) => r.written).length)}; downstream_chain_ran=${String(report.downstream_chain_ran)}.\n`,
  );
  if (written.completionRelPath) {
    process.stderr.write(`Wrote completion report ${written.completionRelPath}.\n`);
  }
  process.stderr.write(
    `READY_FOR_APPLY delta: ${String(report.deltas.ready_for_apply_count)}; apply plans unlocked: ${String(report.apply_plans_unlocked.length)}.\n`,
  );

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== MANUFACTURER_BROWSER_PROOF_BATCH_COMMIT_ASSIST_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
