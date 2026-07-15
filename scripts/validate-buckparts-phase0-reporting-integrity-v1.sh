#!/usr/bin/env bash
# Phase 0 reporting-integrity canonical validation (read-only by default).
# Does not commit, push, deploy, or mutate Supabase / protected CSVs / public CTA.
#
# Usage:
#   bash scripts/validate-buckparts-phase0-reporting-integrity-v1.sh
#   npm run buckparts:phase0-reporting-integrity
#   bash scripts/validate-buckparts-phase0-reporting-integrity-v1.sh --require-clean
#
# Default: allows an intentionally dirty review tree; fingerprints tracked/untracked
# state before validation and fails if any unexpected residue appears afterward.
# --require-clean: post-commit verification only (fails if tree is dirty at start).
#
# Intentional durable writes (NOT run by this script):
#   npm run buckparts:fridge-model-pdp-cta-go-link-proof-pack -- --write-artifacts
#   npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity -- --write-artifacts
#   npm run buckparts:credit-control -- --write-artifacts
#   npm run buckparts:repo-runtime-convergence:check -- --refresh-ledger

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REQUIRE_CLEAN=0
for arg in "$@"; do
  case "$arg" in
    --require-clean) REQUIRE_CLEAN=1 ;;
    -h|--help)
      sed -n '1,25p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

PHASE0_TEST_FILES="$(
  cat <<'EOF'
scripts/lib/buckparts-supabase-service-role-inventory-v1.test.ts
scripts/audit-buckparts-mcp-supabase-exposure-v1.test.ts
scripts/lib/buckparts-security-hardening-v1.test.ts
scripts/lib/buckparts-artifact-provenance-v1.test.ts
scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1.test.ts
scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.test.ts
scripts/lib/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.test.ts
scripts/lib/fridge-truth-spine-v1.test.ts
scripts/lib/ap-demand-selected-batch-run-registry-v1.test.ts
scripts/lib/ap-demand-selected-batch-closeout-readiness-proof-v1.test.ts
scripts/lib/air-purifier-demand-selected-batch-owner-review-v1.test.ts
scripts/lib/buckparts-batch-production-operating-dispatch-ap-demand-chain-v1.test.ts
scripts/lib/buckparts-command-center-dispatch-runner-v1.test.ts
scripts/lib/buckparts-credit-control-center-v1.test.ts
scripts/lib/buckparts-ship-guard-v1.test.ts
scripts/lib/buckparts-ship-guard-ge-mwfp-xwfe-retailer-links-allowance-v1.test.ts
EOF
)"

fingerprint_tree() {
  # Stable fingerprint of tracked diffs + untracked paths/content hashes.
  {
    echo "BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo UNKNOWN)"
    echo "HEAD=$(git rev-parse HEAD)"
    echo "ORIGIN_MAIN=$(git rev-parse origin/main 2>/dev/null || echo UNKNOWN)"
    echo "---STATUS---"
    git status --porcelain=v1
    echo "---TRACKED_DIFF_STAT---"
    git diff --stat HEAD
    echo "---TRACKED_DIFF_NAME---"
    git diff --name-only HEAD | sort
    echo "---TRACKED_DIFF_PATCH_SHA---"
    git diff HEAD | shasum -a 256 | awk '{print $1}'
    echo "---UNTRACKED---"
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      if [[ -f "$f" ]]; then
        printf '%s %s\n' "$(shasum -a 256 "$f" | awk '{print $1}')" "$f"
      else
        printf 'DIR %s\n' "$f"
      fi
    done < <(git ls-files --others --exclude-standard | sort)
  }
}

FP_BEFORE_FILE="$(mktemp -t bp-phase0-fp-before.XXXXXX)"
FP_AFTER_FILE="$(mktemp -t bp-phase0-fp-after.XXXXXX)"
trap 'rm -f "$FP_BEFORE_FILE" "$FP_AFTER_FILE"' EXIT

echo "=== Phase 0 reporting integrity ==="
echo "HEAD=$(git rev-parse --short HEAD)"
echo "origin/main=$(git rev-parse --short origin/main)"
git status --short --branch

if [[ "$REQUIRE_CLEAN" -eq 1 ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "FAIL: --require-clean set but worktree is dirty" >&2
    git status --short >&2
    exit 1
  fi
  echo "PROVEN: --require-clean baseline is clean"
fi

fingerprint_tree >"$FP_BEFORE_FILE"
echo "PROVEN: captured baseline fingerprint ($(wc -l <"$FP_BEFORE_FILE" | tr -d ' ') lines)"

assert_fingerprint_unchanged() {
  local label="$1"
  fingerprint_tree >"$FP_AFTER_FILE"
  if ! diff -u "$FP_BEFORE_FILE" "$FP_AFTER_FILE" >/tmp/bp-phase0-fp-diff.txt; then
    echo "FAIL: unexpected residue after ${label}" >&2
    cat /tmp/bp-phase0-fp-diff.txt >&2
    exit 1
  fi
  echo "PROVEN: fingerprint unchanged after ${label}"
}

echo "=== Focused Phase 0 tests ==="
BUCKPARTS_TEST_FILES="$(echo "${PHASE0_TEST_FILES}" | tr '\n' ' ')" \
  bash scripts/npm-test-v1.sh
assert_fingerprint_unchanged "focused tests"

echo "=== Deploy preflight (must not mutate ledger) ==="
npm run buckparts:deploy:preflight
assert_fingerprint_unchanged "deploy preflight"

echo "=== GE parity dry-run (stdout only; no --write-artifacts) ==="
npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity >/tmp/bp-phase0-ge-parity.json
assert_fingerprint_unchanged "GE parity dry-run"

echo "=== GE sync apply dry-run (stdout only; no --write-artifacts) ==="
npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply >/tmp/bp-phase0-ge-apply-dry.json
assert_fingerprint_unchanged "GE sync apply dry-run"

echo "=== Credit Control (no --write-artifacts) ==="
node --import tsx scripts/report-buckparts-credit-control-center-v1.ts >/tmp/bp-phase0-credit.json
assert_fingerprint_unchanged "credit-control"

echo "=== Ship Guard ==="
node --import tsx scripts/buckparts-ship-guard.ts >/tmp/bp-phase0-ship-guard.json
assert_fingerprint_unchanged "ship-guard"

echo "=== Build ==="
npm run build
assert_fingerprint_unchanged "build"

echo "=== git diff --check ==="
git diff --check
git status --short

echo "PHASE0_REPORTING_INTEGRITY_PASS"
