# Page Factory batch QA Director owner review v1

Generated: 2026-06-08T04:49:51.492Z

## Stop condition

Read-only batch QA aggregation only. Does **not** publish pages, mutate sitemap/robots, compat, retailer links, Supabase, or evidence.

## Batch summary

- batch_id: `haf-qin-qa-director-fixture-v1`
- manifest_path: `data/fridge/batch-production/page-factory/evidence-clone-batch-v1/haf-qin-qa-director-fixture-v1-manifest-v1.json`
- pair_count: **3**
- quality_gate_input_mode: `mixed`
- batch_publication_readiness_score: **33.3%**
- batch_risk_score: **33.3%**

**Recommended next action:** Resolve 1 WRONG_PART_RISK slug(s) before any batch publication (samsung-rf27t5501sr).

## Buckets

| classification | count | % | top blockers | affected slugs |
|---|---:|---:|---|---|
| VERIFIED | 1 | 33.3% | — | `samsung-rf28r7351sr` |
| NOINDEX_REVIEW | 0 | 0% | — | — |
| BLOCKED | 0 | 0% | — | — |
| WRONG_PART_RISK | 1 | 33.3% | compat_proof_exact_mapping: csv compat slugs ["da29-00012b","da29-00020b"] !== expected ["da97-17376b"]; compat_proof_forbidden_absent: forbidden filter still mapped in CSV: da29-00012b; compat_proof_forbidden_absent: forbidden filter still mapped in CSV: da29-00020b; compat_proof_token_alignment: legacy filter slugs ["da29-00012b","da29-00020b"] do not align with official_marketing_token HAF-QIN; homeowner_guidance: missing evidence file: data/manual-evidence/refrigerator/samsung-rf27t5501sr.json | `samsung-rf27t5501sr` |
| NEEDS_EVIDENCE | 1 | 33.3% | clone_status: NEEDS_TARGET_EVIDENCE; compat_proof_exact_mapping: csv compat slugs ["da97-08006b"] !== expected ["da97-17376b"]; compat_proof_token_alignment: legacy filter slugs ["da97-08006b"] do not align with official_marketing_token HAF-QIN; duplicate_thin_content: no model-specific evidence — finish-variant thin-content risk; homeowner_guidance: missing evidence file: data/manual-evidence/refrigerator/samsung-rf28r7351ww.json | `samsung-rf28r7351ww` |

## Top 20 blockers by frequency

| blocker | count | slugs |
|---|---:|---|
| clone_status: NEEDS_TARGET_EVIDENCE | 1 | `samsung-rf28r7351ww` |
| compat_proof_exact_mapping: csv compat slugs ["da29-00012b","da29-00020b"] !== expected ["da97-17376b"] | 1 | `samsung-rf27t5501sr` |
| compat_proof_exact_mapping: csv compat slugs ["da97-08006b"] !== expected ["da97-17376b"] | 1 | `samsung-rf28r7351ww` |
| compat_proof_forbidden_absent: forbidden filter still mapped in CSV: da29-00012b | 1 | `samsung-rf27t5501sr` |
| compat_proof_forbidden_absent: forbidden filter still mapped in CSV: da29-00020b | 1 | `samsung-rf27t5501sr` |
| compat_proof_token_alignment: legacy filter slugs ["da29-00012b","da29-00020b"] do not align with official_marketing_token HAF-QIN | 1 | `samsung-rf27t5501sr` |
| compat_proof_token_alignment: legacy filter slugs ["da97-08006b"] do not align with official_marketing_token HAF-QIN | 1 | `samsung-rf28r7351ww` |
| duplicate_thin_content: no model-specific evidence — finish-variant thin-content risk | 1 | `samsung-rf28r7351ww` |
| homeowner_guidance: missing evidence file: data/manual-evidence/refrigerator/samsung-rf27t5501sr.json | 1 | `samsung-rf27t5501sr` |
| homeowner_guidance: missing evidence file: data/manual-evidence/refrigerator/samsung-rf28r7351ww.json | 1 | `samsung-rf28r7351ww` |
| model_existence_confirmed: manufacturer recognition blocked: wildcard bucket BLOCKED_HAF_CIN_CANONICAL for samsung-rf27t5501sr | 1 | `samsung-rf27t5501sr` |
| model_existence_confirmed: no official manufacturer recognition or model-specific Tier-1 evidence for RF28R7351WW; wildcard CANDIDATE_REVIEW alone is insufficient | 1 | `samsung-rf28r7351ww` |
| model_specific_evidence: missing evidence file: data/manual-evidence/refrigerator/samsung-rf27t5501sr.json | 1 | `samsung-rf27t5501sr` |
| model_specific_evidence: missing evidence file: data/manual-evidence/refrigerator/samsung-rf28r7351ww.json | 1 | `samsung-rf28r7351ww` |
| source_transparency: missing evidence file: data/manual-evidence/refrigerator/samsung-rf27t5501sr.json | 1 | `samsung-rf27t5501sr` |
| source_transparency: missing evidence file: data/manual-evidence/refrigerator/samsung-rf28r7351ww.json | 1 | `samsung-rf28r7351ww` |
| wrong_part_risk: HAF-CIN wrong-family compat present: da29-00020b, da29-00012b | 1 | `samsung-rf27t5501sr` |
| wrong_part_risk: wildcard bucket BLOCKED_HAF_CIN_CANONICAL for samsung-rf27t5501sr | 1 | `samsung-rf27t5501sr` |

## Per-slug

| slug | batch QA | quality gate | publication_authorized | source |
|---|---|---|---|---|
| `samsung-rf28r7351sr` | VERIFIED | INDEXABLE_NO_BUY_LINK | true | artifact |
| `samsung-rf28r7351ww` | NEEDS_EVIDENCE | NOINDEX_REVIEW | false | artifact |
| `samsung-rf27t5501sr` | WRONG_PART_RISK | BLOCKED | false | live_build |
