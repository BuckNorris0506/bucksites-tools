# GSWF PARTIAL owner-browser proof packet v1

Generated: 2026-07-11T04:11:48.408Z

## Status

- contract: `gswf_partial_owner_browser_proof_packet_v1`
- family_key: `filter::ge::gswf`
- read_only: **true**
- mutation_authorized: **false**
- buy_cta_authorized: **false**
- include_in_gswf_wrong_part_apply_plan: **false**

## Summary

| Metric | Value |
| --- | --- |
| total PARTIAL slugs | 3 |
| EXACT_MODEL_TIER1_PROVEN | 0 |
| BROWSER_PROOF_REQUIRED | 3 |
| UNKNOWN | 0 |

## Owner checklist

- These 3 PARTIAL slugs are excluded from the 13-row GSWF wrong-part apply plan and guarded dry-run apply set.
- Do not mutate compatibility_mappings.csv for these slugs until exact-model Tier-1 owner-browser proof exists.
- Hypothesized remap targets (rpwfe/mwf) from HyperAgent are INFERRED only — not apply-ready.
- No GSWF buy CTA authorization from this packet.
- Capture exact-model OEM filter_specification evidence, then re-open a separate repair-plan lane if proven.

## Slug proof rows

### ge-gfe28hmkww

- model_number: `GFE28HMKWW`
- proof_status: **BROWSER_PROOF_REQUIRED**
- exact_model_tier1_proven: **false**
- repo maps: `gswf|gswf2`
- cursor_verdict: `VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW`
- hyperagent_actual_filter: `RPWFE`
- hyperagent_source_type: `OEM_ADJACENT`
- hypothesized_remap: `rpwfe` (INFERRED)
- include_in_apply_plan: **false**
- buy_cta_authorized: **false**
- missing_proof:
  - Exact-model owner-browser Tier-1 capture on GFE28HMKWW (not sibling/platform inference).
  - Official manufacturer filter_specification / parts page naming the replacement filter for this exact model.
  - Repo manual-evidence JSON under data/manual-evidence/refrigerator/ for this exact fridge_slug.
  - Current discovery source_type=OEM_ADJACENT is insufficient for apply-plan inclusion.
- cursor reason: RPWFE inferred from same-platform HMK variant retailer/OEM-adjacent specs — owner browser on exact GFE28HMKWW required before repair.
- recommended: Owner-browser Tier-1 on exact model GFE28HMKWW: open GE OEM product/parts/support page for this exact SKU, capture filter part number screenshot/URL, write manual-evidence JSON — do not edit compatibility_mappings.csv yet. Confirm or refute hypothesized remap target `rpwfe` only after exact-model proof.

### ge-gsc25frshss

- model_number: `GSC25FRSHSS`
- proof_status: **BROWSER_PROOF_REQUIRED**
- exact_model_tier1_proven: **false**
- repo maps: `gswf|gswf2`
- cursor_verdict: `VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW`
- hyperagent_actual_filter: `MWF`
- hyperagent_source_type: `OEM_PLATFORM_INFERENCE`
- hypothesized_remap: `mwf` (INFERRED)
- include_in_apply_plan: **false**
- buy_cta_authorized: **false**
- missing_proof:
  - Exact-model owner-browser Tier-1 capture on GSC25FRSHSS (not sibling/platform inference).
  - Official manufacturer filter_specification / parts page naming the replacement filter for this exact model.
  - Repo manual-evidence JSON under data/manual-evidence/refrigerator/ for this exact fridge_slug.
  - Current discovery source_type=OEM_PLATFORM_INFERENCE is insufficient for apply-plan inclusion.
- cursor reason: MWF inferred from GSS25 side-by-side platform — discontinued model lacks direct OEM page; browser proof required.
- recommended: Owner-browser Tier-1 on exact model GSC25FRSHSS: open GE OEM product/parts/support page for this exact SKU, capture filter part number screenshot/URL, write manual-evidence JSON — do not edit compatibility_mappings.csv yet. Confirm or refute hypothesized remap target `mwf` only after exact-model proof.

### ge-gse26gshess

- model_number: `GSE26GSHESS`
- proof_status: **BROWSER_PROOF_REQUIRED**
- exact_model_tier1_proven: **false**
- repo maps: `gswf|gswf2`
- cursor_verdict: `VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW`
- hyperagent_actual_filter: `MWF`
- hyperagent_source_type: `OEM_PLATFORM_INFERENCE`
- hypothesized_remap: `mwf` (INFERRED)
- include_in_apply_plan: **false**
- buy_cta_authorized: **false**
- missing_proof:
  - Exact-model owner-browser Tier-1 capture on GSE26GSHESS (not sibling/platform inference).
  - Official manufacturer filter_specification / parts page naming the replacement filter for this exact model.
  - Repo manual-evidence JSON under data/manual-evidence/refrigerator/ for this exact fridge_slug.
  - Current discovery source_type=OEM_PLATFORM_INFERENCE is insufficient for apply-plan inclusion.
- cursor reason: MWF inferred from GSE25 successor platform — owner browser on exact GSE26GSHESS required.
- recommended: Owner-browser Tier-1 on exact model GSE26GSHESS: open GE OEM product/parts/support page for this exact SKU, capture filter part number screenshot/URL, write manual-evidence JSON — do not edit compatibility_mappings.csv yet. Confirm or refute hypothesized remap target `mwf` only after exact-model proof.

## Recommended next action

Owner-browser Tier-1 capture for ge-gfe28hmkww, ge-gsc25frshss, and ge-gse26gshess on exact model pages — keep them out of any GSWF apply plan until proof_status=EXACT_MODEL_TIER1_PROVEN.

