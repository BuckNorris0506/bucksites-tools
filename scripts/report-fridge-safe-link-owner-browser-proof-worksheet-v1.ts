#!/usr/bin/env node
/**
 * Read-only fridge safe-link owner-browser-proof worksheet — stdout JSON + draft write.
 *
 *   node --import tsx scripts/report-fridge-safe-link-owner-browser-proof-worksheet-v1.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFridgeSafeLinkOwnerBrowserProofWorksheetV1,
  writeFridgeSafeLinkOwnerBrowserProofWorksheetDraftV1,
} from "./lib/fridge-safe-link-owner-browser-proof-worksheet-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const worksheet = buildFridgeSafeLinkOwnerBrowserProofWorksheetV1({ rootDir: REPO_ROOT });
  const written = writeFridgeSafeLinkOwnerBrowserProofWorksheetDraftV1({
    rootDir: REPO_ROOT,
    worksheet,
  });
  process.stderr.write(
    `Wrote ${written.md_rel_path} (read-only owner-browser-proof worksheet; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(worksheet, null, 2)}\n`);
}

main();
