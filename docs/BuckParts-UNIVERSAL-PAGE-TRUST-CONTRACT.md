# BuckParts Universal Page Trust Contract

Owner intent: every public BuckParts page should tell the same homeowner trust story as a replacement-part decision engine.

## Universal Trust Questions

Every public page should answer these questions when applicable:

1. What did BuckParts find?
2. What should the homeowner compare?
3. Why does BuckParts think this is relevant?
4. What evidence/source supports it?
5. What is uncertain?
6. What should the homeowner do next?
7. Are buying options shown?
8. If buying options are hidden, why?
9. What should the homeowner avoid doing?

## Language Contract

### Universal banned phrases (public-facing)

- Published OEM-style
- store links
- store buttons
- buy-link
- checkout deep link
- retailer targets
- finished our listing review
- pass BuckParts checks
- fully vetted
- guaranteed
- safe to buy
- completely trust

### Approved public language

- buying options
- product page
- compare the number on your old filter
- source-backed help
- not enough information yet
- we are not showing buying options yet

## Page-State Taxonomy

- READY
- USEFUL_NO_CTA
- QUARANTINED
- NEEDS_WORK
- NOINDEX_UNPROVEN

## Public Page-Type Audit Matrix (Read-Only)

### Homepage
- Route/file: `/` -> `src/app/page.tsx`
- Purpose: primary intake for refrigerator filter lookup and trust framing.
- Questions answered: 1,2,3,6,7,9.
- Missing/weak: explicit uncertainty language (5), explicit source/evidence callout (4), hidden-CTA why (8).
- Risks: contains legacy "verified links" style wording in some spots ("verify links"), not full banned phrase but inconsistent with newer "buying options" contract.
- Indexing: indexable.
- Status: NEEDS_COPY_ALIGNMENT

### Catalog
- Route/file: `/catalog` -> `src/app/catalog/page.tsx`
- Purpose: refrigerator category browsing.
- Questions answered: 1,6.
- Missing/weak: 2,3,4,5,7,8,9 mostly absent.
- Risks: trust/decision framing is light and not explicit.
- Indexing: indexable.
- Status: NEEDS_TRUST_SECTION

### Search
- Route/file: `/search` -> `src/app/search/page.tsx`
- Purpose: find models/filters from query and route to detail pages.
- Questions answered: 1,2,6,9; partial 3.
- Missing/weak: explicit source evidence (4), uncertainty framing (5) only implicit, CTA hidden reason (8) not explicit.
- Indexing: indexable.
- Status: NEEDS_COPY_ALIGNMENT

### Fridge model page
- Route/file: `/fridge/[slug]` -> `src/app/fridge/[slug]/page.tsx` + `src/components/fridge/FridgeModelFilterSection.tsx`
- Purpose: model-level fit decision with mapped filters and optional source-backed help.
- Questions answered: 1,2,3,4,5,6,7,8,9 (strongest coverage).
- Risks: some nested copy paths still vary by context; contract should keep "buying options" language locked.
- Indexing: index/follow when publishable; quarantine still indexable by current policy.
- Status: READY

### Refrigerator filter PDP
- Route/file: `/filter/[slug]` -> `src/app/filter/[slug]/page.tsx`
- Purpose: part-level decision page with compatible models and gated buying options.
- Questions answered: 1,2,3,5,6,7,8,9; source evidence mostly via notes sanitization (light 4).
- Risks: evidence transparency not as explicit as model manual callout.
- Indexing: page-state-driven robots.
- Status: READY

### Brand pages
- Route/file: `/brand/[slug]` -> `src/app/brand/[slug]/page.tsx`
- Purpose: simple directory of models and filters by brand.
- Questions answered: 1,6 only.
- Missing/weak: 2,3,4,5,7,8,9 absent.
- Indexing: indexable.
- Status: NEEDS_TRUST_SECTION

### Help index and help article pages
- Route/file: `/help`, `/help/[slug]` -> `src/app/help/page.tsx`, `src/app/help/[slug]/page.tsx`
- Purpose: informational support content.
- Questions answered: depends on article; framework itself only 1/6 lightly.
- Missing/weak: contract questions not consistently enforced.
- Indexing: indexable.
- Status: NEEDS_COPY_ALIGNMENT

### Reset-light pages
- Route/file: `/help/reset-water-filter-light/[brandSlug]` -> `src/app/help/reset-water-filter-light/[brandSlug]/page.tsx`
- Purpose: operational reset instructions after replacement.
- Questions answered: 1,6,9.
- Missing/weak: 2,3,4,5,7,8 mostly not applicable or absent.
- Indexing: indexable.
- Status: USEFUL_NO_CTA

### Non-live vertical hubs/pages: air-purifier, whole-house-water, vacuum, humidifier, appliance-air
- Route/file: `src/app/<vertical>/**/page.tsx` with `<vertical>/layout.tsx` using `NON_LIVE_WEDGE_ROBOTS`.
- Purpose: maintained wedges not currently launch-live for discovery.
- Questions answered: varies; many pages answer 1,2,6,9.
- Missing/weak: full trust contract not standardized; some legacy "store links"/"buying links" wording still appears in metadata/content.
- Indexing: noindex, follow by layout metadata (expected).
- Status: NOINDEX_UNPROVEN (policy-compliant for indexing; copy alignment still needed before LIVE)

### Other public routes discovered
- About (`/about`): NEEDS_COPY_ALIGNMENT (contains "vetted store links")
- Disclosure (`/disclosure`): NEEDS_COPY_ALIGNMENT (contains repeated "store links")
- Privacy (`/privacy`): READY (legal framing; references outbound links and /go clearly)
- Terms (`/terms`): READY (clear uncertainty/no-guarantee posture)

## Cross-Cutting Findings

### Buying-option language consistency
- Fridge flagship and filter PDP are mostly aligned to "buying options".
- Several non-flagship/legal/marketing pages still say "store links" and should align to the approved language set before wider launch claims.

### Evidence/source behavior
- Strongest on fridge model via manual/source callout.
- Filter PDP provides sanitized guidance but lighter explicit source-tier framing.
- Directory pages (catalog/brand/help index) generally do not expose evidence rationale.

### Confidence/uncertainty behavior
- Good on flagship pages ("not enough information yet"/suppressed buying options paths).
- Sparse on catalog/brand/search summaries where homeowners may expect confidence cues.

### Quarantine behavior
- Dedicated override exists and suppresses chips/buy actions on quarantined model route.
- Message must remain homeowner-safe and free of internal jargon.

## Smallest Safe Next Implementation Slice (Not Implemented Here)

1. Copy-only alignment pass on non-flagship public pages (`/about`, `/disclosure`, selected non-live hubs) to remove remaining "store links"/legacy terms and adopt "buying options"/product-page phrasing.
2. Add one shared "trust summary strip" component for low-context pages (catalog, brand, search) that minimally answers questions 2,5,7,9 without UI redesign.
3. Add a route-level phrase guard test covering key public pages for banned phrase contract enforcement.

