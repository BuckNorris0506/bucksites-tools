# Fridge safe-link batch factory v1 (read-only)

Generated: 2026-06-04T17:19:37.077Z

## Cohort summary

- total_missing_before: **26**
- eligible_now_count: **0**
- owner_browser_needed_count: **14**
- no_safe_count: **5**
- conflict_count: **3**
- do_not_use_count: **1**
- validation_status: **VALIDATION_PARTIAL**
- bundle_authentic: **true**
- validation_overlay_applied: **true**
- compatibility_label_count: **3**
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
| frig-242086201 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| eptwfu01 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| xwfe | CONFLICT_REQUIRES_RECONCILIATION | mutation_authorized=false; verified_link_authorized=false |
| fppwfu01 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| wf2cb | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| frig-242017801 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| frig-242294502 | DO_NOT_USE_WRONG_PART_RISK | mutation_authorized=false; verified_link_authorized=false |
| purepour | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| wf3cb | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| wfcb | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| w10413645a | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| xwf | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| adq75795101 | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| gswf2 | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |
| opfg3f | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |
| smartwater-mwfp | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| da97-17376a | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| da97-19467c | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |
| mswf | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| pfmwf | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |
| 4396842 | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |

## Blocked / do-not-use

- **gswf** — CONFLICT_REQUIRES_RECONCILIATION: Cursor validation overlay (PARTIAL): batch_factory_state_at_discovery=APPLY_ELIGIBLE_WITH_EXISTING_PROOF but repo batch_factory now=CONFLICT_REQUIRES_RECONCILIATION [pre-overlay: APPLY_ELIGIBLE_WITH_EXISTING_PROOF]
- **4396508** — CONFLICT_REQUIRES_RECONCILIATION: PROVEN repo Amazon evidence vs HyperAgent NO_SAFE_LINK_FOUND — lane stopped; do not apply until reconciled.
- **xwfe** — CONFLICT_REQUIRES_RECONCILIATION: Cursor validation overlay (PARTIAL): batch_factory_state_at_discovery=NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL but repo batch_factory now=CONFLICT_REQUIRES_RECONCILIATION [pre-overlay: NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL]
- **frig-242294502** — DO_NOT_USE_WRONG_PART_RISK: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=DO_NOT_USE_WRONG_PART_RISK [pre-overlay: DO_NOT_USE_WRONG_PART_RISK]
- **w10413645a** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **xwf** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: XWF/XWFE supersession pair — compatibility label required before any Verified Link.
- **adq75795101** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL [pre-overlay: APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF]
- **gswf2** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED [pre-overlay: NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED]
- **opfg3f** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED [pre-overlay: NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED]
- **da97-19467c** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED [pre-overlay: NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED]
- **pfmwf** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Cursor validation overlay (CONFIRMED): batch_factory_state_at_discovery=APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF but repo batch_factory now=NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED [pre-overlay: NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED]
- **4396842** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Repo evidence NO_SAFE_PDP or rescue no_safe_pdp classification.

No slug is APPLY_ELIGIBLE_WITH_EXISTING_PROOF yet — continue owner-browser proof packets before batch apply-plan.

