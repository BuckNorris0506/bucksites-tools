#!/usr/bin/env node
/**
 * BuckParts deploy batching policy v1 — read-only deploy classification for git diff / commit range.
 *
 *   npm run buckparts:deploy-classifier
 *   npm run buckparts:deploy-classifier -- --working-tree
 *   npm run buckparts:deploy-classifier -- --range origin/main..HEAD
 *   npm run buckparts:deploy-classifier -- --paths data/fridge/batch-production/drafts/foo.json
 *   npm run buckparts:deploy-classifier:pre-push-summary
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  BUCKPARTS_DEPLOY_BATCHING_POLICY_CONTRACT_V1,
  buildBuckpartsDeployClassifierReportV1,
  defaultDeployClassifierGitProvider,
  parseDeployClassifierCliArgsV1,
} from "./lib/buckparts-deploy-classifier-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const cli = parseDeployClassifierCliArgsV1(process.argv.slice(2));
  const report = buildBuckpartsDeployClassifierReportV1({
    scope: cli.scope,
    range: cli.range,
    paths: cli.paths.length > 0 ? cli.paths : undefined,
    git: defaultDeployClassifierGitProvider(REPO_ROOT),
  });

  process.stderr.write(`${report.operator_summary}\n`);
  process.stderr.write(`recommended_next_action: ${report.recommended_next_action}\n`);

  if (!cli.summaryOnly) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }

  if (report.contract !== BUCKPARTS_DEPLOY_BATCHING_POLICY_CONTRACT_V1) {
    process.exitCode = 2;
    return;
  }

  // Read-only classifier — never block push/deploy decisions (pre-push hook uses exit 0).
  process.exitCode = 0;
}

main();
