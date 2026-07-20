#!/usr/bin/env bash
# Phase 3 retailer-link parity self-correction bounded validator.
# Success/failure sentinel is always the final stdout line.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PHASE3_TESTS_TIMEOUT_SEC=180
PHASE2_TIMEOUT_SEC=900
PREFLIGHT_TIMEOUT_SEC=180
CREDIT_TIMEOUT_SEC=120
SHIP_GUARD_TIMEOUT_SEC=120
BUILD_TIMEOUT_SEC=600
GIT_DIFF_TIMEOUT_SEC=60
TMP_DIR=""
SENTINEL_EMITTED=0
SUCCESS_COMPLETE=0

terminal_fail() {
  [[ "$SENTINEL_EMITTED" -eq 1 ]] && return 0
  SENTINEL_EMITTED=1
  echo "FAIL_REASON: $1" >&2
  echo "PHASE3_SELF_CORRECTION_FAIL"
}
fail_validator() { terminal_fail "$1"; exit 1; }
cleanup() { [[ -n "$TMP_DIR" && -d "$TMP_DIR" ]] && rm -rf "$TMP_DIR" >/dev/null 2>&1 || true; }
on_exit() {
  local ec=$?
  if [[ "$ec" -ne 0 && "$SUCCESS_COMPLETE" -eq 0 && "$SENTINEL_EMITTED" -eq 0 ]]; then terminal_fail "validator exited nonzero without sentinel (exit=$ec)"; fi
  cleanup
}
trap on_exit EXIT

run_process_group_timeout() {
  local timeout_sec="$1" log="$2"; shift 2
  python3 - "$timeout_sec" "$log" "$@" <<'PY'
import os, signal, subprocess, sys
with open(sys.argv[2], "w", encoding="utf-8") as log:
    process = subprocess.Popen(sys.argv[3:], stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    try:
        sys.exit(process.wait(timeout=int(sys.argv[1])))
    except subprocess.TimeoutExpired:
        try: os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError: pass
        process.wait()
        log.write(f"\nTIMEOUT: exceeded {sys.argv[1]}s; process group killed\n")
        sys.exit(124)
PY
}
run_group() {
  local name="$1" timeout_sec="$2"; shift 2
  local log="$TMP_DIR/$name.log" rc=0
  echo "=== GROUP $name ==="
  set +e; run_process_group_timeout "$timeout_sec" "$log" "$@"; rc=$?; set -e
  cat "$log"
  if [[ "$rc" -eq 124 ]]; then
    fail_validator "group $name timed out after ${timeout_sec}s"
  fi
  if [[ "$rc" -ne 0 ]]; then
    fail_validator "group $name failed (exit=$rc)"
  fi
  return 0
}

print_fingerprint() { node --import tsx scripts/lib/buckparts-phase1-fingerprint-cli-v1.ts print "$ROOT" "$1"; }
compare_fingerprints_allow_next_only() {
  node --import tsx - "$1" "$2" <<'NODE'
const fs = require("fs");
const before = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const after = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const keys = new Set([...Object.keys(before.surfaces), ...Object.keys(after.surfaces)]);
const changed = [...keys].filter(k => before.surfaces[k] !== after.surfaces[k]);
if (before.head !== after.head) changed.push("head");
const unexpected = changed.filter(k => k !== "ignored:.next");
console.log("fingerprint_changed_keys=" + JSON.stringify(changed.sort()));
if (unexpected.length) process.exit(1);
NODE
}
require_phase2_pass() {
  local log="$1"
  local count
  # Prefer ripgrep; fall back to grep -E for environments without rg on PATH.
  if command -v rg >/dev/null 2>&1; then
    count="$(rg -c '^PHASE2_OPERATING_COHERENCE_PASS$' "$log" || true)"
  else
    count="$(grep -E -c '^PHASE2_OPERATING_COHERENCE_PASS$' "$log" || true)"
  fi
  [[ "${count}" == "1" ]] ||
    fail_validator "nested Phase 2 exited 0 but omitted exact PHASE2_OPERATING_COHERENCE_PASS"
}

TMP_DIR="$(mktemp -d -t bp-p3-self-correction-XXXXXX)"
BEFORE="$TMP_DIR/before.json"; PRE_BUILD="$TMP_DIR/pre-build.json"; AFTER_BUILD="$TMP_DIR/after-build.json"
print_fingerprint "$BEFORE"

case "${BUCKPARTS_PHASE3_SELF_CORRECTION_INJECT:-}" in
  success_short)
    print_fingerprint "$PRE_BUILD"; compare_fingerprints_allow_next_only "$BEFORE" "$PRE_BUILD"
    print_fingerprint "$AFTER_BUILD"; compare_fingerprints_allow_next_only "$PRE_BUILD" "$AFTER_BUILD"
    SUCCESS_COMPLETE=1; echo "PHASE3_SELF_CORRECTION_PASS"; exit 0 ;;
  nested_phase2_missing_pass)
    run_group nested_phase2 "$PHASE2_TIMEOUT_SEC" bash -c 'echo phase2 child completed without sentinel'
    require_phase2_pass "$TMP_DIR/nested_phase2.log" ;;
  nested_phase2_failure)
    run_group nested_phase2 "$PHASE2_TIMEOUT_SEC" bash -c 'echo PHASE2_OPERATING_COHERENCE_FAIL; exit 1' ;;
esac

run_group phase3_tests "$PHASE3_TESTS_TIMEOUT_SEC" env BUCKPARTS_TEST_FILES='scripts/lib/buckparts-retailer-link-parity-issue-intake-v1.test.ts scripts/lib/buckparts-retailer-link-parity-correction-plan-v1.test.ts scripts/lib/buckparts-retailer-link-parity-guarded-apply-v1.test.ts scripts/lib/buckparts-retailer-link-parity-closeout-v1.test.ts scripts/lib/buckparts-phase3-sentinel-v1.test.ts scripts/lib/buckparts-supabase-service-role-inventory-v1.test.ts' bash scripts/npm-test-v1.sh
run_group nested_phase2 "$PHASE2_TIMEOUT_SEC" npm run buckparts:phase2-operating-coherence
require_phase2_pass "$TMP_DIR/nested_phase2.log"
run_group preflight "$PREFLIGHT_TIMEOUT_SEC" npm run buckparts:deploy:preflight
run_group credit_control "$CREDIT_TIMEOUT_SEC" npm run buckparts:credit-control
run_group ship_guard "$SHIP_GUARD_TIMEOUT_SEC" npm run buckparts:ship-guard -- --enforce
run_group git_diff_check "$GIT_DIFF_TIMEOUT_SEC" git diff --check
print_fingerprint "$PRE_BUILD"
if ! compare_fingerprints_allow_next_only "$BEFORE" "$PRE_BUILD"; then
  fail_validator "unexpected pre-build fingerprint delta"
fi
run_group build "$BUILD_TIMEOUT_SEC" npm run build
print_fingerprint "$AFTER_BUILD"
if ! compare_fingerprints_allow_next_only "$PRE_BUILD" "$AFTER_BUILD"; then
  fail_validator "build fingerprint delta not limited to ignored:.next"
fi
SUCCESS_COMPLETE=1
echo "PHASE3_SELF_CORRECTION_PASS"
