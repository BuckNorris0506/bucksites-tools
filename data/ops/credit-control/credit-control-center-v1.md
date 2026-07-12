# BuckParts Credit Control Center v1

Generated: 2026-07-12T16:08:58.325Z

## Status

- contract: `buckparts_credit_control_center_v1`
- deployment_posture: **DEPLOY_HOLD_CREDITS_EXHAUSTED**
- deploy_held: **true**
- read_only: **true**
- data_mutation: **false**
- netlify_api_call_authorized: **false**
- credit_spend_authorized: **false**

## Repo

- repo_head: `d609139`
- origin_main_head: `d609139`
- git_status_clean: **false**
- work_class: **mixed_non_production**
- changed_path_count: 10

## Credit evidence

- path: `data/ops/credit-control/netlify-credit-state-v1.json`
- present: **true**
- status: `exhausted`
- observed_at: `2026-07-11T18:00:00.000Z`
- reset_at: `2026-07-24T00:00:00.000Z`
- source: `owner_screenshot`

## Governance flags

- local_build_recommended: **false**
- local_build_optional: **true**
- push_allowed: **true**
- production_deploy_recommended: **false**

## Recommendations

- Hold all Netlify production deploys until credits reset or owner purchases credits with an explicit spend decision.
- Prefer repo-only work (docs/scripts/tests/drafts). Push to origin/main is allowed only if Netlify auto-deploy is confirmed skipped/disabled.
- Do not buy/spend Netlify credits from this report alone — founder spend decision required.

## Changed paths

- `data/ops/credit-control/credit-control-center-v1.json` — NO_DEPLOY_NEEDED (`operator_reports`)
- `data/ops/credit-control/credit-control-center-v1.md` — NO_DEPLOY_NEEDED (`operator_reports`)
- `scripts/buckparts-pre-push-deploy-summary-v1.sh` — NO_DEPLOY_NEEDED (`scripts_only`)
- `scripts/lib/buckparts-credit-control-center-v1.test.ts` — NO_DEPLOY_NEEDED (`tests_only`)
- `scripts/lib/buckparts-credit-control-center-v1.ts` — NO_DEPLOY_NEEDED (`scripts_only`)
- `scripts/lib/buckparts-deploy-classifier-v1.test.ts` — NO_DEPLOY_NEEDED (`tests_only`)
- `scripts/lib/buckparts-deploy-classifier-v1.ts` — NO_DEPLOY_NEEDED (`scripts_only`)
- `scripts/lib/buckparts-ship-guard-v1.test.ts` — NO_DEPLOY_NEEDED (`tests_only`)
- `scripts/lib/buckparts-ship-guard-v1.ts` — NO_DEPLOY_NEEDED (`scripts_only`)
- `scripts/report-buckparts-deploy-classifier-v1.ts` — NO_DEPLOY_NEEDED (`scripts_only`)

## Proven facts

- PROVEN: read_only=true; data_mutation=false; netlify_api_call_authorized=false; credit_spend_authorized=false.
- PROVEN: deployment_posture=DEPLOY_HOLD_CREDITS_EXHAUSTED; deploy_held=true.
- PROVEN: work_class=mixed_non_production; git_status_clean=false; changed_path_count=10.
- PROVEN: repo_head=d609139; origin_main_head=d609139.
- PROVEN: credit_evidence_present=true; credit_status=exhausted.
- PROVEN: local_build_recommended=false; local_build_optional=true; push_allowed=true; production_deploy_recommended=false.
- PROVEN: owner-recorded credit reset_at=2026-07-24T00:00:00.000Z.
- PROVEN: latest skipped production deploy recorded at/after 853ee79.

## Unknown facts

- UNKNOWN: Live Netlify billing/credit balance was not queried via API (no safe read-only Netlify credit API authorized in this lane).
- UNKNOWN: Whether origin/main auto-deploy is currently hard-disabled in Netlify UI beyond owner screenshot evidence.

## Risk notes

- This control center does not spend credits and does not call Netlify APIs.
- Do not treat production_deploy_recommended=true as authorization to buy credits or force-deploy.
- Avoid unnecessary production builds/deploys while status=exhausted.
- Manual owner updates to netlify-credit-state-v1.json are the durable credit evidence source for this v1.

