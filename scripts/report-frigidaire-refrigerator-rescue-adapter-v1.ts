#!/usr/bin/env node
/**
 * Read-only Frigidaire refrigerator rescue adapter — cohort report + draft writes.
 *
 *   npm run buckparts:frigidaire-refrigerator-rescue-adapter
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFrigidaireRefrigeratorRescueAdapterReportV1,
  buildFrigidaireRescueAdapterMarkdownV1,
  FRIGIDAIRE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
  FRIGIDAIRE_RESCUE_ADAPTER_DRAFT_JSON_REL_V1,
  FRIGIDAIRE_RESCUE_ADAPTER_DRAFT_MD_REL_V1,
} from "./lib/frigidaire-refrigerator-rescue-adapter-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const report = buildFrigidaireRefrigeratorRescueAdapterReportV1({ rootDir: REPO_ROOT });

  const jsonAbs = path.join(REPO_ROOT, FRIGIDAIRE_RESCUE_ADAPTER_DRAFT_JSON_REL_V1);
  const mdAbs = path.join(REPO_ROOT, FRIGIDAIRE_RESCUE_ADAPTER_DRAFT_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildFrigidaireRescueAdapterMarkdownV1(report), "utf8");

  process.stderr.write(
    `Wrote ${FRIGIDAIRE_RESCUE_ADAPTER_DRAFT_JSON_REL_V1} and ${FRIGIDAIRE_RESCUE_ADAPTER_DRAFT_MD_REL_V1} (read-only; no mutation authorized).\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.contract !== FRIGIDAIRE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1) {
    process.exit(2);
  }
}

main();
