#!/usr/bin/env node
/**
 * Read-only EDR4RXD1 owner review packet — stdout JSON; optional draft writes.
 *
 *   npm run buckparts:edr4rxd1-owner-review-packet
 *   npm run buckparts:edr4rxd1-owner-review-packet -- --write-artifacts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildEdr4rxd1OwnerReviewPacketV1,
  writeEdr4rxd1OwnerReviewPacketArtifactsV1,
} from "./lib/edr4rxd1-owner-review-packet-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const packet = buildEdr4rxd1OwnerReviewPacketV1({ rootDir: REPO_ROOT });

  if (writeArtifacts) {
    const written = writeEdr4rxd1OwnerReviewPacketArtifactsV1({
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
