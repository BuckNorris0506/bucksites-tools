# HyperAgent mission packet v0 — gswf-bounded-evidence-slice-5a735d4a

- contract: `hyperagent_mission_packet_v0`
- loop_iteration: **1**
- loop_halt_after_dispatch: **true**
- halt_condition: `DISPATCH_RECORDED`
- mission_type: `BOUNDED_EVIDENCE_SLICE`
- family_key: `filter::ge::gswf`
- queue_item_id: `bd9f2dccb72a7d1d`
- dedup_key: `BOUNDED_EVIDENCE_SLICE:filter::ge::gswf`
- deliverable: `data/fridge/batch-production/drafts/gswf-bounded-evidence-slice-5a735d4a-hyperagent-ingest-packet-v1.json`
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
family_key: filter::ge::gswf
mission_type: BOUNDED_EVIDENCE_SLICE
scope_key: filter::ge::gswf
queue_item_id: bd9f2dccb72a7d1d
IMPORTANT: Full-family HyperAgent scaling is BLOCKED for this family.
Run BOUNDED RESEARCH ONLY on the exact slug batch below.
Slug batch (17):
- ge-cwe23sshww
- ge-gfe24jgkww
- ge-gfe27jmkes
- ge-gfe28gmkbb
- ge-gfe28gskes
- ge-gfe28hmkww
- ge-gfe28hskss
- ge-gne25jmkww
- ge-gne27jstss
- ge-gsc25frshss
- ge-gse25hskss
- ge-gse26gshess
- ge-gte18gsnrss
- ge-gye22gskww
- ge-pfe28kmkww
- ge-pfe28kynbb
- ge-pvd28bymfs
Requirements:
- Find official manufacturer filter_specification evidence for each exact model slug
- Output deliverable contract buckparts_hyperagent_ingest_packet_v1 with candidate_rows per slug
- Set discovery_status=DISCOVERY_COMPLETE on the ingest packet when research is done
- truth_closure_claimed=false on the ingest packet
- mutation_authorized=false — no compatibility_mappings.csv, filters.csv, fridge_models.csv, manual-evidence JSON, Supabase, pages, sitemap, robots, or retailer link edits
- Terminal state per row required (DISCOVERY_COMPLETE | DISCOVERY_BLOCKED | NEEDS_OWNER_REVIEW)
- Official manufacturer pages are highest-confidence; third-party sources are discovery input only
- INFERRED or color-variant extrapolation must not be presented as repo truth
Repo context: mission_factory_registry mission_id=MF-2026-0003 source=data/fridge/batch-production/audits/evidence-leverage-prioritization-v1.json
Queue title: EVIDENCE_SCALING — filter::ge::gswf
```
