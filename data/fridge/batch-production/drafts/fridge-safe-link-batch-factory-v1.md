# Fridge safe-link batch factory v1 (read-only)

Generated: 2026-06-04T01:49:24.921Z

## Cohort summary

- total_missing_before: **26**
- eligible_now_count: **1**
- owner_browser_needed_count: **21**
- no_safe_count: **1**
- conflict_count: **1**
- do_not_use_count: **0**
- compatibility_label_count: **2**
- expected_coverage_delta: **+1** (31 → 32 if eligible applied)

## Proposed first batch (existing proof only)

- **gswf** → https://www.geapplianceparts.com/store/parts/spec/GSWF (official_manufacturer_spec_pdp)

## All rows

| slug | state | blockers |
|------|-------|----------|
| edr4rxd1 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| edr3rxd1 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| gswf | APPLY_ELIGIBLE_WITH_EXISTING_PROOF | mutation_authorized=false; verified_link_authorized=false |
| 4396508 | CONFLICT_REQUIRES_RECONCILIATION | mutation_authorized=false; verified_link_authorized=false |
| ultrawf | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| frig-242086201 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| eptwfu01 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| xwfe | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| fppwfu01 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| wf2cb | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| frig-242017801 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| frig-242294502 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| purepour | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| wf3cb | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| wfcb | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| w10413645a | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| xwf | NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL | mutation_authorized=false; verified_link_authorized=false |
| adq75795101 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| gswf2 | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| opfg3f | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| smartwater-mwfp | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| da97-17376a | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| da97-19467c | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| mswf | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| pfmwf | APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | mutation_authorized=false; verified_link_authorized=false |
| 4396842 | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED | mutation_authorized=false; verified_link_authorized=false |

## Blocked / do-not-use

- **4396508** — CONFLICT_REQUIRES_RECONCILIATION: PROVEN repo Amazon evidence vs HyperAgent NO_SAFE_LINK_FOUND — lane stopped; do not apply until reconciled.
- **xwfe** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: XWF/XWFE supersession pair — compatibility label required before any Verified Link.
- **xwf** — NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL: XWF/XWFE supersession pair — compatibility label required before any Verified Link.
- **4396842** — NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED: Repo evidence NO_SAFE_PDP or rescue no_safe_pdp classification.

Owner review batch factory proposed_first_batch_rows. Draft read-only batch apply-plan for eligible slugs only — still no CSV/Supabase/Verified Link apply until separate owner authorization. Continue owner-browser proof for owner_browser_needed rows.

