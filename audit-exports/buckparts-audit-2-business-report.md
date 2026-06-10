# BuckParts Audit #2 - Business, Growth, Revenue, and Leadership Audit

Date: 2026-06-10

Scope: This audit intentionally avoids repeating Audit #1 repository-quality findings unless they materially affect business outcomes. It evaluates BuckParts as a business system for leadership, investors, operators, growth teams, and product executives.

Evidence convention:
- PROVEN: Directly supported by repository files, report artifacts, or command output.
- INFERRED: Reasonable conclusion from repo evidence, but not directly measured.
- UNKNOWN: Not shown in the repo evidence reviewed.

## A. Executive Business Assessment

### What Business Is BuckParts Actually Building?

PROVEN: BuckParts is not currently an ecommerce store. It is a fit-lookup and wrong-purchase-prevention layer for home replacement parts, especially refrigerator water filters, air purifier filters, and whole-house water filters. The strongest internal positioning is "Fit lookup for home replacement parts," with explicit guidance to avoid overclaiming as an "AutoZone for appliance parts."

PROVEN: The product is built around compatibility certainty, model-to-part mapping, trust language, verified buy links, no-buy states, and disclosure. The public experience is designed to answer: "What part fits my model, and where can I safely buy it?"

INFERRED: The most valuable future business is not affiliate arbitrage. It is a proprietary home consumables fit graph that can power reminders, retailer routing, AI answers, and B2B data products.

### What Stage Is It In?

PROVEN: BuckParts is pre-meaningful-revenue. The revenue ledger has zero entries. The affiliate tracker shows 22 programs, only 3 approved, 5 rejected, and most still drafting, submitted, or in review.

PROVEN: The product has real supply-side structure: 1,093 live model rows, 188 discoverable filter/part pages, 242 raw `/go` click events in the reporting window, and 67 pages with valid buy CTAs according to the business scorecard.

INFERRED: Stage is early product validation, not growth stage. There is enough evidence of user intent to keep going, but not enough monetization, attribution, or repeat usage to call it a business yet.

### What Is Real?

PROVEN:
- Refrigerator and air purifier are marked `LIVE`; whole-house water is `NOINDEX_UNPROVEN`.
- 188 discoverable useful part/filter pages exist.
- 242 raw affiliate click events were recorded in the current click report window.
- Refrigerator has the strongest commercial click signal: 147 of 242 clicks.
- The site has trust pages, disclosure pages, wrong-part-prevention copy, and a no-buy posture.
- `/go` click tracking exists and uses sponsored/nofollow buy links.

### What Is Illusion?

PROVEN:
- "Retailer-linked" does not always mean "valid buy CTA." One report says all 188 useful pages have retailer links, while the business scorecard says only 67 of 188 have valid buy CTAs.
- "Clicks" are not revenue. The revenue ledger has zero entries.
- Launch-readiness reports can overstate public readiness. Whole-house water appears launch-capable in one report but is marked `NOINDEX_UNPROVEN` in launch state.
- Stored sitemap artifacts can be stale. The reviewed sitemap artifact showed 571 URLs and older lastmod values, while runtime sitemap logic is more selective.

INFERRED:
- Internal dashboards may create confidence faster than the market does.
- The company is closer to "well-instrumented prototype with real intent" than "operating growth engine."

### Biggest Opportunities

1. PROVEN/INFERRED: Own the "does this fit my model?" moment for home consumables.
2. PROVEN: Convert refrigerator filter demand first, because it has the strongest click evidence.
3. INFERRED: Build a saved-home reminder product: "My Home Filters."
4. INFERRED: Become an answer source for AI search by publishing structured compatibility evidence.
5. INFERRED: Create a retailer-independent trust layer that competitors with inventory bias cannot easily copy.

### Biggest Risks

1. PROVEN: Revenue is not proven.
2. PROVEN: Valid buy CTA coverage is too low.
3. PROVEN: Organic search traction is weak in available GSC data: 3 clicks, 289 impressions, average position 25.49.
4. PROVEN: Affiliate status is incomplete and commission visibility is weak.
5. INFERRED: Founder attention is being absorbed by internal systems before distribution and revenue are proven.

## B. SEO Audit

### Topical Authority

PROVEN: The repo contains only 7 help articles. They are useful but narrow. Product and model pages create breadth, but the site lacks deep editorial clusters around common search intent.

INFERRED: BuckParts currently has programmatic coverage but not authority. Search engines may see many similar utility pages without enough independent educational content to trust the domain.

### Coverage Depth

PROVEN:
- Refrigerator: 500 live model rows, 57 discoverable parts.
- Air purifier: 572 model rows, 69 discoverable parts.
- Whole-house water: 21 model rows, 62 parts, but noindex/unproven.

INFERRED: Refrigerator is the strongest near-term SEO revenue wedge. Air purifier has breadth but may have lower commercial urgency. Whole-house water needs evidence cleanup before public SEO expansion.

### Content Quality

PROVEN: Model and part pages are structured around compatibility, trust, and buy links. That is valuable.

INFERRED: Many pages are likely thin or repetitive from a search-quality perspective. The useful content is the mapping, but Google also needs uniqueness, evidence, alternatives, installation context, failure modes, and user decision help.

### Indexability and Crawlability

PROVEN:
- Runtime sitemap logic uses live wedge rules.
- Non-live wedges are protected with noindex/follow behavior.
- `/go` routes are disallowed.
- Tests exist around vertical launch metadata, sitemap behavior, and robots behavior.

PROVEN: A stored sitemap artifact appeared stale and included URLs inconsistent with current launch truth.

### Internal Linking

PROVEN: Catalog, search, model pages, filter pages, and brand paths exist.

INFERRED: Internal linking is functionally present but probably not strategic enough. The site needs stronger hubs by brand, model family, part type, replacement interval, and problem intent.

### Programmatic SEO Quality

PROVEN: The site has many model and filter pages. This creates scalable landing pages.

INFERRED: The current programmatic SEO risk is page sameness. BuckParts should only index pages with enough unique evidence, useful decision support, and monetizable next action.

### Duplicate-Content Risk

INFERRED: High. Model pages and filter pages likely repeat page templates heavily, especially across part families and alternate model aliases. This is acceptable only if the compatibility data is unique, visible, and supported by proof.

### Page Quality Risk

PROVEN: Universal Page Trust Contract marks several pages as needing copy alignment or trust sections, including Homepage, Catalog, Search, Brand, Help, About, and Disclosure.

INFERRED: The commercial pages are closer to useful than the top-level pages. The brand-level and help-level surfaces are underdeveloped for trust and authority.

### EEAT and Trust Readiness

PROVEN: BuckParts has an About page, Disclosure, Truth Policy, Wrong Part Prevention, Privacy, Terms, trust language, and banned phrases.

INFERRED: EEAT posture is unusually strong for an early affiliate site, but it needs named evidence, source methodology, update history, and public accountability to become search-authority-grade.

### Schema Usage

PROVEN: Structured data exists and is intentionally conservative.

INFERRED: Schema is underused as a competitive advantage. BuckParts should expose Product, FAQ, Breadcrumb, HowTo where valid, and compatibility/evidence metadata where search-safe.

### Search Intent Alignment

PROVEN: Pages target model-to-filter and part-fit queries.

INFERRED: Exact-fit intent is aligned. Broader intent is missing: "how often replace," "compatible vs OEM," "why does my filter not fit," "reset filter light," "is this part discontinued," and "where to buy genuine."

### What Is Preventing BuckParts From Ranking?

1. PROVEN: Low measured search traction in available GSC data.
2. PROVEN: Thin help content base.
3. PROVEN/INFERRED: Many pages are programmatic and may not show enough unique evidence.
4. UNKNOWN: Backlink profile.
5. UNKNOWN: Actual current index coverage and crawl stats.
6. INFERRED: Lack of authority hubs and topical clusters.

### What Would Most Improve Rankings?

1. Expand proof-rich pages for refrigerator filters first.
2. Build brand and part-family hubs with unique evidence.
3. Add comparison and replacement-intent content around high-click parts.
4. Add rank/index monitoring tied to page quality decisions.
5. Publish a clear public compatibility methodology.

### What Should Be Deleted?

Do not mass-delete proven utility pages blindly.

Delete or noindex:
- UNKNOWN/INFERRED: Pages with no unique compatibility evidence.
- PROVEN: Non-live vertical pages should stay noindex until proven.
- INFERRED: Duplicate brand/model pages that only restate the same template and do not produce impressions, clicks, or compatibility value.

### What Should Be Expanded?

Expand:
- Refrigerator filter hubs.
- High-click part pages.
- Brand family pages.
- "Compatible vs genuine" explainers.
- Filter reset and replacement interval help.
- Public truth-methodology pages.
- AI-search-friendly evidence summaries.

## C. Customer Acquisition Audit

### How Will Users Actually Find BuckParts?

SEO is the only channel with meaningful repo-backed evidence today.

PROVEN:
- GSC data exists.
- Affiliate click reports exist.
- Referrer host data shows mostly `(none)`, with small counts from `buckparts.com` and `google.com`.

UNKNOWN:
- Paid search.
- Newsletter.
- TikTok/Instagram.
- Reddit traffic.
- Forum traffic.
- YouTube traffic.
- AI search traffic.
- Partner referrals.

### SEO

PROVEN: There is a real SEO surface and at least some impressions and clicks.

INFERRED: SEO is the strongest current acquisition channel, but still weak.

### Referrals

UNKNOWN: No strong referral program or partner acquisition evidence was found.

### Reddit, Forums, Social, YouTube

PROVEN: Social metadata exists.

UNKNOWN/INFERRED: There is no visible community distribution engine. No strong evidence of Reddit, forum, YouTube, or social acquisition strategy appeared in the reviewed repo evidence.

### AI Search Engines

UNKNOWN: No `llms.txt`, AI answer strategy, or explicit answer-engine distribution system was found in reviewed evidence.

### Direct Traffic

UNKNOWN: Direct traffic may exist, but `(none)` referrer in click reports is not enough to interpret acquisition.

### Strongest Channels

1. PROVEN: Exact-part/model SEO.
2. PROVEN/INFERRED: Direct return users from search sessions.
3. INFERRED: Future AI search, if BuckParts exposes structured evidence.

### Ignored Channels

1. Reddit repair communities.
2. Appliance and water-filter forums.
3. YouTube how-to videos.
4. AI search answer feeds.
5. Email/SMS reminders.
6. Property managers and landlords.
7. Repair tech referral loops.

## D. Revenue Audit

### Affiliate Readiness

PROVEN:
- 22 affiliate programs are tracked.
- 3 approved.
- 5 rejected.
- 6 drafting.
- 4 submitted.
- 3 in review.
- 1 paused/inactive.
- Only 2 have verified tags in the tracker.

PROVEN: Valid buy CTA coverage is 67 of 188 useful pages. 121 useful pages have zero valid buy CTA according to the business scorecard.

### Ad Readiness

INFERRED: Not ready. Traffic is too low, page intent is commercial, and ads could reduce trust. Affiliate and retailer routing should come first.

### Conversion Readiness

PROVEN: Trust-aware buy sections exist. Primary and alternate CTAs exist. Buy links use sponsored/nofollow.

PROVEN: CTA coverage is not high enough.

INFERRED: Conversion readiness is partially built but commercially incomplete.

### Revenue Instrumentation

PROVEN:
- `/go` click tracking exists.
- GA4 trust-funnel report exists.
- Revenue ledger exists but has zero entries.
- Affiliate click report exists.

INFERRED: BuckParts measures outbound interest but not money.

### Commission Visibility

PROVEN: Commission visibility is incomplete. The revenue ledger is empty, and affiliate program status/tag verification is incomplete.

### What Must Happen Before First Meaningful Revenue?

1. Finalize approved affiliate paths for top clicked parts.
2. Confirm tags and outbound tracking for Amazon, Waterdrop, OEM/parts sellers.
3. Expand valid CTA coverage on refrigerator pages first.
4. Import real commission reports into the revenue ledger.
5. Tie page, part, retailer, click, and commission into one revenue truth table.

### Fastest Path to $100/month

INFERRED:
- Focus only on refrigerator water filters with existing clicks.
- Fix valid CTA gaps for top clicked parts.
- Prefer Amazon and Waterdrop where tags are verified.
- Add comparison copy and trust proof to high-click part pages.
- Track actual commissions weekly.

### Fastest Path to $1,000/month

INFERRED:
- Rank exact part/model pages for the top refrigerator filter families.
- Secure additional affiliate approvals: AppliancePartsPros, RepairClinic, PartSelect, FiltersFast, DiscountFilters, Home Depot/Walmart if possible.
- Build 30 proof-rich SEO pages around high-commercial-intent parts.
- Add email reminders for replacement intervals.
- Build a "save my model" loop.

### Fastest Path to $10,000/month

INFERRED:
- Affiliate SEO alone may be slow.
- Build the home consumables account layer: saved models, replacement schedules, reminders, repeat purchase routing.
- Add B2B: property manager dashboard, repair-tech lookup, retailer trust API, compatibility data licensing.
- Own the answer graph for AI search and partners.

## E. Conversion Audit

### Trust

PROVEN: Trust posture is strong relative to typical affiliate sites. The site explicitly avoids overclaiming and includes wrong-part-prevention language.

INFERRED: Trust is a differentiator, but trust without inventory, price, availability, and proof density may not close the purchase.

### Page Flow

PROVEN: Pages guide users from model/filter compatibility to buy links.

INFERRED: The flow is too dependent on the user already knowing what they need. Broader shoppers need guided narrowing, confidence levels, and "what if this does not look like mine?" support.

### CTA Strategy

PROVEN: Tiered buy links support one primary CTA plus alternates.

PROVEN: Many useful pages lack valid buy CTAs.

INFERRED: CTA quality, not just CTA existence, is the conversion bottleneck.

### Certainty Communication

PROVEN: Certainty and trust systems exist.

INFERRED: The site should make confidence, source type, and evidence freshness more visible at the exact moment of click.

### Buyer Confidence

Most likely blockers:
1. PROVEN: No valid buy CTA on many useful pages.
2. UNKNOWN: Price and stock are not consistently visible.
3. INFERRED: Users may not know whether to choose OEM vs compatible.
4. INFERRED: No visible return-policy or seller-risk comparison at purchase moment.
5. INFERRED: No saved model/reminder loop to convert repeat intent.

## F. Competitive Audit

### Competitors

BuckParts competes against:
- OEM sites.
- Amazon.
- AppliancePartsPros.
- RepairClinic.
- PartsDr.
- Fix.com.
- PartSelect.
- AI search engines.
- Reddit/forums and YouTube as informal answer sources.

### Who Currently Wins?

Amazon wins checkout, price familiarity, speed, and breadth.

OEM sites win authority.

AppliancePartsPros, RepairClinic, PartSelect, PartsDr, and Fix.com win diagrams, part catalogs, long SEO history, and repair workflows.

AI search wins convenience when users ask natural-language questions.

BuckParts currently wins only on an emerging wedge: independent wrong-part prevention and clarity.

### Why They Win

PROVEN/INFERRED:
- They have inventory or strong retailer relationships.
- They have domain authority.
- They have review volume.
- They have diagrams, manuals, and installation media.
- They have checkout or deep retailer integration.

### Where They Are Weak

INFERRED:
- Retailers are biased toward selling something.
- OEM sites can be hard to navigate.
- Amazon has compatibility ambiguity and counterfeit/quality anxiety.
- Big parts sites can overwhelm users.
- AI search often lacks traceable source confidence.

BuckParts can win by being the neutral truth layer.

## G. Founder Leverage Audit

Assumption: Jared is a solo founder.

### Biggest Time Sinks

1. Affiliate program chasing.
2. Deciding which internal reports matter.
3. Hand-curating compatibility proof.
4. Running audits without direct revenue feedback.
5. Maintaining multiple system narratives.
6. Turning raw evidence into public SEO content.

### Biggest Bottlenecks

PROVEN/INFERRED:
- Jared is the business truth interpreter.
- Revenue truth is not automated.
- Affiliate approval and commission loops are not closed.
- Dashboard complexity may be stealing attention from growth.

### Unnecessary Systems

INFERRED:
- Anything that scores readiness without connecting to revenue, rank, clicks, or trust outcomes.
- Duplicate launch/readiness reports that disagree with public launch state.
- Agent-control-plane details in CEO-facing views.

### Systems That Should Be Automated

1. Affiliate status follow-up.
2. Tag verification.
3. Commission import.
4. GSC/GA4 freshness checks.
5. Rank/index monitoring.
6. CTA validity monitoring.
7. High-impression zero-click page triage.
8. Content brief generation from search gaps.

### Systems That Should Be Removed or Hidden

1. Internal agent machinery from CEO dashboards.
2. Readiness metrics that do not affect rank, revenue, retention, or trust.
3. Reports that count raw links as monetization.
4. Non-live vertical promotion in business-facing launch scorecards.

## H. AI / Agent Audit

### HyperAgent Dependency

PROVEN/INFERRED: The repo contains extensive agent and mission systems. Audit #1 already covered architecture. From a business standpoint, the risk is not that agents exist. The risk is that the company confuses agent activity with market learning.

### Mission Factory

INFERRED: Mission Factory is useful if it turns business questions into shipped evidence, pages, revenue experiments, and measured results. It is dangerous if it becomes a sophisticated way to generate internal confidence.

### Discovery Workflow

PROVEN: Discovery systems are strong. Search-miss audit found specific whole-house water misses.

INFERRED: Discovery needs tighter connection to public page quality and revenue opportunity.

### Repair Workflow

INFERRED: Repair workflows should be subordinate to market-facing outcomes: rank, click, conversion, commission, trust, and repeat usage.

### If HyperAgent Disappeared In Six Months, What Would BuckParts Regret Not Building Today?

BuckParts would regret not building a durable, agent-independent evidence system:
- Model-to-part truth graph.
- Source records.
- Confidence levels.
- Alias handling.
- Retailer link validation.
- No-buy reasons.
- Evidence freshness.
- Revenue feedback by page and part.

### Proprietary AI Capability BuckParts Should Own

INFERRED: A replacement-part certainty engine:

Input:
- User model number, photo, manual text, partial part number, or appliance description.

Output:
- Fits / does not fit / uncertain.
- Evidence trail.
- Best buy options.
- OEM vs compatible explanation.
- Wrong-part risk warning.
- Saved reminder.

Moat:
- The data graph, evidence trail, and real conversion outcomes.

## I. Command Center As CEO Dashboard

Forget implementation. A $10M BuckParts would need these every day:

### Revenue Board

- Gross revenue by day/week/month.
- Commission by retailer.
- EPC by page, part, retailer, and wedge.
- Conversion rate from page view to click to commission.
- Rejected/voided commission rate.
- Top earning pages.
- Pages with clicks but zero commission.

### SEO Board

- Indexed pages by wedge.
- Impressions, clicks, CTR, position by page type.
- Rank movement for target queries.
- Pages losing impressions.
- High-impression zero-click pages.
- Crawl errors.
- Sitemap freshness.

### Catalog Quality Board

- Live models.
- Live parts.
- Compatibility proof completeness.
- Alias coverage.
- Stale evidence.
- No-buy pages.
- Pages with missing retailer link.
- Pages with retailer link but invalid CTA.

### Conversion Board

- CTA impressions.
- CTA clicks.
- Seller split.
- Primary vs alternate CTA performance.
- Trust-module exposure.
- Help-open events.
- Search-to-detail-to-click funnel.

### Affiliate Operations Board

- Program status.
- Next follow-up date.
- Approved but untagged programs.
- Rejected programs with alternatives.
- Commission import freshness.
- Terms risk.

### Growth Board

- New backlinks.
- Referral sources.
- Reddit/forum mentions.
- YouTube mentions.
- AI answer appearances.
- Newsletter signups.
- Reminder enrollments.

### Forecast Board

- 30/60/90-day revenue forecast.
- Traffic forecast.
- CTA coverage forecast.
- Content production forecast.
- Affiliate approval forecast.

### Warnings

- GSC stale.
- GA4 stale.
- Revenue import stale.
- CTA broken.
- Retailer link returns error.
- High-click page loses rank.
- Page indexed while noindex intended.
- Non-live wedge gets organic impressions.
- Commission drops unexpectedly.

### What Is Missing?

PROVEN/INFERRED:
- Real revenue.
- Commission import.
- Current GSC/GA4 freshness.
- Rank tracking.
- Referral tracking.
- AI search tracking.
- Retention/reminder metrics.

### What Should Be Removed?

- Raw agent internals.
- Duplicate readiness scores.
- Metrics that do not connect to decisions.
- Internal report names where a CEO needs one clear KPI.

## J. Revolutionary Opportunities

1. My Home Filters: saved home, saved models, replacement schedules, reminders, one-click reorder.
2. Universal Home Consumables Fit Lookup: refrigerator filters, air purifier filters, humidifier filters, vacuum bags, water filters, range hood filters, furnace filters.
3. Wrong-Part Prevention API: retailers and AI tools call BuckParts before recommending a part.
4. AI Answer Source: public evidence pages that AI engines can cite.
5. Label/Manual Scanner: user uploads a photo or manual, BuckParts identifies compatible parts.
6. Browser Extension: warns users on Amazon when a part may not fit their saved model.
7. Seller Trust Layer: score buy options by fit confidence, seller quality, return friction, and counterfeit risk.
8. Property Manager Dashboard: manage filters across units and receive reorder reminders.
9. Repair Tech Lookup Tool: fast model-to-part lookups with confidence evidence.
10. Compatibility Data Licensing: sell structured fit data to retailers, support tools, and AI agents.

## K. Top 25 Findings

1. PROVEN: Revenue ledger is zero. Severity: Critical. Impact: Very High. Difficulty: Medium.
2. PROVEN: Only 67 of 188 useful pages have valid buy CTAs. Severity: Critical. Impact: Very High. Difficulty: Medium.
3. PROVEN: Commission truth is not connected to click truth. Severity: Critical. Impact: Very High. Difficulty: Medium.
4. PROVEN: GSC evidence shows weak organic traction: 3 clicks, 289 impressions. Severity: High. Impact: Very High. Difficulty: High.
5. PROVEN: Help/topical authority content is thin. Severity: High. Impact: High. Difficulty: Medium.
6. INFERRED: Programmatic pages carry duplicate/thin-content risk. Severity: High. Impact: High. Difficulty: Medium.
7. PROVEN: Measurement artifacts are stale in places. Severity: High. Impact: High. Difficulty: Low.
8. PROVEN: Affiliate readiness is incomplete. Severity: High. Impact: High. Difficulty: Medium.
9. PROVEN: Refrigerator has strongest click signal and should be the first commercial wedge. Severity: High. Impact: High. Difficulty: Low.
10. INFERRED: Air purifier has breadth but less proven commercial urgency. Severity: Medium. Impact: Medium. Difficulty: Medium.
11. PROVEN: Whole-house water is noindex but still appears in some business readiness contexts. Severity: Medium. Impact: Medium. Difficulty: Low.
12. INFERRED: Revenue forecasts should not be trusted until commission imports exist. Severity: High. Impact: High. Difficulty: Medium.
13. UNKNOWN: No clear SERP/rank tracker found. Severity: High. Impact: High. Difficulty: Medium.
14. UNKNOWN: Backlink/referral strategy is not proven. Severity: High. Impact: High. Difficulty: High.
15. UNKNOWN: Reddit/forum strategy is not proven. Severity: Medium. Impact: Medium. Difficulty: Medium.
16. UNKNOWN: AI-search strategy is not proven. Severity: Medium. Impact: High. Difficulty: Medium.
17. INFERRED: No retention/reminder product means BuckParts loses repeat value. Severity: High. Impact: Very High. Difficulty: High.
18. PROVEN: EEAT/trust foundation exists but needs more public evidence density. Severity: Medium. Impact: High. Difficulty: Medium.
19. INFERRED: Schema is conservative but under-leveraged. Severity: Medium. Impact: Medium. Difficulty: Low.
20. UNKNOWN: Direct traffic attribution is unclear. Severity: Medium. Impact: Medium. Difficulty: Medium.
21. INFERRED: Founder is the main operating bottleneck. Severity: High. Impact: High. Difficulty: Medium.
22. INFERRED: CEO dashboard is too operator/agent-heavy. Severity: Medium. Impact: Medium. Difficulty: Medium.
23. PROVEN: High-click pages need commercial treatment first. Severity: High. Impact: High. Difficulty: Low.
24. PROVEN/INFERRED: Social metadata exists, but social motion is not proven. Severity: Low. Impact: Medium. Difficulty: Medium.
25. INFERRED: The defensible moat is not the app; it is the compatibility evidence graph. Severity: Critical. Impact: Very High. Difficulty: High.

## L. Top 10 Recommended Projects

Ranked by expected impact divided by effort.

1. Revenue truth ledger import: import affiliate commissions and tie them to page, part, retailer, and click source.
2. Valid CTA expansion sprint: raise valid CTA coverage from 67/188 to 150+/188, starting with refrigerator.
3. Affiliate approval sprint: finish and follow up on high-value programs.
4. GSC/GA4/rank/index freshness board: make current market truth visible daily.
5. Refrigerator high-intent SEO pack: create 30 proof-rich pages around highest-click parts and model families.
6. Commercial confidence module: show fit certainty, source type, seller type, return confidence, and OEM/compatible context at CTA.
7. My Home Filters v1: saved model plus replacement reminder.
8. AI answer readiness pack: publish evidence summaries, `llms.txt`, and canonical compatibility explanations.
9. CEO dashboard simplification: one screen for revenue, SEO, CTA coverage, affiliate status, and warnings.
10. Proprietary truth graph browser: model, part, alias, seller, evidence, confidence, and no-buy reasoning in one durable system.

## M. What We Failed To Ask

1. Who is the first customer BuckParts is truly for: homeowner, renter, landlord, repair tech, property manager, or retailer?
2. What is the first wedge where BuckParts can win money, not just truth?
3. What is the expected commission per click by part family and retailer?
4. Which pages are actually indexed today?
5. Which queries are already ranking positions 5 to 20 and can be pushed into revenue?
6. What is the liability posture if BuckParts recommends the wrong part?
7. What retailer relationships are strategically worth pursuing versus not worth founder time?
8. What should BuckParts stop building immediately?
9. What would make a user come back without Google?
10. What is the moat if Amazon or an AI engine copies the visible UI?
11. Is this intended to become an affiliate media business, SaaS data product, consumer account/reminder app, or retailer infrastructure layer?
12. What customer promise is BuckParts willing to be judged by publicly?

## Final Business Truth

BuckParts has built a serious truth engine before it has built a business engine.

That is not fatal. It may be the correct order for this category. But the next phase cannot be more internal confidence. It has to be revenue truth, search truth, and repeat-user truth.

The strongest near-term move is boring and sharp: monetize refrigerator filters, close affiliate/commission loops, expand valid CTAs, and publish proof-rich pages where demand already exists.

The strongest long-term move is much bigger: become the trusted compatibility layer for home consumables.

