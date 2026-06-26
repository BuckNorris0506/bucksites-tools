# Manufacturer safe-link rescue runner board v1

- generated_at: **2026-06-26T04:52:03.476Z**
- director_generated_at: **2026-06-26T02:21:07.884Z**
- orchestrator_generated_at: **2026-06-26T02:10:46.330Z**
- ready_for_apply_slug: **NONE**
- remaining_opportunity: **20**

## Boardy safety contract

- browser proof freshness required before owner review / apply
- wrong-family validation required when confusion-family blockers present
- exactly one READY_FOR_APPLY candidate at a time
- re-audit begins immediately after apply

## Execution order (top 15)

1. `edr4rxd1` — **BROWSER_PROOF** (everydrop_whirlpool)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

2. `edr3rxd1` — **BROWSER_PROOF** (everydrop_whirlpool)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

3. `ultrawf` — **BROWSER_PROOF** (frigidaire)
   - Run read-only browser proof capture — Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

4. `eptwfu01` — **BROWSER_PROOF** (frigidaire)
   - Run read-only browser proof capture — Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

5. `wf3cb` — **BROWSER_PROOF** (frigidaire)
   - Run read-only browser proof capture — Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

6. `wfcb` — **BROWSER_PROOF** (frigidaire)
   - Run read-only browser proof capture — Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

7. `gswf` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

8. `xwfe` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

9. `4396508` — **BROWSER_PROOF** (everydrop_whirlpool)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

10. `xwf` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

11. `gswf2` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

12. `opfg3f` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

13. `smartwater-mwfp` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

14. `w10413645a` — **BROWSER_PROOF** (everydrop_whirlpool)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

15. `mswf` — **BROWSER_PROOF** (ge_appliance_parts)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

## Stage counts

- DISCOVER: **0**
- BROWSER_PROOF: **19**
- OWNER_REVIEW: **0**
- READY_FOR_APPLY: **0**
- APPLIED: **0**
- REAUDIT_DUE: **0**
- COMPLETE: **1**
- BLOCKED: **7**

## Manufacturer workloads

### everydrop_whirlpool

- remaining_slug_count: **7**
- bottleneck_stage: **BROWSER_PROOF**
- estimated_browser_hours_remaining: **3.5**

### frigidaire

- remaining_slug_count: **4**
- bottleneck_stage: **BROWSER_PROOF**
- estimated_browser_hours_remaining: **2**

### ge_appliance_parts

- remaining_slug_count: **8**
- bottleneck_stage: **BROWSER_PROOF**
- estimated_browser_hours_remaining: **6**

## Bottlenecks

- **BROWSER_PROOF** (19 slugs) — dominant blocker: `owner_apply_approval_missing`
  - examples: `edr4rxd1`, `edr3rxd1`, `ultrawf`, `eptwfu01`, `wf3cb`
- **BLOCKED** (7 slugs) — dominant blocker: `repo_proven_official_pdp_url_missing`
  - examples: `frig-242086201`, `fppwfu01`, `frig-242017801`, `wf2cb`, `frig-242294502`

## Post-apply validation checklist

- Re-run npm run buckparts:manufacturer-safe-link-rescue-orchestrator
- Re-run npm run buckparts:manufacturer-safe-link-rescue-director
- Re-run npm run buckparts:manufacturer-safe-link-rescue-runner
- Re-run model_filter_correctness_audit_v1 for applied slug parity
- Confirm csv_primary_is_search_placeholder=false only after owner approval packet
- Do not set coverage_unlocked=true from runner or director artifacts

## Recommended next action

PENDING_BROWSER_REFRESH for edr4rxd1: Refresh owner browser proof artifact for edr4rxd1 (PASS required, within freshness window).

