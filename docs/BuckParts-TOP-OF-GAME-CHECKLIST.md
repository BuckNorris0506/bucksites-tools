# BuckParts Top-of-Game Checklist v1

BuckParts is judged by whether it helps homeowners safely identify the right replacement part, understand confidence, avoid wrong purchases, and reach a verified buyer path when safe.

This checklist is a repo-backed operating standard. If repo code, command output, or named artifacts conflict with this file, repo truth wins. If proof is not available from the cited source, the current proof is `UNKNOWN`.

## Status Model

- `BRIGHT`: Proven by repo-backed source and safe to use for decisions inside the stated scope.
- `PARTIAL`: Some proof exists, but the proof does not cover the whole standard.
- `DARK`: Known absent, not connected, or explicitly excluded from authority.
- `UNKNOWN`: Not proven from allowed repo-backed sources.
- `NOT_NEEDED_YET`: Not required for the current operating scope.

## Decision Rule

A system only matters if it improves fit correctness, buyer safety, demand capture, conversion/revenue truth, operational reliability, or founder-dependency reduction.

## Checklist

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
| Monitoring/alerting | Route health and deploy sync must be reported honestly and never inferred from local HEAD. | A working route does not prove the deployed commit is the expected commit. | `PARTIAL` | `scripts/report-buckparts-daily-operator.ts` includes read-only live-site route health and excludes deployed commit sync unless explicitly proven. | Proven deployed commit source and alerting cadence. | Keep live-site smoke read-only and keep deploy sync `UNKNOWN` without proof. | Daily Operator output showing route health, target domain, and deploy sync status. |
| Operations/automation | Automation may act only on decision-authoritative signals and must preserve excluded unknowns. | Automation over partial data can scale the wrong work. | `PARTIAL` | `scripts/report-buckparts-daily-operator.ts` defines decision-authoritative signals and excluded signals. | Proven scheduled operator run and owner-reviewed response path. | Keep Daily Operator read-only until all decision-driving inputs are bright or explicitly excluded. | Automation dry run proving no writes, no deploys, no upserts, and clear blocked/unknown reporting. |
| Admin/operator workflow | Operators should get one owner-readable daily report with next owner and agent actions based only on authoritative signals. | The founder needs decisions, not raw dashboards. | `PARTIAL` | `scripts/report-buckparts-daily-operator.ts` defines owner-readable sections, next owner action, next agent action, what not to touch, and validation status. | Current human output from a fresh run is not proven by this file. | Use the Daily Operator as the default owner entry point. | `npm run buckparts:daily` output showing owner-readable status and no raw debug payload by default. |
| Founder-dependency reduction | Repeated operator decisions should become repo-backed policies, reports, or checklists. | The system should reduce dependence on chat memory and founder recall. | `PARTIAL` | `docs/BuckParts-TRUTH-MAP.md` defines canonical truth-source navigation; `scripts/report-buckparts-daily-operator.ts` encodes decision authority and excluded signals. | Proof that each recurring founder decision has a durable owner workflow. | Convert repeated chat decisions into repo-backed docs, commands, or tests. | Review of recurring operator actions mapped to durable repo-backed sources. |
| Legal/compliance/trust language | Public language should avoid overclaims and use approved trust terms. | Overclaiming certainty creates legal and trust risk. | `PARTIAL` | `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` lists banned phrases and approved language, and says several pages need copy alignment. | Current full-site proof that banned phrases are absent. | Keep all trust and buyer-path copy aligned to approved language. | Phrase guard and manual review for public routes and metadata. |
| SEO/indexing | Indexing should reflect page-state and vertical policy, not ambition. | Search traffic should land on pages that can safely help the homeowner. | `PARTIAL` | `docs/BuckParts-TRUTH-MAP.md` lists vertical launch/noindex/sitemap policy; `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` describes indexing expectations by page type. | Fresh sitemap/robots proof for every public route. | Keep unproven verticals noindex until trust and buyer-path proof are ready. | Sitemap and robots audit mapped to page-state and vertical launch policy. |

## What This Checklist Prevents

- Dashboards without decisions.
- Fake-bright metrics.
- Evidence files without catalog coverage.
- Clicks treated as revenue.
- Automation over partial data.
- Chat-memory roadmap drift.

## Research Bot Requirements

### What It Should Research

- Homeowner language for identifying replacement parts, model numbers, filter numbers, uncertainty, and wrong-purchase avoidance.
- Competitor and retailer patterns that clarify fit confidence without overclaiming.
- Search-demand patterns that can become fit-correctness or buyer-safety gaps.
- Evidence expectations: what homeowners need to trust manuals, model mappings, and replacement guidance.
- Compliance-sensitive language around affiliate links, uncertainty, guarantees, and safe purchasing.

### What It Should Not Research

- Valuation, revenue projections, or conversion claims without real revenue/conversion data.
- Buyer-path expansion that bypasses safe CTA policy.
- Catalog-wide evidence coverage claims without catalog/evidence joins.
- GA4 custom-dimension conclusions before custom dimensions are proven.
- Deploy health or deploy sync from local git state.
- Roadmap priorities based only on chat memory.

### How Findings Become Checklist Gaps

Research findings become checklist gaps only when they can be mapped to one of these fields: fit correctness, buyer safety, demand capture, conversion/revenue truth, operational reliability, or founder-dependency reduction. Each accepted gap needs a proof source, missing proof statement, next action, and validation command or audit before it can influence automation.

## Use Cadence

- Daily: Use the Daily Operator to check stop-the-line issues, demand, clicks/money, site health, next action, and excluded signals.
- Weekly: Review this checklist for `PARTIAL`, `DARK`, and `UNKNOWN` items that block durable owner decisions.
- Before deploy: Confirm affected page-state, trust-language, buyer-path, monitoring, and validation requirements are satisfied.
- Before adding pages: Confirm the page type can answer the universal trust questions or is explicitly scoped as `NOT_NEEDED_YET`.
- Before adding automation: Confirm every decision-driving signal is `BRIGHT`, or explicitly excluded from decision authority with an owner-readable reason.
