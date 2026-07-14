# BuckParts fridge model PDP rendered truth proof pack v1

Generated: 2026-07-14T04:36:44.937Z

## Status

- contract: `buckparts_fridge_model_pdp_rendered_truth_proof_pack_v1`
- read_only: **true**
- data_mutation: **false**
- live_production_fetch_enabled: **false**
- slug_count: **39**
- excluded PARTIAL: `ge-gfe28hmkww, ge-gsc25frshss, ge-gse26gshess`

## Summary

- MATCH: 28
- MISMATCH: 0
- UNKNOWN_RENDER: 0
- QUARANTINED_SUPPRESSED: 11
- frontend_safe_promoted_count: 28

## Rows

| cohort | slug | classification | frontend_safe_promoted | supabase | rendered |
|---|---|---|---|---|---|
| gte18 | ge-gte18gsnrss | MATCH | true | (none/unread) | (none/unread) |
| samsung_pass_5 | samsung-rf27t5201sr | QUARANTINED_SUPPRESSED | false | da97-17376b | (none/unread) |
| samsung_pass_5 | samsung-rf27t5501sr | QUARANTINED_SUPPRESSED | false | da97-17376b | (none/unread) |
| samsung_pass_5 | samsung-rf28r6301sr | QUARANTINED_SUPPRESSED | false | da97-17376b | (none/unread) |
| samsung_pass_5 | samsung-rf28t5101sr | QUARANTINED_SUPPRESSED | false | da97-17376b | (none/unread) |
| samsung_pass_5 | samsung-rs22t5201sg | QUARANTINED_SUPPRESSED | false | da97-17376b | (none/unread) |
| gswf_13 | ge-cwe23sshww | MATCH | true | rpwfe | rpwfe |
| gswf_13 | ge-gfe24jgkww | MATCH | true | smartwater-mwfp|xwfe | smartwater-mwfp|xwfe |
| gswf_13 | ge-gfe27jmkes | MATCH | true | xwfe | xwfe |
| gswf_13 | ge-gfe28gmkbb | MATCH | true | rpwfe | rpwfe |
| gswf_13 | ge-gfe28gskes | MATCH | true | rpwfe | rpwfe |
| gswf_13 | ge-gfe28hskss | MATCH | true | rpwfe|smartwater-mwfp | rpwfe|smartwater-mwfp |
| gswf_13 | ge-gne25jmkww | MATCH | true | xwfe | xwfe |
| gswf_13 | ge-gne27jstss | MATCH | true | xwf|xwfe | xwf|xwfe |
| gswf_13 | ge-gse25hskss | MATCH | true | xwf|xwfe | xwf|xwfe |
| gswf_13 | ge-gye22gskww | MATCH | true | rpwfe | rpwfe |
| gswf_13 | ge-pfe28kmkww | MATCH | true | rpwfe|xwf | rpwfe|xwf |
| gswf_13 | ge-pfe28kynbb | MATCH | true | rpwfe | rpwfe |
| gswf_13 | ge-pvd28bymfs | MATCH | true | xwfe | xwfe |
| qa_20 | frigidaire-ffhb2740ps | MATCH | true | ultrawf | ultrawf |
| qa_20 | frigidaire-fghb2868pf | MATCH | true | eptwfu01 | eptwfu01 |
| qa_20 | frigidaire-fgsc2335tf | MATCH | true | eptwfu01 | eptwfu01 |
| qa_20 | ge-gfe28gmkes | MATCH | true | rpwfe | rpwfe |
| qa_20 | ge-gfe28gskss | MATCH | true | rpwfe | rpwfe |
| qa_20 | ge-gfe28gynfs | MATCH | true | rpwfe | rpwfe |
| qa_20 | lg-lfxc22596s | QUARANTINED_SUPPRESSED | false | lt1000p|lt1000pc | (none/unread) |
| qa_20 | lg-lfxs26973s | QUARANTINED_SUPPRESSED | false | lt1000p|lt1000pc | (none/unread) |
| qa_20 | lg-lfxs28968s | QUARANTINED_SUPPRESSED | false | lt1000p|lt1000pc | (none/unread) |
| qa_20 | lg-lmxs28626s | QUARANTINED_SUPPRESSED | false | lt1000p|lt1000pc | (none/unread) |
| qa_20 | lg-lrfvs3006s | QUARANTINED_SUPPRESSED | false | lt1000p|lt1000pc | (none/unread) |
| qa_20 | lg-lrfxs3106s | QUARANTINED_SUPPRESSED | false | lt1000p | (none/unread) |
| qa_20 | samsung-rf263beaesr | MATCH | true | da29-00020b | da29-00020b |
| qa_20 | samsung-rf28nhedbsr | MATCH | true | da29-00020b | da29-00020b |
| qa_20 | samsung-rf28r7201sr | MATCH | true | da97-17376b | da97-17376b |
| qa_20 | samsung-rf28r7351sg | MATCH | true | da97-17376a|da97-17376b | da97-17376a|da97-17376b |
| qa_20 | whirlpool-wrf540cwhz | MATCH | true | edr4rxd1 | edr4rxd1 |
| qa_20 | whirlpool-wrs325sdhz | MATCH | true | edr1rxd1 | edr1rxd1 |
| qa_20 | whirlpool-wrx735sdhz | MATCH | true | edr4rxd1 | edr4rxd1 |
| qa_20 | whirlpool-wrx986sihz | MATCH | true | edr2rxd1 | edr2rxd1 |

## Proven facts

- PROVEN: read_only=true; data_mutation=false; all mutation/buy/sitemap/JSON-LD flags false.
- PROVEN: exact backend-closed scope=39 (GTE18+PASS5+GSWF13+QA20); PARTIAL 3 excluded.
- PROVEN: live_production_fetch_enabled=false; local getFridgeBySlug + Supabase compat + quarantine safety only.
- PROVEN: summary={"MATCH":28,"MISMATCH":0,"UNKNOWN_RENDER":0,"QUARANTINED_SUPPRESSED":11,"frontend_safe_promoted_count":28,"backend_closed_slug_count":39}.
- PROVEN: frontend_safe_promoted_count=28 (mapping-layer local data-path only).

## Unknown facts

- UNKNOWN: Live production HTML for these 39 PDPs (no production fetch).
- UNKNOWN: CTA visibility and /go outcomes for these slugs.
- UNKNOWN: CDN/env drift between local Supabase read and deployed Netlify render.

## Risk notes

- frontend_safe_promoted is mapping-set proof only — not monetizable buyer-path approval.
- Do not mutate CSV, Supabase, retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this packet.
- PARTIAL 3 remains out of scope and must not be promoted from this pack.
