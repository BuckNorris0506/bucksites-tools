# Manufacturer Rescue throughput analytics v1

- generated_at: **2026-07-03T21:55:52.153Z**
- intake_complete: **true**
- rescue_candidates: **25**
- furthest_funnel_stage: **applied_or_complete**

## Funnel stage counts

- rescue_candidate: **1** (conversion 25)
- browser_proof_capture_scheduled: **21** (conversion 24)
- browser_proof_fresh_official_pass: **0** (conversion 3)
- apply_plan_ready_for_owner_review: **1** (conversion 3)
- owner_approval_packet_cohort: **0** (conversion 2)
- readiness_gate_ready_for_apply: **0** (conversion 2)
- runner_ready_for_apply: **0** (conversion 2)
- applied_or_complete: **2** (conversion 2)

## Top bottlenecks

1. **browser_proof_missing_or_not_pass** — 20 slug(s); leverage 200
2. **owner_apply_approval_missing** — 13 slug(s); leverage 130
3. **owner_apply_approval_missing** — 14 slug(s); leverage 112
4. **csv_apply_not_authorized** — 10 slug(s); leverage 100
5. **supabase_mutation_not_authorized** — 10 slug(s); leverage 100

## Manufacturer throughput

| manufacturer | candidates | capture_scheduled | fresh_pass | ready_for_apply |
| --- | ---: | ---: | ---: | ---: |
| frigidaire | 9 | 9 | 0 | 0 |
| ge_appliance_parts | 9 | 8 | 0 | 0 |
| everydrop_whirlpool | 7 | 7 | 0 | 0 |

## Weekly unlock capacity

- estimated_slugs_per_week: **UNKNOWN**
- theoretical_ceiling_if_primary_bottleneck_cleared: **3**
- single_blocker_browser_proof_refresh_candidates: **0**

## Recommended highest-leverage improvement

Refresh stale owner browser proof for guarded apply nominees, then regenerate readiness gate and apply-plan factory.

manufacturer_rescue_throughput_analytics_v1 is the read-only Manufacturer Rescue KPI dashboard — consumes committed artifacts only.

