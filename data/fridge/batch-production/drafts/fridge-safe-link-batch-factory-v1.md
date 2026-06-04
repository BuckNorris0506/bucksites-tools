# Fridge safe-link batch factory v1 (read-only)

Generated: 2026-06-04T21:35:30.409Z

## Cohort summary

- total_missing_before: **26**
- eligible_now_count: **0**
- owner_browser_needed_count: **7**
- owner_browser_proof_candidate_count: **7**
- no_safe_count: **5**
- conflict_count: **5**
- do_not_use_count: **1**
- validation_status: **VALIDATION_PARTIAL**
- bundle_authentic: **true**
- owner_browser_proof_bundle_authentic: **true**
- validation_overlay_applied: **true**
- owner_browser_proof_overlay_applied: **true**
- compatibility_label_count: **8**
- expected_coverage_delta: **+0** (31 → 31 if eligible applied)

## Proposed first batch (existing proof only)

_None — no slug has APPLY_ELIGIBLE_WITH_EXISTING_PROOF._

## All rows

| slug | state | blockers |
|------|-------|----------|
| edr4rxd1 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| edr3rxd1 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| gswf | CONFLICT_REQUIRES_RECONCILIATION | mutation_authorized=false; verified_link_authorized=false |
| 4396508 | CONFLICT_REQUIRES_RECONCILIATION | mutation_authorized=false; verified_link_authorized=false |
| ultrawf | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| frig-242086201 | CONFLICT_REQUIRES_RECONCILIATION | mutation_authorized=false; verified_link_authorized=false |
| eptwfu01 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| xwfe | CONFLICT_REQUIRES_RECONCILIATION | mutation_authorized=false; verified_link_authorized=false |
| fppwfu01 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| wf2cb | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| frig-242017801 | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| frig-242294502 | DO_NOT_USE_WRONG_PART_RISK | mutation_authorized=false; verified_link_authorized=false |
| purepour | CONFLICT_REQUIRES_RECONCILIATION | mutation_authorized=false; verified_link_authorized=false |
| wf3cb | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| wfcb | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| w10413645a | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| xwf | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| adq75795101 | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| gswf2 | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |
| opfg3f | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |
| smartwater-mwfp | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| da97-17376a | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| da97-19467c | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |
| mswf | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| pfmwf | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |
| 4396842 | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |

## Blocked / do-not-use

- **gswf** — CONFLICT_REQUIRES_RECONCILIATION: Cursor validation overlay (PARTIAL): batch_factory_state_at_discovery=APPLY_ELIGIBLE_WITH_EXISTING_PROOF but repo batch_factory now=CONFLICT_REQUIRES_RECONCILIATION [pre-overlay: APPLY_ELIGIBLE_WITH_EXISTING_PROOF]
- **4396508** — CONFLICT_REQUIRES_RECONCILIATION: PROVEN repo Amazon evidence vs HyperAgent NO_SAFE_LINK_FOUND — lane stopped; do not apply until reconciled.
- **frig-242086201** — CONFLICT_REQUIRES_RECONCILIATION: Owner-browser-proof validation overlay (BLOCKED_CONFLICT): 242086201 vs 242086203 / WF3CB equivalence not repo-proven [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **xwfe** — CONFLICT_REQUIRES_RECONCILIATION: Cursor validation overlay (PARTIAL): batch_factory_state_at_discovery=NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL but repo batch_factory now=CONFLICT_REQUIRES_RECONCILIATION [pre-overlay: NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL]
- **wf2cb** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: Owner-browser-proof validation overlay (BLOCKED_LABEL_REQUIRED): Legacy/supersession compatibility label required before apply [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **frig-242017801** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: Owner-browser-proof validation overlay (BLOCKED_LABEL_REQUIRED): 242017801 = ULTRAWF alias/canonical decision required before apply [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **frig-242294502** — DO_NOT_USE_WRONG_PART_RISK: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=DO_NOT_USE_WRONG_PART_RISK [pre-overlay: DO_NOT_USE_WRONG_PART_RISK]
- **purepour** — CONFLICT_REQUIRES_RECONCILIATION: Owner-browser-proof validation overlay (BLOCKED_CONFLICT): FPPWFU01 vs FPPWFU02 mapping unresolved — owner must resolve before any apply [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **w10413645a** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **xwf** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: XWF/XWFE supersession pair — compatibility label required before any Verified Link.
- **adq75795101** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **gswf2** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED [pre-overlay: NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED]
- **opfg3f** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED [pre-overlay: NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED]
- **smartwater-mwfp** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: Owner-browser-proof validation overlay (BLOCKED_LABEL_REQUIRED): EOL/discontinued label handling required per bundle discontinued findings [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **da97-17376a** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: Owner-browser-proof validation overlay (BLOCKED_LABEL_REQUIRED): DA97-17376A → DA97-17376B supersession label required before apply [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **da97-19467c** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED [pre-overlay: NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED]
- **mswf** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: Owner-browser-proof validation overlay (BLOCKED_LABEL_REQUIRED): EOL/discontinued label handling required per bundle discontinued findings [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **pfmwf** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED [pre-overlay: NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED]
- **4396842** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Repo evidence NO_SAFE_PDP or rescue no_safe_pdp classification.

## Owner-browser-proof discovery candidates (not apply-ready)

- **edr4rxd1** → https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.everydrop-refrigerator-water-filter-4-edr4rxd1-pack-of-1.edr4rxd1.html
- **edr3rxd1** → https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.everydrop-refrigerator-water-filter-3-edr3rxd1-pack-of-1.edr3rxd1.html
- **ultrawf** → https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/ULTRAWF
- **eptwfu01** → https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/EPTWFU01
- **fppwfu01** → https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/FPPWFU01
- **wf3cb** → https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB
- **wfcb** → https://www.homedepot.com/p/Frigidaire-PureSource-Plus-Water-Filter-WFCB/308000660


7 slug(s) have owner-browser-proof discovery candidates only — capture fresh owner browser proof before any apply-plan. 8 label-required and 5 conflict slug(s) remain blocked.

