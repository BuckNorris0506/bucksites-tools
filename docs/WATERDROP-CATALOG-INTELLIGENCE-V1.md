# Waterdrop Catalog Intelligence v1 (read-only system design)

**Status:** PLANNING ONLY — no production mutation, no `retailer_links` inserts, no Supabase writes.  
**Contract version:** `waterdrop_catalog_intelligence_v1`  
**Generated:** 2026-05-22  

**Purpose:** BuckParts must **systematically** know which Waterdrop products map to which live filter slugs. Jared should not manually hunt Waterdrop SKUs one by one. **Rakuten ProductSearch is one source, not the full Waterdrop catalog.**

---

## 0. Design correction (why this doc exists)

| Prior assumption (wrong) | Corrected design |
|--------------------------|------------------|
| Local Rakuten snapshot ≈ full Waterdrop catalog | Rakuten is **Source A only** — affiliate subset |
| Missing RPWFE in feed = no Waterdrop for RPWFE | RPWFE WD-F19C exists on **retailer PDPs** and likely DTC; absent from Rakuten snapshot |
| One operator JSON file powers factory | **Multi-source merge** → unified intelligence report → review queue |

**PROVEN (read-only 2026-05-22):**

- `data/waterdrop/operator-input/local/waterdrop-rakuten-productsearch.v1.json` — **141** products, **3** unique live slug matches (`ukf8001`, `da29-00020b`, `lt800p`).
- **0** entries for `RPWFE`, `RPWF`, `WD-F19`, `F19C` in that snapshot (JSON + XML).
- Factory `loadWaterdropCandidatesBySlug` reads only `data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json` — `src/lib/coverage/large-batch-coverage-factory-v1.ts` L320–326.

---

## 1. Current repo Waterdrop / Rakuten state (PROVEN)

### 1.1 Data paths

| Path | Tracked | Role |
|------|---------|------|
| `data/waterdrop/README.md` | Yes | Operator input contract |
| `data/waterdrop/operator-input/waterdrop-rakuten-links.v1.sample.json` | Yes | Sample (1 DA29 row) |
| `data/waterdrop/fixtures/da29-00020b-linksynergy-anchor.html` | Yes | HTML parse fixture |
| `data/waterdrop/operator-input/local/` | **No** (`.gitignore:61`) | Full Rakuten ProductSearch JSON/XML |
| `data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json` | **No** (`.gitignore:62`) | Manual link export (often 1 row locally) |
| `data/waterdrop/operator-input/local/waterdrop-rakuten-productsearch.v1.json` | Ignored | **141** Rakuten API rows (local) |
| `data/waterdrop/operator-input/local/rakuten-waterdrop-productsearch-all.xml` | Ignored | Same **141** products (XML) |
| `data/retailer_links.csv` | Yes | **No** `waterdrop` row for `rpwfe` |

### 1.2 Parser / report scripts

| Artifact | Path |
|----------|------|
| LinkSynergy parse + token infer | `src/lib/retailers/waterdrop-linksynergy-parse-v1.ts` — `inferTokenCandidatesFromWaterdropText`, `parseLinkSynergyAffiliateUrl` |
| Operator input contract | `src/lib/retailers/waterdrop-operator-input-v1.ts` — `waterdrop_rakuten_operator_input_v1` |
| Slug index + exact match | `src/lib/retailers/buckparts-fridge-filter-index-v1.ts` — `matchInferredTokensToBuckpartsSlug` |
| Proof-slice candidate rank | `src/lib/retailers/waterdrop-proof-slice-candidate-v1.ts` |
| CLI report | `scripts/report-waterdrop-proof-slice-candidates.ts` |
| npm alias | `npm run buckparts:waterdrop-proof-slice-candidates` |

### 1.3 Proof slice + buy ranking (PROVEN)

| Item | Value | Proof |
|------|--------|--------|
| Live proof slices | `da29-00020b`, `lt800p` | `WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1` — `waterdrop-exact-proof-slice-v1.ts` |
| `rpwfe` in proof slice | **No** | Same file |
| Waterdrop retailer_key | `waterdrop` | `isWaterdropRetailerKey` |
| Ranking boost | Waterdrop-first **only** on committed proof slices | `waterdropExactProofPrimaryBoost` — `launch-buy-links.ts` L521–522 |
| Compatible subtype | `COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE` | `launch-buy-links.ts` `BUYABLE_SUBTYPES`; da29 insert plan |

**Policy:** Waterdrop must **not** outrank official manufacturer/OEM routes unless product policy explicitly allows it. Today boost applies only on **proof-slice slugs** with verified `waterdrop` + `direct_buyable` rows — not on marketplace `home-depot` / `amazon` keys.

### 1.4 Factory hook limitation (PROVEN)

`loadWaterdropCandidatesBySlug` in `large-batch-coverage-factory-v1.ts`:

- Resolves **only** `data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json` (or operator override).
- Does **not** read `operator-input/local/waterdrop-rakuten-productsearch.v1.json`.
- Sets `publishable_waterdrop_candidate` when operator match recommends browser proof — still **UNKNOWN** production snapshot in CSV-only runs.

**Result:** Factory Waterdrop signal can be **EMPTY/UNKNOWN** in CI while local disk has 141 Rakuten products — **catalog intelligence is disconnected from factory.**

### 1.5 Docs / evidence (committed patterns)

- `docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql` — LinkSynergy + `retailer_key=waterdrop`
- `docs/waterdrop-lt800p-retailer-link-insert-plan.sql`
- `data/evidence/waterdrop-*-owner-browser-proof*.json` — browser proof artifacts
- `docs/RPWFE-PURCHASE-OPTION-RESCUE-V1.md` — GE primary + Waterdrop secondary (uncommitted working doc)

---

## 2. Multi-source Waterdrop lane

```text
┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────────┐
│ A. Rakuten          │  │ B. Waterdrop DTC    │  │ C. Retailer PDP          │
│ ProductSearch       │  │ catalog / sitemap   │  │ discovery (HD/Lowe’s/    │
│ (LinkSynergy)       │  │                     │  │ BBY/Amazon)              │
└─────────┬───────────┘  └─────────┬───────────┘  └────────────┬─────────────┘
          │                        │                            │
          └────────────────────────┼────────────────────────────┘
                                   ▼
              ┌────────────────────────────────────────┐
              │ Normalize → WaterdropProductRecord v1   │
              │ Exact-token map → BuckParts slug        │
              │ Dedupe by (slug, waterdrop_sku, source) │
              └────────────────────┬───────────────────┘
                                   ▼
              ┌────────────────────────────────────────┐
              │ data/waterdrop/reports/                 │
              │   waterdrop-catalog-intelligence-v1.json│
              │ (read-only, gitignored reports OK)        │
              └────────────────────┬───────────────────┘
                                   ▼
              Review queue → owner browser proof → evidence JSON
              → optional retailer_links insert (manual, gated)
```

### Source A — Rakuten / ProductSearch affiliate feed

| Dimension | Definition |
|-----------|------------|
| **What it can prove** | LinkSynergy **affiliate_url** + **destination PDP** on `waterdropfilter.com`; Rakuten `visible_title`; stable `linkid` / `sku` metadata; exact OEM tokens in title/URL when present |
| **What it cannot prove** | Full Waterdrop SKU catalog; marketplace listings (HD, Amazon); products not in MID **53950** export; live price/stock; visible page text without browser pass |
| **Required fields** | `source=rakuten_productsearch`, `entry_id`, `affiliate_url`, `destination_pdp_url`, `visible_title`, `metadata.sku`, `metadata.linkid` |
| **Proof level** | `AFFILIATE_METADATA` — strong for DTC PDP path + token infer; **not** `BROWSER_VERIFIED` until Playwright |
| **Exact-token rule** | `inferTokenCandidatesFromWaterdropText` → `matchInferredTokensToBuckpartsSlug` — **no fuzzy** |
| **Buyer-path** | Affiliate click URL required for `retailer_key=waterdrop` insert; browser_truth on **destination** PDP |
| **Affiliate status** | **PROVEN** when `click.linksynergy.com/link` + `murl=` |
| **Failure modes** | Stale export; incomplete MID catalog (**141 ≠ full Waterdrop**); missing GE RPWFE rows (**PROVEN_ABSENT** in local snapshot) |

**Input files (local, gitignored):**

- `data/waterdrop/operator-input/local/waterdrop-rakuten-productsearch.v1.json`
- `data/waterdrop/operator-input/local/rakuten-waterdrop-productsearch-all.xml` (normalize to same contract)

### Source B — Waterdrop DTC catalog / sitemap

| Dimension | Definition |
|-----------|------------|
| **What it can prove** | Canonical Waterdrop **product identity** (SKU in title/URL); compatible OEM tokens in PDP copy; variant URLs; pack listings on `waterdropfilter.com` |
| **What it cannot prove** | Rakuten commission link without separate LinkSynergy join; marketplace seller identity; affiliate tracking |
| **Required fields** | `source=waterdrop_dtc_catalog`, `waterdrop_sku`, `destination_pdp_url`, `visible_title`, `description_excerpt`, `pack_count`, `collection_path` |
| **Proof level** | `DTC_CATALOG_TEXT` — needs **browser verification** before buy CTA |
| **Exact-token rule** | Same token regex as `PATH_TOKEN_RE` in `waterdrop-linksynergy-parse-v1.ts`; title + URL + body excerpt |
| **Buyer-path** | Requires LinkSynergy match **or** policy decision for non-affiliate DTC (currently inserts use affiliate — see da29 plan) |
| **Affiliate status** | **UNKNOWN** until joined to Rakuten row by `destination_pdp_url` or variant id |
| **Failure modes** | Redirect to category page; 404 product URLs; SEO slug changes; multipack vs single-unit ambiguity |

**Ingest methods (planned):**

- Shopify sitemap / products JSON (if operator provides export)
- Crawl `waterdropfilter.com` product URLs under `/products/` (read-only, rate-limited)
- Merge with Source A on normalized `destination_pdp_url` or `waterdrop_sku`

### Source C — Retailer PDP discovery (Waterdrop-branded listings)

| Retailer | `retailer_key` (repo) | Notes |
|----------|----------------------|--------|
| Home Depot | `home-depot` | `retailer-normalization.ts` |
| Lowe’s | `lowes` | Same |
| Best Buy | **Not in `CANONICAL_RETAILER_KEYS`** | Extend normalization before inserts |
| Amazon | `amazon` | Marketplace caution — ASIN/seller ambiguity |

| Dimension | Definition |
|-----------|------------|
| **What it can prove** | Marketplace **PDP URL** for Waterdrop-branded SKU; visible **RPWFE/RPWF** in title/specs when browser succeeds |
| **What it cannot prove** | LinkSynergy affiliate (unless separate program); long-term stock; third-party seller vs Waterdrop official on Amazon |
| **Required fields** | `source=retailer_pdp_discovery`, `retailer_key`, `marketplace_pdp_url`, `visible_title`, `waterdrop_sku` (from title), `compatible_oem_tokens[]`, `browser_truth_classification`, `proof_notes` |
| **Proof level** | `RETAILER_PDP_BROWSER` required before insert — automation often **blocked** (HD 403, Amazon interstitial) |
| **Exact-token rule** | Visible body must contain **\bRPWFE\b** or **\bRPWF\b** (policy: both acceptable for chip family); **\bWD-F19C\b** or documented SKU; reject if primary product is XWFE/MWF/MWFP |
| **Buyer-path** | `direct_buyable` or `likely_valid` per `verify-oem-retailer-links-playwright.ts` heuristics; **no `/go`** without gates |
| **Affiliate status** | **Usually none** in-repo — destination URL only unless FlexOffers/Amazon affiliate added later |
| **Failure modes** | Bot walls; search/category misclassification; multipack listing; wrong GE filter family |

**RPWFE example URLs (owner-supplied, external — not in Rakuten snapshot):**

- Home Depot 1-pack / 2-pack WD-F19C (paths include `RPWFE`, `RPWF`, `Built-In-CHIP`)
- Amazon `B0CCQYGLZM` — needs human or hardened browser proof

**Policy:** Source C rows use **`home-depot` / `lowes` / `amazon`** — **not** `retailer_key=waterdrop` unless LinkSynergy URL exists.

---

## 3. Waterdrop product identity model

### 3.1 Record contract: `WaterdropProductRecordV1`

```typescript
// Planning types only — implement in report script module when built.

type WaterdropCatalogSourceV1 =
  | "rakuten_productsearch"
  | "waterdrop_dtc_catalog"
  | "retailer_pdp_discovery";

type WaterdropProofLevelV1 =
  | "AFFILIATE_METADATA"      // Source A: LinkSynergy + title/URL tokens
  | "DTC_CATALOG_TEXT"        // Source B: sitemap/crawl text
  | "RETAILER_PDP_BROWSER"    // Source C: Playwright/fetch body proof
  | "BROWSER_VERIFIED"        // Passed verify-oem heuristics
  | "BLOCKED";                // Bot wall, wrong page type, failed token gate

type WaterdropProductRecordV1 = {
  record_id: string;                    // stable: source + source_native_id
  source: WaterdropCatalogSourceV1;
  source_native_id: string;             // rakuten linkid, shopify variant, retailer SKU

  waterdrop_sku: string | null;         // WD-F19C, WD-DA2900020B, F19C-2, WDP-F27, …
  pack_count: number | null;            // 1, 2, 3 — infer from title "2-Pack", "3 Pack"
  compatible_oem_tokens: string[];      // RPWFE, RPWF, DA29-00020B, …

  visible_title: string | null;
  destination_pdp_url: string | null;   // waterdropfilter.com or retailer URL
  affiliate_url: string | null;         // LinkSynergy click when present

  retailer_key: string | null;          // waterdrop | home-depot | lowes | amazon | null
  route_label: "Compatible replacement";
  is_official_oem: false;               // MUST default false; true only with explicit counter-proof

  proof_level: WaterdropProofLevelV1;
  proof_sources: WaterdropCatalogSourceV1[];  // after merge/dedupe
  proof_notes: string[];

  wedge: "refrigerator_water" | "air_purifier" | "other" | "unknown";
};
```

### 3.2 SKU normalization rules

| Pattern | Normalized `waterdrop_sku` |
|---------|---------------------------|
| `WD-F19C`, `WD F19C`, `BL-WD-F19C-1` | `WD-F19C` (strip pack suffix to separate field) |
| `F19C-2`, `WD-F19C-2` | SKU `WD-F19C`, `pack_count=2` |
| `WDP-F27`, `WD-DA2900020B` | preserve as-is |

**Do not** collapse distinct Waterdrop SKUs that map to different OEM tokens.

### 3.3 OEM token extraction

Reuse **`PATH_TOKEN_RE`** and **`compactPartTokenKey`** from `waterdrop-linksynergy-parse-v1.ts` — includes `rpwfe`, `xwfe`, `mwf`, etc.

**Reject** mapping when:

- Only family words (“GE filter”, “refrigerator water filter”) without exact token
- Token appears only in “replaces MWF, MWFP, …” cross-sell list without primary SKU focus
- Competing primary token on PDP (e.g. page is XWFE product but RPWFE in related items only)

---

## 4. Mapping rules → BuckParts

### 4.1 Index (PROVEN)

- `data/filters.csv` — live slugs + `oem_part_number`
- `data/filter_aliases.csv` — alias → slug

Loader: `loadBuckpartsFridgeFilterIndexFromRepo` — `buckparts-fridge-filter-index-v1.ts`

### 4.2 Match rules (strict)

| Step | Rule | Confidence |
|------|------|------------|
| 1 | `compactPartTokenKey(token)` hit on OEM part number | `EXACT_OEM_PART_NUMBER` |
| 2 | Same key hit on alias row | `ALIAS_TOKEN` |
| 3 | Slug string match in inferred tokens | `URL_OR_TITLE_INFERRED` |
| — | Anything else | **NO_MATCH** → backlog only |

**Forbidden:**

- Fuzzy string match
- Brand-family-only (“GE refrigerator filter”)
- Compatibility chart without exact token in product scope
- Mapping RPWFE from XWFE/MWF page primary identity

### 4.3 Outputs

| Output | When |
|--------|------|
| **`review_candidate`** | Live slug + exact/alias match + PDP proof level ≥ threshold |
| **`backlog_candidate`** | Matched token but **no** `filters.csv` row — do not touch `retailer_links` |
| **`rejected`** | Failed token gate, wrong wedge, or ambiguous family |

### 4.4 Merge across sources

For same `buckparts_slug` + same `waterdrop_sku`:

1. Prefer row with **`affiliate_url`** (Rakuten) for `retailer_key=waterdrop` insert planning  
2. Prefer higher **`proof_level`** (`BROWSER_VERIFIED` > `RETAILER_PDP_BROWSER` > `AFFILIATE_METADATA`)  
3. Keep parallel **retailer PDP** rows under `home-depot` / `amazon` as separate review candidates (second buy route)

**Never auto-insert.** Report → owner → evidence JSON → manual SQL.

---

## 5. RPWFE example (two-route page)

### 5.1 Official route (primary)

| Field | Value |
|-------|--------|
| Route | **Official GE** |
| URL | `https://www.geapplianceparts.com/store/parts/spec/RPWFE` |
| `retailer_key` | `oem-parts-catalog` (update existing row) |
| Proof | **PROVEN** Playwright `direct_buyable` — see `docs/RPWFE-PURCHASE-OPTION-RESCUE-V1.md` |
| Ranking | **Always primary** on `/filter/rpwfe` — manufacturer/OEM policy |

### 5.2 Compatible replacement route (secondary)

| Field | Value |
|-------|--------|
| Product | Waterdrop **WD-F19C** (GE RPWFE/RPWF chip-compatible) |
| `route_label` | Compatible replacement |
| `is_official_oem` | **false** |

**Source status:**

| Source | Status | Detail |
|--------|--------|--------|
| Rakuten snapshot | **PROVEN_ABSENT** | 141 products; 0× RPWFE/RPWF/WD-F19C/F19C |
| Waterdrop DTC | **UNKNOWN** | Canonical product URLs redirect/404 in automation; needs sitemap ingest |
| Retailer PDP (HD, Lowe’s, Best Buy, Amazon) | **PROVEN_EXISTS** (external) | Owner URLs + web results; **needs BuckParts browser proof** — HD/Amazon blocked headless in prior pass |

**Customer-facing labels (required):**

- Compatible replacement  
- Not official GE  
- Verify your refrigerator accepts RPWFE/RPWF chip-compatible replacements  
- No guaranteed-fit language  

**Gate before any `retailer_links` row:**

- Visible **RPWFE** and/or **RPWF** (chip family) on PDP body — not URL slug alone  
- Visible **WD-F19C** (or documented Waterdrop SKU)  
- Built-in chip / RFID language where applicable  
- `browser_truth_classification`: `direct_buyable` preferred; `likely_valid` only with documented out-of-stock policy  
- `browser_truth_buyable_subtype`: `COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE` (1-pack) or `MULTIPACK_DIRECT_BUYABLE` (2-pack)  
- **Reject** if primary listing is XWFE, MWF, MWFP  

**`retailer_key` planning:**

- `home-depot` / `lowes` / `amazon` for marketplace PDPs  
- `waterdrop` only when LinkSynergy affiliate + DTC PDP joined  

**Proof slice:** `rpwfe` ∉ `WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1` today — Waterdrop-first ranking **off** until slice + evidence extended.

---

## 6. Intelligence report artifact (planned)

**Path:** `data/waterdrop/reports/waterdrop-catalog-intelligence-v1.json`  
**Recommend:** add `data/waterdrop/reports/` to `.gitignore` (operator-local aggregates).

```json
{
  "contract": "waterdrop_catalog_intelligence_v1",
  "read_only": true,
  "generated_at": "<ISO8601>",
  "sources": {
    "rakuten_productsearch": { "path": "...", "entry_count": 141, "status": "PROVEN" },
    "waterdrop_dtc_catalog": { "path": null, "entry_count": 0, "status": "NOT_INGESTED" },
    "retailer_pdp_discovery": { "entry_count": 0, "status": "NOT_INGESTED" }
  },
  "inventory": {
    "total_records": 0,
    "mapped_to_live_slug": 0,
    "unmapped": 0,
    "backlog": 0
  },
  "by_slug": {},
  "review_queue": [],
  "rpwfe_status": {
    "rakuten": "PROVEN_ABSENT",
    "dtc": "UNKNOWN",
    "retailer_pdp": "PENDING_BROWSER_PROOF"
  },
  "notes": []
}
```

---

## 7. Smallest implementation slice (next code — NOT in this task)

### 7.1 Script

**`scripts/report-waterdrop-catalog-intelligence-v1.ts`**

- Read-only CLI; stdout JSON + optional `--out` path  
- npm: `buckparts:waterdrop-catalog-map`

### 7.2 Source adapters

| Adapter | Module | Input |
|---------|--------|--------|
| `rakuten_productsearch` | `adapters/rakuten-productsearch-v1.ts` | `operator-input/local/waterdrop-rakuten-productsearch.v1.json` or XML → normalize to operator contract |
| `waterdrop_dtc_catalog` | `adapters/waterdrop-dtc-catalog-v1.ts` | sitemap/export path (TBD); stub returns `NOT_INGESTED` until operator provides file |
| `retailer_pdp_discovery` | `adapters/retailer-pdp-discovery-v1.ts` | `data/waterdrop/operator-input/retailer-pdp-candidates.v1.json` (new, gitignored) — owner-approved URLs only |

### 7.3 Core library (reuse, do not fork gates)

- `waterdrop-operator-input-v1.ts` — Rakuten entries  
- `waterdrop-linksynergy-parse-v1.ts` — tokens  
- `buckparts-fridge-filter-index-v1.ts` — slug match  
- `waterdrop-proof-slice-candidate-v1.ts` — ranking hints (optional)

### 7.4 Tests — `scripts/report-waterdrop-catalog-intelligence-v1.test.ts`

| Fixture case | Expect |
|--------------|--------|
| Rakuten positive | `da29-00020b`, `lt800p`, `ukf8001` map with `EXACT_OEM_PART_NUMBER` |
| Rakuten negative | No record with primary token `RPWFE` for slug `rpwfe` |
| Retailer PDP positive | Waterdrop WD-F19C + visible RPWFE → `rpwfe`, `home-depot` or `amazon`, `RETAILER_PDP_BROWSER` |
| Wrong-match negative | PDP primary XWFE with RPWFE only in “related” → **rejected** / no `rpwfe` map |
| Merge | Rakuten + retailer PDP for same slug produces two review rows (waterdrop affiliate vs marketplace) |

### 7.5 Factory / Command Center plug-in (follow-on)

- Replace `loadWaterdropCandidatesBySlug` single-file resolve with **`resolveWaterdropCatalogInputs()`** reading intelligence report or Rakuten JSON path from config  
- Surface `waterdrop_catalog.rpwfe_status` + `review_queue.length` in command center read model — read-only

### 7.6 Explicit non-goals (v1)

- No `retailer_links.csv` writes  
- No Supabase writes  
- No buy-gate changes  
- No automatic HD/Amazon URL invention (operator seeds `retailer-pdp-candidates.v1.json`)  
- No Waterdrop ranking above GE on `rpwfe` without policy + proof slice update  

---

## 8. Scale rule (unchanged)

| Scale | Meaning |
|-------|---------|
| **1** | RPWFE two-route proof (GE spec + Waterdrop WD-F19C sources) |
| **5** | Repeat intelligence report + browser proof per slug |
| **20** | Batch review queue before widening inserts |
| **100s** | Only after 20 safe compatible replacements with low false-positive rate |

---

## 9. PROVEN / INFERRED / UNKNOWN (summary)

| Claim | Label |
|-------|--------|
| Rakuten local snapshot has 141 products, 3 mapped slugs | **PROVEN** |
| RPWFE absent from Rakuten snapshot | **PROVEN** |
| Factory uses only `waterdrop-rakuten-links.v1.json` | **PROVEN** |
| Waterdrop WD-F19C exists on HD/Amazon web | **INFERRED** (owner + external web; not in-repo browser proof yet) |
| Waterdrop DTC catalog ingest path | **UNKNOWN** |
| Best Buy `retailer_key` | **UNKNOWN** (not in `CANONICAL_RETAILER_KEYS`) |
| Full Rakuten MID catalog size vs 141 | **UNKNOWN** |

---

## 10. Explicit non-actions

- No edits to catalog CSVs, `retailer_links`, evidence, discovery, Supabase, gates, search.  
- No commit in this task.  
- Implementation of `report-waterdrop-catalog-intelligence-v1.ts` is a **follow-on** task.
