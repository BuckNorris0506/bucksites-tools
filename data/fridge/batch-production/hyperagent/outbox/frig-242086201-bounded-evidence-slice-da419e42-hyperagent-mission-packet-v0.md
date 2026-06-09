# HyperAgent mission packet v0 — frig-242086201-bounded-evidence-slice-da419e42

- contract: `hyperagent_mission_packet_v0`
- loop_iteration: **1**
- loop_halt_after_dispatch: **true**
- halt_condition: `DISPATCH_RECORDED`
- mission_type: `BOUNDED_EVIDENCE_SLICE`
- family_key: `filter::frigidaire::frig-242086201`
- queue_item_id: `e9da65b8a02782b0`
- dedup_key: `BOUNDED_EVIDENCE_SLICE:filter::frigidaire::frig-242086201`
- deliverable: `data/fridge/batch-production/drafts/frig-242086201-bounded-evidence-slice-da419e42-hyperagent-ingest-packet-v1.json`
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
family_key: filter::frigidaire::frig-242086201
mission_type: BOUNDED_EVIDENCE_SLICE
scope_key: filter::frigidaire::frig-242086201
queue_item_id: e9da65b8a02782b0
IMPORTANT: Full-family HyperAgent scaling is BLOCKED for this family.
Run BOUNDED RESEARCH ONLY on the exact slug batch below.
Slug batch (4):
- frigidaire-crss2623as
- frigidaire-ffht1621qs
- frigidaire-fghd2368tf
- frigidaire-fghn2868pf
Requirements:
- Find official manufacturer filter_specification evidence for each exact model slug
- Output deliverable contract buckparts_hyperagent_ingest_packet_v1 with candidate_rows per slug
- Set discovery_status=DISCOVERY_COMPLETE on the ingest packet when research is done
- truth_closure_claimed=false on the ingest packet
- mutation_authorized=false — no compatibility_mappings.csv, filters.csv, fridge_models.csv, manual-evidence JSON, Supabase, pages, sitemap, robots, or retailer link edits
- Terminal state per row required (DISCOVERY_COMPLETE | DISCOVERY_BLOCKED | NEEDS_OWNER_REVIEW)
- Official manufacturer pages are highest-confidence; third-party sources are discovery input only
- INFERRED or color-variant extrapolation must not be presented as repo truth
Repo context: Evidence leverage ranks filter::frigidaire::frig-242086201 highly, but pre-research risk screen blocks full-family scaling (15 sibling conflicts, 0 learned-failure blocks).
Queue title: Block full-family HyperAgent dispatch for `filter::frigidaire::frig-242086201` — pre-research risk screen HIGH/NEEDS_REPO_RECONCILIATION_FIRST. Optional 4-slug conflict-free research slice (frigidaire-crss2623as, frigidaire-ffht1621qs, frigidaire-fghd2368tf, frigidaire-fghn2868pf) — not full-family scaling.
```
