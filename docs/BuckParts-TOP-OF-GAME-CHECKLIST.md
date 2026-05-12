# BuckParts Top-of-Game Checklist v1

BuckParts is judged by whether it helps homeowners safely identify the right replacement part, understand confidence, avoid wrong purchases, and reach a verified buyer path when safe.

This checklist is a repo-backed operating standard. If repo code, command output, or named artifacts conflict with this file, repo truth wins. If proof is not available from the cited source, the current proof is `UNKNOWN`.

## Top-of-Game Definition

BuckParts is top-of-game when the product and operating loop consistently improve these outcomes:

- Homeowner trust: public pages explain what BuckParts found, what is uncertain, and what the homeowner should compare before buying.
- Fit correctness: model, filter, replacement, and compatibility claims are backed by repo-traceable evidence and do not overstate confidence.
- Verified buyer paths: buying options appear only when the route can support a safe buyer path, and suppressed paths explain why.
- Demand capture: external and internal demand signals identify what homeowners are asking for without treating demand as proof of revenue.
- Revenue truth: clicks, traffic, and engagement are never described as revenue, conversion, profit, or valuation unless a real revenue/conversion source is connected and reconciled.
- Operational reliability: monitoring, tests, audits, and Daily Operator outputs preserve `UNKNOWN` truth and expose blockers before automation acts.
- Founder-dependency reduction: repeated decisions become repo-backed contracts, reports, commands, tests, or docs instead of chat-memory instructions.

## Status Model

- `BRIGHT`: Proven by repo-backed source and safe to use for decisions inside the stated scope.
- `PARTIAL`: Some proof exists, but the proof does not cover the whole standard.
- `DARK`: Known absent, not connected, or explicitly excluded from authority.
- `UNKNOWN`: Not proven from allowed repo-backed sources.
- `NOT_NEEDED_YET`: Not required for the current operating scope.

## Decision Rule

A system only matters if it improves fit correctness, buyer safety, demand capture, conversion/revenue truth, operational reliability, or founder-dependency reduction.

## Decision Authority Rule

A checklist item cannot influence Daily Operator, Command Center, automation, or owner recommendations unless its proof source is `BRIGHT` or explicitly scoped `PARTIAL`.

`PARTIAL` authority must name the exact safe scope. Example: `/go` click visibility may inform click behavior, but not revenue; page-state inventory may inform sitemap/policy inventory, but not semantic CTA/trust state.

`DARK` and `UNKNOWN` items must be excluded from decision authority. They may create blockers, warnings, research tasks, or validation gaps, but they must not justify recommendations, valuation, automation, page expansion, buyer-path expansion, or revenue claims.

## Pre-Work Gate

Before any new feature, system, page, automation, research workstream, dashboard, report, or monetization effort starts, answer these five questions in the plan or task prompt:

- Which checklist category does this improve?
- What proof source will validate it?
- What could it break?
- What must not be inferred?
- What is the smallest correct durable implementation?

If any answer is `UNKNOWN`, the work may proceed only as investigation or read-only validation. It must not ship as decision authority until proof is added.

## Current Status Snapshot

| Category | Standard | Why it matters | Current status | Current proof source | Missing proof | Next action | Validation required |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fit correctness | Public pages should help the homeowner compare model/filter identifiers and understand what BuckParts found. | Wrong-fit guidance can create wrong purchases and trust loss. | `PARTIAL` | `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` says fridge model and filter pages are `READY`; non-live verticals and directory pages are not fully aligned. | Catalog-wide proof that all page types answer the universal trust questions. | Close trust gaps on non-ready page types before expanding claims. | Route/page audit showing each public page type answers applicable trust questions. |
| Buyer-path safety | Buying options should appear only when the page can support a safe buyer path, and hidden buying options should explain why. | A visible buyer path is a recommendation; unsafe recommendations can cause wrong purchases. | `PARTIAL` | `docs/BuckParts-TRUTH-MAP.md` lists buyer-path/safe CTA policy and runtime paths; `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` identifies hidden-CTA why as missing or weak on some pages. | Full route-level proof that every buyer-path state follows policy. | Keep buyer-path changes tied to safe CTA policy and public trust language. | Tests or audit output proving buy sections and hidden states match policy by page type. |
| Evidence/provenance | Homeowners should see what evidence/source supports a recommendation and what remains uncertain. | Confidence is only useful when the evidence behind it is visible and bounded. | `PARTIAL` | `docs/BuckParts-TRUTH-MAP.md` lists manual/source evidence runtime and form-factor evidence runtime; `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` says evidence is strongest on fridge model pages and lighter elsewhere. | Catalog-wide brand/model evidence coverage and page-level evidence exposure for all applicable routes. | Treat evidence inventory/body mapping as authoritative only inside its proven scope. | Evidence-to-catalog join audit proving coverage by brand/model and page type. |
| Customer trust/public page experience | Public pages should answer the universal trust questions using approved homeowner-safe language. | Trust copy should reduce confusion without overclaiming certainty. | `PARTIAL` | `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` defines universal questions, banned phrases, approved language, and page-type statuses. | Proof that all public pages are aligned to approved language and question coverage. | Use the universal page trust contract before public copy expansion. | Phrase guard and page-type audit showing no banned language and clear uncertainty/buyer-path language. |
| Search/demand capture | BuckParts should capture external and internal demand without treating demand as revenue. | Demand tells the operator what homeowners need next. | `PARTIAL` | `scripts/report-buckparts-daily-operator.ts` marks GSC external demand and internal search demand/gaps as decision-authoritative when metrics/runtime are present. | Current live metrics are command-output dependent and not proven by this file alone. | Use Daily Operator output to identify demand opportunities, then validate any action against fit and buyer safety. | `npm run buckparts:daily` or equivalent report showing GSC/internal search status and counts. |
| Analytics/measurement | Measurement should separate page events, clicks, custom dimensions, and unknowns. | Bad measurement turns operator work into guesswork. | `PARTIAL` | `scripts/report-buckparts-daily-operator.ts` treats GA4 aggregate freshness/counts as authoritative, keeps GA4 custom-dimension breakdowns `UNKNOWN`, and treats zero counts as not failure by themselves. | Proven custom-dimension breakdowns by model/filter/trust state. | Keep aggregate GA4 separate from unproven dimensional analysis. | GA4 artifact/report proving configured dimensions and readable breakdowns. |
| Revenue truth | Clicks and GA4 events must never be treated as revenue or conversion proof. | Revenue truth is required before valuation or monetization decisions. | `DARK` | `scripts/report-buckparts-daily-operator.ts` excludes affiliate revenue/conversions until a real feed exists and marks revenue/conversions `UNKNOWN_NOT_CONNECTED`. | Real affiliate revenue/conversion feed. | Do not run valuation or revenue claims from clicks. | Connected revenue/conversion artifact with source, freshness, and reconciliation checks. |
| QA/testing | Changes should be validated against the contract they affect, not just shipped. | Tests protect homeowner safety, measurement truth, and operating reliability. | `UNKNOWN` | `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` proposes a route-level phrase guard test; allowed files do not prove current test results. | Current test/build/audit results. | Require targeted validation for each changed contract. | Named command output for affected tests, build, and audit. |
| Monitoring/alerting | Route health, silent failures, and deploy sync must be reported honestly and never inferred from local HEAD. | A working route does not prove the deployed commit is the expected commit, and console-only failures can hide broken measurement. | `PARTIAL` | `scripts/report-buckparts-daily-operator.ts` includes read-only live-site route health and excludes deployed commit sync unless explicitly proven; `src/lib/monitoring/error-monitoring.ts` provides a redacting Sentry-backed no-op-safe capture helper. | Proven deployed commit source, configured monitoring provider env, and alerting cadence. | Keep live-site smoke read-only, keep deploy sync `UNKNOWN` without proof, and treat monitoring as partial until provider env/alerts are proven. | Daily Operator output showing route health, target domain, and deploy sync status; targeted monitoring tests proving redaction and no-op behavior. |
| Operations/automation | Automation may act only on decision-authoritative signals and must preserve excluded unknowns. | Automation over partial data can scale the wrong work. | `PARTIAL` | `scripts/report-buckparts-daily-operator.ts` defines decision-authoritative signals and excluded signals; `.github/workflows/buckparts-daily-operator.yml` defines a scheduled read-only Daily Operator run. | Successful GitHub run with required env/secrets and owner-reviewed response path. | Keep scheduled Daily Operator read-only; missing env should produce `UNKNOWN`-safe output, not fake success. | Workflow safety test plus a GitHub run showing no writes, no deploys, no upserts, and clear blocked/unknown reporting. |
| Admin/operator workflow | Operators should get one owner-readable daily report with next owner and agent actions based only on authoritative signals. | The founder needs decisions, not raw dashboards. | `PARTIAL` | `scripts/report-buckparts-daily-operator.ts` defines owner-readable sections, next owner action, next agent action, what not to touch, and validation status. | Current human output from a fresh run is not proven by this file. | Use the Daily Operator as the default owner entry point. | `npm run buckparts:daily` output showing owner-readable status and no raw debug payload by default. |
| Founder-dependency reduction | Repeated operator decisions should become repo-backed policies, reports, or checklists. | The system should reduce dependence on chat memory and founder recall. | `PARTIAL` | `docs/BuckParts-TRUTH-MAP.md` defines canonical truth-source navigation; `scripts/report-buckparts-daily-operator.ts` encodes decision authority and excluded signals. | Proof that each recurring founder decision has a durable owner workflow. | Convert repeated chat decisions into repo-backed docs, commands, or tests. | Review of recurring operator actions mapped to durable repo-backed sources. |
| Legal/compliance/trust language | Public language should avoid overclaims and use approved trust terms. | Overclaiming certainty creates legal and trust risk. | `PARTIAL` | `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` lists banned phrases and approved language, and says several pages need copy alignment. | Current full-site proof that banned phrases are absent. | Keep all trust and buyer-path copy aligned to approved language. | Phrase guard and manual review for public routes and metadata. |
| SEO/indexing | Indexing should reflect page-state and vertical policy, not ambition. | Search traffic should land on pages that can safely help the homeowner. | `PARTIAL` | `docs/BuckParts-TRUTH-MAP.md` lists vertical launch/noindex/sitemap policy; `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` describes indexing expectations by page type. | Fresh sitemap/robots proof for every public route. | Keep unproven verticals noindex until trust and buyer-path proof are ready. | Sitemap and robots audit mapped to page-state and vertical launch policy. |

## Stop Conditions

### Internal Systems Work

Stop internal systems work when it does not improve fit correctness, buyer safety, demand capture, conversion/revenue truth, operational reliability, or founder-dependency reduction.

Stop when the system creates another dashboard/report without changing a decision, validation path, or owner action.

Stop when the system turns a `PARTIAL`, `DARK`, or `UNKNOWN` signal into a recommendation without explicitly scoping or excluding it.

### New Page Creation

Stop new page creation when the page cannot answer the applicable universal trust questions.

Stop when the page would expose buying options without safe buyer-path proof.

Stop when the page would imply catalog-wide evidence, compatibility, or confidence that has not been proven.

Stop when the page relies on search demand alone without fit correctness and buyer-path safety.

### Automation Expansion

Stop automation expansion unless every decision-driving signal is `BRIGHT` or explicitly scoped `PARTIAL`, and every `DARK`/`UNKNOWN` signal is excluded from authority.

Stop if the automation would write to DB, mutate retailer links, change `/go`, deploy, push, or change public UI without explicit owner approval.

Stop if automation would act on revenue, valuation, semantic page-state, GA4 dimensions, catalog-wide evidence coverage, or deployed commit sync while those signals remain excluded.

### Monetization/Revenue Claims

Stop monetization claims when revenue/conversions are not connected to a real feed.

Stop any claim that clicks, human-likely clicks, GA4 funnel events, GSC demand, or traffic imply revenue, profit, buyer intent, or conversion.

Stop buyer-path expansion if verified product-page safety is not proven.

### Valuation Talk

Stop valuation talk until real revenue/profit exists and is reconciled.

Traffic, clicks, impressions, search demand, and GA4 events must not be converted into valuation.

### Research Bot Recommendations

Stop research-bot recommendations when they are not mapped to a checklist category.

Stop when findings are general market ideas without a proof source, missing proof statement, validation method, and smallest durable implementation.

Stop when research would bypass safe CTA policy, infer revenue, infer valuation, infer deployed commit sync, or infer catalog-wide coverage from filenames.

## Research Bot Operating Contract

The Research Bot is an input generator, not decision authority. It can propose checklist gaps; it cannot declare `BRIGHT`, ship pages, expand automation, create revenue claims, or override repo truth.

### Accepted Research Types

- Homeowner language for identifying replacement parts, model numbers, filter numbers, uncertainty, and wrong-purchase avoidance.
- Competitor and retailer patterns that clarify fit confidence without overclaiming.
- Search-demand patterns that can become fit-correctness or buyer-safety gaps.
- Evidence expectations: what homeowners need to trust manuals, model mappings, and replacement guidance.
- Compliance-sensitive language around affiliate links, uncertainty, guarantees, and safe purchasing.
- Public-page trust patterns that can be converted into tests, copy contracts, or route audits.
- Operational reliability patterns for read-only monitoring, alerting, and owner-readable workflows.

### Rejected Research Types

- Valuation, revenue projections, or conversion claims without real revenue/conversion data.
- Buyer-path expansion that bypasses safe CTA policy.
- Catalog-wide evidence coverage claims without catalog/evidence joins.
- GA4 custom-dimension conclusions before custom dimensions are proven.
- Deploy health or deploy sync from local git state.
- Roadmap priorities based only on chat memory.
- Generic feature ideas that do not improve a checklist category.
- Competitor mimicry that weakens homeowner trust or creates overclaiming risk.
- SEO expansion that ignores page-state, noindex, evidence, or buyer-path policy.

### Required Output Format

Each research finding must use this format:

- Checklist category:
- Homeowner problem:
- Evidence observed:
- Repo proof needed:
- Missing proof:
- Risk if acted on too early:
- Smallest durable implementation:
- Validation required:
- Decision-authority status: `UNKNOWN` until repo proof upgrades it.

### Accepted Checklist Gap

A research finding becomes an accepted checklist gap only when it maps to fit correctness, buyer safety, demand capture, conversion/revenue truth, operational reliability, or founder-dependency reduction.

An accepted gap must name the proof source it needs, the inference it forbids, the next action, and the validation required. Until then, it remains `UNKNOWN` and cannot influence Daily Operator, Command Center, automation, monetization, valuation, or page expansion.

### Rejected as Distraction

Reject research as distraction when it cannot identify a checklist category, proof source, missing proof, and validation path.

Reject research that only creates more dashboard work, broad market analysis, valuation talk, unproven revenue claims, or automation over partial data.

## What This Checklist Prevents

- Dashboards without decisions.
- Fake-bright metrics.
- Evidence files without catalog coverage.
- Clicks treated as revenue.
- Automation over partial data.
- Chat-memory roadmap drift.
- Public pages that imply fit confidence without proof.
- Research that creates motion without owner action.
- Deploys that improve internal surfaces while bypassing validation.

## Checklist Maintenance Cadence

- Daily: Use the Daily Operator to check stop-the-line issues, demand, clicks/money, site health, Top-of-Game Checklist statuses, next action, and excluded signals.
- Scheduled Daily Operator: `.github/workflows/buckparts-daily-operator.yml` runs `npm run buckparts:daily` on `workflow_dispatch` and daily cron. It is read-only, does not deploy, does not mutate DB rows, retailer links, `/go`, artifacts, or public UI, and writes only the GitHub job summary. Supabase/live-site env may be required for the full report; missing env must produce `UNKNOWN`-safe output, not fake success.
- Weekly: Review this checklist for `PARTIAL`, `DARK`, and `UNKNOWN` items that block durable owner decisions.
- Pre-deploy check: Confirm affected page-state, trust-language, buyer-path, monitoring, migration, and validation requirements are satisfied. Deploy only when the changed surface has passed named validation.
- Pre-page expansion check: Confirm the page type can answer the universal trust questions or is explicitly scoped as `NOT_NEEDED_YET`.
- Pre-automation check: Confirm every decision-driving signal is `BRIGHT` or explicitly scoped `PARTIAL`, and every `DARK`/`UNKNOWN` signal is excluded from authority with owner-readable wording.
- Monthly top-of-game audit: Reclassify each category using repo proof only, identify fake-bright risks, retire stale checklist items, and choose the smallest next system improvement.

## Next System After Checklist

After this checklist hardening, the next system is not more checklist work.

The next system is Daily Operator / Command Center alignment to checklist authority: recommendations should reflect which checklist categories are `BRIGHT`, explicitly scoped `PARTIAL`, excluded, or blocked.

The Research Bot comes later, after Daily Operator / Command Center alignment can safely receive research findings as checklist gaps without treating them as authority.
