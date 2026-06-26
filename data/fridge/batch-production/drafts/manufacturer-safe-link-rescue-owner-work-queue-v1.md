# Manufacturer safe-link rescue owner work queue (read-only)

Generated: 2026-06-26T02:10:46.330Z
Source: `npm run buckparts:manufacturer-safe-link-rescue-orchestrator`

## Authorization

- mutation_authorized: **false**
- csv_apply_authorized: **false**
- supabase_mutation_authorized: **false**
- coverage_unlocked: **false**

## Next browser captures

- **gswf** (ge_appliance_parts, rank 7) — Run read-only GE browser capture for gswf; owner approval before any CSV apply.
  - Adapter discovery only (not repo-proven): https://www.geapplianceparts.com/store/parts/spec/GSWF

- **xwfe** (ge_appliance_parts, rank 8) — Run read-only GE browser capture for xwfe; owner approval before any CSV apply.
  - Adapter discovery only (not repo-proven): https://www.geapplianceparts.com/store/parts/spec/XWFE

- **xwf** (ge_appliance_parts, rank 11) — Run read-only GE browser capture for xwf; owner approval before any CSV apply.
  - Adapter discovery only (not repo-proven): https://www.geapplianceparts.com/store/parts/spec/XWF

- **gswf2** (ge_appliance_parts, rank 13) — Run read-only GE browser capture for gswf2; owner approval before any CSV apply.
  - Adapter discovery only (not repo-proven): https://www.geapplianceparts.com/store/parts/spec/GSWF2

- **opfg3f** (ge_appliance_parts, rank 16) — Run read-only GE browser capture for opfg3f; owner approval before any CSV apply.
  - Adapter discovery only (not repo-proven): https://www.geapplianceparts.com/store/parts/spec/OPFG3F

- **smartwater-mwfp** (ge_appliance_parts, rank 18) — Run read-only GE browser capture for smartwater-mwfp; owner approval before any CSV apply.
  - Adapter discovery only (not repo-proven): https://www.geapplianceparts.com/store/parts/spec/MWFP

- **mswf** (ge_appliance_parts, rank 21) — Run read-only GE browser capture for mswf; owner approval before any CSV apply.
  - Adapter discovery only (not repo-proven): https://www.geapplianceparts.com/store/parts/spec/MSWF

- **pfmwf** (ge_appliance_parts, rank 22) — Run read-only GE browser capture for pfmwf; owner approval before any CSV apply.
  - Adapter discovery only (not repo-proven): https://www.geapplianceparts.com/store/parts/spec/PFMWF

## Next owner reviews

- **edr4rxd1** (everydrop_whirlpool, READY) — browser=PASS
  - Complete owner-browser checklist or rerun capture for edr4rxd1; do not draft apply plan until whirlpool_official_pdp_proof_result=PROVEN.

- **edr3rxd1** (everydrop_whirlpool, READY) — browser=PASS
  - Complete owner-browser checklist or rerun capture for edr3rxd1; do not draft apply plan until whirlpool_official_pdp_proof_result=PROVEN.

- **ultrawf** (frigidaire, SUPERSESSION_REVIEW) — browser=PASS
  - Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

- **eptwfu01** (frigidaire, SUPERSESSION_REVIEW) — browser=PASS
  - Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

- **wf3cb** (frigidaire, SUPERSESSION_REVIEW) — browser=PASS
  - Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

- **wfcb** (frigidaire, SUPERSESSION_REVIEW) — browser=PASS
  - Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

## Next guarded apply candidates

_Apply still requires separate owner-approved executor — orchestrator does not authorize CSV mutation._

- **edr4rxd1** (everydrop_whirlpool, rank 1)
  - Repo-proven URL: https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html

- **edr3rxd1** (everydrop_whirlpool, rank 2)
  - Repo-proven URL: https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html

- **ultrawf** (frigidaire, rank 3)
  - Repo-proven URL: https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/ULTRAWF

- **eptwfu01** (frigidaire, rank 4)
  - Repo-proven URL: https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/EPTWFU01

- **wf3cb** (frigidaire, rank 5)
  - Repo-proven URL: https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB

- **wfcb** (frigidaire, rank 6)
  - Repo-proven URL: https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WFCB

## Recommended execution order (top 10)

1. `edr4rxd1` — everydrop_whirlpool — score=1197
2. `edr3rxd1` — everydrop_whirlpool — score=1184
3. `ultrawf` — frigidaire — score=1105
4. `eptwfu01` — frigidaire — score=1085
5. `wf3cb` — frigidaire — score=1012
6. `wfcb` — frigidaire — score=902
7. `gswf` — ge_appliance_parts — score=788
8. `xwfe` — ge_appliance_parts — score=735
9. `4396508` — everydrop_whirlpool — score=687
10. `frig-242086201` — frigidaire — score=655
