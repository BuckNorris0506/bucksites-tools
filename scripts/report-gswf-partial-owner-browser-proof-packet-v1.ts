#!/usr/bin/env node
/**
 * Read-only GSWF PARTIAL owner-browser proof packet — stdout JSON; optional draft writes.
 *
 *   npm run buckparts:gswf-partial-owner-browser-proof-packet
 *   npm run buckparts:gswf-partial-owner-browser-proof-packet -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGswfPartialOwnerBrowserProofPacketV1,
  writeGswfPartialOwnerBrowserProofPacketArtifactsV1,
} from "./lib/gswf-partial-owner-browser-proof-packet-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const packet = buildGswfPartialOwnerBrowserProofPacketV1({ rootDir: REPO_ROOT });

  if (writeArtifacts) {
    const written = writeGswfPartialOwnerBrowserProofPacketArtifactsV1({
      rootDir: REPO_ROOT,
      packet,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (read-only draft artifacts; no mutation authorized).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

main();
