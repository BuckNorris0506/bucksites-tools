# Refrigerator truth repair owner review v1

Generated: 2026-06-09T14:27:56.374Z

## Status

- contract: `refrigerator_truth_repair_owner_review_v1`
- read_only: **true**
- data_mutation: **false**
- mutation_authorized: **false**
- owner_review_required: **true**
- repo_truth_closure_authorized: **false**

## Summary

| Metric | Count |
| --- | ---: |
| apply_candidate_count | 5 |
| browser_proof_required_count | 15 |
| phantom_or_suppression_review_count | 4 |
| no_action_count | 0 |
| total_slug_rows | 24 |

## Scoreboard impact estimate (if owner-approved)

| Metric | Baseline | After apply | Reduction |
| --- | ---: | ---: | ---: |
| wrong_part_risk_count | 75 | 70 | 5 |
| multi_mapped_count | 212 | 211 | 1 |
| phantom_model_count | 15 | 13 | 2 |

## Owner checklist

- repo_truth_closure_authorized=false — this packet does not close repo truth.
- No apply plan in this lane — owner must approve a separate compat apply packet before CSV edits.
- Review 5 samsung_pass_ready apply candidate(s) — owner approval required; mutation_authorized=false everywhere.
- Queue owner-browser proof for 15 slug(s) — PARTIAL verdicts are not apply-ready.
- Resolve 4 catalog integrity slug(s) before compat or evidence scaling.
- Do not mutate compatibility_mappings.csv, filters.csv, fridge_models.csv, manual-evidence JSON, Supabase, pages, sitemap/robots, retailer links, or HQ handoff from this packet.
- WF2CB bounded slice rows remain owner-review until validation PASS exists — hold wf2cb removals.
- Frigidaire 242017801 bounded slice rows remain owner-review — 0 PASS rows; hold 6-filter co-map removals.
- 242017801=ULTRAWF token identity is a separate owner-review concern — do not consolidate filters.csv or aliases without approval.
- Samsung PASS-ready rows may be grouped as owner-review apply candidates only — not applied automatically.

## Token identity owner-review concerns

### 242017801_ultrawf_duplicate_token

- claim: **242017801 = ULTRAWF (PureSource Ultra)**
- repo slugs: `ultrawf` + `frig-242017801`
- cross_alias_in_repo: **false**
- consolidation_authorized: **false**
- separate_lane: `frigidaire-242017801-ultrawf-token-consolidation-owner-review-v1`
- action: Separate owner-review lane for 242017801/ULTRAWF token consolidation — do not merge filters.csv rows or aliases without explicit owner approval.

## samsung_pass_ready (5)

- `samsung-rf27t5201sr` — VALIDATION_PASS_READY_FOR_OWNER_REVIEW; maps `da29-10105j` → target `da97-17376b`; replace_mapping; mutation_authorized=false
- `samsung-rf27t5501sr` — VALIDATION_PASS_READY_FOR_OWNER_REVIEW; maps `da29-00012b|da29-00020b` → target `da97-17376b`; split_mapping; mutation_authorized=false
- `samsung-rf28r6301sr` — VALIDATION_PASS_READY_FOR_OWNER_REVIEW; maps `da29-00019a` → target `da97-17376b`; replace_mapping; mutation_authorized=false
- `samsung-rf28t5101sr` — VALIDATION_PASS_READY_FOR_OWNER_REVIEW; maps `da29-00019a` → target `da97-17376b`; replace_mapping; mutation_authorized=false
- `samsung-rs22t5201sg` — VALIDATION_PASS_READY_FOR_OWNER_REVIEW; maps `da29-10105j` → target `da97-17376b`; replace_mapping; mutation_authorized=false

## samsung_partial_needs_browser_proof (10)

- `samsung-rf23m8070sg` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `da29-10105j` → target `da97-17376b`; capture_manual_evidence; mutation_authorized=false
- `samsung-rf23m8590sg` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `da29-00019a` → target `da97-17376b`; capture_manual_evidence; mutation_authorized=false
- `samsung-rf28r6201ww` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `da29-10105j` → target `da97-17376b`; capture_manual_evidence; mutation_authorized=false
- `samsung-rf28r6241sb` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `da29-00019a` → target `da97-17376b`; capture_manual_evidence; mutation_authorized=false
- `samsung-rf28r6241sg` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `da29-00019a` → target `da97-17376b`; capture_manual_evidence; mutation_authorized=false
- `samsung-rf28r6241sw` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `da29-10105j` → target `da97-17376b`; capture_manual_evidence; mutation_authorized=false
- `samsung-rf28r7201sg` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `da29-10105j` → target `da97-17376b`; capture_manual_evidence; mutation_authorized=false
- `samsung-rf28t5101sg` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `da29-10105j` → target `da97-17376b`; capture_manual_evidence; mutation_authorized=false
- `samsung-rf28t5f01sr` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `da29-00019a` → target `da97-17376b`; capture_manual_evidence; mutation_authorized=false
- `samsung-rs25h5111sr` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `da29-10105j` → target `da29-00020b`; capture_manual_evidence; mutation_authorized=false

## wf2cb_data_quality_defects (1)

- `frigidaire-frfs2623as` — VALIDATION_FAIL; maps `wf2cb` → target `fppwfu01`; catalog_reconcile_typo; mutation_authorized=false

## wf2cb_partial_needs_browser_proof (3)

- `frigidaire-ffhb2860ts` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `wf2cb` → target `eptwfu01`; owner_browser_proof; mutation_authorized=false
- `frigidaire-fgsc2345tf` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `wf2cb` → target `eptwfu01`; owner_browser_proof; mutation_authorized=false
- `frigidaire-fpru19f8re` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `wf2cb` → target `none`; owner_browser_proof; mutation_authorized=false

## phantom_or_non_refrigerator_models (1)

- `frigidaire-cfse2333tb` — VALIDATION_FAIL; maps `wf2cb` → target `none`; catalog_suppress_slug; mutation_authorized=false

## frig_242017801_partial_needs_browser_proof (2)

- `frigidaire-fghd2365tf` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `frig-242017801|frig-242086201|purepour|ultrawf|wf3cb|wfcb` → target `ultrawf`; owner_browser_proof; mutation_authorized=false
- `frigidaire-frfs2613as` — VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW; maps `frig-242017801|frig-242086201|purepour|ultrawf|wf3cb|wfcb` → target `purepour`; owner_browser_proof; mutation_authorized=false

## frig_242017801_phantom_typo_models (2)

- `frigidaire-grfs2633af` — VALIDATION_FAIL; maps `frig-242017801|frig-242086201|purepour|ultrawf|wf3cb|wfcb` → target `none`; catalog_suppress_slug; mutation_authorized=false
- `frigidaire-grfs2833af` — VALIDATION_FAIL; maps `frig-242017801|frig-242086201|purepour|ultrawf|wf3cb|wfcb` → target `none`; catalog_reconcile_typo; mutation_authorized=false

