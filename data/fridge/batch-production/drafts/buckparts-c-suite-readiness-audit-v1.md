# BuckParts C-Suite readiness audit v1

Generated: 2026-07-14T03:48:07.122Z
HEAD: `e097e09`

## Executive verdicts

- **CEO strategy**: FAIL
  - blocker: QA 20 runtime-risk: Supabase still has old rows on 20/20 while CSV intent is repaired
  - blocker: Frontend match for IN_SYNC cohorts not proven (render/source proof absent)
- **CTO architecture**: PASS
  - blocker: Live render / CDN / env parity for the 42 slugs not checked (live fetch disabled)
- **CPO journey**: FAIL
  - blocker: QA 20 customers likely see old Supabase filter families on model PDP
  - blocker: Search → PDP → CTA → /go journey not render-proven for any slug in v1
- **COO operating system**: PASS
  - blocker: Time/cost per batch not instrumented in this audit
- **CFO deploy/revenue**: UNKNOWN
  - blocker: Monetizable safe buyer paths not proven for scoped cohorts (CTA UNKNOWN)
  - blocker: Live Netlify credit/API not re-verified this session
- **CLO risk/claims**: PASS
  - blocker: Live page HTML / emitted JSON-LD not fetched for scoped slugs
- **CMO demand capture**: UNKNOWN
  - blocker: Fresh GSC / search-miss demand intersection not loaded in v1
  - blocker: Do not treat QA-drift or PARTIAL as coverage wins
- **Data Officer metrics**: FAIL
  - blocker: Backend parity progress (PASS/GTE18/GSWF13 closed) must not be reported as frontend-safe coverage
  - blocker: QA 20 proves CSV intent ≠ runtime Supabase customer truth

## Explicit callouts

- QA 20 is runtime-risk because Supabase still has old rows on 20/20.
- PASS 5, GTE18, and GSWF 13 are backend parity closed (artifact-backed IN_SYNC) when their parity packets are present.
- Frontend match is not claimed unless render/source proof exists — IN_SYNC does not auto-mark frontend-safe.
- GSWF PARTIAL 3 remains held/unknown and must never be promoted from this audit.
- Product JSON-LD / CTA / go-link per-slug claims remain UNKNOWN without inspected page/data proof.

## Cohort totals

- PASS: 0
- FAIL: 20
- UNKNOWN: 22
- backend_closed_in_sync_count: 19
- qa_20_supabase_old_rows_count: 20
- partial_held_count: 3

## Cohort table

| cohort | slug | csv | supabase | backend | frontend | CTA/go | verdict |
|---|---|---|---|---|---|---|---|
| gte18 | ge-gte18gsnrss | (none) | (none) | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| samsung_pass_5 | samsung-rf27t5201sr | da97-17376b | da97-17376b | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| samsung_pass_5 | samsung-rf27t5501sr | da97-17376b | da97-17376b | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| samsung_pass_5 | samsung-rf28r6301sr | da97-17376b | da97-17376b | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| samsung_pass_5 | samsung-rf28t5101sr | da97-17376b | da97-17376b | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| samsung_pass_5 | samsung-rs22t5201sg | da97-17376b | da97-17376b | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-cwe23sshww | rpwfe | rpwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-gfe24jgkww | smartwater-mwfp|xwfe | smartwater-mwfp|xwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-gfe27jmkes | xwfe | xwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-gfe28gmkbb | rpwfe | rpwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-gfe28gskes | rpwfe | rpwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-gfe28hskss | rpwfe|smartwater-mwfp | rpwfe|smartwater-mwfp | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-gne25jmkww | xwfe | xwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-gne27jstss | xwf|xwfe | xwf|xwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-gse25hskss | xwf|xwfe | xwf|xwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-gye22gskww | rpwfe | rpwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-pfe28kmkww | rpwfe|xwf | rpwfe|xwf | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-pfe28kynbb | rpwfe | rpwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_13 | ge-pvd28bymfs | xwfe | xwfe | IN_SYNC | UNKNOWN | UNKNOWN | UNKNOWN |
| qa_20 | frigidaire-ffhb2740ps | ultrawf | frig-242086201|ultrawf | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | frigidaire-fghb2868pf | eptwfu01 | eptwfu01|frig-242017801|frig-242086201|purepour|ultrawf|wf3cb|wfcb | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | frigidaire-fgsc2335tf | eptwfu01 | eptwfu01|frig-242294502 | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | ge-gfe28gmkes | rpwfe | mswf|rpwfe | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | ge-gfe28gskss | rpwfe | mswf|mwf|rpwfe | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | ge-gfe28gynfs | rpwfe | rpwfe|xwfe | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | lg-lfxc22596s | lt1000p|lt1000pc | adq36006101|adq74793502|lt1000p|lt1000pc|mdj64844601 | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | lg-lfxs26973s | lt1000p|lt1000pc | adq36006101|adq74793502|lt1000p|lt1000pc|lt700p|mdj64844601 | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | lg-lfxs28968s | lt1000p|lt1000pc | adq36006101|adq74793502|lt1000p|lt1000pc|lt700p|mdj64844601 | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | lg-lmxs28626s | lt1000p|lt1000pc | adq36006101|adq74793502|lt1000p|lt1000pc|mdj64844601 | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | lg-lrfvs3006s | lt1000p|lt1000pc | adq36006101|adq74793502|lt1000p|lt1000pc|lt700p|mdj64844601 | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | lg-lrfxs3106s | lt1000p | lt1000p|lt600p|lt800p | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | samsung-rf263beaesr | da29-00020b | da29-00020b|da97-17376a|da97-17376b | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | samsung-rf28nhedbsr | da29-00020b | da29-00020b|da29-10105j|da97-19467c | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | samsung-rf28r7201sr | da97-17376b | da29-00012b|da29-00020b|da97-17376b | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | samsung-rf28r7351sg | da97-17376a|da97-17376b | da29-00012b|da29-00020b|da97-17376a|da97-17376b | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | whirlpool-wrf540cwhz | edr4rxd1 | 4396841|4396842|edr4rxd1|w10413645a | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | whirlpool-wrs325sdhz | edr1rxd1 | edr1rxd1|edr3rxd1 | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | whirlpool-wrx735sdhz | edr4rxd1 | 4396395|4396508|4396710|46-9002|8171413|edr1rxd1|edr2rxd1|edr4rxd1 | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| qa_20 | whirlpool-wrx986sihz | edr2rxd1 | edr2rxd1|edr4rxd1|ukf8001 | SUPABASE_STILL_HAS_OLD_ROWS | UNKNOWN | UNKNOWN | FAIL |
| gswf_partial_3 | ge-gfe28hmkww | gswf|gswf2 | UNKNOWN | PARTIAL_HELD_UNKNOWN_NOT_PROVEN | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_partial_3 | ge-gsc25frshss | gswf|gswf2 | UNKNOWN | PARTIAL_HELD_UNKNOWN_NOT_PROVEN | UNKNOWN | UNKNOWN | UNKNOWN |
| gswf_partial_3 | ge-gse26gshess | gswf|gswf2 | UNKNOWN | PARTIAL_HELD_UNKNOWN_NOT_PROVEN | UNKNOWN | UNKNOWN | UNKNOWN |

## Architecture source map

- CSV role: ops_parity_intent_only_not_runtime_customer_truth
- Supabase role: runtime_customer_truth_for_pdp_search_cta_go_sitemap
- PROVEN: live fridge PDP loader does not read data/compatibility_mappings.csv; runtime = Supabase
- **/fridge/[slug]**: runtime=supabase.compatibility_mappings; live_render=UNKNOWN
- **/filter/[slug]**: runtime=supabase.filters+retailer_links; live_render=UNKNOWN
- **search**: runtime=supabase; live_render=UNKNOWN
- **CTA**: runtime=supabase.retailer_links + direct_buyable gates; live_render=UNKNOWN
- **/go**: runtime=supabase.retailer_links via getRetailerLinkById; live_render=UNKNOWN
- **sitemap**: runtime=supabase + safety collectors; live_render=UNKNOWN
- **robots**: runtime=static/codegen robots policy; live_render=UNKNOWN
- **Product JSON-LD**: runtime=suppressed_without_truthful_offer (code gate); live_render=UNKNOWN

## Ranked next 10 moves

1. Build Refrigerator QA 20 Supabase sync plan/owner-review (20/20 still have old runtime rows). (auditor count: 20 FAIL / old-row slugs).
2. Produce frontend mismatch proof pack (PDP filter extract) for worst QA drift slugs.
3. Run IN_SYNC cohort smoke for PASS 5 + GTE18 + sample GSWF 13 (confirm PDP equals intent). (backend-closed IN_SYNC count this audit: 19).
4. PARTIAL 3 promotion kill-check: assert no CTA/index 'ready' and keep held. (held count: 3).
5. Safe CTA gap report for IN_SYNC cohorts (repaired truth ≠ monetizable buyer path).
6. Split Command Center metrics: backend_parity_closed vs frontend_safe_coverage.
7. JSON-LD / claims lint on sample filter pages in the 42-slug scope.
8. Credit/deploy gate board: what truth work proceeds without spend vs needs deploy.
9. Demand ∩ QA-drift: prioritize sync for QA slugs appearing in GSC/search-miss.
10. COO reusable checklist template: parity → sync plan → approval → guarded apply → already_applied.

## Flags

- read_only: **true**
- data_mutation: **false**
- live_fetch_enabled: **false**
- live_fetch_status: **DISABLED_BY_DEFAULT**

## Proven facts

- PROVEN: read_only=true; data_mutation=false; all mutation/buy/sitemap/JSON-LD mutation flags false.
- PROVEN: exact scope=42 slugs across 5 cohorts.
- PROVEN: live_fetch_enabled=false by default; v1 does not fetch production URLs.
- PROVEN: live fridge PDP loader does not read data/compatibility_mappings.csv; runtime = Supabase
- PROVEN: QA old-row count from parity artifact compose=20.

## Unknown facts

- UNKNOWN: Observed PDP filter lists for all 42 slugs (no render/source proof in v1).
- UNKNOWN: CTA visibility and /go outcomes for all 42 slugs.
- UNKNOWN: Live production HTML parity vs local/repo Supabase.
- UNKNOWN: Fresh demand/GSC intersection for prioritization.
- UNKNOWN: Ship-guard consolidated recompute this session.

## Risk notes

- Customer pages read Supabase; CSV-only repairs do not fix live wrong-part exposure.
- Do not invent Product offers/review/aggregateRating or buy eligibility from this packet.
- Do not create approval/apply from this audit.
