# Dangerous mapping remediation plan v1

- generated_at: **2026-06-08T05:42:45.806Z**
- dangerous_model_count: **76**
- indexable_risk_page_count: **0**

## Smallest safe remediation sequence

### Step 1: noindex

- root_cause_groups: samsung_haf_qin_da29_da97_conflicts, samsung_haf_cin_canonical_blockers, lg_lt_generation_co_maps, ge_xwf_xwfe_rpwfe_legacy_mixes, quarantined_models
- affected_slug_count: **76**
- owner_approval_required: **false**
- repo_mutation_required: **false**
- rationale: Defensive publication gate: zero indexable_risk_pages in committed audit, but block factory/index promotion for all 76 dangerous slugs until mappings are split or removed.

### Step 2: quarantine

- root_cause_groups: quarantined_models
- affected_slug_count: **1**
- owner_approval_required: **false**
- repo_mutation_required: **false**
- rationale: Maintain existing owner-review quarantine on lg-lrfxs3106s — official LT1000P vs repo co-map conflict is already documented.

### Step 3: remove_mapping

- root_cause_groups: samsung_haf_cin_canonical_blockers
- affected_slug_count: **1**
- owner_approval_required: **true**
- repo_mutation_required: **true**
- rationale: Single-slug surgical fix: samsung-rf27t5501sr maps non-canonical da29-00012b alongside canonical HAF-CIN da29-00020b — remove wrong-family row first.

### Step 4: evidence_research

- root_cause_groups: samsung_haf_qin_da29_da97_conflicts
- affected_slug_count: **33**
- owner_approval_required: **true**
- repo_mutation_required: **false**
- rationale: Largest Samsung wrong-family bucket (33 slugs, 26 wildcard REVIEW_DA29_CONFLICT) — HyperAgent haf-qin pipeline + per-model official token proof before any compat edits.

### Step 5: split_mapping

- root_cause_groups: samsung_haf_qin_da29_da97_conflicts
- affected_slug_count: **33**
- owner_approval_required: **true**
- repo_mutation_required: **true**
- rationale: After proof, retain only repo-proven samsung::HAFQIN or samsung::HAFCIN slug per model — drop co-mapped DA29+DA97 rows.

### Step 6: evidence_research

- root_cause_groups: lg_lt_generation_co_maps
- affected_slug_count: **34**
- owner_approval_required: **true**
- repo_mutation_required: **false**
- rationale: 34 LG models co-map multiple LT generations (lt1000p+lt1000pc dominant) — capture official single LT token per model before compat split.

### Step 7: split_mapping

- root_cause_groups: lg_lt_generation_co_maps
- affected_slug_count: **34**
- owner_approval_required: **true**
- repo_mutation_required: **true**
- rationale: Reduce 34 wrong-part surfaces to one LT slug per model after official proof.

### Step 8: evidence_research

- root_cause_groups: ge_xwf_xwfe_rpwfe_legacy_mixes
- affected_slug_count: **7**
- owner_approval_required: **true**
- repo_mutation_required: **false**
- rationale: 7 GE models mix RFID (XWFE/RPWFE) and legacy (XWF) shells — model-specific GE spec required.

### Step 9: split_mapping

- root_cause_groups: ge_xwf_xwfe_rpwfe_legacy_mixes
- affected_slug_count: **7**
- owner_approval_required: **true**
- repo_mutation_required: **true**
- rationale: Retain single RFID or legacy slug per proven GE model.

### Step 10: split_mapping

- root_cause_groups: quarantined_models
- affected_slug_count: **1**
- owner_approval_required: **true**
- repo_mutation_required: **true**
- rationale: After owner reconciliation, map lg-lrfxs3106s to lt1000p only (official LT1000P documented) and lift quarantine.

## samsung_haf_qin_da29_da97_conflicts

- affected_slug_count: **33**
- suspected_correct_filter_family: **UNKNOWN**
- safest_action: **evidence_research**
- hyperagent_can_help: **true**
- dominant_mapped_filter_patterns: da29-10105j (8); da29-00019a (6); da29-00003g (3); da29-00003g|da97-08006b (3); da29-00019a|da97-08006b (3); da29-00003g|da97-17376a|da97-17376b (2); da29-00020a (2); da29-00020a|da97-06317a (2); da29-00020a|da97-15217d (2); da29-00019a|da29-10105j (1); da29-10105j|da97-19467c (1)

### Affected slugs

- `samsung-rf18a5101sr`
- `samsung-rf18hfenbww`
- `samsung-rf20a5101sr`
- `samsung-rf23m8070sg`
- `samsung-rf23m8570sg`
- `samsung-rf23m8590sg`
- `samsung-rf23m8590sr`
- `samsung-rf260beaesg`
- `samsung-rf26j7500sr`
- `samsung-rf27t5201sr`
- `samsung-rf28k9070sw`
- `samsung-rf28r6201sg`
- `samsung-rf28r6201sr`
- `samsung-rf28r6201ww`
- `samsung-rf28r6241sb`
- `samsung-rf28r6241sg`
- `samsung-rf28r6241sr`
- `samsung-rf28r6241sw`
- `samsung-rf28r6301sr`
- `samsung-rf28r7201sg`
- `samsung-rf28r7201ww`
- `samsung-rf28r7351sw`
- `samsung-rf28r7551sr`
- `samsung-rf28r7551sw`
- `samsung-rf28r7551ww`
- `samsung-rf28t5001sg`
- `samsung-rf28t5021sr`
- `samsung-rf28t5101sg`
- `samsung-rf28t5101sr`
- `samsung-rf28t5f01sr`
- `samsung-rf30bb8600ql`
- `samsung-rs22t5201sg`
- `samsung-rs25h5111sr`

## samsung_haf_cin_canonical_blockers

- affected_slug_count: **1**
- suspected_correct_filter_family: **samsung::HAFCIN**
- safest_action: **remove_mapping**
- hyperagent_can_help: **false**
- dominant_mapped_filter_patterns: da29-00012b|da29-00020b (1)

### Affected slugs

- `samsung-rf27t5501sr`

## lg_lt_generation_co_maps

- affected_slug_count: **34**
- suspected_correct_filter_family: **UNKNOWN**
- safest_action: **split_mapping**
- hyperagent_can_help: **true**
- dominant_mapped_filter_patterns: adq36006101|adq74793502|lt1000p|lt1000pc|mdj64844601 (15); lt600p|lt800p (12); lt1000p|lt1000pc (5); adq36006101|adq74793502|lt1000p|lt1000pc|lt700p|mdj64844601 (2)

### Affected slugs

- `lg-lfcc22426s`
- `lg-lfcc25426s`
- `lg-lfcs22520s`
- `lg-lfcs23520s`
- `lg-lfds22520s`
- `lg-lfxc22526d`
- `lg-lfxc22526s`
- `lg-lfxc22596d`
- `lg-lfxc22596s`
- `lg-lfxc24796d`
- `lg-lfxs26596s`
- `lg-lfxs26973d`
- `lg-lfxs26973s`
- `lg-lfxs28566b`
- `lg-lfxs28566s`
- `lg-lfxs28596s`
- `lg-lfxs28968d`
- `lg-lfxs28968s`
- `lg-lfxs28991s`
- `lg-lfxs29566s`
- `lg-lfxs30796d`
- `lg-lfxs30796s`
- `lg-lmws27626s`
- `lg-lmxs28626s`
- `lg-lmxs30796s`
- `lg-lrfvs3006s`
- `lg-lrfxs2503b`
- `lg-lrfxs3106w`
- `lg-lrmvc2306d`
- `lg-lrmvc2306s`
- `lg-lrsxs2706s`
- `lg-lsxs26366s`
- `lg-lsxs27366s`
- `lg-lupxs3186n`

## ge_xwf_xwfe_rpwfe_legacy_mixes

- affected_slug_count: **7**
- suspected_correct_filter_family: **UNKNOWN**
- safest_action: **split_mapping**
- hyperagent_can_help: **true**
- dominant_mapped_filter_patterns: xwf|xwfe (4); rpwfe|xwfe (3)

### Affected slugs

- `ge-gfe28gskww`
- `ge-gfe28gynes`
- `ge-gie21gsnerss`
- `ge-gye22hskww`
- `ge-pfe28kskbb`
- `ge-pfe28kynww`
- `ge-pwe23kmkes`

## quarantined_models

- affected_slug_count: **1**
- suspected_correct_filter_family: **lg::LT1000P**
- safest_action: **quarantine**
- hyperagent_can_help: **false**
- dominant_mapped_filter_patterns: lt1000p (1)

### Affected slugs

- `lg-lrfxs3106s`

## Recommended next action

Execute remediation sequence steps 1–4 read-only (noindex + HyperAgent Samsung evidence research), then owner-approved remove_mapping/split_mapping for HAF-CIN blocker and proven families.
