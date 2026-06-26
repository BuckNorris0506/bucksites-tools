# Manufacturer browser proof owner work packet v1

- generated_at: **2026-06-26T18:56:29.399Z**
- stale_count: **6**
- missing_count: **19**

## Trust gates (never weakened)

- exact-token proof required before PASS
- wrong-family tokens fail closed
- official PDP path type required for official_pass
- factory never auto-grants PASS_BROWSER_PROOF

## Owner session work (grouped by strategy)

### frigidaire
- slugs: eptwfu01, fppwfu01, frig-242017801, frig-242086201, frig-242294502, purepour, ultrawf, wf2cb, wf3cb, wfcb
- command: `npm run buckparts:fridge-safe-link-owner-browser-proof-session (owner visual inspection required)`

- **eptwfu01** — STALE
  - target: https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/EPTWFU01
  - owner proof artifact: `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-eptwfu01-v1.json`
- **fppwfu01** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`
- **frig-242017801** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`
- **frig-242086201** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`
- **frig-242294502** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`
- **purepour** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`
- **ultrawf** — STALE
  - target: https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/ULTRAWF
  - owner proof artifact: `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-ultrawf-v1.json`
- **wf2cb** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`
- **wf3cb** — STALE
  - target: https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB
  - owner proof artifact: `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-wf3cb-v1.json`
- **wfcb** — STALE
  - target: https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WFCB
  - owner proof artifact: `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-wfcb-v1.json`

### everydrop_whirlpool
- slugs: 4396395, 4396508, 4396842, edr3rxd1, edr4rxd1, ukf8001, w10413645a
- command: `npm run buckparts:fridge-safe-link-owner-browser-proof-session (owner visual inspection required)`

- **4396395** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`
- **4396508** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`
- **4396842** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`
- **edr3rxd1** — STALE
  - target: https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html
  - owner proof artifact: `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr3rxd1-v1.json`
- **edr4rxd1** — STALE
  - target: https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html
  - owner proof artifact: `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json`
- **ukf8001** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`
- **w10413645a** — MISSING
  - target: UNKNOWN
  - owner proof artifact: `UNKNOWN`

## Downstream

manufacturer_safe_link_rescue_readiness_gate_v1 remains sole READY_FOR_APPLY promotion authority.
manufacturer_safe_link_rescue_apply_plan_factory_v1 consumes fresh official PASS owner proof only.

## Recommended next action

Execute 3 batched capture batch(es) (25 slug(s)); owner review required before PASS owner-browser-proof artifacts. Then re-run readiness gate and apply-plan factory.

