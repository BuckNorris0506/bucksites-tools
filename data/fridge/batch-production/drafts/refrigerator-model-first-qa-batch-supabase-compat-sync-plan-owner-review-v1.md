# Refrigerator model-first QA batch — Supabase compatibility sync plan (owner review)

- contract: `refrigerator_model_first_qa_batch_supabase_compat_sync_plan_owner_review_v1`
- generated_at: `2026-07-14T04:05:48.106Z`
- csv_apply_commit: `a2b5bc7`
- read_only: **true**
- data_mutation: **false**
- supabase_mutation_authorized: **false**
- apply_authorized: **false**
- plan_sync_state: **pending_sync**
- planned_slug_count: **20**
- target_mappings_basis: `csv_current_mappings_per_slug`

## Classification counts

- **IN_SYNC**: 0
- **SUPABASE_STILL_HAS_OLD_ROWS**: 20
- **SUPABASE_MISSING_TARGET**: 0
- **CONFLICT**: 0
- **UNKNOWN_READ_FAILED**: 0

## Planned Supabase changes (NOT applied)

- removals: **53**
- additions: **0**

### Removals

- `frigidaire-ffhb2740ps,frig-242086201`
- `frigidaire-fghb2868pf,frig-242017801`
- `frigidaire-fghb2868pf,frig-242086201`
- `frigidaire-fghb2868pf,purepour`
- `frigidaire-fghb2868pf,ultrawf`
- `frigidaire-fghb2868pf,wf3cb`
- `frigidaire-fghb2868pf,wfcb`
- `frigidaire-fgsc2335tf,frig-242294502`
- `ge-gfe28gmkes,mswf`
- `ge-gfe28gskss,mswf`
- `ge-gfe28gskss,mwf`
- `ge-gfe28gynfs,xwfe`
- `lg-lfxc22596s,adq36006101`
- `lg-lfxc22596s,adq74793502`
- `lg-lfxc22596s,mdj64844601`
- `lg-lfxs26973s,adq36006101`
- `lg-lfxs26973s,adq74793502`
- `lg-lfxs26973s,lt700p`
- `lg-lfxs26973s,mdj64844601`
- `lg-lfxs28968s,adq36006101`
- `lg-lfxs28968s,adq74793502`
- `lg-lfxs28968s,lt700p`
- `lg-lfxs28968s,mdj64844601`
- `lg-lmxs28626s,adq36006101`
- `lg-lmxs28626s,adq74793502`
- `lg-lmxs28626s,mdj64844601`
- `lg-lrfvs3006s,adq36006101`
- `lg-lrfvs3006s,adq74793502`
- `lg-lrfvs3006s,lt700p`
- `lg-lrfvs3006s,mdj64844601`
- `lg-lrfxs3106s,lt600p`
- `lg-lrfxs3106s,lt800p`
- `samsung-rf263beaesr,da97-17376a`
- `samsung-rf263beaesr,da97-17376b`
- `samsung-rf28nhedbsr,da29-10105j`
- `samsung-rf28nhedbsr,da97-19467c`
- `samsung-rf28r7201sr,da29-00012b`
- `samsung-rf28r7201sr,da29-00020b`
- `samsung-rf28r7351sg,da29-00012b`
- `samsung-rf28r7351sg,da29-00020b`
- `whirlpool-wrf540cwhz,4396841`
- `whirlpool-wrf540cwhz,4396842`
- `whirlpool-wrf540cwhz,w10413645a`
- `whirlpool-wrs325sdhz,edr3rxd1`
- `whirlpool-wrx735sdhz,4396395`
- `whirlpool-wrx735sdhz,4396508`
- `whirlpool-wrx735sdhz,4396710`
- `whirlpool-wrx735sdhz,46-9002`
- `whirlpool-wrx735sdhz,8171413`
- `whirlpool-wrx735sdhz,edr1rxd1`
- `whirlpool-wrx735sdhz,edr2rxd1`
- `whirlpool-wrx986sihz,edr4rxd1`
- `whirlpool-wrx986sihz,ukf8001`

### Additions

- none

## Per-slug rows

### frigidaire-ffhb2740ps

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `ultrawf`
- supabase: `frig-242086201|ultrawf`
- old_rows_still_in_supabase: `frig-242086201`
- missing_from_supabase: `(none)`

### frigidaire-fghb2868pf

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `eptwfu01`
- supabase: `eptwfu01|frig-242017801|frig-242086201|purepour|ultrawf|wf3cb|wfcb`
- old_rows_still_in_supabase: `frig-242017801|frig-242086201|purepour|ultrawf|wf3cb|wfcb`
- missing_from_supabase: `(none)`

### frigidaire-fgsc2335tf

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `eptwfu01`
- supabase: `eptwfu01|frig-242294502`
- old_rows_still_in_supabase: `frig-242294502`
- missing_from_supabase: `(none)`

### ge-gfe28gmkes

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `rpwfe`
- supabase: `mswf|rpwfe`
- old_rows_still_in_supabase: `mswf`
- missing_from_supabase: `(none)`

### ge-gfe28gskss

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `rpwfe`
- supabase: `mswf|mwf|rpwfe`
- old_rows_still_in_supabase: `mswf|mwf`
- missing_from_supabase: `(none)`

### ge-gfe28gynfs

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `rpwfe`
- supabase: `rpwfe|xwfe`
- old_rows_still_in_supabase: `xwfe`
- missing_from_supabase: `(none)`

### lg-lfxc22596s

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `lt1000p|lt1000pc`
- supabase: `adq36006101|adq74793502|lt1000p|lt1000pc|mdj64844601`
- old_rows_still_in_supabase: `adq36006101|adq74793502|mdj64844601`
- missing_from_supabase: `(none)`

### lg-lfxs26973s

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `lt1000p|lt1000pc`
- supabase: `adq36006101|adq74793502|lt1000p|lt1000pc|lt700p|mdj64844601`
- old_rows_still_in_supabase: `adq36006101|adq74793502|lt700p|mdj64844601`
- missing_from_supabase: `(none)`

### lg-lfxs28968s

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `lt1000p|lt1000pc`
- supabase: `adq36006101|adq74793502|lt1000p|lt1000pc|lt700p|mdj64844601`
- old_rows_still_in_supabase: `adq36006101|adq74793502|lt700p|mdj64844601`
- missing_from_supabase: `(none)`

### lg-lmxs28626s

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `lt1000p|lt1000pc`
- supabase: `adq36006101|adq74793502|lt1000p|lt1000pc|mdj64844601`
- old_rows_still_in_supabase: `adq36006101|adq74793502|mdj64844601`
- missing_from_supabase: `(none)`

### lg-lrfvs3006s

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `lt1000p|lt1000pc`
- supabase: `adq36006101|adq74793502|lt1000p|lt1000pc|lt700p|mdj64844601`
- old_rows_still_in_supabase: `adq36006101|adq74793502|lt700p|mdj64844601`
- missing_from_supabase: `(none)`

### lg-lrfxs3106s

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `lt1000p`
- supabase: `lt1000p|lt600p|lt800p`
- old_rows_still_in_supabase: `lt600p|lt800p`
- missing_from_supabase: `(none)`

### samsung-rf263beaesr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `da29-00020b`
- supabase: `da29-00020b|da97-17376a|da97-17376b`
- old_rows_still_in_supabase: `da97-17376a|da97-17376b`
- missing_from_supabase: `(none)`

### samsung-rf28nhedbsr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `da29-00020b`
- supabase: `da29-00020b|da29-10105j|da97-19467c`
- old_rows_still_in_supabase: `da29-10105j|da97-19467c`
- missing_from_supabase: `(none)`

### samsung-rf28r7201sr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `da97-17376b`
- supabase: `da29-00012b|da29-00020b|da97-17376b`
- old_rows_still_in_supabase: `da29-00012b|da29-00020b`
- missing_from_supabase: `(none)`

### samsung-rf28r7351sg

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `da97-17376a|da97-17376b`
- supabase: `da29-00012b|da29-00020b|da97-17376a|da97-17376b`
- old_rows_still_in_supabase: `da29-00012b|da29-00020b`
- missing_from_supabase: `(none)`

### whirlpool-wrf540cwhz

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `edr4rxd1`
- supabase: `4396841|4396842|edr4rxd1|w10413645a`
- old_rows_still_in_supabase: `4396841|4396842|w10413645a`
- missing_from_supabase: `(none)`

### whirlpool-wrs325sdhz

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `edr1rxd1`
- supabase: `edr1rxd1|edr3rxd1`
- old_rows_still_in_supabase: `edr3rxd1`
- missing_from_supabase: `(none)`

### whirlpool-wrx735sdhz

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `edr4rxd1`
- supabase: `4396395|4396508|4396710|46-9002|8171413|edr1rxd1|edr2rxd1|edr4rxd1`
- old_rows_still_in_supabase: `4396395|4396508|4396710|46-9002|8171413|edr1rxd1|edr2rxd1`
- missing_from_supabase: `(none)`

### whirlpool-wrx986sihz

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `edr2rxd1`
- supabase: `edr2rxd1|edr4rxd1|ukf8001`
- old_rows_still_in_supabase: `edr4rxd1|ukf8001`
- missing_from_supabase: `(none)`

## Proven facts

- PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false; csv_mutation_authorized=false.
- PROVEN: buy_cta_authorized=false; retailer_links_mutation_authorized=false; sitemap_robots_mutation_authorized=false; product_json_ld_mutation_authorized=false.
- PROVEN: planned_slug_count=20; csv_apply_commit=a2b5bc7; target_mappings_basis=csv_current_mappings_per_slug.
- PROVEN: classification_counts={"IN_SYNC":0,"SUPABASE_STILL_HAS_OLD_ROWS":20,"SUPABASE_MISSING_TARGET":0,"CONFLICT":0,"UNKNOWN_READ_FAILED":0}; plan_sync_state=pending_sync.
- PROVEN: planned_removals=53; planned_additions=0 (plan only — not applied).
- PROVEN: allowed_removal_row_keys count=53.
- PROVEN: removals limited to proven old Supabase leftovers not present in CSV; additions limited to CSV mappings missing from Supabase.

## Unknown facts

- UNKNOWN: Whether founder will create a matching refrigerator QA batch supabase-compat-sync owner-approval artifact.
- UNKNOWN: Whether live public pages currently resolve filters from CSV, Supabase, or both after deploy.

## Risk notes

- Pending exact sync: remove 53 old Supabase leftover rows (additions=0).
- This packet does not mutate Supabase or CSV.
- Do not mutate retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this packet.
- Future Supabase apply requires a separate founder approval artifact + guarded executor + env flag.
- Removals are limited to the proven QA parity old-row allowlist; additions expected empty while CSV targets already exist in Supabase.

