#!/usr/bin/env bash
# Decision Priors Framework v1 bounded validator (read-only labels).
# Success/failure sentinel is always the final stdout line.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TESTS_TIMEOUT_SEC=180
TMP_DIR=""
SENTINEL_EMITTED=0
SUCCESS_COMPLETE=0

terminal_fail() {
  [[ "$SENTINEL_EMITTED" -eq 1 ]] && return 0
  SENTINEL_EMITTED=1
  echo "FAIL_REASON: $1" >&2
  echo "DECISION_PRIORS_FRAMEWORK_FAIL"
}
fail_validator() { terminal_fail "$1"; exit 1; }
cleanup() { [[ -n "$TMP_DIR" && -d "$TMP_DIR" ]] && rm -rf "$TMP_DIR" >/dev/null 2>&1 || true; }
on_exit() {
  local ec=$?
  if [[ "$ec" -ne 0 && "$SUCCESS_COMPLETE" -eq 0 && "$SENTINEL_EMITTED" -eq 0 ]]; then
    terminal_fail "validator exited nonzero without sentinel (exit=$ec)"
  fi
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
}

require_contract_doc() {
  [[ -f "$ROOT/docs/BuckParts-DECISION-PRIORS-FRAMEWORK-CONTRACT-V1.md" ]] ||
    fail_validator "missing docs/BuckParts-DECISION-PRIORS-FRAMEWORK-CONTRACT-V1.md"
  grep -q "decision_priors_framework_v1" "$ROOT/docs/BuckParts-DECISION-PRIORS-FRAMEWORK-CONTRACT-V1.md" ||
    fail_validator "contract doc missing decision_priors_framework_v1"
  grep -q "TEMPORARY ONLY" "$ROOT/docs/BuckParts-DECISION-PRIORS-FRAMEWORK-CONTRACT-V1.md" ||
    fail_validator "contract doc must declare TEMPORARY ONLY (not permanent Executive organ)"
  grep -q "Labels only" "$ROOT/docs/BuckParts-DECISION-PRIORS-FRAMEWORK-CONTRACT-V1.md" ||
    fail_validator "contract doc missing Labels only rule"
  grep -q "no scores" "$ROOT/docs/BuckParts-DECISION-PRIORS-FRAMEWORK-CONTRACT-V1.md" ||
    fail_validator "contract doc missing no scores rule"
}

assert_projection_authority_locks() {
  echo "=== GROUP projection_authority_locks ==="
  local log="$TMP_DIR/projection_authority_locks.log" rc=0
  set +e
  run_process_group_timeout 60 "$log" \
    node --import tsx scripts/report-buckparts-decision-priors-framework-v1.ts
  rc=$?
  set -e
  cat "$log"
  if [[ "$rc" -ne 0 ]]; then
    fail_validator "projection authority locks failed (exit=$rc)"
  fi
  grep -q '"nba_authority": false' "$log" || fail_validator "missing nba_authority=false"
  grep -q '"command_center_authority": false' "$log" || fail_validator "missing command_center_authority=false"
  grep -q '"new_store_created": false' "$log" || fail_validator "missing new_store_created=false"
  grep -q '"labels_only": true' "$log" || fail_validator "missing labels_only=true"
}

TMP_DIR="$(mktemp -d -t bp-decision-priors-XXXXXX)"

case "${BUCKPARTS_DECISION_PRIORS_FRAMEWORK_INJECT:-}" in
  success_short)
    SUCCESS_COMPLETE=1
    echo "DECISION_PRIORS_FRAMEWORK_PASS"
    exit 0
    ;;
esac

require_contract_doc
run_group decision_priors_framework_tests "$TESTS_TIMEOUT_SEC" \
  env BUCKPARTS_TEST_FILES='src/lib/owner-dashboard/decision-priors-framework-v1.test.ts scripts/lib/buckparts-decision-priors-framework-v1.test.ts' \
  bash scripts/npm-test-v1.sh
assert_projection_authority_locks

SUCCESS_COMPLETE=1
echo "DECISION_PRIORS_FRAMEWORK_PASS"
