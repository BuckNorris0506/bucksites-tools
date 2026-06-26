# Manufacturer browser proof refresh orchestrator v1

- generated_at: **2026-06-26T20:02:47.406Z**
- factory_generated_at: **2026-06-26T20:02:46.830Z**
- scheduled_slug_count: **25**
- manufacturer_refresh_batch_count: **3**
- browser_proof_max_age_days: **14**
- deploy_marker: **UNKNOWN**

## Manufacturer refresh batches

### refresh_batch_frigidaire
- manufacturer: **frigidaire**
- scheduled_slug_count: **10**
- max_refresh_priority: **100**
- capture_strategies: owner_browser_proof_session_assist
- ge_normalization_draft_only: **false**
- commands: `npm run buckparts:fridge-safe-link-owner-browser-proof-session (owner visual inspection required)`
- slugs: fppwfu01, frig-242017801, frig-242086201, frig-242294502, purepour, wf2cb, eptwfu01, ultrawf, wf3cb, wfcb
- post_capture: Owner browser proof session required — factory never auto-grants PASS_BROWSER_PROOF.

### refresh_batch_ge-appliance-parts
- manufacturer: **ge_appliance_parts**
- scheduled_slug_count: **8**
- max_refresh_priority: **100**
- capture_strategies: ge_automated_playwright_spec_capture
- ge_normalization_draft_only: **true**
- commands: `npm run buckparts:ge-refrigerator-rescue-capture -- --all`
- slugs: gswf, gswf2, mswf, opfg3f, pfmwf, smartwater-mwfp, xwf, xwfe
- post_capture: GE Playwright capture may produce browser evidence only — owner must reconcile normalization draft and record PASS owner browser proof manually.

### refresh_batch_everydrop-whirlpool
- manufacturer: **everydrop_whirlpool**
- scheduled_slug_count: **7**
- max_refresh_priority: **100**
- capture_strategies: owner_browser_proof_session_assist
- ge_normalization_draft_only: **false**
- commands: `npm run buckparts:fridge-safe-link-owner-browser-proof-session (owner visual inspection required)`
- slugs: 4396395, 4396508, 4396842, ukf8001, w10413645a, edr3rxd1, edr4rxd1
- post_capture: Owner browser proof session required — factory never auto-grants PASS_BROWSER_PROOF.

## Recommended next action

Execute 3 manufacturer refresh batch(es) in priority order; owner review required before PASS owner-browser-proof artifacts. Then re-run factory, readiness gate, and apply-plan factory.

