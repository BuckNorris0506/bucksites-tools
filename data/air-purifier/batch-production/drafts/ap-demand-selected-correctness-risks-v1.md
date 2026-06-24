# AP Demand-Selected Batch — Correctness Risks (vornado and renpho superseded)

**Contract:** `ap_demand_selected_correctness_risks_v1` · **Read-only** · **Generated:** 2026-06-24T02:00:00.000Z

## Executive summary

| Slug | Verdict | Label |
|------|---------|-------|
| `vornado-md1-0023` | `catalog_identity_repaired_csv_f3c2141` | PROVEN — BP-000005 CLOSED_PROVEN |
| `renpho-rp-ap003` | `catalog_suppressed_no_safe_path` | PROVEN — BP-000006 CLOSED_PROVEN |

Mechanical discovery validation (`VALIDATION_PASS`, 84/84) does **not** override owner-closed catalog dispositions. **No blocking correctness-risk verdicts remain.**

## renpho-rp-ap003 (CLOSED_PROVEN)

**Disposition:** suppress + no-safe-path.

| Fact | Label |
|------|-------|
| Bogus filter slug removed from `filters.csv` and `retailer_links.csv` | PROVEN |
| `renpho-rp-ap003` retained model-only in `models.csv` | PROVEN |
| Self-edge + ap001/ap002/ap080 compat edges to bogus filter removed | PROVEN |
| No buyer path created; aftermarket not promoted | PROVEN |
| Model-first `NO_SAFE_PATH_FOUND`; Renpho sells 0 filters on renpho.com | PROVEN |

## Authority artifacts

- `data/air-purifier/batch-production/audits/ap-demand-selected-correctness-risks-v1.json`
- `data/command-center/issues/BP-000006.json`
- `data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-renpho-rp-ap003-live-browser-v1.results.json`
