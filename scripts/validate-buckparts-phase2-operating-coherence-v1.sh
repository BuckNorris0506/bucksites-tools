#!/usr/bin/env bash
# Phase 2 operating-coherence bounded validator (serial, fingerprint-aware).
# Usage: npm run buckparts:phase2-operating-coherence
#
# Final stdout contract:
#   success → last line exactly PHASE2_OPERATING_COHERENCE_PASS
#   failure → last line exactly PHASE2_OPERATING_COHERENCE_FAIL (exactly once)
#
# Test-only injection (never set in production):
#   BUCKPARTS_PHASE2_COHERENCE_INJECT=success_short|pre_fingerprint_failure|focused_group_timeout|nested_phase1_failure|final_fingerprint_failure|cleanup_failure

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PHASE2_TESTS_TIMEOUT_SEC=120
PHASE1_BOUNDED_TIMEOUT_SEC=600
PHASE0_TIMEOUT_SEC=600
PREFLIGHT_TIMEOUT_SEC=180
CREDIT_TIMEOUT_SEC=120
SHIP_GUARD_TIMEOUT_SEC=120
GIT_DIFF_TIMEOUT_SEC=60
BUILD_TIMEOUT_SEC=600

VALIDATOR_TMP_DIR=""
VALIDATOR_START="$(date +%s)"

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
  echo "Not claimed: Phase 2 complete, HyperAgent eligibility, Phase 3."
  echo "PHASE2_OPERATING_COHERENCE_FAIL"
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
  set +e
  if [[ -n "${VALIDATOR_TMP_DIR}" && -d "${VALIDATOR_TMP_DIR}" ]]; then
    rm -rf "$VALIDATOR_TMP_DIR" >/dev/null 2>&1 || true
  fi
  if [[ "${BUCKPARTS_PHASE2_COHERENCE_INJECT_CLEANUP_FAIL:-}" == "1" ]]; then
    false >/dev/null 2>&1 || true
  fi
  set -e
}

on_exit() {
  local ec=$?
  if [[ -n "${FINAL_EXIT_CODE}" ]]; then
    ec="${FINAL_EXIT_CODE}"
  fi

  if [[ "${ec}" -ne 0 && "${SENTINEL_EMITTED}" -eq 0 && "${SUCCESS_COMPLETE}" -eq 0 ]]; then
    terminal_fail "validator exited nonzero without sentinel (exit=${ec})" "${ec}"
  fi

  silent_cleanup

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

compare_fingerprints_allow_next_only() {
  local before_basename="$1"
  local after_basename="$2"
  local log_label="$3"
  export VALIDATOR_TMP_DIR
  node --import tsx - "$before_basename" "$after_basename" "$log_label" <<'NODE' || return 1
const fs = require("fs");
const beforePath = process.env.VALIDATOR_TMP_DIR + "/" + process.argv[2];
const afterPath = process.env.VALIDATOR_TMP_DIR + "/" + process.argv[3];
const label = process.argv[4];
const before = JSON.parse(fs.readFileSync(beforePath, "utf8"));
const after = JSON.parse(fs.readFileSync(afterPath, "utf8"));
const keys = new Set([...Object.keys(before.surfaces), ...Object.keys(after.surfaces)]);
const changed = [];
for (const k of [...keys].sort()) {
  if (before.surfaces[k] !== after.surfaces[k]) changed.push(k);
}
if (before.head !== after.head) changed.push("head");
const allowed = new Set(["ignored:.next"]);
const unexpected = changed.filter((k) => !allowed.has(k));
console.log(label + "_changed_keys=" + JSON.stringify(changed));
if (unexpected.length > 0) {
  console.error("UNEXPECTED_" + label.toUpperCase() + "_DELTA: " + unexpected.join(", "));
  process.exit(1);
}
console.log(label + "_fingerprint_verdict=IGNORED_NEXT_ONLY_OR_NONE");
NODE
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
  local name="$1"
  local timeout_sec="$2"
  shift 2
  local log="$VALIDATOR_TMP_DIR/group-${name}.log"
  local start end dur rc=0
  start="$(date +%s)"
  echo ""
  echo "=== GROUP ${name} ==="
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
  echo "--- RESULT ${name}: duration=${dur}s exit=${rc} ---"

  if [[ "$rc" -eq 124 ]]; then
    fail_validator "group ${name} timed out after ${timeout_sec}s"
  fi
  if [[ "$rc" -ne 0 ]]; then
    fail_validator "group ${name} failed (exit=${rc})"
  fi
}

finish_success() {
  local total_dur="$1"
  echo ""
  echo "=== Phase 2 operating coherence validation COMPLETE ==="
  echo "total_validator_duration_sec=${total_dur}"
  echo "fingerprint_verdict=PRE_BUILD_UNCHANGED; BUILD_IGNORED_NEXT_ONLY_OR_NONE"
  echo "PASS_REASON: phase2 coherence gates passed; fingerprints unchanged except ignored:.next around build"
  echo "Not claimed: Phase 2 complete, HyperAgent eligibility, Phase 3."
  SUCCESS_COMPLETE=1
  echo "PHASE2_OPERATING_COHERENCE_PASS"
  exit 0
}

VALIDATOR_TMP_DIR="$(mktemp -d -t bp-p2-coherence-XXXXXX)"
export VALIDATOR_TMP_DIR
FP_BEFORE="$VALIDATOR_TMP_DIR/fp-before.json"
FP_PRE_BUILD="$VALIDATOR_TMP_DIR/fp-pre-build.json"
FP_AFTER_BUILD="$VALIDATOR_TMP_DIR/fp-after-build.json"

echo "=== Phase 2 operating coherence validation ==="
echo "review_HEAD=$(git rev-parse HEAD)"
echo "origin_main=$(git rev-parse origin/main 2>/dev/null || echo UNKNOWN)"
git status --short --branch | head -40

case "${BUCKPARTS_PHASE2_COHERENCE_INJECT:-}" in
  pre_fingerprint_failure)
    false
    ;;
esac

print_fingerprint BEFORE "$FP_BEFORE"

case "${BUCKPARTS_PHASE2_COHERENCE_INJECT:-}" in
  success_short)
    print_fingerprint PRE_BUILD "$FP_PRE_BUILD"
    compare_fingerprints_allow_next_only fp-before.json fp-pre-build.json pre_build \
      || fail_validator "fingerprint changed before pre-build gate (success_short)"
    print_fingerprint AFTER_BUILD "$FP_AFTER_BUILD"
    compare_fingerprints_allow_next_only fp-pre-build.json fp-after-build.json build \
      || fail_validator "build fingerprint delta not limited to ignored:.next (success_short)"
    VALIDATOR_END="$(date +%s)"
    TOTAL_DUR=$((VALIDATOR_END - VALIDATOR_START))
    finish_success "${TOTAL_DUR}"
    ;;
  focused_group_timeout)
    fail_validator "group phase2_coherence_tests timed out after ${PHASE2_TESTS_TIMEOUT_SEC}s"
    ;;
  nested_phase1_failure)
    fail_validator "nested phase1_bounded validator failed (exit=1; sentinel=PHASE1_ROUND2_BOUNDED_FAIL)"
    ;;
  cleanup_failure)
    BUCKPARTS_PHASE2_COHERENCE_INJECT_CLEANUP_FAIL=1
    fail_validator "injected failure before cleanup"
    ;;
  final_fingerprint_failure)
    print_fingerprint PRE_BUILD "$FP_PRE_BUILD"
    compare_fingerprints_allow_next_only fp-before.json fp-pre-build.json pre_build \
      || fail_validator "fingerprint changed before pre-build gate"
    print_fingerprint AFTER_BUILD "$FP_AFTER_BUILD"
    fail_validator "final fingerprint verification failed"
    ;;
esac

run_group phase2_coherence_tests "$PHASE2_TESTS_TIMEOUT_SEC" \
  env BUCKPARTS_TEST_FILES='scripts/lib/buckparts-phase2-operating-coherence-v1.test.ts scripts/lib/buckparts-command-center-dispatch-runner-v1.test.ts scripts/lib/buckparts-phase2-coherence-sentinel-v1.test.ts' \
  bash scripts/npm-test-v1.sh
run_group phase1_bounded "$PHASE1_BOUNDED_TIMEOUT_SEC" \
  npm run buckparts:phase1-round2-bounded

PHASE0_ARGS=()
if [[ -z "$(git status --porcelain=v1)" ]]; then
  PHASE0_ARGS+=(--require-clean)
  echo "phase0_mode=require-clean (clean tree)"
else
  echo "phase0_mode=default (dirty repair tree; residue fingerprint only)"
fi
run_group phase0_integrity "$PHASE0_TIMEOUT_SEC" \
  npm run buckparts:phase0-reporting-integrity -- "${PHASE0_ARGS[@]+"${PHASE0_ARGS[@]}"}"

run_group preflight "$PREFLIGHT_TIMEOUT_SEC" \
  npm run buckparts:deploy:preflight

run_group credit "$CREDIT_TIMEOUT_SEC" \
  npm run buckparts:credit-control

run_group ship_guard "$SHIP_GUARD_TIMEOUT_SEC" \
  npm run buckparts:ship-guard -- --enforce

run_group git_diff_check "$GIT_DIFF_TIMEOUT_SEC" \
  git diff --check

print_fingerprint PRE_BUILD "$FP_PRE_BUILD"
compare_fingerprints_allow_next_only fp-before.json fp-pre-build.json pre_build \
  || fail_validator "non-ignored fingerprint changed before phase2 build group"

run_group build "$BUILD_TIMEOUT_SEC" \
  npm run build

print_fingerprint AFTER_BUILD "$FP_AFTER_BUILD"
compare_fingerprints_allow_next_only fp-pre-build.json fp-after-build.json build \
  || fail_validator "build fingerprint delta not limited to ignored:.next"

VALIDATOR_END="$(date +%s)"
TOTAL_DUR=$((VALIDATOR_END - VALIDATOR_START))
finish_success "${TOTAL_DUR}"
