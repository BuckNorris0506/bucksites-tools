#!/usr/bin/env node
/**
 * Read-only manufacturer safe-link rescue orchestrator — unified queue + scoreboard drafts.
 *
 *   npm run buckparts:manufacturer-safe-link-rescue-orchestrator
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildManufacturerRescueOwnerWorkQueueMarkdownV1,
  buildManufacturerRescueScoreboardV1,
  buildManufacturerSafeLinkRescueOrchestratorReportV1,
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_OWNER_WORK_QUEUE_MD_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_SCOREBOARD_JSON_REL_V1,
} from "./lib/manufacturer-safe-link-rescue-orchestrator-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildManufacturerSafeLinkRescueOrchestratorReportV1({ rootDir: REPO_ROOT });
  const scoreboard = buildManufacturerRescueScoreboardV1(report);
  const workQueueMd = buildManufacturerRescueOwnerWorkQueueMarkdownV1(report);

  const jsonAbs = path.join(REPO_ROOT, MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1);
  const scoreboardAbs = path.join(REPO_ROOT, MANUFACTURER_SAFE_LINK_RESCUE_SCOREBOARD_JSON_REL_V1);
  const mdAbs = path.join(REPO_ROOT, MANUFACTURER_SAFE_LINK_RESCUE_OWNER_WORK_QUEUE_MD_REL_V1);

  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(scoreboardAbs, `${JSON.stringify(scoreboard, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, workQueueMd, "utf8");

  process.stderr.write(
    `Wrote ${MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1}, ${MANUFACTURER_SAFE_LINK_RESCUE_SCOREBOARD_JSON_REL_V1}, ${MANUFACTURER_SAFE_LINK_RESCUE_OWNER_WORK_QUEUE_MD_REL_V1} (read-only; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify({ report, scoreboard }, null, 2)}\n`);

  if (report.contract !== MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
