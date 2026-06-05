#!/usr/bin/env node
/**
 * Read-only fridge safe-link owner browser proof session worksheet — stdout JSON + draft write.
 *
 *   node --import tsx scripts/report-fridge-safe-link-owner-browser-proof-session-v1.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFridgeSafeLinkOwnerBrowserProofSessionV1,
  writeFridgeSafeLinkOwnerBrowserProofSessionDraftV1,
} from "./lib/fridge-safe-link-owner-browser-proof-session-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const session = buildFridgeSafeLinkOwnerBrowserProofSessionV1({ rootDir: REPO_ROOT });
  const written = writeFridgeSafeLinkOwnerBrowserProofSessionDraftV1({
    rootDir: REPO_ROOT,
    session,
  });
  process.stderr.write(
    `Wrote ${written.md_rel_path} (read-only owner browser proof session; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(session, null, 2)}\n`);
}

main();
