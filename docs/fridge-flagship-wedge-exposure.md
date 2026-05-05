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

Routes such as `/air-purifier` and `/whole-house-water` remain available; they are not removed and are not co-equal homepage/catalog promos while not `LIVE`. Vacuum, humidifier, and appliance-air are `NOINDEX_UNPROVEN` and omitted from static sitemap paths. Air purifier and whole-house water are omitted from **dynamic** sitemap URLs while not `LIVE` (see `wedge-indexable-urls.test.ts`).

## Hiding / deprioritizing (optional later)

**Lower risk:** Add `robots: noindex` on non-fridge layouts when policy is ready.

**Higher risk:** Removing routes or mass 404 without redirects — requires explicit owner approval and migration plan for indexed URLs.

## TODO for a future pass

1. Add integration tests for sitemap + homepage link policy when helpful.
2. Re-promote non-fridge wedges in nav/home when they reach fridge-parity trust and `VERTICAL_LAUNCH_STATES` moves them to `LIVE`.
