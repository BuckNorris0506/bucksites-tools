/**
 * CLI: verify Phase 1 nine-failure baseline from Node TAP output.
 *
 * Usage:
 *   node --import tsx scripts/lib/buckparts-phase1-tap-baseline-verify-cli-v1.ts \
 *     <specJson> <tapFile> <checkoutCommit> <childExitCode>
 */
import { readFileSync } from "node:fs";
import {
  BUCKPARTS_PHASE1_BASELINE_COMMIT_V1,
  verifyPhase1BaselineNineFailuresV1,
  type Phase1BaselineSpecV1,
} from "./buckparts-phase1-tap-baseline-verifier-v1";

const [specPath, tapPath, checkout, exitRaw] = process.argv.slice(2);
if (!specPath || !tapPath || !checkout || exitRaw === undefined) {
  console.error(
    "usage: <specJson> <tapFile> <checkoutCommit> <childExitCode>",
  );
  process.exit(2);
}

const spec = JSON.parse(readFileSync(specPath, "utf8")) as Phase1BaselineSpecV1;
const tap = readFileSync(tapPath, "utf8");
const exitCode = Number(exitRaw);
const result = verifyPhase1BaselineNineFailuresV1({
  tap_text: tap,
  checkout_commit: checkout,
  child_exit_code: exitCode,
  spec,
  expected_baseline_commit: BUCKPARTS_PHASE1_BASELINE_COMMIT_V1,
  timed_out: exitCode === 124,
  fingerprint_unchanged: true,
});

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      reasons: result.reasons,
      summary: result.parsed.summary,
      plan_count: result.parsed.plan_count,
    },
    null,
    2,
  ),
);
for (const t of result.parsed.tests) {
  console.log(`TAP_TEST ok=${String(t.ok)} name=${t.name}`);
}
if (!result.ok) {
  console.error("BASELINE_SIGNATURE_FAIL");
  for (const r of result.reasons) console.error(` - ${r}`);
  process.exit(1);
}
console.log("BASELINE_SIGNATURE_PASS");
console.log(`expected_test_failure_exit=${String(exitCode)}`);
process.exit(0);
