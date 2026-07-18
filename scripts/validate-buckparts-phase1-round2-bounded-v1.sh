#!/usr/bin/env bash
# Phase 1 Round 2 — bounded serial acceptance validation.
#
# - Fully synthetic Waterdrop + deterministic repair groups must pass
# - Real --no-artifact serial probe must pass with complete fingerprint preservation
# - Nine baseline failures proven only against isolated clean checkout at
#   04a1fdb40fc03ae30e8b1332c91e20f797e9d14f using --test-reporter=tap
#
# Does NOT run npm build (build mutates .next; run separately).
# Usage: npm run buckparts:phase1-round2-bounded
#
# Final stdout contract:
#   success → last line exactly PHASE1_ROUND2_BOUNDED_PASS
#   failure → last line exactly PHASE1_ROUND2_BOUNDED_FAIL (exactly once)
#
# Test-only injection (never set in production):
#   BUCKPARTS_PHASE1_BOUNDED_INJECT=success_short|pre_group_failure|group_timeout|cleanup_failure

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASELINE_COMMIT="04a1fdb40fc03ae30e8b1332c91e20f797e9d14f"
BASELINE_SPEC="$ROOT/scripts/lib/buckparts-phase1-baseline-nine-failures-v1.json"
EXPECTED_TEST_FAILURE_EXIT=1

# Timeouts: measured worst-case + margin (no env override required for PASS).
# Waterdrop focused suite measured ~318s; default bound is 480s.
WATERDROP_TIMEOUT_SEC=480
DET_TIMEOUT_SEC=120
INT_TIMEOUT_SEC=120
BASELINE_TIMEOUT_SEC=180

VALIDATOR_TMP_DIR=""
BASELINE_WORKTREE=""
VALIDATOR_START="$(date +%s)"

# Sentinel / exit-state (single terminal failure path).
SENTINEL_EMITTED=0
SUCCESS_COMPLETE=0
FINAL_EXIT_CODE=""

terminal_fail() {
  local reason="$1"
  local code="${2:-1}"
  if [[ "${SENTINEL_EMITTED}" -eq 1 ]]; then
    if [[ -z "${FINAL_EXIT_CODE}" ]]; then
      FINAL_EXIT_CODE="${code}"
    fi
    return 0
  fi
  SENTINEL_EMITTED=1
  FINAL_EXIT_CODE="${code}"
  echo "FAIL_REASON: ${reason}" >&2
  echo "Not claimed: Phase 1 complete, HyperAgent eligibility, full CC composite green."
  echo "PHASE1_ROUND2_BOUNDED_FAIL"
}

fail_validator() {
  terminal_fail "$1" 1
  exit 1
}

on_err() {
  local ec=$?
  if [[ "${SUCCESS_COMPLETE}" -eq 1 || "${SENTINEL_EMITTED}" -eq 1 ]]; then
    return 0
  fi
  # bash 3.2 (macOS) fires ERR even under `set +e`. Only terminal-fail when
  # errexit is active so expected nonzero statuses (e.g. baseline exit 1) are ignored.
  case "$-" in
    *e*) ;;
    *) return 0 ;;
  esac
  local line="${BASH_LINENO[0]:-unknown}"
  terminal_fail "unexpected command failure (exit=${ec}) near line ${line}" "${ec}"
  exit "${ec}"
}

on_signal() {
  local sig="$1"
  local code=130
  if [[ "${sig}" == "TERM" ]]; then
    code=143
  fi
  if [[ "${SUCCESS_COMPLETE}" -eq 1 || "${SENTINEL_EMITTED}" -eq 1 ]]; then
    exit "${FINAL_EXIT_CODE:-${code}}"
  fi
  terminal_fail "interrupted (${sig})" "${code}"
  exit "${code}"
}

silent_cleanup() {
  # Silent only. Never print. Never emit sentinels. Never mask FINAL_EXIT_CODE.
  set +e
  if [[ -n "${BASELINE_WORKTREE}" && -d "${BASELINE_WORKTREE}" ]]; then
    git -C "$ROOT" worktree remove --force "$BASELINE_WORKTREE" >/dev/null 2>&1 || true
    rm -rf "$BASELINE_WORKTREE" >/dev/null 2>&1 || true
  fi
  if [[ -n "${VALIDATOR_TMP_DIR}" && -d "${VALIDATOR_TMP_DIR}" ]]; then
    rm -rf "$VALIDATOR_TMP_DIR" >/dev/null 2>&1 || true
  fi
  # Test-only: simulate a cleanup-step failure without printing or altering exit.
  if [[ "${BUCKPARTS_PHASE1_BOUNDED_INJECT_CLEANUP_FAIL:-}" == "1" ]]; then
    false >/dev/null 2>&1 || true
  fi
  set -e
}

on_exit() {
  local ec=$?
  if [[ -n "${FINAL_EXIT_CODE}" ]]; then
    ec="${FINAL_EXIT_CODE}"
  fi

  # Catch any nonzero exit that skipped terminal_fail (should be rare).
  if [[ "${ec}" -ne 0 && "${SENTINEL_EMITTED}" -eq 0 && "${SUCCESS_COMPLETE}" -eq 0 ]]; then
    terminal_fail "validator exited nonzero without sentinel (exit=${ec})" "${ec}"
  fi

  silent_cleanup

  # Disarm traps so cleanup/exit cannot print or re-enter after the sentinel.
  trap - EXIT ERR INT TERM
  exit "${ec}"
}

trap 'on_err' ERR
trap 'on_exit' EXIT
trap 'on_signal INT' INT
trap 'on_signal TERM' TERM

print_fingerprint() {
  local label="$1"
  local json_file="$2"
  echo "=== FINGERPRINT ${label} ==="
  node --import tsx scripts/lib/buckparts-phase1-fingerprint-cli-v1.ts print "$ROOT" "$json_file"
}

compare_fingerprints() {
  local before="$1"
  local after="$2"
  node --import tsx scripts/lib/buckparts-phase1-fingerprint-cli-v1.ts compare "$before" "$after"
}

run_process_group_timeout() {
  local timeout_sec="$1"
  local log="$2"
  shift 2
  python3 - "$timeout_sec" "$log" "$@" <<'PY'
import os, signal, subprocess, sys

timeout = int(sys.argv[1])
log_path = sys.argv[2]
cmd = sys.argv[3:]
with open(log_path, "w", encoding="utf-8") as log:
    proc = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    try:
        rc = proc.wait(timeout=timeout)
        sys.exit(rc)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        try:
            proc.wait(timeout=5)
        except Exception:
            pass
        with open(log_path, "a", encoding="utf-8") as log:
            log.write(f"\nTIMEOUT: exceeded {timeout}s; process group killed\n")
        sys.exit(124)
PY
}

run_group() {
  local kind="$1"
  local name="$2"
  local timeout_sec="$3"
  shift 3
  local log="$VALIDATOR_TMP_DIR/group-${name}.log"
  local start end dur rc=0
  start="$(date +%s)"
  echo ""
  echo "=== GROUP [${kind}] ${name} ==="
  echo "timeout_sec=${timeout_sec}"
  printf 'exact_command:'
  printf ' %q' "$@"
  printf '\n'
  set +e
  run_process_group_timeout "$timeout_sec" "$log" "$@"
  rc=$?
  set -e
  cat "$log"
  end="$(date +%s)"
  dur=$((end - start))
  echo "--- RESULT [${kind}] ${name}: duration=${dur}s exit=${rc} ---"

  if [[ "$rc" -eq 124 ]]; then
    fail_validator "group ${name} timed out after ${timeout_sec}s"
  fi
  if [[ "$kind" != "BASELINE" && "$rc" -ne 0 ]]; then
    fail_validator "repair/integration group ${name} failed (exit=${rc})"
  fi
  LAST_GROUP_EXIT="$rc"
  LAST_GROUP_LOG="$log"
  LAST_GROUP_DUR="$dur"
}

finish_success() {
  local total_dur="$1"
  echo ""
  echo "=== Phase 1 Round 2 bounded validation COMPLETE ==="
  echo "total_validator_duration_sec=${total_dur}"
  echo "fingerprint_verdict=UNCHANGED"
  echo "PASS_REASON: repair groups passed; no-artifact probe passed; isolated TAP baseline 9/9 failures matched; fingerprints unchanged"
  echo "Not claimed: Phase 1 complete, HyperAgent eligibility, full CC composite green."
  SUCCESS_COMPLETE=1
  echo "PHASE1_ROUND2_BOUNDED_PASS"
  exit 0
}

VALIDATOR_TMP_DIR="$(mktemp -d -t bp-p1-r2-XXXXXX)"
FP_BEFORE="$VALIDATOR_TMP_DIR/fp-before.json"
FP_AFTER="$VALIDATOR_TMP_DIR/fp-after.json"

echo "=== Phase 1 Round 2 bounded validation ==="
echo "review_HEAD=$(git rev-parse HEAD)"
echo "origin_main=$(git rev-parse origin/main 2>/dev/null || echo UNKNOWN)"
echo "baseline_commit_required=${BASELINE_COMMIT}"
git status --short --branch | head -40

print_fingerprint BEFORE "$FP_BEFORE"

# --- Test-only injection seams (no production effect when unset) ---
case "${BUCKPARTS_PHASE1_BOUNDED_INJECT:-}" in
  pre_group_failure)
    # Unexpected pre-group failure via set -e / ERR (not fail_validator).
    false
    ;;
  group_timeout)
    fail_validator "group waterdrop_hermetic_full_cc timed out after ${WATERDROP_TIMEOUT_SEC}s"
    ;;
  cleanup_failure)
    BUCKPARTS_PHASE1_BOUNDED_INJECT_CLEANUP_FAIL=1
    fail_validator "injected failure before cleanup"
    ;;
  success_short)
    print_fingerprint AFTER "$FP_AFTER"
    compare_fingerprints "$FP_BEFORE" "$FP_AFTER" || fail_validator "fingerprint changed during bounded validation"
    VALIDATOR_END="$(date +%s)"
    TOTAL_DUR=$((VALIDATOR_END - VALIDATOR_START))
    finish_success "${TOTAL_DUR}"
    ;;
esac

run_group DET "waterdrop_hermetic_full_cc" "$WATERDROP_TIMEOUT_SEC" \
  env BUCKPARTS_TEST_FILES='scripts/lib/buckparts-waterdrop-hermetic-nba-v1.test.ts' \
  bash scripts/npm-test-v1.sh

run_group DET "tap_verifier_and_fingerprint" "$DET_TIMEOUT_SEC" \
  env BUCKPARTS_TEST_FILES='scripts/lib/buckparts-phase1-tap-baseline-verifier-v1.test.ts' \
  bash scripts/npm-test-v1.sh

run_group DET "dispatch_freshness_and_isolated_no_artifact" "$DET_TIMEOUT_SEC" \
  env BUCKPARTS_TEST_FILES='scripts/lib/buckparts-phase1-operating-circuit-v1.test.ts' \
  bash scripts/npm-test-v1.sh

run_group DET "phase1_credit_ship_dispatch_unit" "$DET_TIMEOUT_SEC" \
  env BUCKPARTS_TEST_FILES='scripts/lib/buckparts-credit-control-center-v1.test.ts scripts/lib/buckparts-ship-guard-v1.test.ts scripts/lib/buckparts-command-center-dispatch-runner-v1.test.ts' \
  bash scripts/npm-test-v1.sh

run_group INT "real_cli_no_artifact" "$INT_TIMEOUT_SEC" \
  npm run buckparts:command-center:run-dispatch -- --no-artifact

# --- Isolated clean baseline with structured TAP ---
BASELINE_WORKTREE="$(mktemp -d -t bp-p1-baseline-wt-XXXXXX)"
BASELINE_NAME_PATTERN="$(node --import tsx scripts/lib/buckparts-phase1-baseline-name-pattern-cli-v1.ts "$BASELINE_SPEC")"

echo ""
echo "=== GROUP [BASELINE] cc_nine_baseline_failures_isolated ==="
echo "timeout_sec=${BASELINE_TIMEOUT_SEC}"

git worktree add --detach "$BASELINE_WORKTREE" "$BASELINE_COMMIT"
CHECKOUT_COMMIT="$(git -C "$BASELINE_WORKTREE" rev-parse HEAD)"
echo "baseline_checkout_commit=${CHECKOUT_COMMIT}"
[[ "$CHECKOUT_COMMIT" == "$BASELINE_COMMIT" ]] || fail_validator "baseline checkout commit mismatch: ${CHECKOUT_COMMIT}"

ln -s "$ROOT/node_modules" "$BASELINE_WORKTREE/node_modules"

BASELINE_LOG="$VALIDATOR_TMP_DIR/group-baseline.tap"
BASELINE_START="$(date +%s)"
EXPANDED_BASELINE_CMD=(
  bash -c
  "cd $(printf %q "$BASELINE_WORKTREE") && node --import tsx --test --test-reporter=tap --test-concurrency=1 --test-name-pattern=$(printf %q "$BASELINE_NAME_PATTERN") scripts/report-buckparts-command-center.test.ts"
)
printf 'exact_command:'
printf ' %q' "${EXPANDED_BASELINE_CMD[@]}"
printf '\n'
echo "baseline_name_pattern=${BASELINE_NAME_PATTERN}"

set +e
run_process_group_timeout "$BASELINE_TIMEOUT_SEC" "$BASELINE_LOG" "${EXPANDED_BASELINE_CMD[@]}"
BASELINE_RC=$?
set -e
cat "$BASELINE_LOG"
BASELINE_END="$(date +%s)"
BASELINE_DUR=$((BASELINE_END - BASELINE_START))
echo "--- RESULT [BASELINE] cc_nine_baseline_failures_isolated: duration=${BASELINE_DUR}s exit=${BASELINE_RC} checkout=${CHECKOUT_COMMIT} ---"
echo "BASELINE_NOTE: TAP results are from isolated clean checkout only — not the dirty review tree."

if [[ "$BASELINE_RC" -eq 124 ]]; then
  fail_validator "baseline group timed out"
fi

node --import tsx scripts/lib/buckparts-phase1-tap-baseline-verify-cli-v1.ts \
  "$BASELINE_SPEC" "$BASELINE_LOG" "$CHECKOUT_COMMIT" "$BASELINE_RC" \
  || fail_validator "baseline TAP signature verification failed (exit=${BASELINE_RC})"

git -C "$ROOT" worktree remove --force "$BASELINE_WORKTREE" >/dev/null 2>&1 || true
rm -rf "$BASELINE_WORKTREE" >/dev/null 2>&1 || true
BASELINE_WORKTREE=""

print_fingerprint AFTER "$FP_AFTER"
compare_fingerprints "$FP_BEFORE" "$FP_AFTER" || fail_validator "fingerprint changed during bounded validation"

VALIDATOR_END="$(date +%s)"
TOTAL_DUR=$((VALIDATOR_END - VALIDATOR_START))
finish_success "${TOTAL_DUR}"
