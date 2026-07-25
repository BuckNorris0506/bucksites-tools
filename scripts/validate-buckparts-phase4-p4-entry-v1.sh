#!/usr/bin/env bash
# Phase 4 P4-ENTRY coverage scoreboard bounded validator.
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
  echo "PHASE4_P4_ENTRY_FAIL"
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
  [[ -f "$ROOT/docs/BuckParts-PHASE4-COVERAGE-CONTRACT-V1.md" ]] ||
    fail_validator "missing docs/BuckParts-PHASE4-COVERAGE-CONTRACT-V1.md"
  grep -q "phase4_coverage_scoreboard_v1" "$ROOT/docs/BuckParts-PHASE4-COVERAGE-CONTRACT-V1.md" ||
    fail_validator "contract doc missing phase4_coverage_scoreboard_v1"
}

TMP_DIR="$(mktemp -d -t bp-p4-entry-XXXXXX)"

case "${BUCKPARTS_PHASE4_P4_ENTRY_INJECT:-}" in
  success_short)
    SUCCESS_COMPLETE=1
    echo "PHASE4_P4_ENTRY_PASS"
    exit 0
    ;;
esac

require_contract_doc
run_group phase4_scoreboard_tests "$TESTS_TIMEOUT_SEC" \
  env BUCKPARTS_TEST_FILES='scripts/lib/buckparts-phase4-coverage-scoreboard-v1.test.ts' \
  bash scripts/npm-test-v1.sh

SUCCESS_COMPLETE=1
echo "PHASE4_P4_ENTRY_PASS"
