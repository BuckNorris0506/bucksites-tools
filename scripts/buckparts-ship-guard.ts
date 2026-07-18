#!/usr/bin/env node
/**
 * BuckParts ship guard CLI — consolidated pre-commit/pre-push guard proof.
 *
 * Default: dry-run JSON (read-only). --commit / --push run recommended validations; never git commit/push.
 * --enforce: preflight fail-closed mode (SAFE required; BLOCKED/UNKNOWN exit 1). Does not run nested validations.
 */

import {
  buildBuckpartsShipGuardReportV1,
  parseShipGuardArgv,
  shipGuardEnforceExitCodeV1,
} from "./lib/buckparts-ship-guard-v1";

const mode = parseShipGuardArgv(process.argv.slice(2));
// Never run nested validations in enforce mode (avoids recursion with deploy:preflight).
const runValidations = mode === "commit" || mode === "push";

const report = buildBuckpartsShipGuardReportV1({
  rootDir: process.cwd(),
  mode,
  runValidations,
});

console.log(JSON.stringify(report, null, 2));
process.exitCode = shipGuardEnforceExitCodeV1(report);
