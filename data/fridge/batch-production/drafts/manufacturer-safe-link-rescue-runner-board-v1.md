# Manufacturer safe-link rescue runner board v1

- generated_at: **2026-06-26T03:13:09.669Z**
- director_generated_at: **2026-06-26T02:21:07.884Z**
- orchestrator_generated_at: **2026-06-26T02:10:46.330Z**
- ready_for_apply_slug: **ultrawf**
- remaining_opportunity: **20**

## Boardy safety contract

- browser proof freshness required before owner review / apply
- wrong-family validation required when confusion-family blockers present
- exactly one READY_FOR_APPLY candidate at a time
- re-audit begins immediately after apply

## Execution order (top 15)

1. `ultrawf` — **READY_FOR_APPLY** (frigidaire)
   - Single guarded apply slot — owner-approved CSV apply executor may run for this slug only; re-audit required immediately after apply.

2. `eptwfu01` — **OWNER_REVIEW** (frigidaire)
   - Owner review complete — waiting for one-at-a-time READY_FOR_APPLY slot (another slug holds apply turn).

3. `wf3cb` — **OWNER_REVIEW** (frigidaire)
   - Owner review complete — waiting for one-at-a-time READY_FOR_APPLY slot (another slug holds apply turn).

4. `wfcb` — **OWNER_REVIEW** (frigidaire)
   - Owner review complete — waiting for one-at-a-time READY_FOR_APPLY slot (another slug holds apply turn).

5. `edr4rxd1` — **BROWSER_PROOF** (everydrop_whirlpool)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

6. `edr3rxd1` — **BROWSER_PROOF** (everydrop_whirlpool)
   - Refresh on-disk browser proof artifact (PASS required) before owner review or apply.

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
- BROWSER_PROOF: **15**
- OWNER_REVIEW: **3**
- READY_FOR_APPLY: **1**
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
- bottleneck_stage: **OWNER_REVIEW**
- estimated_browser_hours_remaining: **0**

### ge_appliance_parts

- remaining_slug_count: **8**
- bottleneck_stage: **BROWSER_PROOF**
- estimated_browser_hours_remaining: **6**

## Bottlenecks

- **BROWSER_PROOF** (15 slugs) — dominant blocker: `owner_apply_approval_missing`
  - examples: `edr4rxd1`, `edr3rxd1`, `gswf`, `xwfe`, `4396508`
- **BLOCKED** (7 slugs) — dominant blocker: `repo_proven_official_pdp_url_missing`
  - examples: `frig-242086201`, `fppwfu01`, `frig-242017801`, `wf2cb`, `frig-242294502`
- **OWNER_REVIEW** (3 slugs) — dominant blocker: `confusion_family_review_required`
  - examples: `eptwfu01`, `wf3cb`, `wfcb`
- **READY_FOR_APPLY** (1 slugs) — dominant blocker: `confusion_family_review_required`
  - examples: `ultrawf`

## Post-apply validation checklist

- Re-run npm run buckparts:manufacturer-safe-link-rescue-orchestrator
- Re-run npm run buckparts:manufacturer-safe-link-rescue-director
- Re-run npm run buckparts:manufacturer-safe-link-rescue-runner
- Re-run model_filter_correctness_audit_v1 for applied slug parity
- Confirm csv_primary_is_search_placeholder=false only after owner approval packet
- Do not set coverage_unlocked=true from runner or director artifacts

## Recommended next action

READY_FOR_APPLY slot held by ultrawf — guarded apply executor only; re-audit after apply.

