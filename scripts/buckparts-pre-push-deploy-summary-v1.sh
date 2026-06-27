#!/usr/bin/env bash
# Optional pre-push hook — deploy batching summary only; NEVER blocks (exit 0).
# Install (optional):
#   cp scripts/buckparts-pre-push-deploy-summary-v1.sh .git/hooks/pre-push
#   chmod +x .git/hooks/pre-push
#
# Or chain from an existing pre-push hook:
#   scripts/buckparts-pre-push-deploy-summary-v1.sh

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

printf '[buckparts-pre-push-deploy-summary] ' >&2
npm run --silent buckparts:deploy-classifier:pre-push-summary >&2 || true

exit 0
