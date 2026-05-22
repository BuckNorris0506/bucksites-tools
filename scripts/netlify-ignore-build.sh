#!/usr/bin/env bash
# Netlify ignore-build hook.
# Exit 0 = skip deploy build (docs/operator-only changes).
# Exit 1 = run build (runtime-relevant changes or uncertainty).
# See: https://docs.netlify.com/build/configure-builds/ignore-builds/

set -euo pipefail

log() {
  printf '[netlify-ignore-build] %s\n' "$*" >&2
}

# --dry-run <path> [<path> ...]  Classify paths without git (local validation).
if [[ "${1:-}" == "--dry-run" ]]; then
  shift
  if [[ $# -eq 0 ]]; then
    log "dry-run: no paths; defaulting to BUILD (exit 1)"
    exit 1
  fi
  changed=("$@")
else
  if [[ -z "${CACHED_COMMIT_REF:-}" || -z "${COMMIT_REF:-}" ]]; then
    log "missing CACHED_COMMIT_REF or COMMIT_REF; defaulting to BUILD (exit 1)"
    exit 1
  fi

  if ! git rev-parse --verify "${CACHED_COMMIT_REF}^{commit}" >/dev/null 2>&1; then
    log "cached commit not found (${CACHED_COMMIT_REF}); defaulting to BUILD (exit 1)"
    exit 1
  fi
  if ! git rev-parse --verify "${COMMIT_REF}^{commit}" >/dev/null 2>&1; then
    log "commit not found (${COMMIT_REF}); defaulting to BUILD (exit 1)"
    exit 1
  fi

  mapfile -t changed < <(
    git diff --name-only "${CACHED_COMMIT_REF}" "${COMMIT_REF}" 2>/dev/null || true
  )

  if [[ ${#changed[@]} -eq 0 ]]; then
    log "no changed files between ${CACHED_COMMIT_REF} and ${COMMIT_REF}; SKIP (exit 0)"
    exit 0
  fi
fi

is_non_runtime() {
  local f="$1"
  case "$f" in
    docs/* | README | README.* | readme | readme.*)
      return 0
      ;;
    data/evidence/* | data/discovery/* | data/owner-decisions/* | data/reports/*)
      return 0
      ;;
    data/bulk/* | data/waterdrop/* | data/gsc/* | data/manual-evidence/*)
      return 0
      ;;
    data/fridge-form-factor-evidence/* | data/affiliate/* | data/ops/*)
      return 0
      ;;
    data/operator-blocked-fridge-non-amazon.json | data/EXPECTED_HEADERS.txt)
      return 0
      ;;
    scripts/* | reports/* | .github/* | .cursor/*)
      return 0
      ;;
    *.md)
      return 0
      ;;
    *.sample.csv)
      return 0
      ;;
  esac
  return 1
}

is_runtime() {
  local f="$1"
  case "$f" in
    src/* | public/*)
      return 0
      ;;
    package.json | package-lock.json | pnpm-lock.yaml | yarn.lock)
      return 0
      ;;
    next.config.js | next.config.mjs | next.config.ts)
      return 0
      ;;
    tailwind.config.js | tailwind.config.ts | postcss.config.js | postcss.config.mjs | postcss.config.ts)
      return 0
      ;;
    tsconfig.json | tsconfig.*.json)
      return 0
      ;;
    netlify.toml)
      return 0
      ;;
    supabase/*)
      return 0
      ;;
    data/filters.csv | data/filter_aliases.csv | data/compatibility_mappings.csv)
      return 0
      ;;
    data/fridge_models.csv | data/fridge_model_aliases.csv | data/retailer_links.csv | data/brands.csv)
      return 0
      ;;
    data/air-purifier/* | data/vacuum/* | data/humidifier/* | data/appliance-air/* | data/whole-house-water/*)
      # Vertical catalog CSVs affect seed/runtime assumptions; skip samples via *.sample.csv above.
      return 0
      ;;
  esac
  return 1
}

runtime_hits=()
unknown_hits=()
non_runtime_hits=()

for f in "${changed[@]}"; do
  [[ -z "$f" ]] && continue
  if is_non_runtime "$f"; then
    non_runtime_hits+=("$f")
  elif is_runtime "$f"; then
    runtime_hits+=("$f")
  else
    unknown_hits+=("$f")
  fi
done

log "changed: ${#changed[@]} | runtime: ${#runtime_hits[@]} | non-runtime: ${#non_runtime_hits[@]} | unknown: ${#unknown_hits[@]}"

if [[ ${#runtime_hits[@]} -gt 0 ]]; then
  log "runtime examples: ${runtime_hits[*]:0:5}"
  log "BUILD (exit 1)"
  exit 1
fi

if [[ ${#unknown_hits[@]} -gt 0 ]]; then
  log "unknown examples: ${unknown_hits[*]:0:5}"
  log "uncertain classification; BUILD (exit 1)"
  exit 1
fi

log "only non-runtime paths changed; SKIP (exit 0)"
exit 0
