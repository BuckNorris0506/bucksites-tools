# Air Purifier Buyer-Path Pilot #1 (Local Only)

**Status:** Local CSV mutation only. **NOT DEPLOYED.** **Supabase:** untouched.  
**Executed:** 2026-05-22  
**Repo HEAD at start:** `a7748c0`  
**Mutable surface:** `data/air-purifier/retailer_links.csv` only (pilot slugs).  
**Fridge batch:** untouched (`data/retailer_links.csv`, `docs/BUYER-PATH-20-SAFE-BATCH-V1.md`).

---

## Pilot #1 scope

Five slugs from Command Center / coverage snapshot queue:

| # | Slug | OEM token | GSC signal |
|---|------|-----------|------------|
| 1 | `shark-hepa-he15fkp` | HE15FKPET | `he15fkpet`, `shark he15fkpet`; `/air-purifier/model/shark-hp150` (82 imp) |
| 2 | `shark-hepa-he3fkp` | HE3FKPET | `hp300`; `/air-purifier/model/shark-hp300` (15 imp) |
| 3 | `blueair-particle-411` | BLUEAIR-PART411 | `/air-purifier/filter/blueair-f4max-411` (10 imp) — **slug drift** vs live `blueair-particle-411` |
| 4 | `levoit-rf-rar029` | LEVOIT-RF-RAR029 | Core 300 family hub demand (no top-query token) |
| 5 | `honeywell-hrf-r3` | HONEYWELL-HRF-R3 | HPA300 compat graph (no dedicated top query) |

---

## Per-row proof summary

### `shark-hepa-he15fkp` — SKIPPED

| Field | Value |
|-------|-------|
| Filter | `HE15FKPET`, brand `shark`, aliases `HE15FKPET` |
| Compat models | 4 (`shark-hp150`–`hp155`) |
| CSV URL | `https://www.sharkclean.com/products/hp150-hepa-filter-zidHE15FKPET` → redirects to `https://www.sharkninja.com/hp150-hepa-filter/HE15FKPET.html` |
| Browser | PDP identity **PROVEN** (HE15FKPET in final URL/title); **no** visible Add to Cart / Buy in Playwright pass |
| Classification | `likely_valid` (not `direct_buyable`) |
| Wrong-family | HE3FKPET / HP300 not dominant — **pass** |
| Mutation | None |

### `shark-hepa-he3fkp` — SKIPPED

| Field | Value |
|-------|-------|
| Filter | `HE3FKPET`, compat 4 models (`shark-hp300`–`hp305`) |
| CSV URL | `https://www.sharkclean.com/products/shark-neverchangeanti-allergen-true-hepa-filter-zidHE3FKPET` → `https://www.sharkninja.com/shark-neverchangeanti-allergen-true-hepa-filter/HE3FKPET.html` |
| Browser | PDP identity **PROVEN**; no purchase CTA detected |
| Classification | `likely_valid` |
| Wrong-family | HE15FKPET / HP150 not dominant — **pass** |
| Mutation | None |

### `blueair-particle-411` — SKIPPED (slug drift + no PDP)

| Field | Value |
|-------|-------|
| Filter | `BLUEAIR-PART411`, compat `blueair-411`, `411a-max`, `mini-max` |
| CSV URL | Search placeholder `https://www.blueair.com/us/search?q=BLUEAIR-PART411` (404 page) |
| Discovery | Candidate PDP paths on blueair.com returned **404** (site structure change) |
| GSC | `/air-purifier/filter/blueair-f4max-411` does not match repo slug — **do not mutate** per pilot rules |
| Mutation | None |

### `levoit-rf-rar029` — SKIPPED

| Field | Value |
|-------|-------|
| Filter | `LEVOIT-RF-RAR029`, aliases `RF-RAR029`, `Core 300 filter`, `RAR029` |
| Compat models | 16 mappings (Core 300 family) |
| Primary CSV | Levoit site search (0 results) |
| Secondary CSV | Amazon `B0DR6X4N35` |
| Browser | Levoit OEM PDP URLs 404; Amazon listing shows purchase UI but **does not** surface `RAR029` / `RF-RAR029` (Pet Care / `300-RF-PA` variant — wrong family for this OEM row) |
| Mutation | None |

### `honeywell-hrf-r3` — MUTATED

| Field | Value |
|-------|-------|
| Filter | `HONEYWELL-HRF-R3`, aliases `HRF-R3` |
| Compat models | 15 HPA300-series mappings |
| Proven PDP | `https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-3-pack-hrf-r3.htm` |
| Browser | Title/H1 **HRF-R3**; **Add to Cart** visible; not search/404 |
| Wrong-family | R1/R2 pack strings not dominant on PDP — **pass** |
| Primary change | Promoted Honeywell Store row to `is_primary=true`; demoted Amazon (bot-wall / no token proof in pilot pass) |
| Mutation | `browser_truth_classification=direct_buyable`, notes + checked_at on OEM row |

---

## Rows mutated

| filter_slug | retailer_key | Change |
|-------------|--------------|--------|
| `honeywell-hrf-r3` | `oem-catalog` | `direct_buyable` browser truth; `is_primary=true`; retailer label clarified |
| `honeywell-hrf-r3` | `amazon` | `is_primary=false` (no browser truth; remains blocked) |

**CSV schema:** Added columns `browser_truth_classification`, `browser_truth_notes`, `browser_truth_checked_at` (empty on all other rows).

No other AP slugs changed.

---

## Rows failed / skipped

| Slug | Reason |
|------|--------|
| `shark-hepa-he15fkp` | PDP OK; no `direct_buyable` purchase proof |
| `shark-hepa-he3fkp` | PDP OK; no `direct_buyable` purchase proof |
| `blueair-particle-411` | GSC slug drift unresolved; no live Blueair PDP discovered |
| `levoit-rf-rar029` | No OEM PDP; Amazon secondary wrong/missing RAR029 token |

---

## AP safe CTA count (repo CSV gates)

| Metric | Before | After |
|--------|-------:|------:|
| Total link rows | 64 | 64 |
| Safe `direct_buyable` | 0 | **1** |
| Blocked (gate or `BLOCKED_SEARCH_OR_DISCOVERY`) | 64 | **63** |
| `search_placeholder` | 52 | 52 |
| `missing_browser_truth` | 12 | 11 |

**Moved:** `honeywell-hrf-r3` primary `oem-catalog` row only.

---

## Gate / route proof (post-edit)

| slug | row | gate | state | `/air-purifier/go` safe |
|------|-----|------|-------|-------------------------|
| `honeywell-hrf-r3` | oem-catalog primary | `null` | `LIVE_DIRECT_BUYABLE` | yes |
| `honeywell-hrf-r3` | amazon secondary | `missing_browser_truth` | `BLOCKED_BROWSER_TRUTH_MISSING` | no |
| All other pilot slugs | unchanged | prior failures | blocked | no |

Helpers used: `buyLinkGateFailureKind`, `mapSignalsToRetailerLinkState`, `isAffiliateUrlSafeForGoRedirect` (same as fridge; AP-compatible).

`scripts/verify-oem-retailer-links-playwright.ts --air-only` still **skips** `shark-official` rows (`isOemRetailerKey` = `oem*` only). Pilot used isolated Playwright pass in `/tmp` (not committed).

---

## Deployment / Supabase / fridge

| Item | Status |
|------|--------|
| Deploy | NOT DEPLOYED |
| Supabase | untouched |
| `data/retailer_links.csv` | untouched |
| `docs/BUYER-PATH-20-SAFE-BATCH-V1.md` | untouched |
| Gates / search / compat CSVs | untouched |

---

## Next AP bite (recommendation only — not executed)

Pilot #1 yielded **0** passing rows in the Shark family (2 PDP-valid but not buy-proven). **Do not** run a Shark multi-row batch until SharkNinja purchase UI is capturable in Playwright or human-verified.

**Recommended next discovery group:** Honeywell **HRF-R1 / HRF-R2** (same Honeywell Store PDP pattern as the one passing row) — 2+ slugs, single retailer host, likely same proof workflow.

Alternative if Blueair slug drift is resolved first: remap GSC `blueair-f4max-411` → `blueair-particle-411` in a separate catalog task, then re-run Blueair PDP discovery.

---

## Honeywell Bite #2 (local only)

**Executed:** 2026-05-22 (HEAD `2148be1` or later)  
**Candidates:** `honeywell-hrf-r1`, `honeywell-hrf-r2` only. **`honeywell-hrf-r3` unchanged** (pilot #1 proof retained).

### Preflight

| Slug | OEM | Aliases | Compat | Primary (pre) | URL (pre) | Gate (pre) | GSC |
|------|-----|---------|--------|---------------|-----------|------------|-----|
| `honeywell-hrf-r1` | HONEYWELL-HRF-R1 | HRF-R1, HONEYWELL-HRF-R1 | 13 | Amazon | honeywellstore PDP (already in CSV) | OEM `missing_browser_truth` | No dedicated AP query/page |
| `honeywell-hrf-r2` | HONEYWELL-HRF-R2 | — | 5 | oem-catalog | honeywellstore 2-pack PDP | OEM `missing_browser_truth` | No dedicated AP query/page |

### Browser proof

| Slug | PDP URL | Token | Buy CTA | Result |
|------|---------|-------|---------|--------|
| `honeywell-hrf-r1` | `.../true-hepa-replacement-filter-r-hrf-r1.htm` | HRF-R1 in title/H1 | Add to Cart Set Up Subscription | **direct_buyable** |
| `honeywell-hrf-r2` | `.../true-hepa-replacement-filter-r-2-pack-hrf-r2.htm` | HRF-R2 in title/H1 (2-pack explicit) | Add to Cart Set Up Subscription | **direct_buyable** |

Wrong-family: R1 page excludes dominant R2/R3 pack copy; R2 page excludes R1/R3. Playwright artifact: `/tmp/bp-honeywell-bite2/results.json`.

### Rows mutated (bite #2)

| filter_slug | retailer_key | Change |
|-------------|--------------|--------|
| `honeywell-hrf-r1` | `oem-catalog` | `direct_buyable`; `is_primary=true`; label clarified |
| `honeywell-hrf-r1` | `amazon` | `is_primary=false` |
| `honeywell-hrf-r2` | `oem-catalog` | `direct_buyable`; label clarified (already primary) |

### Rows failed / skipped (bite #2)

None — both candidates passed.

### AP safe CTA count (bite #2 delta)

| Metric | Before bite #2 | After bite #2 |
|--------|----------------:|--------------:|
| Safe `direct_buyable` | 1 | **3** |
| Blocked | 63 | **61** |
| `missing_browser_truth` | 11 | **9** |
| `search_placeholder` | 52 | 52 |

**Moved:** `honeywell-hrf-r1` and `honeywell-hrf-r2` primary `oem-catalog` rows. All three Honeywell R-family primaries are now Honeywell Store `direct_buyable`.

### Gate proof (all Honeywell R rows)

| slug | row | gate | state | `/air-purifier/go` |
|------|-----|------|-------|---------------------|
| `honeywell-hrf-r1` | oem primary | null | LIVE_DIRECT_BUYABLE | yes |
| `honeywell-hrf-r2` | oem primary | null | LIVE_DIRECT_BUYABLE | yes |
| `honeywell-hrf-r3` | oem primary | null | LIVE_DIRECT_BUYABLE | yes |
| Each | amazon secondary | `missing_browser_truth` | blocked | no |

**Deployment:** NOT DEPLOYED. **Supabase:** untouched. **Fridge batch:** untouched.

### Official reference PDP path (code — 2026-05-23)

**Implemented locally (not deployed).** Shark CSV rows **not mutated** in this step.

| Item | Status |
|------|--------|
| `filterOfficialReferenceRetailerLinks` | `launch-buy-links.ts` — `likely_valid` + allowlist `shark-official` + PDP URL + `browser_truth_notes` + `browser_truth_checked_at` |
| UI | `OfficialProductReferenceLinks` — direct outbound, title “Official product reference”, no Buy/Shop/Purchase, no `/go` |
| AP wiring | `getAirPurifierFilterBySlug` → `official_reference_links`; AP filter page passes to `VerticalFilterPageContent` |
| `/go` | **Still blocks** `likely_valid` (unchanged `buyLinkGateFailureKind` / `isAffiliateUrlSafeForGoRedirect`) |
| Buy CTAs | **Still** `direct_buyable` only via `filterRealBuyRetailerLinks` |
| Tests | `src/lib/retailers/official-reference-retailer-links.test.ts` |

**Next step:** ~~Set Shark rows to `likely_valid`~~ **Done** — see Shark reference activation below.

### Shark reference activation (local CSV — 2026-05-23)

**NOT DEPLOYED.** **Supabase untouched.** **Fridge batch untouched.**

| Slug | Classification | `/go` | Buy CTA | Reference link |
|------|----------------|-------|---------|----------------|
| `shark-hepa-he15fkp` | `likely_valid` | blocked | none | yes — official SharkNinja PDP |
| `shark-hepa-he3fkp` | `likely_valid` | blocked | none | yes — official SharkNinja PDP |

Both rows: `browser_truth_checked_at=2026-05-23T03:00:00.000Z`; notes document HE15FKPET/HE3FKPET, HP150/NeverChange HP300 family, Out of Stock / Notify Me, not a confirmed buy path. **Not** `direct_buyable`.

| AP metric | Before activation | After activation |
|-----------|------------------:|-----------------:|
| Safe `direct_buyable` CTAs | 3 | **3** (unchanged) |
| Official reference links | 0 | **2** |
| Blocked (buy gate) | 61 | **61** (Shark still blocked from buy/`/go`) |
| Demand lane `safe_cta_count` | 3 | **3** |

Proof: CSV gate + `shark-reference-activation-smoke.test.ts` (TrustAwareBuySection + OfficialProductReferenceLinks render from committed CSV). Live `/air-purifier/filter/*` via `next dev` requires Supabase rows matching CSV (`seed:import:air-purifier` — not run).

### Next AP bite (recommendation only)

Honeywell R-family is **complete** in repo (R1/R2/R3). Next highest-leverage batch:

1. **Shark official PDPs** (`shark-hepa-he15fkp`, `shark-hepa-he3fkp`) — human or non-headless buy-CTA proof, then same browser-truth CSV pattern; or  
2. **Medify / Winix / Coway** OEM search rows with Amazon secondaries — discover PDPs where Amazon ASINs exist in CSV.

Do not execute without approval.

---

## Shark policy review (official PDP, no buy CTA)

**Executed:** 2026-05-23 (HEAD `2148be1` or later)  
**Candidates:** `shark-hepa-he15fkp`, `shark-hepa-he3fkp` — **activated as `likely_valid` reference links** (see Shark reference activation above).

### Current gate / useful-link policy (PROVEN from repo)

| Question | Answer |
|----------|--------|
| Does `/air-purifier/go` allow `likely_valid`? | **No** — `isAffiliateUrlSafeForGoRedirect` delegates to `buyLinkGateFailureKind`, which requires `direct_buyable` via `passesDirectBuyableGate`. |
| Does CTA UI require `direct_buyable`? | **Yes** — `filterRealBuyRetailerLinks` excludes any row where `buyLinkGateFailureKind !== null`. `likely_valid` → `unsafe_browser_truth`. |
| Distinction between buy vs useful official link? | **Yes (2026-05-23)** — `filterOfficialReferenceRetailerLinks` + `OfficialProductReferenceLinks` for allowlisted `likely_valid` official PDPs (`shark-official`). OEM site-search footnote unchanged for `oem-catalog`. |
| Safe classification for official PDP without Add to Cart? | **`likely_valid`** for browser proof — but **still blocked** at buy gate today. |
| Would setting Shark to `likely_valid` show a useful link? | **Yes (after 2026-05-23 activation)** — via `filterOfficialReferenceRetailerLinks` + `OfficialProductReferenceLinks`; buy section still suppressed; `/go` still blocked. |

`RETAILER_LINK_STATES.LIVE_LIKELY_VALID_NON_BUYABLE` exists in `retailer-link-state.ts` but is **not reachable** through live buy-path gates (`gateFailureKind` is evaluated before classification mapping).

AP filter loader (`getAirPurifierFilterBySlug`) passes **gated-only** links to `VerticalFilterPageContent`; `buildPartPageTrust` → `suppress_buy` when zero gated links survive.

### Shark browser proof (2026-05-23 Playwright)

| Slug | Final URL | Domain | Token | Model clarity | Primary buy CTA | Useful without buy? | Recommended class |
|------|-----------|--------|-------|---------------|-----------------|----------------------|-------------------|
| `shark-hepa-he15fkp` | `https://www.sharkninja.com/hp150-hepa-filter/HE15FKPET.html` | sharkninja.com | HE15FKPET in URL + `Model: HE15FKPET` | HP150 in title/H1 | **Out of Stock — Notify me** (no Add to Cart on primary SKU) | Yes — official PDP, price, fit copy | `likely_valid` |
| `shark-hepa-he3fkp` | `https://www.sharkninja.com/shark-neverchangeanti-allergen-true-hepa-filter/HE3FKPET.html` | sharkninja.com | HE3FKPET in URL + `Model: HE3FKPET` | NeverChange / HP300 family in copy | **Out of Stock — Notify me** | Yes — same pattern | `likely_valid` |

Wrong-family: HE15 page clean; HE3 page lists HP150 only under “Customers also viewed” (not primary product area).  
Artifact: `/tmp/bp-shark-policy/results.json`

### Row decisions

| Slug | Decision | Reason |
|------|----------|--------|
| `shark-hepa-he15fkp` | **KEEP_BLOCKED (buy)** → **REFERENCE ACTIVE** | `likely_valid`; official reference only; not `direct_buyable` |
| `shark-hepa-he3fkp` | **KEEP_BLOCKED (buy)** → **REFERENCE ACTIVE** | Same |

**Not mutated:** both Shark rows remain without `browser_truth_*` fields.

### Policy gap (smallest future change)

BuckParts needs a **non-buy official reference path** before Shark can help users without weakening buy gates:

| Item | Proposal |
|------|----------|
| **Label** | “Official product reference” (UI copy); classification stays `likely_valid` or new read-only `official_reference_pdp` |
| **State** | `LIVE_LIKELY_VALID_NON_BUYABLE` (already defined) |
| **Rendering** | New `TieredBuyLinks` footnote (or `TrustAwareBuySection` block) for verified official PDP rows: **direct outbound link**, label **not** “Buy”, copy like OEM footnote (“Opens manufacturer product page for reference”) |
| **Gate** | **Do not** change `passesDirectBuyableGate` or `/go` rules. Add separate `filterOfficialReferenceLinks()` that requires: token-verified `likely_valid`, non-search URL, allowlisted `retailer_key` (e.g. `shark-official`), explicit opt-in per row |
| **Tests** | `likely_valid` + `shark-official` still blocked on `/go`; reference link renders; `filterRealBuyRetailerLinks` unchanged |
| **Why safe** | Buy CTAs and affiliate redirect gate remain `direct_buyable`-only; reference links bypass `/go` and are not labeled as checkout |

### AP coverage after Shark review

| Metric | Before | After (no mutation) |
|--------|-------:|--------------------:|
| Safe `direct_buyable` | 3 | **3** |
| Blocked | 61 | **61** |
| Shark rows changed | — | **0** |

### Blueair slug-drift review (read-only — 2026-05-23)

**NOT DEPLOYED.** **Supabase untouched.** **Fridge batch untouched.** **No AP CSV mutation in this step.**

#### Repo state (PROVEN)

| Check | Result |
|-------|--------|
| `blueair-f4max-411` in `data/air-purifier/filters.csv` | **No** — slug never existed in catalog CSV |
| `blueair-particle-411` in `filters.csv` | **Yes** — `BLUEAIR-PART411`, “Blue Pure 411 particle + carbon filter” |
| Aliases for 411 / F4MAX / Particle 411 | **None** in `data/air-purifier/filter_aliases.csv` |
| Route `/air-purifier/filter/[slug]` | Supabase slug lookup only — **no alias resolution, no redirect** → `blueair-f4max-411` **404** (`notFound()`) |
| Sitemap filter URLs | Generated from live filter slugs only — **does not emit** `blueair-f4max-411` |
| Retailer row (`blueair-particle-411`) | Primary `oem-catalog` → `https://www.blueair.com/us/search?q=BLUEAIR-PART411` |
| Gate | `search_placeholder` — blocked from buy UI and `/go` |
| Official reference | **No** — `oem-catalog` not on reference allowlist (`shark-official` only) |

Compat (read-only note): `blueair-411`, `blueair-411a-max`, `blueair-mini-max` → `blueair-particle-411`. **Do not mutate** in this task.

#### GSC slug-drift proof

| Signal | Value |
|--------|-------|
| GSC page | `https://buckparts.com/air-purifier/filter/blueair-f4max-411` |
| Impressions | **10** (prior snapshot / coverage doc; listed in `demand_to_coverage_next_lane_v1` AP `top_pages`) |
| Live catalog slug | `blueair-particle-411` only |
| Prior inference | “GSC typo → `blueair-particle-411`” — **rejected** after product-token review (see identity) |

#### Product identity decision — **B: related but distinct**

| Token / slug | Product | Official PDP (browser, 2026-05-23) |
|--------------|---------|-------------------------------------|
| `blueair-particle-411` / `BLUEAIR-PART411` | Blue Pure **411 / 411+ / 411 Auto** particle + carbon filter | [blue-pure-411-particle-carbon](https://www.blueair.com/products/blue-pure-411-particle-carbon) — H1 “Blue Pure 411 Series Filter”; **Add to cart**; page tokens **F411PACF**, 411/411+/411 Auto; **no** `BLUEAIR-PART411` string |
| `F4MAX` / 110036 | Blue Pure **411i Max / 411a Max** particle + carbon filter — **not** compatible with 411/411+/411 Auto per OEM | [f4max-replacement-pac-filter-for-411max-series-f4max](https://www.blueair.com/products/f4max-replacement-pac-filter-for-411max-series-f4max) — **F4MAX**, **411i Max**, **411a Max**, **110036**, **Add to cart** |
| GSC slug `blueair-f4max-411` | Malformed conflation of **F4MAX** family name + **411** model number — **not** a catalog slug and **not** provably identical to `blueair-particle-411` | — |

**Not A (same sellable filter).** **Not safe to alias** `blueair-f4max-411` → `blueair-particle-411` without wrong-family risk for 411a Max / 411i Max owners.

#### Discovery / PDP proof

| URL | PDP? | Buy action | Exact repo OEM token? | Wrong-family risk |
|-----|------|------------|----------------------|-------------------|
| `blueair.com/us/search?q=BLUEAIR-PART411` (CSV) | **404** | — | — | — |
| `blueair.com/products/blue-pure-411-particle-carbon` | **Yes** | Add to cart | **No** (`F411PACF` / marketing name, not `BLUEAIR-PART411`) | Low for 411 family; **high** if user wanted F4MAX Max-series filter |
| `blueair.com/products/f4max-replacement-pac-filter-for-411max-series-f4max` | **Yes** | Add to cart | **No** (no `BLUEAIR-PART411`; F4MAX / 110036) | **High** if mapped to particle-411 slug |

#### Buyer-path decision — **KEEP_BLOCKED** (+ route/catalog work tracked separately)

| Option | Verdict |
|--------|---------|
| `BUYER_PATH_UPDATE` on `blueair-particle-411` | **Reject** — no `direct_buyable` proof with exact `BLUEAIR-PART411` token on PDP; search URL still broken |
| `REFERENCE_ONLY` | **Reject** — `oem-catalog` not allowlisted for official reference path |
| `ALIAS_ONLY` `blueair-f4max-411` → `blueair-particle-411` | **Reject** — product evidence shows F4MAX ≠ PART411 filter |
| `NEEDS_ROUTE_REDIRECT` | **Yes (catalog prerequisite)** — GSC URL 404s today; redirect target **must not** be chosen until catalog owns the correct filter slug |
| `KEEP_BLOCKED` | **Yes** — leave retailer row unchanged |

**Smallest safe follow-up patches (not implemented):**

1. **Catalog + compat review (approved task):** add filter slug e.g. `blueair-f4max-411max` with OEM `F4MAX` / `110036`; fix `blueair-411a-max` compat away from `blueair-particle-411` if F4MAX is confirmed OEM for that model.
2. **Redirect (after #1):** `next.config` or middleware 301 `/air-purifier/filter/blueair-f4max-411` → correct live slug (F4MAX row or, only with proof, particle row).
3. **Buyer-path (after PDP + token policy):** replace search URL on the **matching** row only; `direct_buyable` only with Add to Cart + exact-token proof per pilot rules.

#### AP counts after this task (no mutation)

| Metric | Before | After |
|--------|-------:|------:|
| Safe `direct_buyable` CTAs | 3 | **3** |
| Official reference links | 2 | **2** |
| Blocked (buy gate) | 61 | **61** |
| GSC drift (`blueair-f4max-411`) | Unresolved 404 | **Unresolved** (identity clarified; no redirect) |
| Useful-link coverage | 2 Shark refs + 3 Honeywell buys | **Unchanged** |

**Deployment:** NOT DEPLOYED. **Supabase:** untouched. **Fridge batch:** untouched.

---

## Provenance

| Label | Items |
|-------|-------|
| **PROVEN** | Repo CSV/catalog rows; gate math; Playwright artifacts: `/tmp/bp-ap-pilot-pw/ap-pilot-v1-results.json`, `ap-pilot-v2-results.json`, `/tmp/bp-honeywell-bite2/results.json` |
| **INFERRED** | Amazon B0DR6X4N35 is wrong-family for RAR029 from title text in first successful fetch |
| **UNKNOWN** | Whether Shark PDPs expose purchase CTAs to non-bot clients |
