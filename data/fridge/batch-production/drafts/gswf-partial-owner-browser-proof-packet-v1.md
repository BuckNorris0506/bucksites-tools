# GSWF PARTIAL owner-browser proof packet v1

Generated: 2026-07-12T19:19:19.556Z

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
| BROWSER_PROOF_REQUIRED | 0 |
| UNKNOWN_NOT_PROVEN | 3 |
| UNKNOWN (incl. UNKNOWN_NOT_PROVEN) | 3 |

## Owner checklist

- These 3 PARTIAL slugs remain excluded from the 13-row GSWF wrong-part apply plan and Supabase sync.
- HyperAgent/browser session recorded UNKNOWN_NOT_PROVEN for all three — do not promote RPWFE/MWF hypotheses.
- Next required proof: physical rating-plate photo or corrected exact model verification.
- Do not mutate compatibility_mappings.csv or Supabase for these slugs from this packet.
- No GSWF buy CTA authorization from this packet.

## Slug proof rows

### ge-gfe28hmkww

- model_number: `GFE28HMKWW`
- proof_status: **UNKNOWN_NOT_PROVEN**
- exact_model_tier1_proven: **false**
- next_required_proof: `RATING_PLATE_OR_CORRECTED_MODEL_VERIFICATION`
- repo maps: `gswf|gswf2`
- cursor_verdict: `VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW`
- hyperagent_actual_filter: `RPWFE`
- hyperagent_evidence_confidence: `UNKNOWN_NOT_PROVEN`
- hyperagent_source_type: `OEM_ADJACENT`
- hypothesized_remap: `none` (UNKNOWN; promotion authorized: **false**)
- include_in_apply_plan: **false**
- buy_cta_authorized: **false**
- missing_proof:
  - Physical rating-plate photo or corrected exact model verification for GFE28HMKWW.
  - GE first-party product/spec backend did not resolve this exact model string in HyperAgent/browser session.
  - Do not promote hypothesized remap targets until rating-plate / corrected-model proof exists.
  - Repo manual-evidence JSON under data/manual-evidence/refrigerator/ for this exact fridge_slug.
- cursor reason: RPWFE inferred from same-platform HMK variant retailer/OEM-adjacent specs — owner browser on exact GFE28HMKWW required before repair.
- owner_browser_proof_result: `data/fridge/batch-production/drafts/gswf-partial-owner-browser-proof-result-v1.json`
- recommended: Require physical rating-plate photo or corrected exact model verification for GFE28HMKWW before any remap hypothesis promotion or apply-plan inclusion.

### ge-gsc25frshss

- model_number: `GSC25FRSHSS`
- proof_status: **UNKNOWN_NOT_PROVEN**
- exact_model_tier1_proven: **false**
- next_required_proof: `RATING_PLATE_OR_CORRECTED_MODEL_VERIFICATION`
- repo maps: `gswf|gswf2`
- cursor_verdict: `VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW`
- hyperagent_actual_filter: `MWF`
- hyperagent_evidence_confidence: `UNKNOWN_NOT_PROVEN`
- hyperagent_source_type: `OEM_PLATFORM_INFERENCE`
- hypothesized_remap: `none` (UNKNOWN; promotion authorized: **false**)
- include_in_apply_plan: **false**
- buy_cta_authorized: **false**
- missing_proof:
  - Physical rating-plate photo or corrected exact model verification for GSC25FRSHSS.
  - GE first-party product/spec backend did not resolve this exact model string in HyperAgent/browser session.
  - Do not promote hypothesized remap targets until rating-plate / corrected-model proof exists.
  - Repo manual-evidence JSON under data/manual-evidence/refrigerator/ for this exact fridge_slug.
- cursor reason: MWF inferred from GSS25 side-by-side platform — discontinued model lacks direct OEM page; browser proof required.
- owner_browser_proof_result: `data/fridge/batch-production/drafts/gswf-partial-owner-browser-proof-result-v1.json`
- recommended: Require physical rating-plate photo or corrected exact model verification for GSC25FRSHSS before any remap hypothesis promotion or apply-plan inclusion.

### ge-gse26gshess

- model_number: `GSE26GSHESS`
- proof_status: **UNKNOWN_NOT_PROVEN**
- exact_model_tier1_proven: **false**
- next_required_proof: `RATING_PLATE_OR_CORRECTED_MODEL_VERIFICATION`
- repo maps: `gswf|gswf2`
- cursor_verdict: `VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW`
- hyperagent_actual_filter: `MWF`
- hyperagent_evidence_confidence: `UNKNOWN_NOT_PROVEN`
- hyperagent_source_type: `OEM_PLATFORM_INFERENCE`
- hypothesized_remap: `none` (UNKNOWN; promotion authorized: **false**)
- include_in_apply_plan: **false**
- buy_cta_authorized: **false**
- missing_proof:
  - Physical rating-plate photo or corrected exact model verification for GSE26GSHESS.
  - GE first-party product/spec backend did not resolve this exact model string in HyperAgent/browser session.
  - Do not promote hypothesized remap targets until rating-plate / corrected-model proof exists.
  - Repo manual-evidence JSON under data/manual-evidence/refrigerator/ for this exact fridge_slug.
- cursor reason: MWF inferred from GSE25 successor platform — owner browser on exact GSE26GSHESS required.
- owner_browser_proof_result: `data/fridge/batch-production/drafts/gswf-partial-owner-browser-proof-result-v1.json`
- recommended: Require physical rating-plate photo or corrected exact model verification for GSE26GSHESS before any remap hypothesis promotion or apply-plan inclusion.

## Recommended next action

Hold all three PARTIAL slugs as UNKNOWN_NOT_PROVEN — require physical rating-plate / corrected model verification before any remap hypothesis promotion or apply-plan inclusion.

