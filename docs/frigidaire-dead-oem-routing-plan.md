# Frigidaire Dead OEM Routing Plan (No-Mutation)

## Goal

Define a safe, no-mutation plan to route five dead Frigidaire OEM search tokens away from non-working OEM search URLs and toward repo-proven compatible-aftermarket paths.

This document is planning-only. It does not perform DB writes or retailer-link mutations.

## Scope

Target tokens:

- `242017801`
- `242086201`
- `242294502`
- `EPTWFU01`
- `FPPWFU01`

## Repo-Proven Routing Map

Source of truth: `scripts/report-frigidaire-replacement-strategy.ts` output (`buckparts_frigidaire_replacement_strategy_v1`), where all five targets are `oem_status: "DEAD"` and `recommended_path: "COMPATIBLE_AFTERMARKET_PARTS"`.

| token | current dead OEM row (CSV) | dead OEM URL | db link_id availability | repo-proven compatible-aftermarket path |
| --- | --- | --- | --- | --- |
| `242017801` | `filter_slug=frig-242017801`, `retailer_key=oem-parts-catalog` | `https://www.frigidaire.com/en/catalogsearch/result/?q=242017801` | Not present in repo CSV; resolve from DB at mutation time | `https://buckparts.com/filter/frig-242017801` |
| `242086201` | `filter_slug=frig-242086201`, `retailer_key=oem-parts-catalog` | `https://www.frigidaire.com/en/catalogsearch/result/?q=242086201` | Not present in repo CSV; resolve from DB at mutation time | `https://buckparts.com/filter/frig-242086201` |
| `242294502` | `filter_slug=frig-242294502`, `retailer_key=oem-parts-catalog` | `https://www.frigidaire.com/en/catalogsearch/result/?q=242294502` | Not present in repo CSV; resolve from DB at mutation time | `https://buckparts.com/filter/frig-242294502` |
| `EPTWFU01` | `filter_slug=eptwfu01`, `retailer_key=oem-parts-catalog` | `https://www.frigidaire.com/en/catalogsearch/result/?q=EPTWFU01` | Not present in repo CSV; resolve from DB at mutation time | `https://buckparts.com/filter/eptwfu01` |
| `FPPWFU01` | `filter_slug=fppwfu01`, `retailer_key=oem-parts-catalog` | `https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01` | Not present in repo CSV; resolve from DB at mutation time | `https://buckparts.com/filter/fppwfu01` |

## Safe Mutation Rules (For Future Execution)

1. Do not delete, overwrite, or downgrade existing evidence artifacts.
2. Do not convert dead OEM search URLs into buy CTAs under any condition.
3. Treat dead OEM rows as blocked/remediation-only records until replacement is verified.
4. Promote only the compatible-aftermarket CTA path for each token and only if the candidate link passes the full buy-link gate.
5. If full gate does not pass, keep state as no-buy/unknown and do not force promotion.
6. Keep APP/Amazon exact-token paths unpromoted unless separately proven by repo + browser evidence.

## Future Mutation Procedure (When Authorized)

1. Resolve exact DB `link_id` values for the five target dead OEM rows using token/filter_slug + `retailer_key=oem-parts-catalog`.
2. For each token, stage compatible-aftermarket replacement candidate from the mapping above.
3. Evaluate staged candidate through full gate (URL class + browser truth + token safety constraints).
4. Apply mutation only for records that pass full gate.
5. Preserve no-buy/unknown state for records that fail or remain unproven.
6. Record post-mutation evidence and decisions in a dated evidence artifact.

## Required Post-Mutation Validation Commands

```bash
npm test
npm run buckparts:audit
npm run build
npm run buckparts:command-surface
npm run buckparts:blocked-link-queue
```

