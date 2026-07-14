# refrigerator QA batch repair — Supabase compatibility sync guarded dry-run v1

Generated: 2026-07-14T04:06:00.079Z

## Status

- contract: `refrigerator_model_first_qa_batch_supabase_compat_sync_guarded_apply_v1`
- mode: **dry_run**
- apply_status: **DRY_RUN_READY**
- read_only: **true**
- data_mutation: **false**
- supabase_mutation_authorized: **false**
- mutation_flag_enabled: **false**
- plan_sync_state: **pending_sync**
- owner_approval_present: **false**
- owner_approval_valid: **false**
- owner_approval_required_for_apply: **true**
- owner_approval_decision_id: `none`

## Sources

- sync_plan: `data/fridge/batch-production/drafts/refrigerator-model-first-qa-batch-supabase-compat-sync-plan-owner-review-v1.json`
- sync_plan_sha256: `b017b22bd8187bb12a89fbe88043d516142a8ef2f319e6e7239e1d16149751d4`
- owner_approval: `data/owner-decisions/refrigerator-model-first-qa-batch-supabase-compat-sync-owner-approval-v1.json`
- csv_apply_commit: `a2b5bc7`
- target_mappings_basis: `csv_current_mappings_per_slug`

## Planned Supabase changes

- planned_slug_count: 20
- planned_removals: 53
- planned_additions: 0

## Classification counts (from sync plan)

- **IN_SYNC**: 0
- **SUPABASE_STILL_HAS_OLD_ROWS**: 20
- **SUPABASE_MISSING_TARGET**: 0
- **CONFLICT**: 0
- **UNKNOWN_READ_FAILED**: 0

## Exact Supabase row deltas

- **remove** `frigidaire-ffhb2740ps,frig-242086201`
- **remove** `frigidaire-fghb2868pf,frig-242017801`
- **remove** `frigidaire-fghb2868pf,frig-242086201`
- **remove** `frigidaire-fghb2868pf,purepour`
- **remove** `frigidaire-fghb2868pf,ultrawf`
- **remove** `frigidaire-fghb2868pf,wf3cb`
- **remove** `frigidaire-fghb2868pf,wfcb`
- **remove** `frigidaire-fgsc2335tf,frig-242294502`
- **remove** `ge-gfe28gmkes,mswf`
- **remove** `ge-gfe28gskss,mswf`
- **remove** `ge-gfe28gskss,mwf`
- **remove** `ge-gfe28gynfs,xwfe`
- **remove** `lg-lfxc22596s,adq36006101`
- **remove** `lg-lfxc22596s,adq74793502`
- **remove** `lg-lfxc22596s,mdj64844601`
- **remove** `lg-lfxs26973s,adq36006101`
- **remove** `lg-lfxs26973s,adq74793502`
- **remove** `lg-lfxs26973s,lt700p`
- **remove** `lg-lfxs26973s,mdj64844601`
- **remove** `lg-lfxs28968s,adq36006101`
- **remove** `lg-lfxs28968s,adq74793502`
- **remove** `lg-lfxs28968s,lt700p`
- **remove** `lg-lfxs28968s,mdj64844601`
- **remove** `lg-lmxs28626s,adq36006101`
- **remove** `lg-lmxs28626s,adq74793502`
- **remove** `lg-lmxs28626s,mdj64844601`
- **remove** `lg-lrfvs3006s,adq36006101`
- **remove** `lg-lrfvs3006s,adq74793502`
- **remove** `lg-lrfvs3006s,lt700p`
- **remove** `lg-lrfvs3006s,mdj64844601`
- **remove** `lg-lrfxs3106s,lt600p`
- **remove** `lg-lrfxs3106s,lt800p`
- **remove** `samsung-rf263beaesr,da97-17376a`
- **remove** `samsung-rf263beaesr,da97-17376b`
- **remove** `samsung-rf28nhedbsr,da29-10105j`
- **remove** `samsung-rf28nhedbsr,da97-19467c`
- **remove** `samsung-rf28r7201sr,da29-00012b`
- **remove** `samsung-rf28r7201sr,da29-00020b`
- **remove** `samsung-rf28r7351sg,da29-00012b`
- **remove** `samsung-rf28r7351sg,da29-00020b`
- **remove** `whirlpool-wrf540cwhz,4396841`
- **remove** `whirlpool-wrf540cwhz,4396842`
- **remove** `whirlpool-wrf540cwhz,w10413645a`
- **remove** `whirlpool-wrs325sdhz,edr3rxd1`
- **remove** `whirlpool-wrx735sdhz,4396395`
- **remove** `whirlpool-wrx735sdhz,4396508`
- **remove** `whirlpool-wrx735sdhz,4396710`
- **remove** `whirlpool-wrx735sdhz,46-9002`
- **remove** `whirlpool-wrx735sdhz,8171413`
- **remove** `whirlpool-wrx735sdhz,edr1rxd1`
- **remove** `whirlpool-wrx735sdhz,edr2rxd1`
- **remove** `whirlpool-wrx986sihz,edr4rxd1`
- **remove** `whirlpool-wrx986sihz,ukf8001`

## Proven facts

- PROVEN: mode=dry_run; apply_status=DRY_RUN_READY; data_mutation=false; supabase_mutation_authorized=false; mutation_flag_enabled=false.
- PROVEN: sync_plan_rel_path=data/fridge/batch-production/drafts/refrigerator-model-first-qa-batch-supabase-compat-sync-plan-owner-review-v1.json.
- PROVEN: plan_sync_state=pending_sync; planned_slug_count=20; planned_removals=53; planned_additions=0.
- PROVEN: owner_approval_present=false; owner_approval_valid=false; decision_id=none.
- PROVEN: csv_apply_commit=a2b5bc7; target_mappings_basis=csv_current_mappings_per_slug.
- PROVEN: allowed_removal_row_keys=frigidaire-ffhb2740ps,frig-242086201 | frigidaire-fghb2868pf,frig-242017801 | frigidaire-fghb2868pf,frig-242086201 | frigidaire-fghb2868pf,purepour | frigidaire-fghb2868pf,ultrawf | frigidaire-fghb2868pf,wf3cb | frigidaire-fghb2868pf,wfcb | frigidaire-fgsc2335tf,frig-242294502 | ge-gfe28gmkes,mswf | ge-gfe28gskss,mswf | ge-gfe28gskss,mwf | ge-gfe28gynfs,xwfe | lg-lfxc22596s,adq36006101 | lg-lfxc22596s,adq74793502 | lg-lfxc22596s,mdj64844601 | lg-lfxs26973s,adq36006101 | lg-lfxs26973s,adq74793502 | lg-lfxs26973s,lt700p | lg-lfxs26973s,mdj64844601 | lg-lfxs28968s,adq36006101 | lg-lfxs28968s,adq74793502 | lg-lfxs28968s,lt700p | lg-lfxs28968s,mdj64844601 | lg-lmxs28626s,adq36006101 | lg-lmxs28626s,adq74793502 | lg-lmxs28626s,mdj64844601 | lg-lrfvs3006s,adq36006101 | lg-lrfvs3006s,adq74793502 | lg-lrfvs3006s,lt700p | lg-lrfvs3006s,mdj64844601 | lg-lrfxs3106s,lt600p | lg-lrfxs3106s,lt800p | samsung-rf263beaesr,da97-17376a | samsung-rf263beaesr,da97-17376b | samsung-rf28nhedbsr,da29-10105j | samsung-rf28nhedbsr,da97-19467c | samsung-rf28r7201sr,da29-00012b | samsung-rf28r7201sr,da29-00020b | samsung-rf28r7351sg,da29-00012b | samsung-rf28r7351sg,da29-00020b | whirlpool-wrf540cwhz,4396841 | whirlpool-wrf540cwhz,4396842 | whirlpool-wrf540cwhz,w10413645a | whirlpool-wrs325sdhz,edr3rxd1 | whirlpool-wrx735sdhz,4396395 | whirlpool-wrx735sdhz,4396508 | whirlpool-wrx735sdhz,4396710 | whirlpool-wrx735sdhz,46-9002 | whirlpool-wrx735sdhz,8171413 | whirlpool-wrx735sdhz,edr1rxd1 | whirlpool-wrx735sdhz,edr2rxd1 | whirlpool-wrx986sihz,edr4rxd1 | whirlpool-wrx986sihz,ukf8001.
- PROVEN: csv_mutation_authorized=false; buy_cta_authorized=false; retailer_links_mutation_authorized=false.
- PROVEN: no founder approval artifact at data/owner-decisions/refrigerator-model-first-qa-batch-supabase-compat-sync-owner-approval-v1.json (expected for this dry-run lane).
- PROVEN: sync plan shape verified (pending_sync; removals=53; additions=0; slug_count=20).

## Unknown facts

- UNKNOWN: When founder will create refrigerator-model-first-qa-batch-supabase-compat-sync-owner-approval-v1.json.
- UNKNOWN: Whether a future founder session will set BUCKPARTS_REFRIGERATOR_QA_BATCH_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1 for an authorized apply.

## Risk notes

- Dry-run never mutates Supabase or CSV.
- Apply requires matching founder approval + BUCKPARTS_REFRIGERATOR_QA_BATCH_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1 + exact pending 20/53/0 sync plan.
- Already-synced live mappings return ALREADY_APPLIED and do not re-apply deltas.
- Do not mutate retailer_links / buy CTA / sitemap / robots / Product JSON-LD / CSV from this executor.
- Do not include non-QA-batch, non-QA slugs in any refrigerator QA batch Supabase sync apply.

