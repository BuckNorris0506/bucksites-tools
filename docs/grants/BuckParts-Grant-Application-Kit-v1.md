# BuckParts Grant Application Kit v1

**Repo checkpoint:** `aec8b8c` (Grant/Public Trust Pack v1 on `main`)  
**Purpose:** Repo-grounded grant application source material. Use with `BuckParts-Grant-Answer-Bank-v1.md`, `BuckParts-Grant-Use-Of-Funds-v1.md`, and `BuckParts-Grant-Truth-Claims-Register-v1.md`.  
**Rule:** If a fact is not proven in-repo, write **UNKNOWN**. Do not invent traction, revenue, users, interviews, eligibility, awards, or metrics.

---

## One-sentence description

BuckParts is a truth-first homeowner-help site that helps people avoid buying the wrong replacement filter or part by showing fit evidence, uncertainty, and buying options only when retailer listing checks pass.

---

## 100-word description

BuckParts helps homeowners avoid costly wrong-part purchases when shopping for replacement filters. Online listings, model numbers, compatible replacements, and retailer pages are often confusing. BuckParts is not a store. It shows model-to-part evidence, labels uncertainty, distinguishes original from compatible parts, and opens buying options only when listing evidence is safe enough to pass internal checks. Refrigerator and air purifier lookup are public in the repo; other categories remain limited or preview-only until proof improves. Affiliate links are secondary to truth and help cover operating costs. Grant funds would expand verification capacity, trust UX, accessibility, coverage, and development capacity—not ecommerce growth.

---

## 250-word description

Homeowners frequently buy the wrong replacement filter because model numbers change by year, compatible replacements look similar, and retailer listings are hard to trust. BuckParts addresses this as a truth-first homeowner-help system—not an online store.

The site helps users search by appliance model or part number, compare what BuckParts lists against the old filter or manual, and see whether a safe buying path exists. BuckParts does not guess fit. It shows uncertainty when evidence is incomplete, labels original versus compatible replacements when data supports that distinction, and withholds buy buttons when listing checks fail. Public trust pages document this policy at `/truth-policy` and `/wrong-part-prevention`.

In the committed repo state, refrigerator water filters and air purifier filters are configured as public-facing (`LIVE`). Whole-house water remains preview/noindex (`NOINDEX_UNPROVEN`) even though one WHW filter (`3m-ap810`) has a committed safe direct-buyable retailer row in CSV; WHW is not publicly opened. WHW `3m-ap811` is in a `BROWSER_TRUTH_READY` lane per the safe-CTA expansion queue—browser truth capture is the documented next step, not public opening or CSV apply without founder approval.

Affiliate commissions may help cover operating overhead (hosting, AI/tool credits, browser verification, marketing, development). Revenue does not override fit evidence. Grant funds would serve the same mission: verification tools, browser checks, customer trust UX, accessibility, coverage expansion, marketing/education, and development capacity.

Traffic, revenue, customer counts, and interview totals: **UNKNOWN**—not asserted here.

---

## 500-word description

### Problem

Replacement-part shopping is a common homeowner pain point. Model numbers vary by revision and region. Retailers reuse photos, bundle sizes, or route shoppers to search pages instead of a single product listing. “Compatible” filters are not always interchangeable. The result is wasted money, delayed repairs, and lost trust—especially when helping family members buy filters online.

This problem does not need to be invented. The founder has personally bought wrong replacement parts when listings, model numbers, and compatibility claims were confusing—a pattern familiar to many homeowners.

### Solution

BuckParts is a truth-first homeowner-help and wrong-part-prevention system for replacement filters and parts. It is **not** ecommerce. BuckParts does not ship products, set prices, or run checkout.

Instead, BuckParts:

- ties appliance models to filter numbers using structured repo data where evidence exists;
- shows fit reasoning and uncertainty instead of fake certainty;
- labels original versus compatible replacements when the data supports it;
- reviews retailer product pages before showing buying options;
- withholds outbound purchase links when checks fail or evidence is incomplete.

Buying options appear only when listing evidence is safe enough to pass internal gates. A missing buy button is often intentional—a trust feature, not a missing feature.

### Public benefit

Wrong-part purchases waste homeowner money and time. BuckParts aims to reduce that harm with plain-language guidance, public trust policies, and verification-first linking. The site is free to use; no account is required for lookup. Public pages explain how to compare part numbers before ordering.

### Current repo state (honest)

| Area | Status |
|------|--------|
| Public trust pages (`/truth-policy`, `/wrong-part-prevention`) | **PROVEN** in repo at `aec8b8c` |
| Grant readiness report (`buckparts_grant_readiness_v1`, read-only) | **PROVEN** |
| Refrigerator wedge | **PROVEN** `LIVE` in `vertical-launch-state.ts` |
| Air purifier wedge | **PROVEN** `LIVE` (truth-gated public opening policy in repo) |
| Whole-house water wedge | **PROVEN** `NOINDEX_UNPROVEN` — not publicly opened |
| WHW `3m-ap810` safe retailer row | **PROVEN** one committed `direct_buyable` aquapure-dealer row in `data/whole-house-water/retailer_links.csv` |
| WHW public opening | **PROVEN unauthorized** in buyer-path / expansion queue artifacts |
| WHW `3m-ap811` | **PROVEN** `BROWSER_TRUTH_READY` lane; buyer-path proof PASS=0; `safe_apply_authorized=false` |
| Site traffic / users / revenue / interviews | **UNKNOWN** |
| Grant eligibility for any specific program | **UNKNOWN** |
| Missouri / KC-region eligibility | **UNKNOWN** — not documented in repo |

### Why this is not ecommerce

BuckParts is not an online store, seller, or manufacturer. Retailers run checkout. BuckParts does not claim to list every retailer, guarantee price, or guarantee stock. The mission is wrong-part prevention and decision clarity—not conversion maximization.

### Why affiliate links are secondary

Outbound retailer links may earn commissions that help cover operating costs (ChatGPT, Cursor, Codex, hosting, browser verification, marketing, tools). Affiliate links do **not** decide what is shown. Fit evidence and listing checks come first.

### Grant use of funds (summary)

See `BuckParts-Grant-Use-Of-Funds-v1.md`. Categories: AI/tool credits, browser verification, coverage expansion, customer trust UX, accessibility, development capacity, marketing/education.

### Grant-fit categories (screening only—not eligibility claims)

| Category | Fit rationale | Eligibility |
|----------|---------------|-------------|
| Small business digital readiness | Solo-built verification and trust UX infrastructure | **UNKNOWN** per program |
| Innovation / technology | Model-to-part evidence, browser verification, truth-gated buy paths | **UNKNOWN** per program |
| Consumer protection / public benefit | Wrong-part prevention for homeowners | **UNKNOWN** per program |
| Solo founder / microbusiness | Single-founder operation implied by repo; no headcount file | **UNKNOWN** |
| Missouri / KC-region | Not documented in repo | **UNKNOWN** |
| Accessibility / public information | Plain-language trust pages; accessibility work listed as use-of-funds | **UNKNOWN** per program |

### Documents or screenshots likely needed later

- Screenshots of `/truth-policy` and `/wrong-part-prevention` live (when deploying)
- Screenshots of refrigerator/air purifier lookup and truth-gated buy sections
- Founder bio and contact information (**UNKNOWN** in repo—Jared to supply)
- Business registration / EIN (**UNKNOWN** in repo)
- Bank letter or fiscal sponsor (**UNKNOWN**)
- Letters of support (**UNKNOWN**)
- Accessibility audit results (**UNKNOWN**—not yet performed)
- Privacy policy URL (`/privacy`) — **PROVEN** route exists

### Open questions for Jared (before submitting applications)

1. Legal entity name, EIN, and business address for grant forms?
2. Missouri / Kansas City residency or business nexus—any programs to target?
3. Are there any real usage metrics (traffic, searches, clicks) safe to cite? If yes, provide numbers; if no, keep **UNKNOWN**.
4. Any customer feedback, emails, or support tickets that can be quoted anonymously?
5. Any prior grants applied for or awarded? (**UNKNOWN** in repo)
6. Budget amounts per use-of-funds category for a specific application?
7. Timeline for WHW public opening—keep **UNKNOWN** externally?
8. Fiscal sponsor needed for any target grants?
9. Accessibility priorities and any known WCAG gaps?
10. Which wedge should be highlighted as the next coverage expansion if asked?

### Related files

- `docs/grants/BuckParts-Grant-Answer-Bank-v1.md` — paste-ready snippets
- `docs/grants/BuckParts-Grant-Use-Of-Funds-v1.md` — budget categories
- `docs/grants/BuckParts-Grant-Truth-Claims-Register-v1.md` — PROVEN / INFERRED / UNKNOWN / forbidden claims
- `scripts/report-buckparts-grant-readiness-v1.ts` — public trust pack readiness
- `scripts/report-buckparts-grant-application-kit-readiness-v1.ts` — this kit readiness
