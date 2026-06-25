#!/usr/bin/env node
/**
 * Read-only GE refrigerator rescue adapter — cohort report + owner approval packet drafts.
 *
 *   npm run buckparts:ge-refrigerator-rescue-adapter
 *   npm run buckparts:ge-refrigerator-rescue-adapter -- --write-drafts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGeRefrigeratorRescueAdapterReportV1,
  GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
} from "./lib/ge-refrigerator-rescue-adapter-v1";
import {
  buildGeRefrigeratorRescueOwnerApprovalPacketV1,
  writeGeRefrigeratorRescueOwnerApprovalPacketDraftsV1,
} from "./lib/ge-refrigerator-rescue-owner-approval-packet-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

const ADAPTER_DRAFT_REL = "data/fridge/batch-production/drafts/ge-refrigerator-rescue-adapter-v1.json";

function main(): void {
  const writeDrafts = process.argv.includes("--write-drafts");

  const adapterReport = buildGeRefrigeratorRescueAdapterReportV1({ rootDir: REPO_ROOT });
  const packet = buildGeRefrigeratorRescueOwnerApprovalPacketV1({ rootDir: REPO_ROOT });

  const output = {
    adapter: adapterReport,
    owner_approval_packet: packet,
  };

  if (writeDrafts) {
    const adapterAbs = path.join(REPO_ROOT, ADAPTER_DRAFT_REL);
    mkdirSync(path.dirname(adapterAbs), { recursive: true });
    writeFileSync(adapterAbs, `${JSON.stringify(adapterReport, null, 2)}\n`, "utf8");
    const written = writeGeRefrigeratorRescueOwnerApprovalPacketDraftsV1({
      rootDir: REPO_ROOT,
      packet,
    });
    process.stderr.write(
      `Wrote ${ADAPTER_DRAFT_REL}, ${written.json_rel_path}, ${written.md_rel_path} (read-only; no mutation authorized).\n`,
    );
  }

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

  if (adapterReport.contract !== GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
