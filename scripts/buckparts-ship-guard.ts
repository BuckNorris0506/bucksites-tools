#!/usr/bin/env node
/**
 * BuckParts ship guard CLI — consolidated pre-commit/pre-push guard proof.
 *
 * Default: dry-run JSON (read-only). --commit / --push run recommended validations; never git commit/push.
 */

import {
  buildBuckpartsShipGuardReportV1,
  parseShipGuardArgv,
} from "./lib/buckparts-ship-guard-v1";

const mode = parseShipGuardArgv(process.argv.slice(2));
const runValidations = mode === "commit" || mode === "push";

const report = buildBuckpartsShipGuardReportV1({
  rootDir: process.cwd(),
  mode,
  runValidations,
});

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.push_assessment === "BLOCKED" ? 1 : 0;
