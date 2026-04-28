# BuckParts Operating Map (Step 1 Source of Truth)

Scope: repo-truth inventory from `/Users/jaredbuckman/bucksites-tools` only.  
Classification legend: `KEEP`, `FREEZE`, `CUT`, `UNKNOWN`.

## 1) Core runtime systems

| Name | Exact repo path(s) | What it does | Affects (trust/index/CTA/affiliate/ops) | Infra type | Classification | Reason |
|---|---|---|---|---|---|---|
| Next.js production app | `src/app/**`, `src/components/**`, `src/lib/**` | Serves BuckParts site routes and UI. | yes/yes/yes/yes/yes | Permanent | KEEP | Core runtime. |
| Search API + telemetry loop | `src/app/api/search/route.ts`, `src/lib/search/telemetry.ts` | Handles search and emits search/gap telemetry. | no/yes/yes/no/yes | Permanent | KEEP | Active discovery loop. |
| `/go` redirect + gate | `src/app/go/[linkId]/route.ts`, `src/app/appliance-air/go/[linkId]/route.ts`, `src/app/air-purifier/go/[linkId]/route.ts`, `src/app/humidifier/go/[linkId]/route.ts`, `src/app/vacuum/go/[linkId]/route.ts`, `src/app/whole-house-water/go/[linkId]/route.ts`, `src/lib/retailers/go-affiliate-route-handler.ts`, `src/lib/retailers/go-redirect-gate.ts` | Affiliate redirect, validation/gating, click flow handling. | yes/no/yes/yes/yes | Permanent | KEEP | Core affiliate path. |
| Buy-link trust gating | `src/lib/retailers/launch-buy-links.ts`, `src/components/BuyLinks.tsx`, `src/components/TieredBuyLinks.tsx` | Filters/suppresses low-trust links and controls launch eligibility. | yes/no/yes/yes/no | Permanent | KEEP | Direct trust and CTA control. |
| Part trust scoring/panel | `src/lib/trust/part-trust.ts`, `src/components/trust/PartTrustPanel.tsx` | Computes and displays trust states for part pages. | yes/no/yes/no/no | Permanent | KEEP | User-facing trust system. |
| Sitemap/indexability | `src/app/sitemap.ts`, `src/lib/sitemap/wedge-indexable-urls.ts` | Builds sitemap/indexable URL set by wedge. | no/yes/yes/no/yes | Permanent | KEEP | Indexation control layer. |
| Legal/trust pages | `src/app/privacy/page.tsx`, `src/app/disclosure/page.tsx`, `src/app/about/page.tsx`, `src/app/terms/page.tsx` | Privacy/disclosure/about/terms pages. | yes/no/no/yes/no | Permanent | KEEP | Trust/compliance surface. |
| Help content system | `src/app/help/page.tsx`, `src/app/help/[slug]/page.tsx`, `src/app/help/reset-water-filter-light/[brandSlug]/page.tsx`, `content/help/*.md` | Help article routing and content docs. | yes/yes/yes/no/no | Permanent | KEEP | Published support content. |
| Netlify deploy config | `netlify.toml`, `package.json` (`build`) | Defines production build/deploy runtime. | no/no/no/no/yes | Permanent | KEEP | Active hosting config. |
| GitHub workflow automation | `.github/**` | No workflow files found in repo. | no/no/no/no/yes | UNKNOWN | UNKNOWN | Not present in repo; external automation cannot be proven. |
| Dashboard UI app | _(none found)_ | No dashboard frontend app artifact found. | no/no/no/no/yes | UNKNOWN | UNKNOWN | Reporting exists as scripts, not dashboard UI. |

## 2) Queue/workflow systems

| Name | Exact repo path(s) | What it does | Affects (trust/index/CTA/affiliate/ops) | Infra type | Classification | Reason |
|---|---|---|---|---|---|---|
| Search intelligence queue | `supabase/migrations/20260410170000_search_intelligence.sql` | Defines search events/gaps and workflow statuses. | no/yes/yes/no/yes | Permanent | KEEP | Canonical search queue schema present. |
| Search gap candidate workflow | `supabase/migrations/20260410180000_search_gap_candidates.sql`, `scripts/search-gap-candidates-generate.ts`, `scripts/search-gap-candidates-apply.ts` | Candidate generation/apply for search gaps. | no/yes/yes/no/yes | Permanent | KEEP | End-to-end queue scripts + schema. |
| Candidate application staging workflow | `supabase/migrations/20260410190000_candidate_application_staging.sql`, `scripts/review-staged-compat-refrigerator.ts`, `scripts/resolve-staged-compat-refrigerator.ts`, `scripts/promote-staged-refrigerator.ts`, `scripts/review-staged-part-resolution-refrigerator.ts`, `scripts/apply-staged-compat-part-choice-refrigerator.ts`, `scripts/review-staged-filter-brand-refrigerator.ts`, `scripts/apply-staged-filter-brand-refrigerator.ts` | Staging/review/promote lifecycle for catalog changes. | yes/no/yes/no/yes | Permanent | KEEP | Explicit staged lifecycle implemented. |
| Retailer offer candidates queue (newer) | `supabase/migrations/20260424133000_retailer_offer_candidates_phase1_state.sql`, `scripts/hqii-candidate-queue-upsert.ts`, `scripts/buckparts-schema-preflight.ts` | Stateful retailer offer candidate queue. | yes/no/no/yes/yes | Permanent | KEEP | Current queue-state artifacts exist. |
| Retailer link candidates queue (older) | `supabase/migrations/20260408200000_retailer_link_candidates.sql`, `supabase/schema.sql` | Legacy/older retailer link candidate queue model. | yes/no/no/yes/yes | Permanent | FREEZE | Overlaps newer offer-candidate queue. |
| Retailer links workflow migration | `supabase/migrations/20260408120000_retailer_links_workflow.sql` | Retailer link workflow foundation. | yes/no/yes/yes/yes | Permanent | KEEP | Foundational workflow migration. |
| Placeholder-link removal workflow | `supabase/migrations/20260410220000_remove_search_placeholder_retailer_links.sql` | Removes placeholder-style retailer links from workflow. | yes/no/yes/yes/yes | Permanent | KEEP | Trust/CTA quality control. |
| Gap status application workflow | `scripts/apply-search-gap-status-refrigerator.ts`, `scripts/apply-search-gap-status-air-purifier.ts`, `scripts/apply-search-gap-status-whole-house-water.ts` | Applies queue status updates by wedge. | no/yes/yes/no/yes | Permanent | KEEP | Queue hygiene scripts wired. |

## 3) Reporting/runbook systems

| Name | Exact repo path(s) | What it does | Affects (trust/index/CTA/affiliate/ops) | Infra type | Classification | Reason |
|---|---|---|---|---|---|---|
| Launch readiness report | `scripts/report-homekeep-launch-readiness.ts` | Launch readiness output. | yes/yes/yes/no/yes | Permanent | KEEP | Explicit report artifact. |
| Business scorecard report | `scripts/report-homekeep-business-scorecard.ts` | Business/coverage scorecard output. | no/no/yes/yes/yes | Permanent | KEEP | Explicit report artifact. |
| Cross-wedge ops report | `scripts/report-homekeep-cross-wedge-ops.ts` | Cross-wedge operations output. | no/no/yes/no/yes | Permanent | KEEP | Explicit ops report artifact. |
| Affiliate click report | `scripts/report-homekeep-affiliate-clicks.ts` | Affiliate click-event reporting output. | no/no/no/yes/yes | Permanent | KEEP | Explicit affiliate report artifact. |
| Traffic/monetization audit | `scripts/audit-homekeep-traffic-monetization-readiness.ts` | Traffic + monetization readiness checks. | yes/no/yes/yes/yes | Permanent | KEEP | Explicit audit artifact. |
| Refrigerator guardrails report | `scripts/report-refrigerator-mapping-guardrails.ts` | Fridge mapping guardrail checks. | yes/no/yes/no/yes | Permanent | KEEP | Guardrail report artifact. |
| Air purifier guardrails report | `scripts/report-air-purifier-mapping-guardrails.ts` | AP mapping guardrail checks. | yes/no/yes/no/yes | Permanent | KEEP | Guardrail report artifact. |
| Whole-house-water guardrails report | `scripts/report-whole-house-water-mapping-guardrails.ts` | WHW mapping guardrail checks. | yes/no/yes/no/yes | Permanent | KEEP | Guardrail report artifact. |
| Refrigerator model priority report | `scripts/report-model-priority-refrigerator.ts` | Fridge model priority output. | no/no/yes/no/yes | Permanent | KEEP | Prioritization report artifact. |
| Refrigerator runbook | `scripts/runbook-refrigerator.ts` | Refrigerator operations runbook script. | yes/no/yes/no/yes | Permanent | KEEP | Named runbook artifact. |
| Air purifier runbook | `scripts/runbook-air-purifier.ts` | AP operations runbook script. | yes/no/yes/no/yes | Permanent | KEEP | Named runbook artifact. |
| Whole-house-water runbook | `scripts/runbook-whole-house-water.ts` | WHW operations runbook script. | yes/no/yes/no/yes | Permanent | KEEP | Named runbook artifact. |

## 4) Script inventory

Full `scripts/*.ts` inventory found at report time (54 files total).

| Script | Exact repo path | What it does | Affects (trust/index/CTA/affiliate/ops) | Infra type | Classification | Reason |
|---|---|---|---|---|---|---|
| import seed | `scripts/import-seed.ts` | Fridge seed import. | no/no/yes/no/yes | Permanent | KEEP | NPM-wired ingestion. |
| import AP seed | `scripts/import-air-purifier-seed.ts` | AP seed import. | no/no/yes/no/yes | Permanent | KEEP | NPM-wired ingestion. |
| import vacuum seed | `scripts/import-vacuum-seed.ts` | Vacuum seed import. | no/no/yes/no/yes | Permanent | KEEP | NPM-wired ingestion. |
| import humidifier seed | `scripts/import-humidifier-seed.ts` | Humidifier seed import. | no/no/yes/no/yes | Permanent | KEEP | NPM-wired ingestion. |
| import appliance-air seed | `scripts/import-appliance-air-seed.ts` | Appliance-air seed import. | no/no/yes/no/yes | Permanent | KEEP | NPM-wired ingestion. |
| import WHW seed | `scripts/import-whole-house-water-seed.ts` | Whole-house-water seed import. | no/no/yes/no/yes | Permanent | KEEP | NPM-wired ingestion. |
| ingest HQII links | `scripts/ingest-hqii-retailer-links.ts` | Ingests retailer links feed. | yes/no/yes/yes/yes | Permanent | KEEP | NPM-wired ingestion. |
| prioritize next coverage batch | `scripts/prioritize-coverage-next-batch.ts` | Prioritization helper. | no/no/yes/no/yes | Permanent | KEEP | NPM-wired script. |
| generate fridge review packets | `scripts/generate-fridge-non-amazon-review-packets.ts` | Generates fridge non-Amazon review packets. | yes/no/yes/no/yes | Temporary scaffolding | FREEZE | Tactical operator helper. |
| collect fridge evidence | `scripts/collect-fridge-non-amazon-evidence.ts` | Collects evidence for fridge non-Amazon flow. | yes/no/no/yes/yes | Temporary scaffolding | FREEZE | Tactical operator helper. |
| run fridge non-Amazon operator | `scripts/run-fridge-non-amazon-operator.ts` | Runs fridge non-Amazon operator loop. | yes/no/yes/yes/yes | Temporary scaffolding | FREEZE | Tactical operator flow. |
| rank search gaps | `scripts/search-gaps-rank.ts` | Ranks search gaps. | no/yes/yes/no/yes | Permanent | KEEP | NPM-wired queue stage. |
| classify search gaps | `scripts/search-gaps-classify.ts` | Classifies search gaps. | no/yes/yes/no/yes | Permanent | KEEP | NPM-wired queue stage. |
| generate gap candidates | `scripts/search-gap-candidates-generate.ts` | Generates candidate actions for gaps. | no/yes/yes/no/yes | Permanent | KEEP | NPM-wired queue stage. |
| apply gap candidates | `scripts/search-gap-candidates-apply.ts` | Applies selected gap candidates. | no/yes/yes/no/yes | Permanent | KEEP | NPM-wired queue stage. |
| promote staged refrigerator | `scripts/promote-staged-refrigerator.ts` | Promotes staged refrigerator records. | yes/no/yes/no/yes | Permanent | KEEP | NPM-wired staged workflow. |
| resolve staged compat | `scripts/resolve-staged-compat-refrigerator.ts` | Resolves staged compatibility decisions. | yes/no/yes/no/yes | Permanent | KEEP | NPM-wired staged workflow. |
| review staged compat | `scripts/review-staged-compat-refrigerator.ts` | Reviews staged compatibility decisions. | yes/no/yes/no/yes | Permanent | KEEP | NPM-wired staged workflow. |
| reprocess compat after models | `scripts/reprocess-compat-after-models-refrigerator.ts` | Reprocesses compat after model updates. | yes/no/yes/no/yes | Permanent | KEEP | NPM-wired maintenance workflow. |
| review staged part resolution | `scripts/review-staged-part-resolution-refrigerator.ts` | Reviews staged part-resolution choices. | yes/no/yes/no/yes | Permanent | KEEP | NPM-wired staged workflow. |
| apply staged compat part choice | `scripts/apply-staged-compat-part-choice-refrigerator.ts` | Applies reviewed part-choice to staging flow. | yes/no/yes/no/yes | Permanent | KEEP | NPM-wired staged workflow. |
| review staged filter brand | `scripts/review-staged-filter-brand-refrigerator.ts` | Reviews staged filter-brand mapping. | yes/no/yes/no/yes | Permanent | KEEP | NPM-wired staged workflow. |
| apply staged filter brand | `scripts/apply-staged-filter-brand-refrigerator.ts` | Applies staged filter-brand mapping. | yes/no/yes/no/yes | Permanent | KEEP | NPM-wired staged workflow. |
| apply gap status refrigerator | `scripts/apply-search-gap-status-refrigerator.ts` | Applies gap status updates (fridge). | no/yes/yes/no/yes | Permanent | KEEP | NPM-wired queue hygiene. |
| apply gap status air purifier | `scripts/apply-search-gap-status-air-purifier.ts` | Applies gap status updates (AP). | no/yes/yes/no/yes | Permanent | KEEP | NPM-wired queue hygiene. |
| apply gap status WHW | `scripts/apply-search-gap-status-whole-house-water.ts` | Applies gap status updates (WHW). | no/yes/yes/no/yes | Permanent | KEEP | NPM-wired queue hygiene. |
| launch readiness report | `scripts/report-homekeep-launch-readiness.ts` | Launch readiness report output. | yes/yes/yes/no/yes | Permanent | KEEP | Report artifact. |
| business scorecard report | `scripts/report-homekeep-business-scorecard.ts` | Business scorecard output. | no/no/yes/yes/yes | Permanent | KEEP | Report artifact. |
| cross-wedge ops report | `scripts/report-homekeep-cross-wedge-ops.ts` | Cross-wedge ops output. | no/no/yes/no/yes | Permanent | KEEP | Report artifact. |
| affiliate clicks report | `scripts/report-homekeep-affiliate-clicks.ts` | Affiliate click report output. | no/no/no/yes/yes | Permanent | KEEP | Report artifact. |
| refrigerator guardrails | `scripts/report-refrigerator-mapping-guardrails.ts` | Fridge mapping guardrails. | yes/no/yes/no/yes | Permanent | KEEP | Guardrail artifact. |
| air purifier guardrails | `scripts/report-air-purifier-mapping-guardrails.ts` | AP mapping guardrails. | yes/no/yes/no/yes | Permanent | KEEP | Guardrail artifact. |
| WHW guardrails | `scripts/report-whole-house-water-mapping-guardrails.ts` | WHW mapping guardrails. | yes/no/yes/no/yes | Permanent | KEEP | Guardrail artifact. |
| model priority refrigerator | `scripts/report-model-priority-refrigerator.ts` | Model priority report (fridge). | no/no/yes/no/yes | Permanent | KEEP | Report artifact. |
| runbook refrigerator | `scripts/runbook-refrigerator.ts` | Refrigerator runbook output/process. | yes/no/yes/no/yes | Permanent | KEEP | Runbook artifact. |
| runbook AP | `scripts/runbook-air-purifier.ts` | AP runbook output/process. | yes/no/yes/no/yes | Permanent | KEEP | Runbook artifact. |
| runbook WHW | `scripts/runbook-whole-house-water.ts` | WHW runbook output/process. | yes/no/yes/no/yes | Permanent | KEEP | Runbook artifact. |
| schema preflight | `scripts/buckparts-schema-preflight.ts` | Schema sanity/preflight checks. | yes/no/no/no/yes | Permanent | KEEP | NPM-wired preflight. |
| cleanup demo wedges | `scripts/remove-demo-wedge-brands.ts` | Cleanup of demo placeholder wedge brands. | yes/yes/yes/no/yes | Temporary scaffolding | FREEZE | One-off cleanup semantics. |
| audit traffic monetization | `scripts/audit-homekeep-traffic-monetization-readiness.ts` | Audits traffic + monetization readiness. | yes/no/yes/yes/yes | Permanent | KEEP | Audit artifact. |
| generate fridge bulk CSV | `scripts/generate-fridge-homekeep-bulk-csv.ts` | Generates bulk fridge CSV data. | no/no/yes/no/yes | Temporary scaffolding | FREEZE | Tactical generation helper. |
| generate AP/WH retailer links | `scripts/generate-ap-wh-retailer-links.ts` | Generates AP/WH retailer link data. | no/no/yes/yes/yes | Temporary scaffolding | FREEZE | Tactical generation helper. |
| emit vertical search retailer links | `scripts/emit-vertical-search-retailer-links.ts` | Emits vertical search-style retailer links. | no/no/yes/yes/yes | Temporary scaffolding | FREEZE | Tactical emit helper. |
| HQII candidate queue upsert | `scripts/hqii-candidate-queue-upsert.ts` | Upserts HQII candidates into queue state tables. | yes/no/no/yes/yes | Permanent | UNKNOWN | Not npm-wired; active usage unproven. |
| run Amazon monetization batch | `scripts/run-amazon-monetization-batch.ts` | Amazon monetization batch planning/execution helper. | no/no/yes/yes/yes | Temporary scaffolding | UNKNOWN | Not npm-wired; active usage unproven. |
| verify OEM retailer links (Playwright) | `scripts/verify-oem-retailer-links-playwright.ts` | Browser verification helper for retailer links. | yes/no/no/yes/yes | Temporary scaffolding | UNKNOWN | Not npm-wired; active usage unproven. |
| diagnose Amazon evidence canaries | `scripts/diagnose-amazon-evidence-canaries.ts` | Diagnostic helper for canary/evidence checks. | no/no/no/yes/yes | Temporary scaffolding | FREEZE | Diagnostic utility. |
| run Amazon monetization batch test | `scripts/run-amazon-monetization-batch.test.ts` | Test harness for batch helper. | no/no/no/no/yes | Temporary scaffolding | FREEZE | Tactical test harness. |
| diagnose canaries test | `scripts/diagnose-amazon-evidence-canaries.test.ts` | Test harness for canary diagnostics. | no/no/no/no/yes | Temporary scaffolding | FREEZE | Tactical test harness. |
| generate review packets test | `scripts/generate-fridge-non-amazon-review-packets.test.ts` | Test harness for review packet script. | no/no/no/no/yes | Temporary scaffolding | FREEZE | Tactical test harness. |
| fridge non-Amazon operator test | `scripts/run-fridge-non-amazon-operator.test.ts` | Test harness for operator script. | no/no/no/no/yes | Temporary scaffolding | FREEZE | Tactical test harness. |
| HQII upsert test | `scripts/hqii-candidate-queue-upsert.test.ts` | Test harness for HQII upsert script. | no/no/no/no/yes | Temporary scaffolding | FREEZE | Tactical test harness. |
| import seed repro test | `scripts/import-seed.repro.test.ts` | Repro/debug-oriented import test. | no/no/no/no/yes | Temporary scaffolding | UNKNOWN | `repro` indicates possible one-off use. |
| ingest HQII links repro test | `scripts/ingest-hqii-retailer-links.repro.test.ts` | Repro/debug-oriented ingest test. | no/no/no/no/yes | Temporary scaffolding | UNKNOWN | `repro` indicates possible one-off use. |

## 5) Duplicate/overlapping systems

| Overlap | Exact repo path(s) | Evidence | Classification treatment |
|---|---|---|---|
| Dual retailer candidate queues | `supabase/migrations/20260408200000_retailer_link_candidates.sql`, `supabase/migrations/20260424133000_retailer_offer_candidates_phase1_state.sql`, `supabase/schema.sql` | Two candidate queue models coexist (`retailer_link_candidates` and `retailer_offer_candidates`). | Legacy queue stays `FREEZE`; newer queue remains `KEEP`. |
| Script-fragmented dashboard function | `scripts/report-homekeep-*.ts`, `scripts/report-*-mapping-guardrails.ts`, `scripts/runbook-*.ts` | Reporting/runbook behavior spread across many scripts; no single dashboard artifact. | Reports/runbooks `KEEP`; dashboard UI remains `UNKNOWN`. |
| Search-gap handling across runtime + scripts | `src/lib/search/telemetry.ts`, `scripts/search-gaps-rank.ts`, `scripts/search-gaps-classify.ts`, `scripts/search-gap-candidates-generate.ts`, `scripts/search-gap-candidates-apply.ts` | Search-gap logic exists in more than one layer. | Classification remains `UNKNOWN` for duplication risk impact. |

## 6) One-off / frozen systems

| Name | Exact repo path(s) | Why frozen/one-off | Classification |
|---|---|---|---|
| Demo wedge cleanup | `scripts/remove-demo-wedge-brands.ts` | Cleanup semantics indicate one-time operation. | FREEZE |
| Fridge non-Amazon tactical operator helpers | `scripts/generate-fridge-non-amazon-review-packets.ts`, `scripts/collect-fridge-non-amazon-evidence.ts`, `scripts/run-fridge-non-amazon-operator.ts` | Tactical/operator batch flow scripts. | FREEZE |
| Tactical generation/emit helpers | `scripts/generate-fridge-homekeep-bulk-csv.ts`, `scripts/generate-ap-wh-retailer-links.ts`, `scripts/emit-vertical-search-retailer-links.ts` | Transitional data-generation helpers. | FREEZE |
| Tactical diagnostics/tests | `scripts/diagnose-amazon-evidence-canaries.ts`, `scripts/run-amazon-monetization-batch.test.ts`, `scripts/diagnose-amazon-evidence-canaries.test.ts`, `scripts/generate-fridge-non-amazon-review-packets.test.ts`, `scripts/run-fridge-non-amazon-operator.test.ts`, `scripts/hqii-candidate-queue-upsert.test.ts` | Diagnostic/tactical harnesses. | FREEZE |

## 7) Missing source-of-truth gaps

| Gap | Repo evidence | Impact | Classification |
|---|---|---|---|
| No single canonical operations map in repo | No pre-existing file mapping wedge -> queue -> scripts -> reports before this document. | ops efficiency | UNKNOWN |
| No in-repo workflow automation config | `.github/**` not found. | ops efficiency | UNKNOWN |
| No unified dashboard artifact | No dashboard app/config path found; reporting is script-based. | ops efficiency | UNKNOWN |
| Queue-of-record not explicitly declared in one canonical place | Both older and newer candidate queue artifacts exist. | ops efficiency, affiliate approval clarity | UNKNOWN |

## 8) Current official classifications: KEEP / FREEZE / CUT / UNKNOWN

### KEEP
- Core runtime systems, search telemetry/indexation systems, `/go` affiliate path, trust gating/scoring, legal/help surfaces, active queue/workflow schemas, runbooks/reports, and npm-wired primary ingestion/staging scripts.

### FREEZE
- Legacy overlapping queue model (`retailer_link_candidates`), one-off cleanup script(s), and tactical generation/diagnostic/operator helper sets classified as non-core ongoing infrastructure.

### CUT
- No currently present repo artifact is newly classified `CUT` from Step 1 evidence.

### UNKNOWN
- Items where active use/production ownership is not provable from repo alone (missing workflow automation artifacts, no dashboard UI artifact, unwired scripts with unclear current orchestration, and unresolved queue-of-record declaration).

