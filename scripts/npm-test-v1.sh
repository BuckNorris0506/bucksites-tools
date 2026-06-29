#!/usr/bin/env bash
# Run the full test suite and propagate Node's exit code (fail closed on any test failure).
# Do not pipe this script through `tail`/`grep` alone — that masks failures (exit code of last pipe stage).
set -euo pipefail

run_node_test() {
  node --import tsx --test "$@"
}

if [ -n "${BUCKPARTS_TEST_FILES:-}" ]; then
  # Accept space-, tab-, or newline-separated paths (including multiline copy/paste with "\" continuations).
  # Unquoted expansion is intentional; filter lone "\" tokens from broken line continuations.
  test_files=()
  token=
  IFS=$' \t\n'
  for token in ${BUCKPARTS_TEST_FILES}; do
    [[ -z "${token}" || "${token}" == "\\" ]] && continue
    test_files+=("${token}")
  done
  if [ "${#test_files[@]}" -eq 0 ]; then
    echo "npm-test-v1: BUCKPARTS_TEST_FILES is set but no valid test file paths were parsed." >&2
    exit 2
  fi
  run_node_test "${test_files[@]}"
else
  run_node_test "src/**/*.test.ts" "scripts/**/*.test.ts"
fi
exit $?
