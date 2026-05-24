# Air Purifier Buyer-Path Coverage Snapshot + Top-20 Queue v1

**Status:** Read-only planning artifact. **No mutations.** **NOT DEPLOYED.** **Supabase:** untouched.  
**Generated:** 2026-05-22  
**Repo HEAD:** `a7748c0` (Command Center `demand_to_coverage_next_lane_v1` present)  
**Command Center signal:** `recommended_wedge=air_purifier`, `recommendation_status=RECOMMEND_REOPEN`

---

## Executive summary

Google Search Console demand is concentrated on **Shark NeverChange HP150/HP300** surfaces and the **air purifier hub**, while repo buyer-path coverage is **100% blocked** at the link gate: **64/64** `data/air-purifier/retailer_links.csv` rows fail (`search_placeholder` or `missing_browser_truth`). Two Shark filters already point at **official product PDP URLs** in CSV but lack `browser_truth_classification=direct_buyable`, so they are the fastest pilot path.

**Do not expand the local fridge `data/retailer_links.csv` batch until this AP top-20 queue has a controlled pilot bite.**

---

## 1. Current demand signal (PROVEN)

Source: `npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts` (2026-05-22).

| Signal | Value |
|--------|------:|
| `source_status` | PROVEN |
| `recommended_wedge` | air_purifier |
| `recommendation_status` | RECOMMEND_REOPEN |
| Wedge impressions (aggregated) | 256 |
| Wedge clicks | 0 |
| Launch state | NOINDEX_UNPROVEN |
| Sitemap AP URLs | 4 |
| Repo blocked links | 64 |
| Repo safe direct_buyable CTAs | 0 |

### Top GSC pages (site artifact)

| Page | Impressions |
|------|------------:|
| `/air-purifier` | 111 |
| `/air-purifier/model/shark-hp150` | 82 |
| `/air-purifier/model/shark-hp300` | 15 |
| `/air-purifier/filter/blueair-f4max-411` | 10 |

**INFERRED:** GSC path `blueair-f4max-411` does not match a live filter slug (closest live slug: `blueair-particle-411`).

### Top GSC queries (AP-relevant)

| Query | Impressions |
|-------|------------:|
| air purifier filter replacement | 28 |
| he15fkpet | 14 |
| shark he15fkpet | 6 |
| hp150 hepa filter | 4 |
| hp300 | 3 |
| he15fkpet filter replacement | 3 |

---

## 2. Air purifier data / route state (PROVEN)

### Catalog counts (`data/air-purifier/`, non-sample)

| Asset | Count |
|-------|------:|
| Brands | 18 |
| Filters (live slugs) | 57 |
| Models | 287 |
| Filter aliases | 27 |
| Model aliases | 21 |
| Compatibility mappings | 350 |
| Retailer link rows | 64 (covers all 57 filter slugs; 7 slugs have 2 rows) |

### Buyer-path gate summary (repo CSV, current gates)

| Metric | Count |
|--------|------:|
| Total link rows | 64 |
| `search_placeholder` (primary OEM search URLs) | 52 |
| `missing_browser_truth` (URL looks like PDP but no browser proof) | 12 |
| `direct_buyable` safe CTA | 0 |
| Amazon secondary rows | 7 |
| Official `/products/` URLs in CSV | 5 (Shark ×2, Honeywell ×3) |
| Filter slugs with zero link row | 0 |

### Vertical launch + routes

| Item | State |
|------|--------|
| Launch | `NOINDEX_UNPROVEN` (`src/lib/catalog/vertical-launch-state.ts`) |
| Layout robots | `noindex,follow` (`src/app/air-purifier/layout.tsx`) |
| Routes present | `/air-purifier`, `/air-purifier/search`, `/air-purifier/brand/[slug]`, `/air-purifier/model/[slug]`, `/air-purifier/filter/[slug]`, `/air-purifier/go/[linkId]` |

### Evidence / discovery

| Source | AP-specific artifacts |
|--------|-------------------------|
| `data/evidence/` | **None** found for air purifier |
| `data/discovery/` | **None** found for air purifier |

---

## 3. Coverage snapshot

| Dimension | AP state | Fridge batch contrast |
|-----------|----------|------------------------|
| GSC demand rank | **#1 wedge** (256 imp) | Fridge pages scattered; lower per-URL AP concentration |
| Launch | NOINDEX_UNPROVEN | refrigerator **LIVE** |
| Safe buy CTAs | **0** | 8 deploy-ready-safe local rows in `data/retailer_links.csv` |
| Highest-signal products | Shark HE15FKPET / HE3FKPET | GE/Frigidaire fridge tokens |
| Fastest rescue pattern | **Shark official PDP** already in CSV | GE spec PDP / Frigidaire PartDetail (fridge batch) |
| Batch file | `data/air-purifier/retailer_links.csv` | `data/retailer_links.csv` (dirty, do not touch) |

**Hub page (`/air-purifier`, 111 imp):** Demand is wedge-level; buyer-path work still happens per **filter slug** (and model pages that route to filters). No single hub-row mutation.

---

## 4. Top-20 air purifier buyer-path queue

Ranking weights used (read-only): GSC page/query mapping → live slug → blocked primary link → exact OEM token → official PDP URL in repo → model compatibility breadth → batchability.

| Rank | Slug | Type | Brand | OEM token | Current path | GSC proof | Current primary URL | Gate / CTA state | Rescue reason | Buyer-path class | First candidate source (repo) | Proof before mutation | Confidence |
|------|------|------|-------|-----------|--------------|-----------|---------------------|------------------|---------------|------------------|------------------------------|----------------------|------------|
| 1 | `shark-hepa-he15fkp` | filter | shark | HE15FKPET | `/air-purifier/filter/shark-hepa-he15fkp` | Queries: he15fkpet (14), shark he15fkpet (6), hp150 hepa (4); serves `shark-hp150` model demand | `https://www.sharkclean.com/products/hp150-hepa-filter-zidHE15FKPET` | `missing_browser_truth` / BLOCKED | Official PDP in CSV but no browser proof; highest query-level demand | official_noncommissioned | Same URL (shark-official primary) | Playwright: exact HE15FKPET on PDP + Add to Cart | PROVEN |
| 2 | `shark-hp150` | model | shark | HP150 | `/air-purifier/model/shark-hp150` | **82** page impressions | (via compat → `shark-hepa-he15fkp` link) | Inherited from filter | Model page demand; rescue filter row #1 | official_noncommissioned | Filter row #1 PDP | Model page + filter PDP browser pass | PROVEN |
| 3 | `shark-hepa-he3fkp` | filter | shark | HE3FKPET | `/air-purifier/filter/shark-hepa-he3fkp` | Query: hp300 (3); serves `shark-hp300` model | `https://www.sharkclean.com/products/shark-neverchangeanti-allergen-true-hepa-filter-zidHE3FKPET` | `missing_browser_truth` / BLOCKED | Same Shark official PDP pattern as HE15FKPET | official_noncommissioned | Same URL (shark-official primary) | Playwright: exact HE3FKPET + buyability | PROVEN |
| 4 | `shark-hp300` | model | shark | HP300 | `/air-purifier/model/shark-hp300` | **15** page impressions | (via compat → `shark-hepa-he3fkp`) | Inherited | Second-highest model page demand | official_noncommissioned | Filter row #3 PDP | Model + filter PDP browser pass | PROVEN |
| 5 | `blueair-particle-411` | filter | blueair | BLUEAIR-PART411 | `/air-purifier/filter/blueair-particle-411` | GSC page `/filter/blueair-f4max-411` (**10** imp) — slug drift | `https://www.blueair.com/us/search?q=BLUEAIR-PART411` | `search_placeholder` / BLOCKED | GSC URL typo vs catalog; needs direct Blueair PDP | official_noncommissioned | Discover Blue Pure 411 filter PDP on blueair.com | Browser: resolve f4max vs PART411; exact token on PDP | INFERRED |
| 6 | `levoit-rf-rar029` | filter | levoit | LEVOIT-RF-RAR029 | `/air-purifier/filter/levoit-rf-rar029` | Core 300 family; hub/query tail | `https://levoit.com/search?q=LEVOIT-RF-RAR029` (+ Amazon secondary) | Primary `search_placeholder` | **16** model mappings; Amazon DP exists but not primary | official_noncommissioned | levoit.com product PDP for Core 300 filter | Browser: exact RAR029; prefer OEM PDP over search | INFERRED |
| 7 | `levoit-rf-rar040` | filter | levoit | LEVOIT-RF-RAR040 | `/air-purifier/filter/levoit-rf-rar040` | Core 400 family | `https://levoit.com/search?q=LEVOIT-RF-RAR040` | `search_placeholder` | **6** models; same Levoit search pattern as #6 | official_noncommissioned | levoit.com PDP | Browser proof | INFERRED |
| 8 | `honeywell-hrf-r3` | filter | honeywell | HONEYWELL-HRF-R3 | `/air-purifier/filter/honeywell-hrf-r3` | — | Primary OEM: `.../true-hepa-replacement-filter-r-3-pack-hrf-r3.htm` | `missing_browser_truth` (product URL, no truth) | Product-page URL already (not search); needs truth only | official_noncommissioned | honeywellstore.com URL in CSV | Playwright Add to Cart + HRF-R3 token | PROVEN |
| 9 | `honeywell-hrf-r1` | filter | honeywell | HONEYWELL-HRF-R1 | `/air-purifier/filter/honeywell-hrf-r1` | — | `.../true-hepa-replacement-filter-r-hrf-r1.htm` + Amazon | `missing_browser_truth` | Compact HPA100 family; product page in CSV | official_noncommissioned | honeywellstore.com | Browser proof | PROVEN |
| 10 | `medify-ma25-rf` | filter | medify | MEDIFY-MA-25-RF | `/air-purifier/filter/medify-ma25-rf` | — | `https://medifyair.com/search?q=...` + Amazon B084Q965BF | Primary search; Amazon secondary | Amazon ASIN present; OEM search blocked | retailer_commissioned | Amazon DP or medifyair PDP | Amazon buyability + exact token if Amazon-first | INFERRED |
| 11 | `medify-ma40-rf` | filter | medify | MEDIFY-MA-40-RF | `/air-purifier/filter/medify-ma40-rf` | — | medify search + Amazon B07MTQFFNT | Primary search | Same Medify pattern | retailer_commissioned | medifyair.com or Amazon | Browser proof | INFERRED |
| 12 | `coway-max2-hepa` | filter | coway | COWAY-3304899 | `/air-purifier/filter/coway-max2-hepa` | — | `https://coway.com/search?q=COWAY-3304899` | `search_placeholder` | AP-1512 Mighty family (**12** models) | official_noncommissioned | coway.com PDP | Browser proof | INFERRED |
| 13 | `blueair-f2-211` | filter | blueair | BLUEAIR-F2MAX211PAC | `/air-purifier/filter/blueair-f2-211` | — | blueair.com search | `search_placeholder` | Blue Pure 211+ family (**3** models) | official_noncommissioned | blueair.com PDP | Browser proof | INFERRED |
| 14 | `levoit-rf-cr200` | filter | levoit | LEVOIT-RF-CR200 | `/air-purifier/filter/levoit-rf-cr200` | — | levoit.com search | `search_placeholder` | Core 200 line (**5** models) | official_noncommissioned | levoit.com PDP | Browser proof | INFERRED |
| 15 | `winix-hepa-115115` | filter | winix | WINIX-115115 | `/air-purifier/filter/winix-hepa-115115` | — | winixamerica.com search | `search_placeholder` | **28** model mappings (high compat surface) | official_noncommissioned | winixamerica.com PDP | Browser proof | INFERRED |
| 16 | `gg-flt4825` | filter | germguardian | GUARDIAN-FLT4825 | `/air-purifier/filter/gg-flt4825` | — | germguardian.com search | `search_placeholder` | Guardian tower line (**15** models) | official_noncommissioned | germguardian.com PDP | Browser proof | INFERRED |
| 17 | `levoit-vital100-rf` | filter | levoit | LEVOIT-VITAL100-RF | `/air-purifier/filter/levoit-vital100-rf` | — | levoit.com search | `search_placeholder` | Vital 100 family | official_noncommissioned | levoit.com PDP | Browser proof | INFERRED |
| 18 | `shark-carbon-foam` | filter | shark | SHARK-CARBON-FOAM | `/air-purifier/filter/shark-carbon-foam` | — | sharkclean.com search | `search_placeholder` | Paired cartridge for HP series (**21** compat rows) — secondary to HEPA | official_noncommissioned | sharkclean.com | Browser; confirm not substituting HEPA SKU | INFERRED |
| 19 | `airdoctor-ad3000-cartridge` | filter | airdoctor | ADF401 | `/air-purifier/filter/airdoctor-ad3000-cartridge` | — | airdoctorpro.com search | `search_placeholder` | Premium SKU; single-filter focus | official_noncommissioned | airdoctorpro.com PDP | Browser proof | INFERRED |
| 20 | `iqair-hyperhepa-hp250` | filter | iqair | 102-14-14-00 | `/air-purifier/filter/iqair-hyperhepa-hp250` | — | iqair.com search | `search_placeholder` | High-trust niche; low volume | official_noncommissioned | iqair.com PDP | Browser proof | INFERRED |

**Queue rules for execution**

- **No new filter rows** in v1 pilot — update existing primary links only after browser proof.
- **No new retailer rows** unless a slug truly has zero links (none today).
- **Model rows (#2, #4)** are tracking GSC; mutations target **filter slugs** they compat-map to.
- Do **not** mutate `data/retailer_links.csv` (fridge) during AP pilot.

---

## 5. First 5 AP pilot candidates (controlled bite)

| Pilot # | Slug | Why first | Pattern | Existing row? |
|---------|------|-----------|---------|---------------|
| 1 | `shark-hepa-he15fkp` | Highest GSC query cluster + official PDP URL already primary | Shark `shark-official` product page → `direct_buyable` | Yes |
| 2 | `shark-hepa-he3fkp` | HP300 model page demand + same official pattern | Same as #1 | Yes |
| 3 | `blueair-particle-411` | GSC filter page impressions (slug drift) | Blueair OEM PDP discovery (replace search URL) | Yes |
| 4 | `levoit-rf-rar029` | Largest Levoit compat footprint + Amazon fallback | Levoit OEM PDP or vetted Amazon primary policy | Yes (2 rows) |
| 5 | `honeywell-hrf-r3` | Product-page URL already; only missing browser truth | Honeywell store PDP truth capture | Yes |

**Pilot success criteria (mirror fridge 20-safe):**

1. `buyLinkGateFailureKind` → null on primary row  
2. `browser_truth_classification=direct_buyable` with dated notes  
3. No gate weakening, no new catalog rows  
4. Document in a future `docs/AIR-PURIFIER-BUYER-PATH-20-SAFE-BATCH-V1.md` when authorized (not created in this pass)

**Batchability:** Pilot #1–2 share **Shark official PDP** playbook (one browser session, two slugs).

---

## 6. Fridge batch interaction

| Question | Answer |
|----------|--------|
| Pause fridge expansion now? | **Yes (INFERRED)** — Command Center `RECOMMEND_REOPEN` + GSC proof says AP outranks fridge demand; finish **8 deploy-ready-safe** fridge rows but **do not add bites 12–20** until AP pilot #1–5 complete. |
| Touch fridge local prepared rows? | **No** — keep `M data/retailer_links.csv` and `docs/BUYER-PATH-20-SAFE-BATCH-V1.md` as-is (11 prepared / 8 deploy-ready / 3 needs-review). |
| AP becomes next active 20-safe batch? | **Yes (INFERRED)** — next batch file target is `data/air-purifier/retailer_links.csv` with separate doc; not mixed into fridge CSV. |
| Avoid losing fridge work? | Fridge rows remain valid local prep; deploy fridge **8** when owner approves; AP work is **parallel planning** until pilot proves repeatability. |

---

## 7. System gaps (read-only)

| Gap | Impact |
|-----|--------|
| No AP browser-truth / evidence JSON in `data/evidence/` | Every PDP rescue needs fresh Playwright proof per slug |
| GSC slug drift (`blueair-f4max-411` vs `blueair-particle-411`) | IA/redirect or alias review before mutating |
| `NOINDEX_UNPROVEN` launch | Buyer-path can improve CTAs before wedge promotion decision |
| Command Center `next_best_action` still fridge-weighted | Use `demand_to_coverage_next_lane_v1` for wedge priority; not `top_money_queue` |
| No AP large-batch factory lane | Fridge-only `large_batch_coverage_factory`; AP queue is this doc until factory extended |
| Supabase `air_purifier_retailer_links` may differ from repo CSV | This snapshot is **repo CSV truth**; production parity check is separate (not run here) |

---

## Validation commands (operator)

```bash
npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts
npx tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.demand_to_coverage_next_lane_v1'
# After pilot mutations (future): gate check per slug — do not run until authorized
```

**Deployment:** NOT DEPLOYED. **Commits:** none required for this planning artifact.
