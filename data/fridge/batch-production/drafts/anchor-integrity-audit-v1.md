# Anchor integrity audit v1

## ANCHOR_HEALTH_SUMMARY

- generated_at: **2026-06-08T15:06:46.256Z**
- healthy_count: **5**
- watchlist_count: **9**
- disputed_count: **1**
- sibling_conflict_disputed_count: **1**
- total_anchor_count: **15**

## highest_risk_anchors

### frigidaire-fghb2868pf

- anchor_health: **DISPUTED**
- anchor_family: `filter::frigidaire::eptwfu01`
- evidence_clone_dependency_count: **33**
- sibling_family_conflict_detected: **true**
- model_specific_filter_proof_present: **false**
- source_title_contains_exact_model_number: **false**
- health_reasons: sibling_family_conflict_detected, filter_specification_model_proof_missing

### samsung-rf28r7351sg

- anchor_health: **WATCHLIST**
- anchor_family: `model::samsung::RF28`
- evidence_clone_dependency_count: **31**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: support_page_missing

### frigidaire-fgsc2335tf

- anchor_health: **WATCHLIST**
- anchor_family: `filter::frigidaire::eptwfu01`
- evidence_clone_dependency_count: **30**
- sibling_family_conflict_detected: **true**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: sibling_family_conflict_detected, manual_evidence_not_public_ready, learned_failure_guards_warn

### ge-gfe28gynfs

- anchor_health: **WATCHLIST**
- anchor_family: `filter::ge::rpwfe`
- evidence_clone_dependency_count: **26**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: support_page_missing

### ge-gfe28gmkes

- anchor_health: **HEALTHY**
- anchor_family: `filter::ge::rpwfe`
- evidence_clone_dependency_count: **26**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: all_anchor_integrity_checks_pass

### ge-gfe28gskss

- anchor_health: **HEALTHY**
- anchor_family: `filter::ge::rpwfe`
- evidence_clone_dependency_count: **26**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: all_anchor_integrity_checks_pass

### whirlpool-wrx735sdhz

- anchor_health: **WATCHLIST**
- anchor_family: `filter::whirlpool::edr4rxd1`
- evidence_clone_dependency_count: **24**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: manual_evidence_not_public_ready, support_page_missing

### whirlpool-wrf540cwhz

- anchor_health: **WATCHLIST**
- anchor_family: `filter::whirlpool::edr4rxd1`
- evidence_clone_dependency_count: **22**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **false**
- source_title_contains_exact_model_number: **true**
- health_reasons: filter_specification_model_proof_missing, manual_evidence_not_public_ready

### samsung-rf28nhedbsr

- anchor_health: **WATCHLIST**
- anchor_family: `model::samsung::RF28`
- evidence_clone_dependency_count: **21**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: support_page_missing

### whirlpool-wrx986sihz

- anchor_health: **WATCHLIST**
- anchor_family: `filter::whirlpool::edr2rxd1`
- evidence_clone_dependency_count: **21**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: manual_evidence_not_public_ready

### samsung-rf28r7201sr

- anchor_health: **HEALTHY**
- anchor_family: `model::samsung::RF28`
- evidence_clone_dependency_count: **21**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: all_anchor_integrity_checks_pass

### samsung-rf28r7351sr

- anchor_health: **HEALTHY**
- anchor_family: `model::samsung::RF28`
- evidence_clone_dependency_count: **21**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: all_anchor_integrity_checks_pass

### frigidaire-ffhb2740ps

- anchor_health: **WATCHLIST**
- anchor_family: `model::frigidaire::FFHB274`
- evidence_clone_dependency_count: **9**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: manual_evidence_not_public_ready

### whirlpool-wrs325sdhz

- anchor_health: **WATCHLIST**
- anchor_family: `model::whirlpool::WRS325`
- evidence_clone_dependency_count: **8**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: manual_evidence_not_public_ready

### samsung-rf263beaesr

- anchor_health: **HEALTHY**
- anchor_family: `model::samsung::RF263`
- evidence_clone_dependency_count: **6**
- sibling_family_conflict_detected: **false**
- model_specific_filter_proof_present: **true**
- source_title_contains_exact_model_number: **true**
- health_reasons: all_anchor_integrity_checks_pass

## families_with_disputed_or_watchlist_primary_anchor

- `filter::frigidaire::eptwfu01`

## Recommended next action

Freeze evidence-clone families with sibling-conflict DISPUTED primary anchors (frigidaire-fghb2868pf) until owner browser proof closes anchor integrity gaps.
