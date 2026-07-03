# Manufacturer safe-link rescue runner board v1

- generated_at: **2026-07-03T21:55:52.150Z**
- director_generated_at: **2026-07-03T21:55:52.146Z**
- orchestrator_generated_at: **2026-07-03T21:55:52.145Z**
- ready_for_apply_slug: **NONE**
- remaining_opportunity: **20**

## Boardy safety contract

- browser proof freshness required before owner review / apply
- wrong-family validation required when confusion-family blockers present
- exactly one READY_FOR_APPLY candidate at a time
- re-audit begins immediately after apply

## Execution order (top 15)

1. `edr4rxd1` — **REAUDIT_DUE** (everydrop_whirlpool)
   - Re-run orchestrator + director + model correctness audit after apply; parity UNKNOWN until validation passes.

2. `edr3rxd1` — **REAUDIT_DUE** (everydrop_whirlpool)
   - Re-run orchestrator + director + model correctness audit after apply; parity UNKNOWN until validation passes.

3. `eptwfu01` — **BROWSER_PROOF** (frigidaire)
   - Run read-only browser proof capture — Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

4. `wf3cb` — **BROWSER_PROOF** (frigidaire)
   - Run read-only browser proof capture — Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

5. `wfcb` — **BROWSER_PROOF** (frigidaire)
   - Run read-only browser proof capture — Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

6. `gswf` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

7. `xwfe` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

8. `xwf` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

9. `gswf2` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

10. `opfg3f` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

11. `smartwater-mwfp` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

12. `w10413645a` — **BROWSER_PROOF** (everydrop_whirlpool)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

13. `mswf` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

14. `pfmwf` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

15. `4396842` — **BROWSER_PROOF** (everydrop_whirlpool)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

## Stage counts

- DISCOVER: **0**
- BROWSER_PROOF: **14**
- OWNER_REVIEW: **0**
- READY_FOR_APPLY: **0**
- APPLIED: **2**
- REAUDIT_DUE: **2**
- COMPLETE: **1**
- BLOCKED: **7**

## Manufacturer workloads

### everydrop_whirlpool

- remaining_slug_count: **7**
- bottleneck_stage: **BROWSER_PROOF**
- estimated_browser_hours_remaining: **1.5**

### frigidaire

- remaining_slug_count: **3**
- bottleneck_stage: **BROWSER_PROOF**
- estimated_browser_hours_remaining: **1.5**

### ge_appliance_parts

- remaining_slug_count: **8**
- bottleneck_stage: **BROWSER_PROOF**
- estimated_browser_hours_remaining: **6**

## Bottlenecks

- **BROWSER_PROOF** (14 slugs) — dominant blocker: `owner_apply_approval_missing`
  - examples: `eptwfu01`, `wf3cb`, `wfcb`, `gswf`, `xwfe`
- **BLOCKED** (7 slugs) — dominant blocker: `repo_proven_official_pdp_url_missing`
  - examples: `frig-242086201`, `fppwfu01`, `frig-242017801`, `wf2cb`, `frig-242294502`
- **REAUDIT_DUE** (2 slugs) — dominant blocker: `NONE`
  - examples: `edr4rxd1`, `edr3rxd1`
- **APPLIED** (2 slugs) — dominant blocker: `live_browser_capture_unavailable_or_failed`
  - examples: `4396508`, `ukf8001`

## Post-apply validation checklist

- Re-run npm run buckparts:manufacturer-safe-link-rescue-orchestrator
- Re-run npm run buckparts:manufacturer-safe-link-rescue-director
- Re-run npm run buckparts:manufacturer-safe-link-rescue-runner
- Re-run model_filter_correctness_audit_v1 for applied slug parity
- Confirm csv_primary_is_search_placeholder=false only after owner approval packet
- Do not set coverage_unlocked=true from runner or director artifacts

## Recommended next action

PENDING_BROWSER_REFRESH for eptwfu01: Refresh owner browser proof artifact for eptwfu01 (PASS required, within freshness window).

