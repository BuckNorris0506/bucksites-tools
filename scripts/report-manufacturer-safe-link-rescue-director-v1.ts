#!/usr/bin/env node
/**
 * Read-only manufacturer safe-link rescue director — execution plan drafts from orchestrator.
 *
 *   npm run buckparts:manufacturer-safe-link-rescue-director
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildManufacturerRescueNextActionsMarkdownV1,
  buildManufacturerRescueRoadmapV1,
  buildManufacturerSafeLinkRescueDirectorReportV1,
  loadManufacturerRescueOrchestratorInputV1,
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_JSON_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_NEXT_ACTIONS_MD_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_ROADMAP_JSON_REL_V1,
} from "./lib/manufacturer-safe-link-rescue-director-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const { orchestrator, orchestrator_source_path } = loadManufacturerRescueOrchestratorInputV1({
    rootDir: REPO_ROOT,
  });
  const director = buildManufacturerSafeLinkRescueDirectorReportV1({
    rootDir: REPO_ROOT,
    orchestrator,
    orchestratorSourcePath: orchestrator_source_path,
  });
  const roadmap = buildManufacturerRescueRoadmapV1({ director, orchestrator });
  const nextActionsMd = buildManufacturerRescueNextActionsMarkdownV1(director, roadmap);

  const directorAbs = path.join(REPO_ROOT, MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_JSON_REL_V1);
  const roadmapAbs = path.join(REPO_ROOT, MANUFACTURER_SAFE_LINK_RESCUE_ROADMAP_JSON_REL_V1);
  const mdAbs = path.join(REPO_ROOT, MANUFACTURER_SAFE_LINK_RESCUE_NEXT_ACTIONS_MD_REL_V1);

  mkdirSync(path.dirname(directorAbs), { recursive: true });
  writeFileSync(directorAbs, `${JSON.stringify(director, null, 2)}\n`, "utf8");
  writeFileSync(roadmapAbs, `${JSON.stringify(roadmap, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, nextActionsMd, "utf8");

  process.stderr.write(
    `Wrote ${MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_JSON_REL_V1}, ${MANUFACTURER_SAFE_LINK_RESCUE_ROADMAP_JSON_REL_V1}, ${MANUFACTURER_SAFE_LINK_RESCUE_NEXT_ACTIONS_MD_REL_V1} (read-only; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify({ director, roadmap }, null, 2)}\n`);

  if (director.contract !== MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
