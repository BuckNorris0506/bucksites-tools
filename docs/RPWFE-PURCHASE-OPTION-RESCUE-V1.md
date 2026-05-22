# RPWFE Purchase-Option Rescue v1 (read-only proof lane)

**Status:** NOT EXECUTED — owner approval required before any CSV, Supabase, or production mutation.  
**Generated:** 2026-05-22 (read-only investigation)  
**Scale rule:** 1 product proves the loop → 5 proves repeatability → 20 proves batch safety → 100s only after 20 pass with low false-positive rate.

---

## 1. Current RPWFE state (repo truth)

| Claim | Value | Proof |
|-------|--------|--------|
| Live catalog row | Yes — `ge,rpwfe,RPWFE,GE RPWFE (RFID),6` | `data/filters.csv` line 41 |
| Alias | `rpwfe,RPWFE` | `data/filter_aliases.csv` line 73 |
| Compatibility mappings | **19** rows (`ge-*` fridge model slugs → `rpwfe`) | `data/compatibility_mappings.csv` (grep `,rpwfe$`) |
| Fridge models CSV | **0** rows for `rpwfe` | `data/fridge_models.csv` (no matches) |
| Retailer links | **1** row | `data/retailer_links.csv` line 41 |
| Current URL | `https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE` | `data/retailer_links.csv` |
| `retailer_key` | `oem-parts-catalog`, `is_primary: true` | `data/retailer_links.csv` |
| `browser_truth_*` | Empty (all columns blank) | `data/retailer_links.csv` |
| Factory classification | `publishable_no_buy_page`, priority score **550** | `scripts/report-large-batch-coverage-factory.ts` → `classify` in `src/lib/coverage/large-batch-coverage-factory-v1.ts` (live row + search-placeholder-only links, no gated buyable) |
| Public page path | `/filter/rpwfe` | `src/app/filter/[slug]/page.tsx` + `TrustAwareBuySection` (buy suppressed when no gated buyable links) |

### Why the current link fails gates

| Step | Result | Function / file |
|------|--------|-----------------|
| URL shape | Manufacturer catalog **search** (`search.jsp` + `searchKeyword=RPWFE`) | `isManufacturerSiteSearchUrl` in `src/lib/retailers/launch-buy-links.ts` |
| Placeholder | `isSearchPlaceholderBuyLink("oem-parts-catalog", url)` → **true** | `isSearchPlaceholderBuyLink` (OEM slot + manufacturer search) |
| Gate failure | `buyLinkGateFailureKind` → **`search_placeholder`** | `buyLinkGateFailureKind` in `launch-buy-links.ts` |
| Link state | **`BLOCKED_SEARCH_OR_DISCOVERY`** | `mapSignalsToRetailerLinkState` in `src/lib/retailers/retailer-link-state.ts` |
| PDP classifier | `looksLikeRetailerPdpUrlV1` → **false** (not `/parts/spec/`) | `batch-production-non-amazon-pdp-source-v1.ts` |

Ephemeral precheck (2026-05-22, no CSV edits):

```bash
npx tsx -e "
import { buyLinkGateFailureKind, isSearchPlaceholderBuyLink, isManufacturerSiteSearchUrl } from './src/lib/retailers/launch-buy-links.ts';
import { mapSignalsToRetailerLinkState } from './src/lib/retailers/retailer-link-state.ts';
const url = 'https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE';
const row = { retailer_key: 'oem-parts-catalog', affiliate_url: url, browser_truth_classification: null };
console.log({ isSearchPlaceholder: isSearchPlaceholderBuyLink(row.retailer_key, url), isManufacturerSearch: isManufacturerSiteSearchUrl(url), gate: buyLinkGateFailureKind(row), state: mapSignalsToRetailerLinkState({ gateFailureKind: buyLinkGateFailureKind(row) }) });
"
```

### Discovery (not in `retailer_links.csv`)

- Exa candidate (manufacturer official PDP): `https://www.geappliances.com/appliance/GE-RPWFE-REFRIGERATOR-WATER-FILTER-RPWFE` — `data/discovery/exa/fridge-water/runs/2026-05-21-first-run/candidates.json` (`rejection_flags`: `live_slug_exists`).
- Batch lane infers GE spec PDP: `https://www.geapplianceparts.com/store/parts/spec/RPWFE` — `inferGeAppliancePartsSpecUrlV1` in `src/lib/owner-dashboard/batch-production-non-amazon-pdp-source-v1.ts`; fixture in `batch-owner-review-report-v1.test.ts`.
- Owner batch registry: `approve_for_next_planning_only` for `rpwfe` — `data/owner-decisions/batch-non-amazon-pdp-owner-approval.json` (planning only, **not** production link approval).

---

## 2. Candidate URLs checked (browser / live fetch)

**Method (spec PDP):** **PROVEN** Playwright Chromium (2026-05-22) using the same heuristics as `scripts/verify-oem-retailer-links-playwright.ts` (`classify()`, Add-to-Cart control probe, `BuckPartsOEMBrowserTruth/1.0` UA). Run was **ephemeral** (`/tmp/bp-rpwfe-pw-verify/`) because `playwright` is **not** declared in repo `package.json` (see § Playwright tooling below).

**Playwright result (spec PDP, PROVEN):**

| Signal | Value |
|--------|--------|
| `final_url` | `https://www.geapplianceparts.com/store/parts/spec/RPWFE` (no search redirect) |
| `page_title` | `RPWFE \| GE® RPWFE™ REFRIGERATOR WATER FILTER \| GE Appliances Parts` |
| Visible purchase action | **`Add to Cart`** |
| Verifier `classification` | **`direct_buyable`** |
| `classifier_notes` | `visible purchase action: Add to Cart` |

**Third-party retailers (Home Depot, Lowe’s, Walmart, Amazon, AppliancePartsPros, RepairClinic, PartSelect):** **Not checked** — no exact PDP URLs exist in repo discovery artifacts for RPWFE; per BuckParts Truth Contract, URLs were **not invented**.

| URL | PDP vs search | Exact `RPWFE` on page | Product identity | Buy path | Ambiguity (XWFE/MWF/MWFP) |
|-----|---------------|----------------------|------------------|----------|---------------------------|
| Current CSV search | **Search** | Keyword only (SERP intent) | Not a single SKU PDP | No safe `/go` target | N/A (blocked before token risk) |
| `https://www.geapplianceparts.com/store/parts/spec/RPWFE` | **PDP** (`/parts/spec/`) — **PROVEN** | **Yes** — title, H1, SKU line `RPWFE` — **PROVEN** (Playwright) | GE® RPWFE™ refrigerator water filter — **PROVEN** | **Add to Cart** — **PROVEN** (Playwright) | Full-page scan finds `MWF` / `XWFE` / `MWFP` in site chrome or lower-page content only; **hero/price/CTA region is RPWFE**; related **RPWFE3PK** is explicit multipack sibling, not MWF substitution |
| `https://www.geappliances.com/appliance/GE-RPWFE-REFRIGERATOR-WATER-FILTER-RPWFE` | **PDP** (`/appliance/…RPWFE`) | **Yes** — `Model #: RPWFE`, product title (prior live fetch) | Same OEM filter | **Out of stock** online (prior fetch); no Add to Cart | Page is RPWFE-specific; not a generic category |

### Playwright tooling (repo truth)

| Item | Status |
|------|--------|
| `scripts/verify-oem-retailer-links-playwright.ts` | **PROVEN** — imports `playwright`; documented in `docs/buckparts-operating-map.md` |
| `package.json` / `devDependencies` | **PROVEN** — **no** `playwright` entry |
| `package-lock.json` | **PROVEN** — `@playwright/test` appears only as an **optional peer** of `next` (not installed) |
| In-repo command today | **FAILS** — `MODULE_NOT_FOUND` until dependency is added |

**Smallest durable fix (owner, not done here):** add `playwright` to `devDependencies`, run `npx playwright install chromium`, then:

```bash
npx tsx scripts/verify-oem-retailer-links-playwright.ts \
  --csv /path/to/rpwfe-candidate.csv --debug-buy-signals
```

---

## 3. Accepted / rejected purchase options

| Candidate | Verdict | Rationale |
|-----------|---------|-----------|
| GE Appliance Parts **search** (current CSV) | **REJECTED** (keep blocked) | `search_placeholder` gate; wrong-purchase risk if surfaced as buy CTA |
| GE Appliance Parts **spec PDP** | **ACCEPTED** (primary rescue target) | **PROVEN** Playwright `direct_buyable`; exact RPWFE PDP + Add to Cart; passes gates when `browser_truth_classification: direct_buyable` is set on insert |
| GE Appliances **official PDP** | **ACCEPTED** (secondary / non-buyable or deferred) | Exact token and official PDP; **no online Add to Cart** at fetch time → expect `likely_valid` not `direct_buyable` unless stock returns |

**Route order for `/filter/rpwfe` (when owner approves inserts):**

1. **Official GE** — GE Appliance Parts spec PDP (primary buy path); GE Appliances official PDP optional secondary.
2. **Compatible replacement** — Waterdrop WD-F19C only after visible PDP + gate proof (see § Waterdrop below); never labeled OEM/official.

---

## 3B. Waterdrop compatible-replacement lane (WD-F19C)

**Truth labels (required on any future customer-facing copy / retailer_name):**

- **Compatible replacement** — not official GE, not OEM.
- **Verify your refrigerator accepts RPWFE/RPWF chip-compatible replacements** before purchase.
- No guaranteed-fit language.

**Repo Waterdrop patterns (PROVEN):**

| Item | Proof |
|------|--------|
| `retailer_key` for Waterdrop DTC | **`waterdrop`** — `docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql`, `isWaterdropRetailerKey` in `waterdrop-exact-proof-slice-v1.ts` |
| `retailer_key` for Home Depot | **`home-depot`** — `retailer-normalization.ts` (`homedepot` → `home-depot`) |
| `retailer_key` for Amazon | **`amazon`** — `launch-buy-links.ts` |
| Committed proof slices | **`da29-00020b`, `lt800p` only** — `WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1`; **`rpwfe` is NOT in slice** |
| Operator Rakuten input | `data/waterdrop/operator-input/waterdrop-rakuten-links.v1.sample.json` only — **no RPWFE entry** |
| `data/retailer_links.csv` | **PROVEN** — no `waterdrop`, `home-depot`, or `amazon` row for `rpwfe` |
| Buyable subtype (compatible) | **`COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE`** — da29 insert plan; multipack uses **`MULTIPACK_DIRECT_BUYABLE`** for 2-pack SKUs |

**Browser method (2026-05-22):** Ephemeral Playwright (`/tmp/bp-rpwfe-waterdrop-verify/`) + fetch attempts. Home Depot and Amazon block headless automation; Waterdrop DTC canonical URLs redirect to category/404 in automation.

### Owner-supplied Waterdrop marketplace URLs checked

| # | URL | Page type | Visible RPWFE | Waterdrop / WD-F19C | Chip/RFID | Buy action | Verdict |
|---|-----|-----------|---------------|---------------------|-----------|------------|---------|
| 1 | [HD 1-pack](https://www.homedepot.com/p/Waterdrop-Refrigerator-Water-Filter-Replacement-WD-F19C-for-GE-RPWFE-RPWF-Built-In-CHIP-Compatible-with-GFE28GYNFS-1-Pack-BL-WD-F19C-1/329923038) | **INFERRED** PDP shape (`/p/…/329923038`) | **UNKNOWN** — bot error page | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** — no Add to Cart in automation | **REJECTED** for insert until human/browser-truth pass |
| 2 | [HD 2-pack](https://www.homedepot.com/p/Waterdrop-Refrigerator-Water-Filter-Replacement-for-GE-RPWFE-RPWF-Built-in-CHIP-RPWF-WSG-4-DWF-36-WF277-2-Pack-BL-WD-F19C-2/329922984) | **INFERRED** PDP shape | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** | **REJECTED** (multipack lane deferred) |
| 3 | [Amazon B0CCQYGLZM](https://www.amazon.com/Waterdrop-Replacement-Refrigerator-Compatible-GFE28GYNFS/dp/B0CCQYGLZM) | **INFERRED** PDP shape (`/dp/`) | **UNKNOWN** — interstitial only | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** | **REJECTED** until human capture; Amazon rescue is separate frozen lane |

**Automation detail (PROVEN failures):**

| Candidate | `final_url` | Playwright `classification` | Visible body |
|-----------|-------------|----------------------------|--------------|
| HD 1-pack | Same as input (no redirect) | `likely_valid` (no buy control) | Home Depot “Oops!! Something went wrong” |
| HD 2-pack | Same as input | `likely_valid` | Same error shell |
| Amazon | Same as input | `likely_valid` | “Click the button below to continue shopping” (bot wall) |

**INFERRED from URL slugs only (not sufficient for insert):** all three owner URLs encode **RPWFE**, **RPWF**, **WD-F19C**, and **Built-In-CHIP** in the path/title segment. Per BuckParts exact-token rule, **visible page proof is still required** — slug alone does not pass.

**Waterdrop DTC (not owner-listed; checked for operator pattern):**

| URL | Result |
|-----|--------|
| `https://waterdropfilter.com/products/replacement-for-ge-rpwfe-refrigerator-water-filter` | Redirects to **`/collections/refrigerator-filters`** category — **REJECTED** (not RPWFE PDP) |
| `https://www.waterdropfilter.com/collections/.../replacement-for-ge-rpwfe...` | **404 Not Found** in Playwright |

### Waterdrop accepted / rejected (insert authority)

| Option | Verdict |
|--------|---------|
| HD 1-pack Waterdrop WD-F19C | **REJECTED** — automation blocked; no visible RPWFE/Add to Cart proof |
| HD 2-pack Waterdrop WD-F19C | **REJECTED** — same; multipack subtype unproven |
| Amazon Waterdrop WD-F19C | **REJECTED** — bot wall; marketplace/seller ambiguity unverified |
| Waterdrop DTC + LinkSynergy (operator pattern) | **REJECTED** — no RPWFE row in `data/waterdrop/operator-input/`; no live PDP URL proven in automation |

### Waterdrop gate precheck (ephemeral rows; PROVEN 2026-05-22)

Assumes owner later sets `browser_truth_classification: direct_buyable` after human verification:

| Label | `retailer_key` | `gate` (with truth) | `state` | `passesDirectBuyableGate` | `isVerifiedWaterdropCompatibleDirectBuyable` | Notes |
|-------|----------------|---------------------|---------|---------------------------|---------------------------------------------|-------|
| `hd_1pack_buyable` | `home-depot` | null | `LIVE_DIRECT_BUYABLE` | true | false | Not Waterdrop key; subtype `COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE` if 1-pack |
| `hd_2pack_buyable` | `home-depot` | null | `LIVE_DIRECT_BUYABLE` | true | false | Prefer `MULTIPACK_DIRECT_BUYABLE` if 2-pack listing |
| `amazon_buyable` | `amazon` | null | `LIVE_DIRECT_BUYABLE` | true | false | Amazon ranking/gates separate from Waterdrop slice |
| `waterdrop_dtc_buyable` | `waterdrop` | null | `LIVE_DIRECT_BUYABLE` | true | true | **`rpwfe` not in `WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1`** — no Waterdrop-first ranking boost until slice + evidence extended |

Without `browser_truth_classification`, all rows → **`missing_browser_truth`** / **`BLOCKED_BROWSER_TRUTH_MISSING`**.

```bash
npx tsx -e "
import { buyLinkGateFailureKind, passesDirectBuyableGate } from './src/lib/retailers/launch-buy-links.ts';
import { mapSignalsToRetailerLinkState } from './src/lib/retailers/retailer-link-state.ts';
import { isVerifiedWaterdropCompatibleDirectBuyable, isWaterdropExactProofSliceSlug } from './src/lib/retailers/waterdrop-exact-proof-slice-v1.ts';
const hd='https://www.homedepot.com/p/Waterdrop-Refrigerator-Water-Filter-Replacement-WD-F19C-for-GE-RPWFE-RPWF-Built-In-CHIP-Compatible-with-GFE28GYNFS-1-Pack-BL-WD-F19C-1/329923038';
const row={retailer_key:'home-depot',affiliate_url:hd,browser_truth_classification:'direct_buyable',browser_truth_buyable_subtype:'COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE'};
console.log({gate:buyLinkGateFailureKind(row),state:mapSignalsToRetailerLinkState({gateFailureKind:buyLinkGateFailureKind(row),browserTruthClassification:row.browser_truth_classification}),slice:isWaterdropExactProofSliceSlug('rpwfe')});
"
```

### Proposed Waterdrop insert shape (NOT EXECUTED — only if human browser proof passes)

**Do not run until:** visible **RPWFE** on PDP, Add to Cart (or documented out-of-stock with reason), and owner approval.

**Example — Home Depot compatible row (second slot, not primary):**

```csv
rpwfe,Home Depot — Waterdrop compatible (RPWFE),<HD_AFFILIATE_OR_DESTINATION_URL>,false,1,home-depot,direct_buyable,Human browser: RPWFE WD-F19C compatible replacement; not official GE,<ISO8601>
```

`browser_truth_buyable_subtype`: `COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE` (1-pack) or `MULTIPACK_DIRECT_BUYABLE` (2-pack).

**Example — Waterdrop DTC (only if Rakuten LinkSynergy URL exists in operator input + PDP proof):**

Mirror `docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql`: `retailer_key=waterdrop`, `is_primary=false`, subtype `COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE`, notes must state **compatible replacement / not official GE**.

**Customer copy (doctrine-aligned):** use “compatible replacement filter” per `customer-language-doctrine.ts`; never “OEM” for Waterdrop.

---

## 4. Gate proof (in-memory, proposed rows — official GE)

Precheck command (read-only):

```bash
npx tsx -e "
import { buyLinkGateFailureKind, isSearchPlaceholderBuyLink, passesDirectBuyableGate } from './src/lib/retailers/launch-buy-links.ts';
import { mapSignalsToRetailerLinkState } from './src/lib/retailers/retailer-link-state.ts';
import { looksLikeRetailerPdpUrlV1 } from './src/lib/owner-dashboard/batch-production-non-amazon-pdp-source-v1.ts';
const rows = [
  { label: 'current_search', retailer_key: 'oem-parts-catalog', affiliate_url: 'https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE', browser_truth_classification: null },
  { label: 'spec_pdp', retailer_key: 'oem-parts-catalog', affiliate_url: 'https://www.geapplianceparts.com/store/parts/spec/RPWFE', browser_truth_classification: null },
  { label: 'spec_pdp_buyable', retailer_key: 'oem-parts-catalog', affiliate_url: 'https://www.geapplianceparts.com/store/parts/spec/RPWFE', browser_truth_classification: 'direct_buyable' },
  { label: 'ge_official', retailer_key: 'oem-catalog', affiliate_url: 'https://www.geappliances.com/appliance/GE-RPWFE-REFRIGERATOR-WATER-FILTER-RPWFE', browser_truth_classification: null },
  { label: 'ge_official_buyable', retailer_key: 'oem-catalog', affiliate_url: 'https://www.geappliances.com/appliance/GE-RPWFE-REFRIGERATOR-WATER-FILTER-RPWFE', browser_truth_classification: 'direct_buyable' },
];
for (const r of rows) {
  const gate = buyLinkGateFailureKind(r);
  console.log(JSON.stringify({ label: r.label, looks_like_pdp: looksLikeRetailerPdpUrlV1(r.affiliate_url, r.retailer_key), is_search_placeholder: isSearchPlaceholderBuyLink(r.retailer_key, r.affiliate_url), gate, state: mapSignalsToRetailerLinkState({ gateFailureKind: gate, browserTruthClassification: r.browser_truth_classification }), passes_buy: passesDirectBuyableGate({ browser_truth_classification: r.browser_truth_classification }) }));
}
"
```

**Results (PROVEN 2026-05-22):**

| Proposed row | `looksLikeRetailerPdpUrlV1` | `buyLinkGateFailureKind` (no browser truth) | With `direct_buyable` truth | Expected live buy CTA |
|--------------|----------------------------|-----------------------------------------------|----------------------------|------------------------|
| Current search | false | `search_placeholder` | — | **blocked** |
| Spec PDP (`oem-parts-catalog`) | true | `missing_browser_truth` | gate **null**, state **`LIVE_DIRECT_BUYABLE`** | **blocked until truth filled** |
| GE official (`oem-catalog`) | false | `missing_browser_truth` | gate **null**, state **`LIVE_DIRECT_BUYABLE`** | **blocked until truth filled**; live fetch suggests **`likely_valid`** not buyable until stock |

**Recommended `browser_truth_classification`:**

| URL | Recommendation | Notes |
|-----|----------------|-------|
| Spec PDP | **`direct_buyable`** — **PROVEN** (Playwright 2026-05-22) | `Add to Cart` visible; verifier classification `direct_buyable` |
| GE official | `likely_valid` (INFERRED) | Out of stock; no purchase action in prior live fetch (Playwright not re-run this pass) |

Unique index reminder: `retailer_links_filter_retailer_key_unique` on `(filter_id, retailer_key)` — `supabase/schema.sql`. Only one row per `retailer_key` per filter.

---

## 5. Insert plan (NOT EXECUTED)

### Option A — **Recommended:** replace URL on existing primary row

Update the existing `oem-parts-catalog` row (same `retailer_key`, no duplicate-key conflict):

**CSV shape** (`data/retailer_links.csv` — owner edit only):

```csv
rpwfe,OEM parts catalog (GE spec PDP),https://www.geapplianceparts.com/store/parts/spec/RPWFE,true,0,oem-parts-catalog,direct_buyable,Playwright: Add to Cart; exact RPWFE spec PDP,<ISO8601>
```

**Supabase shape** (after prechecks; mirror `docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql` pattern):

```sql
-- Precheck: filter exists
select id, slug, oem_part_number from public.filters where slug = 'rpwfe';

-- Precheck: current row
select id, retailer_key, affiliate_url, browser_truth_classification
from public.retailer_links rl
join public.filters f on f.id = rl.filter_id
where f.slug = 'rpwfe';

-- Owner-approved UPDATE (not run by automation):
-- update public.retailer_links
-- set affiliate_url = 'https://www.geapplianceparts.com/store/parts/spec/RPWFE',
--     retailer_name = 'GE Appliance Parts (spec PDP)',
--     browser_truth_classification = 'direct_buyable',
--     browser_truth_notes = 'Playwright OEM verify: RPWFE spec PDP, Add to Cart',
--     browser_truth_checked_at = now()
-- where filter_id = (select id from public.filters where slug = 'rpwfe')
--   and retailer_key = 'oem-parts-catalog';
```

### Option B — secondary official OEM row (optional)

Add **`oem-catalog`** row pointing at GE Appliances official PDP only if owner accepts **non-buyable** or **likely_valid** CTA policy (out of stock at 2026-05-22 fetch).

### Option C — separate `ge-appliance-parts` key

Tests use `ge-appliance-parts` for GE spec PDPs (`launch-buy-links.test.ts`). Allowed by unique index but **not** in `OEM_CATALOG_SLOT_KEYS` — does not auto-flag manufacturer search placeholders. Owner choice if slot naming should align with MWF policy tests.

### Rollback

1. Restore `affiliate_url` to search URL **only** if reverting intentionally (will re-block buy).
2. Clear or set `browser_truth_classification` to empty → returns to `missing_browser_truth` / no buy CTA.
3. Re-run factory: `npx tsx scripts/report-large-batch-coverage-factory.ts | node -e "..."` — expect `publishable_no_buy_page` again if no gated buyable links.

### Validation commands (post-approval only)

```bash
# Data guard (must stay empty before/after unless owner edits)
git diff -- data/filters.csv data/filter_aliases.csv data/compatibility_mappings.csv \
  data/fridge_models.csv data/retailer_links.csv data/evidence data/discovery

# Browser truth (requires devDependency playwright + chromium)
npx tsx scripts/verify-oem-retailer-links-playwright.ts \
  --csv /tmp/rpwfe-spec-pdp-verify.csv --debug-buy-signals

# Factory + coverage
npx tsx scripts/report-large-batch-coverage-factory.ts
npm run buckparts:prioritize:coverage -- --source csv

# Gate unit tests (unchanged logic)
npx tsx --test src/lib/retailers/launch-buy-links.test.ts
```

---

## 6. What this proves for 5 / 20 / 100

| Scale | Meaning for this lane |
|-------|------------------------|
| **1 (RPWFE)** | End-to-end proof: repo state → official GE spec PDP Playwright proof → Waterdrop marketplace **attempt** (blocked automation) → gate precheck → doc → owner-only mutation. |
| **5** | Repeat loop per slug; each slug may use **two-route pattern**: (1) official manufacturer/OEM catalog PDP, (2) compatible replacement (e.g. Waterdrop) **only after** visible token + buy proof — **not** after URL-slug inference alone. |
| **20** | Batch safety: both routes must pass browser truth with low false positives; extend `WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1` + evidence JSON per slug before Waterdrop-first ranking. |
| **100s** | Future goal only after 20 slugs pass; do not bulk-insert search placeholders or marketplace URLs blocked by bot walls. |

**Two-route page pattern (INFERRED product design):** RPWFE can show **official GE buy path first**, then **Waterdrop compatible replacement second** with explicit not-official-GE labeling — repeat at **5 slugs** only after Waterdrop route passes human or in-repo Playwright proof.

---

## 7. PROVEN / INFERRED / UNKNOWN

| Topic | Label |
|-------|--------|
| RPWFE live in `filters.csv`, 19 compat rows, 1 search retailer link | **PROVEN** |
| Current link = `search_placeholder` → `BLOCKED_SEARCH_OR_DISCOVERY` | **PROVEN** (helpers above) |
| Factory `publishable_no_buy_page` for live RPWFE cohort | **PROVEN** (factory script logic + live row signals) |
| Spec PDP shows RPWFE + Add to Cart | **PROVEN** (Playwright 2026-05-22) |
| Spec PDP verifier classification `direct_buyable` | **PROVEN** (Playwright; matches `verify-oem-retailer-links-playwright.ts` heuristics) |
| GE official PDP shows RPWFE, out of stock online | **PROVEN** (prior live fetch; Playwright not re-run) |
| GE official → `likely_valid` not buyable today | **INFERRED** |
| In-repo `verify-oem-retailer-links-playwright.ts` runs without `npm install playwright` | **PROVEN** fails today (`MODULE_NOT_FOUND`) |
| HD / Amazon Waterdrop URLs show visible RPWFE + Add to Cart | **UNKNOWN** — automation blocked (403/error/interstitial) |
| URL slug encodes RPWFE/WD-F19C/CHIP on HD URLs | **INFERRED** — not visible-page proof |
| `rpwfe` in `WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1` | **PROVEN false** — no Waterdrop-first boost until slice extended |
| Waterdrop DTC RPWFE PDP live at canonical paths | **PROVEN false** in automation (redirect/404) |
| Production `/filter/rpwfe` shows buy after insert | **UNKNOWN** until owner mutates + deploy |
| Production two-route (GE + Waterdrop) | **UNKNOWN** until both routes inserted + labeled |

---

## 8. Explicit non-actions (this task)

- No edits to `data/*.csv`, `data/evidence/*`, `data/discovery/*`, Supabase, migrations, or buy-gate logic.
- No commit.
- Insert plan SQL/CSV above is **documentation only**.
