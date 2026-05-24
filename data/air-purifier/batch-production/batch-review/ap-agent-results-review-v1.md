# Air Purifier Agent Results — Owner Review

Generated: 2026-05-23T05:11:38.529Z

**NOT DEPLOYED · No CSV mutation · Supabase untouched**

## Headline counts

| Metric | Value |
|--------|------:|
| Result files | 3 |
| Total rows | 19 |
| Valid rows | 12 |
| Invalid rows | 7 |
| Auto-apply eligible | 3 |
| Reference eligible | 0 |
| Owner review | 14 |
| Rejected | 0 |
| Catalog task | 0 |
| No safe path | 2 |

## Projected coverage delta (if owner approves apply planner)

- Direct-buy safe CTA **+3**
- Official reference links **+0**
- Blocked rows reduced (approx) **−3**

## Auto-apply candidates

- **levoit-rf-lv-h133** (ap-levoit-oem-discovery-v1) — https://levoit.com/products/lv-h133-air-purifier-tower-replacement-filter
- **levoit-rf-lv-h128** (ap-levoit-oem-discovery-v1) — https://levoit.com/products/lv-h128-replacement-filter
- **levoit-vital100-rf** (ap-levoit-oem-discovery-v1) — https://levoit.com/products/vital100-air-purifier-replacement-filter

## Reference candidates

_None pass strict reference validation._

## Owner review required

- **medify-ma25-rf** — validation:pass_direct_buyable_with_wrong_family_tokens; validation:pass_direct_buyable_final_url_not_pdp_like; owner_review_required_flag; pass_direct_buyable_failed_auto_apply_checks; recommended_mutation_touches_primary_choice
- **medify-ma40-rf** — validation:pass_direct_buyable_with_wrong_family_tokens; validation:pass_direct_buyable_final_url_not_pdp_like; owner_review_required_flag; pass_direct_buyable_failed_auto_apply_checks; recommended_mutation_touches_primary_choice
- **medify-ma50-rf** — validation:pass_direct_buyable_with_wrong_family_tokens; validation:pass_direct_buyable_final_url_not_pdp_like; owner_review_required_flag; pass_direct_buyable_failed_auto_apply_checks; recommended_mutation_touches_primary_choice
- **levoit-rf-rar040** — agent_needs_owner_review; owner_review_required_flag
- **levoit-rf-rar060** — agent_needs_owner_review; owner_review_required_flag
- **levoit-rf-c131** — agent_needs_owner_review; owner_review_required_flag
- **levoit-rf-cr200** — agent_needs_owner_review; owner_review_required_flag
- **holmes-hapf30** — reference_retailer_not_on_allowlist; wrong_family_tokens_present
- **winix-carbon-116131** — agent_needs_owner_review; owner_review_required_flag
- **winix-hepa-115115** — validation:pass_direct_buyable_with_wrong_family_tokens; pass_direct_buyable_failed_auto_apply_checks
- **gg-flt5000** — validation:pass_direct_buyable_with_wrong_family_tokens; pass_direct_buyable_failed_auto_apply_checks
- **coway-max2-hepa** — validation:pass_direct_buyable_with_wrong_family_tokens; pass_direct_buyable_failed_auto_apply_checks
- **shark-hepa-hp100** — reference_retailer_not_on_allowlist; wrong_family_tokens_present
- **rabbit-biogs-minusa2** — validation:pass_direct_buyable_with_wrong_family_tokens; pass_direct_buyable_failed_auto_apply_checks

## Rejected / no safe path

- **levoit-rf-meta-air** — NO_SAFE_PATH: NO_SAFE_PATH
- **shark-carbon-foam** — NO_SAFE_PATH: NO_SAFE_PATH

## Owner summary

- 3 slug(s) pass strict auto-apply validation: levoit-rf-lv-h133, levoit-rf-lv-h128, levoit-vital100-rf
- Owner review (validation:pass_direct_buyable_with_wrong_family_tokens): medify-ma25-rf, medify-ma40-rf, medify-ma50-rf, winix-hepa-115115, gg-flt5000, coway-max2-hepa, rabbit-biogs-minusa2
- Owner review (agent_needs_owner_review): levoit-rf-rar040, levoit-rf-rar060, levoit-rf-c131, levoit-rf-cr200, winix-carbon-116131
- Owner review (reference_retailer_not_on_allowlist): holmes-hapf30, shark-hepa-hp100
- No safe path: levoit-rf-meta-air, shark-carbon-foam
- 7 row(s) failed strict validation — see invalid_rows (may still appear in owner_review_required).

## Next action

Owner review 3 auto_apply_eligible row(s), then run a future apply planner (not this script).

---

_This summary is read-only. Apply planner (future task) may consume `ap-agent-results-review-v1.json`._
