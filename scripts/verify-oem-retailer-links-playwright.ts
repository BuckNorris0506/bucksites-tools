/**
 * Browser-truth OEM retailer link verifier (Playwright Chromium).
 * Read-only by default: loads URLs from CSVs and writes CSV output.
 *
 * Optional `--write-db` persists classification results back to live retailer-link tables
 * using browser_truth_classification / browser_truth_notes / browser_truth_checked_at.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runVerifyOemRetailerLinksV1 } from "./lib/verify-oem-retailer-links-run-v1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function main() {
  const { exit_code } = await runVerifyOemRetailerLinksV1({
    rootDir,
    argv: process.argv.slice(2),
  });
  if (exit_code !== 0) process.exit(exit_code);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
