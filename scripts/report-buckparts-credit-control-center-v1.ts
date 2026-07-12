#!/usr/bin/env node
/**
 * BuckParts Credit Control Center v1 — read-only credit governance snapshot.
 *
 *   npm run buckparts:credit-control
 *   npm run buckparts:credit-control -- --write-artifacts
 *
 * Does not call Netlify APIs, mutate production data, or spend credits.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuckpartsCreditControlCenterV1,
  writeBuckpartsCreditControlCenterArtifactsV1,
} from "./lib/buckparts-credit-control-center-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const writeArtifacts = process.argv.includes("--write-artifacts");
  const report = buildBuckpartsCreditControlCenterV1({ rootDir: REPO_ROOT });

  if (writeArtifacts) {
    const written = writeBuckpartsCreditControlCenterArtifactsV1({
      rootDir: REPO_ROOT,
      report,
    });
    process.stderr.write(
      `Wrote ${written.json_rel_path} and ${written.md_rel_path} (posture=${report.deployment_posture}; deploy_held=${String(report.deploy_held)}).\n`,
    );
  }

  process.stderr.write(
    `credit_control: posture=${report.deployment_posture} deploy_held=${String(report.deploy_held)} work_class=${report.work_class} push_allowed=${String(report.push_allowed)} production_deploy_recommended=${String(report.production_deploy_recommended)}\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
