#!/usr/bin/env bash
# Optional pre-push hook — deploy batching + credit-control summary only; NEVER blocks (exit 0).
# Install (optional):
#   cp scripts/buckparts-pre-push-deploy-summary-v1.sh .git/hooks/pre-push
#   chmod +x .git/hooks/pre-push
#
# Or chain from an existing pre-push hook:
#   scripts/buckparts-pre-push-deploy-summary-v1.sh
#
# Surfaces Credit Control Center posture via deploy-classifier (includes credit_control lines).
# Does not call Netlify APIs and does not spend credits.

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

printf '[buckparts-pre-push-deploy-summary] ' >&2
npm run --silent buckparts:deploy-classifier:pre-push-summary >&2 || true

printf '[buckparts-pre-push-credit-control] ' >&2
npm run --silent buckparts:credit-control 2>/dev/null | node -e '
let s="";
process.stdin.on("data",d=>s+=d);
process.stdin.on("end",()=>{
  try {
    const j=JSON.parse(s);
    process.stderr.write(
      `posture=${j.deployment_posture} deploy_held=${j.deploy_held} production_deploy_recommended=${j.production_deploy_recommended} push_allowed=${j.push_allowed}\n`
    );
  } catch {
    process.stderr.write("credit_control_summary_unavailable\n");
  }
});
' || printf 'credit_control_summary_unavailable\n' >&2

exit 0
