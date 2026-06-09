# HyperAgent mission packet v0 — edr2rxd1-bounded-evidence-slice-62ac6eaa

- contract: `hyperagent_mission_packet_v0`
- loop_iteration: **1**
- loop_halt_after_dispatch: **true**
- halt_condition: `DISPATCH_RECORDED`
- mission_type: `BOUNDED_EVIDENCE_SLICE`
- family_key: `filter::whirlpool::edr2rxd1`
- queue_item_id: `3015ad03fe3721ad`
- dedup_key: `BOUNDED_EVIDENCE_SLICE:filter::whirlpool::edr2rxd1`
- deliverable: `data/fridge/batch-production/drafts/edr2rxd1-bounded-evidence-slice-62ac6eaa-hyperagent-ingest-packet-v1.json`
- truth_closure_claimed: **false**
- mutation_authorized: **false**

## Named skills used

- `buildHyperAgentWorkQueueV1`
- `buildHyperAgentDispatchRegistryV1`
- `isHyperAgentRedispatchBlockedV1`
- `hyperAgentDedupKeyV1`
- `hyperAgentSlugBatchFingerprintV1`
- `buildBoundedEvidenceSlicePromptV0`
- `buildCopyPastePromptV0`

## Copy-paste prompt

```
BuckParts HYPERAGENT_ORCHESTRATOR_V0 — BOUNDED_EVIDENCE_SLICE
family_key: filter::whirlpool::edr2rxd1
mission_type: BOUNDED_EVIDENCE_SLICE
scope_key: filter::whirlpool::edr2rxd1
queue_item_id: 3015ad03fe3721ad
IMPORTANT: Full-family HyperAgent scaling is BLOCKED for this family.
Run BOUNDED RESEARCH ONLY on the exact slug batch below.
Slug batch (10):
- whirlpool-wrf535smhm
- whirlpool-wrf540sihz
- whirlpool-wrf554chhz
- whirlpool-wrf555sdam
- whirlpool-wrf757sdhb
- whirlpool-wrf767sdhz
- whirlpool-wrf954cihz
- whirlpool-wrs315sdhb
- whirlpool-wrs315sdhz
- whirlpool-wrs325snhz
Requirements:
- Find official manufacturer filter_specification evidence for each exact model slug
- Output deliverable contract buckparts_hyperagent_ingest_packet_v1 with candidate_rows per slug
- Set discovery_status=DISCOVERY_COMPLETE on the ingest packet when research is done
- truth_closure_claimed=false on the ingest packet
- mutation_authorized=false — no compatibility_mappings.csv, filters.csv, fridge_models.csv, manual-evidence JSON, Supabase, pages, sitemap, robots, or retailer link edits
- Terminal state per row required (DISCOVERY_COMPLETE | DISCOVERY_BLOCKED | NEEDS_OWNER_REVIEW)
- Official manufacturer pages are highest-confidence; third-party sources are discovery input only
- INFERRED or color-variant extrapolation must not be presented as repo truth
Repo context: pre-research LOW, but family reconciliation MEDIUM.
Queue title: Run bounded evidence research only for `filter::whirlpool::edr2rxd1` — not full-family scaling, no compat mutation, no evidence promotion without owner-reviewed manual evidence; family reconciliation remains MEDIUM.
```
