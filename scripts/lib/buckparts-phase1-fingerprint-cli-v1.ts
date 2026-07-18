/**
 * CLI for Phase 1 fingerprint print / compare (shell-safe entrypoint).
 *
 * Usage:
 *   node --import tsx scripts/lib/buckparts-phase1-fingerprint-cli-v1.ts print <repoRoot> <outJson>
 *   node --import tsx scripts/lib/buckparts-phase1-fingerprint-cli-v1.ts compare <beforeJson> <afterJson>
 */
import { writeFileSync, readFileSync } from "node:fs";
import {
  buildPhase1FingerprintV1,
  comparePhase1FingerprintsV1,
  formatPhase1FingerprintSurfacesV1,
  type Phase1FingerprintV1,
} from "./buckparts-phase1-fingerprint-v1";

const [cmd, a, b] = process.argv.slice(2);

if (cmd === "print") {
  if (!a || !b) {
    console.error("usage: print <repoRoot> <outJson>");
    process.exit(2);
  }
  const fp = buildPhase1FingerprintV1(a);
  writeFileSync(b, JSON.stringify(fp, null, 2) + "\n");
  console.log(formatPhase1FingerprintSurfacesV1(fp));
  console.log(`head=${fp.head}`);
  console.log(`porcelain_sha=${fp.porcelain_sha}`);
  console.log(`tracked_diff_sha=${fp.tracked_diff_sha}`);
  console.log(`staged_diff_sha=${fp.staged_diff_sha}`);
  console.log(`untracked_paths_sha=${fp.untracked_paths_sha}`);
  console.log(`untracked_content_sha=${fp.untracked_content_sha}`);
  console.log(`execution_ledger_sha=${fp.execution_ledger_sha}`);
  console.log(`dispatch_runs_sha=${fp.dispatch_runs_sha}`);
  console.log(`ignored_surfaces_sha=${fp.ignored_surfaces_sha}`);
  console.log(`generated_surfaces_sha=${fp.generated_surfaces_sha}`);
  process.exit(0);
}

if (cmd === "compare") {
  if (!a || !b) {
    console.error("usage: compare <beforeJson> <afterJson>");
    process.exit(2);
  }
  const before = JSON.parse(readFileSync(a, "utf8")) as Phase1FingerprintV1;
  const after = JSON.parse(readFileSync(b, "utf8")) as Phase1FingerprintV1;
  const cmp = comparePhase1FingerprintsV1(before, after);
  if (!cmp.unchanged) {
    console.error("FINGERPRINT_CHANGED");
    for (const k of cmp.changed_keys) console.error(` - ${k}`);
    process.exit(1);
  }
  console.log("fingerprint_verdict=UNCHANGED");
  process.exit(0);
}

console.error("usage: print|compare ...");
process.exit(2);
