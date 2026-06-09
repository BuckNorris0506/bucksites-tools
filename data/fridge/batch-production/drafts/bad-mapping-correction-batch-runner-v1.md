# Bad mapping correction batch runner v1

- generated_at: **2026-06-09T17:26:52.403Z**
- dangerous_slug_count: **76**
- recommended_first_batch: **15** slugs

## Recommended first batch

- `samsung-rf23m8070sg`
- `samsung-rf23m8590sg`
- `samsung-rf27t5201sr`
- `samsung-rf27t5501sr`
- `samsung-rf28r6201ww`
- `samsung-rf28r6241sb`
- `samsung-rf28r6241sg`
- `samsung-rf28r6241sw`
- `samsung-rf28r6301sr`
- `samsung-rf28r7201sg`
- `samsung-rf28t5101sg`
- `samsung-rf28t5101sr`
- `samsung-rf28t5f01sr`
- `samsung-rs22t5201sg`
- `samsung-rs25h5111sr`

## HyperAgent research batch groups

### hyperagent-lg-lt-generation-co-maps-adq36006101-adq74793502-lt1000p-lt1000pc-mdj64844601

- root_cause_group: `lg_lt_generation_co_maps`
- slug_count: **15**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — LG LT generation research batch.
Batch ID: hyperagent-lg-lt-generation-co-maps-adq36006101-adq74793502-lt1000p-lt1000pc-mdj64844601.
Mapped pattern: adq36006101|adq74793502|lt1000p|lt1000pc|mdj64844601.
Models (15): LFCC22426S, LFCS22520S, LFDS22520S, LFXC22526S, LFXC24796D, LFXS26973D, LFXS28596S, LFXS28968D, LFXS28991S, LFXS30796D, LMWS27626S, LMXS30796S, LRMVC2306S, LRSXS2706S, LSXS26366S.
Slugs: lg-lfcc22426s, lg-lfcs22520s, lg-lfds22520s, lg-lfxc22526s, lg-lfxc24796d, lg-lfxs26973d, lg-lfxs28596s, lg-lfxs28968d, lg-lfxs28991s, lg-lfxs30796d, lg-lmws27626s, lg-lmxs30796s, lg-lrmvc2306s, lg-lrsxs2706s, lg-lsxs26366s.
For each model, find the official LG product/spec page and extract exactly one LT cartridge OEM.
Current repo co-maps multiple LT generations — identify the single correct token per model.
Do not infer from sibling models. Output filter_specification evidence per slug.
```

### hyperagent-lg-lt-generation-co-maps-lt600p-lt800p

- root_cause_group: `lg_lt_generation_co_maps`
- slug_count: **12**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — LG LT generation research batch.
Batch ID: hyperagent-lg-lt-generation-co-maps-lt600p-lt800p.
Mapped pattern: lt600p|lt800p.
Models (12): LFCC25426S, LFCS23520S, LFXC22526D, LFXC22596D, LFXS28566B, LFXS29566S, LFXS30796S, LRFXS2503B, LRFXS3106W, LRMVC2306D, LSXS27366S, LUPXS3186N.
Slugs: lg-lfcc25426s, lg-lfcs23520s, lg-lfxc22526d, lg-lfxc22596d, lg-lfxs28566b, lg-lfxs29566s, lg-lfxs30796s, lg-lrfxs2503b, lg-lrfxs3106w, lg-lrmvc2306d, lg-lsxs27366s, lg-lupxs3186n.
For each model, find the official LG product/spec page and extract exactly one LT cartridge OEM.
Current repo co-maps multiple LT generations — identify the single correct token per model.
Do not infer from sibling models. Output filter_specification evidence per slug.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-10105j

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **8**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-10105j.
Mapped pattern: da29-10105j.
Models (8): RF23M8070SG, RF27T5201SR, RF28R6201WW, RF28R6241SW, RF28R7201SG, RF28T5101SG, RS22T5201SG, RS25H5111SR.
Slugs: samsung-rf23m8070sg, samsung-rf27t5201sr, samsung-rf28r6201ww, samsung-rf28r6241sw, samsung-rf28r7201sg, samsung-rf28t5101sg, samsung-rs22t5201sg, samsung-rs25h5111sr.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00019a

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **6**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00019a.
Mapped pattern: da29-00019a.
Models (6): RF23M8590SG, RF28R6241SB, RF28R6241SG, RF28R6301SR, RF28T5101SR, RF28T5F01SR.
Slugs: samsung-rf23m8590sg, samsung-rf28r6241sb, samsung-rf28r6241sg, samsung-rf28r6301sr, samsung-rf28t5101sr, samsung-rf28t5f01sr.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

### hyperagent-lg-lt-generation-co-maps-lt1000p-lt1000pc

- root_cause_group: `lg_lt_generation_co_maps`
- slug_count: **5**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — LG LT generation research batch.
Batch ID: hyperagent-lg-lt-generation-co-maps-lt1000p-lt1000pc.
Mapped pattern: lt1000p|lt1000pc.
Models (5): LFXC22596S, LFXS26973S, LFXS28968S, LMXS28626S, LRFVS3006S.
Slugs: lg-lfxc22596s, lg-lfxs26973s, lg-lfxs28968s, lg-lmxs28626s, lg-lrfvs3006s.
For each model, find the official LG product/spec page and extract exactly one LT cartridge OEM.
Current repo co-maps multiple LT generations — identify the single correct token per model.
Do not infer from sibling models. Output filter_specification evidence per slug.
```

### hyperagent-ge-xwf-xwfe-rpwfe-legacy-mixes-xwf-xwfe

- root_cause_group: `ge_xwf_xwfe_rpwfe_legacy_mixes`
- slug_count: **4**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — GE RFID vs legacy shell research batch.
Batch ID: hyperagent-ge-xwf-xwfe-rpwfe-legacy-mixes-xwf-xwfe.
Mapped pattern: xwf|xwfe.
Models (4): GFE28GSKWW, GFE28GYNES, GIE21GSNERSS, PFE28KYNWW.
Slugs: ge-gfe28gskww, ge-gfe28gynes, ge-gie21gsnerss, ge-pfe28kynww.
For each model, find the official GE spec and determine RFID (XWFE/RPWFE) vs legacy (XWF/MWF) shell.
Output one proven filter slug per model for post-research split_mapping.
```

### hyperagent-ge-xwf-xwfe-rpwfe-legacy-mixes-rpwfe-xwfe

- root_cause_group: `ge_xwf_xwfe_rpwfe_legacy_mixes`
- slug_count: **3**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — GE RFID vs legacy shell research batch.
Batch ID: hyperagent-ge-xwf-xwfe-rpwfe-legacy-mixes-rpwfe-xwfe.
Mapped pattern: rpwfe|xwfe.
Models (3): GYE22HSKWW, PFE28KSKBB, PWE23KMKES.
Slugs: ge-gye22hskww, ge-pfe28kskbb, ge-pwe23kmkes.
For each model, find the official GE spec and determine RFID (XWFE/RPWFE) vs legacy (XWF/MWF) shell.
Output one proven filter slug per model for post-research split_mapping.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00003g

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **3**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00003g.
Mapped pattern: da29-00003g.
Models (3): RF23M8570SG, RF28R7551SW, RF28T5001SG.
Slugs: samsung-rf23m8570sg, samsung-rf28r7551sw, samsung-rf28t5001sg.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00003g-da97-08006b

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **3**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00003g-da97-08006b.
Mapped pattern: da29-00003g|da97-08006b.
Models (3): RF260BEAESG, RF28R6201SR, RF30BB8600QL.
Slugs: samsung-rf260beaesg, samsung-rf28r6201sr, samsung-rf30bb8600ql.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00019a-da97-08006b

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **3**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00019a-da97-08006b.
Mapped pattern: da29-00019a|da97-08006b.
Models (3): RF28K9070SW, RF28R7201WW, RF28R7551SR.
Slugs: samsung-rf28k9070sw, samsung-rf28r7201ww, samsung-rf28r7551sr.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

### hyperagent-lg-lt-generation-co-maps-adq36006101-adq74793502-lt1000p-lt1000pc-lt700p-mdj64844601

- root_cause_group: `lg_lt_generation_co_maps`
- slug_count: **2**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — LG LT generation research batch.
Batch ID: hyperagent-lg-lt-generation-co-maps-adq36006101-adq74793502-lt1000p-lt1000pc-lt700p-mdj64844601.
Mapped pattern: adq36006101|adq74793502|lt1000p|lt1000pc|lt700p|mdj64844601.
Models (2): LFXS26596S, LFXS28566S.
Slugs: lg-lfxs26596s, lg-lfxs28566s.
For each model, find the official LG product/spec page and extract exactly one LT cartridge OEM.
Current repo co-maps multiple LT generations — identify the single correct token per model.
Do not infer from sibling models. Output filter_specification evidence per slug.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00003g-da97-17376a-da97-17376b

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **2**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00003g-da97-17376a-da97-17376b.
Mapped pattern: da29-00003g|da97-17376a|da97-17376b.
Models (2): RF18A5101SR, RF23M8590SR.
Slugs: samsung-rf18a5101sr, samsung-rf23m8590sr.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00020a

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **2**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00020a.
Mapped pattern: da29-00020a.
Models (2): RF28R7551WW, RF28T5021SR.
Slugs: samsung-rf28r7551ww, samsung-rf28t5021sr.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00020a-da97-06317a

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **2**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00020a-da97-06317a.
Mapped pattern: da29-00020a|da97-06317a.
Models (2): RF28R6241SR, RF28R7351SW.
Slugs: samsung-rf28r6241sr, samsung-rf28r7351sw.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00020a-da97-15217d

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **2**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00020a-da97-15217d.
Mapped pattern: da29-00020a|da97-15217d.
Models (2): RF18HFENBWW, RF20A5101SR.
Slugs: samsung-rf18hfenbww, samsung-rf20a5101sr.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00019a-da29-10105j

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **1**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-00019a-da29-10105j.
Mapped pattern: da29-00019a|da29-10105j.
Models (1): RF28R6201SG.
Slugs: samsung-rf28r6201sg.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

### hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-10105j-da97-19467c

- root_cause_group: `samsung_haf_qin_da29_da97_conflicts`
- slug_count: **1**
- compat_edit_authorized: **false**

```
BuckParts BAD_MAPPING_CORRECTION_BATCH — Samsung DA29/DA97 research batch.
Batch ID: hyperagent-samsung-haf-qin-da29-da97-conflicts-da29-10105j-da97-19467c.
Mapped pattern: da29-10105j|da97-19467c.
Models (1): RF26J7500SR.
Slugs: samsung-rf26j7500sr.
For each model, find the official Samsung support/spec page and extract:
1) Water filter marketing token (HAF-QIN or HAF-CIN)
2) Exact DA97 or DA29 OEM part number
3) Source URL and page title
Reject wildcard-only inference. Cross-check against samsung::HAFQIN (da97-17376a/b) and samsung::HAFCIN (da29-00020b) repo-proven families.
Output: one evidence row per slug suitable for data/manual-evidence/refrigerator/{slug}.json filter_specification source.
```

## Post-HyperAgent validation checklist

- Manual evidence JSON exists at data/manual-evidence/refrigerator/{slug}.json with matching fridge_model_slug
- At least one source has evidence_role=filter_specification citing official manufacturer page
- Extracted OEM token maps to exactly one slug in data/filters.csv
- Proposed corrected mapping uses only slugs from one repo-proven filter family
- Re-run model_filter_correctness_audit_v1 — slug no longer WRONG_PART_RISK or BLOCKED
- For Samsung: legacyFilterSlugsMatchOfficialTokenV1 passes when marketing token is HAF-QIN or HAF-CIN
- Owner approval packet filed before any compatibility_mappings.csv edit
- No Supabase, sitemap, robots, or public page mutation from this runner

## Recommended next action

Run HyperAgent on recommended_first_batch_slugs (surgical samsung-rf27t5501sr + Samsung da29-10105j/da29-00019a research batches), validate against post_hyperagent_validation_checklist, then owner-review compat edits.
