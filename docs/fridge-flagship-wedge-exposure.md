# Fridge flagship vs non-fridge public exposure (audit)

**Decision:** Refrigerator water is the flagship wedge. Air purifier and whole-house water should **not** be promoted at equal priority until they match the fridge trust standard.

## Current exposure (after fridge-only LIVE launch-state patch)

| Surface | Fridge | Air purifier | Whole-house water |
|---------|--------|--------------|-------------------|
| Homepage browse links | Yes (`/catalog`, fridge cards) | Yes (`/air-purifier`) | Yes (`/whole-house-water`) |
| Homepage playbook | Generic “verify” wording | N/A | N/A |
| `VERTICAL_LAUNCH_STATES` | `LIVE` | `NOINDEX_UNPROVEN` | `NOINDEX_UNPROVEN` |
| Sitemap static hubs | `/catalog`, `/search` | Not in LIVE static scope | Not in LIVE static scope |
| Sitemap dynamic discovery URLs | Useful-filter gated (`/brand`, `/fridge`, `/filter`) | Omitted when wedge not LIVE | Omitted when wedge not LIVE |

Vacuum, humidifier, appliance-air are `NOINDEX_UNPROVEN` and omitted from static sitemap paths. Air purifier and whole-house water are omitted from **dynamic** sitemap URLs while not `LIVE` (see `wedge-indexable-urls.test.ts`).

## Hiding / deprioritizing (not implemented here)

**Lower risk:** Remove or demote homepage links; adjust copy to lead with fridge only; set non-fridge verticals to `NOINDEX_UNPROVEN` and drop from `getSitemapLaunchVerticals()`; add `robots: noindex` on non-fridge layouts.

**Higher risk:** Removing routes or mass 404 without redirects — requires explicit owner approval and migration plan for indexed URLs.

## TODO for a future pass

1. Update homepage and About copy so non-fridge wedges are not co-equal CTAs until parity.
2. Add integration tests for sitemap + homepage link policy when implementation lands.
