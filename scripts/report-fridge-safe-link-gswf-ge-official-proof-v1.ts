#!/usr/bin/env node
/**
 * Read-only GSWF GE official owner-browser proof — Playwright capture + draft writes.
 *
 *   npm run buckparts:fridge-safe-link-gswf-ge-official-proof
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  captureGswfGeOfficialOwnerBrowserProofV1,
  writeGswfGeOfficialOwnerBrowserProofDraftsV1,
} from "./lib/fridge-safe-link-gswf-ge-official-browser-capture-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

async function main(): Promise<void> {
  const proof = await captureGswfGeOfficialOwnerBrowserProofV1({ rootDir: REPO_ROOT, writeDrafts: true });
  const written = writeGswfGeOfficialOwnerBrowserProofDraftsV1({ rootDir: REPO_ROOT, proof });
  process.stderr.write(
    `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  process.exit(proof.browser_truth_status === "PASS" ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
