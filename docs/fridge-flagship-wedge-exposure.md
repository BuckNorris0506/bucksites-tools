# Fridge flagship vs non-fridge public exposure (audit)

**Decision:** Refrigerator water is the flagship wedge. Air purifier and whole-house water should **not** be promoted at equal priority until they match the fridge trust standard.

## Current exposure (after fridge-first public promo + sitemap gating)

| Surface | Fridge | Air purifier | Whole-house water |
|---------|--------|--------------|-------------------|
| Homepage browse promo | Yes (`/catalog` hub, fridge cards, fridge-first hero) | Not linked from homepage promo | Not linked from homepage promo |
| `/catalog` hub cards | Yes (`refrigerator_water` only) | Omitted from hub | Omitted from hub |
| Homepage playbook | Generic “verify” wording | N/A | N/A |
| Global `/search` | Fridge-first copy; may still surface matching non-fridge hits | Secondary in UX copy | Secondary in UX copy |
| `VERTICAL_LAUNCH_STATES` | `LIVE` | `NOINDEX_UNPROVEN` | `NOINDEX_UNPROVEN` |
| Sitemap static hubs | `/catalog`, `/search` | Not in LIVE static scope | Not in LIVE static scope |
| Sitemap dynamic discovery URLs | Useful-filter gated (`/brand`, `/fridge`, `/filter`) | Omitted when wedge not LIVE | Omitted when wedge not LIVE |
| HTML `robots` (Next metadata) | Fridge routes use page-state robots (`/fridge`, `/filter`, `/brand`); not wrapped by a segment noindex layout | `layout.tsx`: `noindex,follow` via `NON_LIVE_WEDGE_ROBOTS` | Same as air purifier |

For every `VerticalSlug` where `VERTICAL_LAUNCH_STATES[slug] === "NOINDEX_UNPROVEN"`, `src/app/<slug>/layout.tsx` exports `metadata.robots = { index: false, follow: true }` (`NON_LIVE_WEDGE_ROBOTS` in `src/lib/catalog/non-live-wedge-robots.ts`). Child pages inherit unless they override. **Refrigerator** has no `src/app/fridge/layout.tsx` or `src/app/filter/layout.tsx` noindex shell—only the LIVE wedge—so flagship URLs are not noindexed by this policy.

**Owner truth surface:** Private owner dashboard **lane 12 · Vertical launch / crawler / promo policy** (`/ownerdashboard/[secret]`) includes a read-only table derived from `VERTICAL_LAUNCH_STATES`, `VERTICAL_SLUGS_WITH_HOMEKEEP_SITEMAP_DISCOVERY`, segment layout noindex rules, `CATALOG_HUB_LAUNCH_CATEGORIES`, and fridge-first homepage promo constants (`buildOwnerVerticalLaunchPolicyReport` in `src/lib/owner-dashboard/owner-vertical-launch-policy.ts`).

Routes under non-LIVE wedges remain available for internal QA and direct URLs; they are not removed and are not co-equal homepage/catalog promos while not `LIVE`. Vacuum, humidifier, and appliance-air are `NOINDEX_UNPROVEN` and omitted from static sitemap paths. Air purifier and whole-house water are omitted from **dynamic** sitemap URLs while not `LIVE` (see `wedge-indexable-urls.test.ts`). Crawler alignment is enforced by sitemap omission **and** layout `noindex` on those segments.

## Hiding / deprioritizing (optional later)

**Lower risk:** Further tighten global `/search` result scope if product policy moves beyond “fridge-first copy only.”

**Higher risk:** Removing routes or mass 404 without redirects — requires explicit owner approval and migration plan for indexed URLs.

## TODO for a future pass

1. Add integration tests for sitemap + homepage link policy when helpful.
2. When a wedge becomes `LIVE`, remove its segment `layout.tsx` noindex (or stop exporting `NON_LIVE_WEDGE_ROBOTS` there) and re-promote it in nav/home.
