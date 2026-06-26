#!/usr/bin/env node
/**
 * Read-only EveryDrop / Whirlpool official owner-browser proof cohort report.
 *
 *   npm run buckparts:fridge-safe-link-everydrop-whirlpool-official-proof
 *   npm run buckparts:fridge-safe-link-everydrop-whirlpool-official-proof -- --write-drafts
 *   npm run buckparts:fridge-safe-link-everydrop-whirlpool-official-proof -- --capture --write-drafts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildEverydropWhirlpoolOfficialCohortProofV1,
  FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_ADAPTER_CONTRACT_V1,
  writeEverydropWhirlpoolOfficialProofDraftsV1,
} from "./lib/fridge-safe-link-everydrop-whirlpool-official-browser-capture-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const writeDrafts = process.argv.includes("--write-drafts");
  const runPlaywright = process.argv.includes("--capture");

  const report = await buildEverydropWhirlpoolOfficialCohortProofV1({
    rootDir: REPO_ROOT,
    runPlaywright,
    writeDraftScreenshot: writeDrafts,
  });

  if (writeDrafts) {
    const written = writeEverydropWhirlpoolOfficialProofDraftsV1({ rootDir: REPO_ROOT, report });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft; no mutation authorized).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_ADAPTER_CONTRACT_V1) {
    process.exit(2);
  }

  process.exit(report.browser_pass_count > 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
