#!/usr/bin/env node
/**
 * Read-only manufacturer safe-link rescue apply plan factory.
 *
 *   npm run buckparts:manufacturer-safe-link-rescue-apply-plan-factory
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  buildManufacturerSafeLinkRescueApplyPlanFactoryPlansV1,
  MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1,
  writeManufacturerSafeLinkRescueApplyPlanFactoryArtifactsV1,
} from "./lib/manufacturer-safe-link-rescue-apply-plan-factory-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const { factory, plans } = buildManufacturerSafeLinkRescueApplyPlanFactoryPlansV1({
    rootDir: REPO_ROOT,
  });
  const written = writeManufacturerSafeLinkRescueApplyPlanFactoryArtifactsV1({
    rootDir: REPO_ROOT,
    factory,
    plans,
  });

  process.stderr.write(
    `Wrote ${written.factoryJsonRelPath}, ${written.ownerReviewMdRelPath}, and ${String(written.applyPlanRelPaths.length)} apply-plan artifact(s) (read-only; no mutation authorized).\n`,
  );

  process.stdout.write(`${JSON.stringify(factory, null, 2)}\n`);

  if (factory.contract !== MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
