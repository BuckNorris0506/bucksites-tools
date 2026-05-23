# Air Purifier Batch Production Lane v1

Read-only factory layer that classifies every live AP filter slug into agent-ready action buckets — replacing manual row-by-row buyer-path triage.

**Generated:** 2026-05-23  
**Deployment:** NOT DEPLOYED  
**Supabase:** untouched  
**Fridge batch:** untouched (`data/retailer_links.csv`, `docs/BUYER-PATH-20-SAFE-BATCH-V1.md`)

---

## Why this exists

Command Center recommends `air_purifier` (256 GSC impressions; 3 direct-buy CTAs; 2 official reference links). Manual pilot bites (Honeywell, Shark, Blueair review) proved repeatability limits:

- Gate math is deterministic (`buyLinkGateFailureKind`, `filterOfficialReferenceRetailerLinks`).
- Rescue patterns cluster by **source** (Honeywell Store, Shark official, OEM search placeholder, Amazon secondary).
- Catalog identity bugs (Blueair F4MAX vs PART411) must **block** buyer-path mutation.

This lane reads `data/air-purifier/*.csv` only and emits JSON for batch agents.

---

## Run

```bash
npx tsx scripts/report-air-purifier-batch-production-lane-v1.ts
node --import tsx --test scripts/report-air-purifier-batch-production-lane-v1.test.ts
```

---

## State counts (repo CSV, 2026-05-23)

| State | Count | Meaning |
|-------|------:|---------|
| `existing_direct_buyable` | 3 | Honeywell HRF-R1/R2/R3 — live buy CTAs |
| `existing_official_reference` | 2 | Shark HE15FKPET / HE3FKPET — reference links |
| `search_placeholder_rescue_needed` | 47 | OEM site-search only; needs PDP discovery |
| `catalog_identity_gap` | 1 | `blueair-particle-411` — F4MAX identity split |
| `wrong_family_reject` | 1 | `levoit-rf-rar029` — pilot wrong-family |
| `owner_review` | 3 | Medify rows — Amazon secondary + policy |
| `direct_buy_candidate` | 0 | Product URL without truth (none pending) |
| `reference_candidate` | 0 | Shark reference incomplete (none pending) |

**Candidate count:** 57 filter slugs

---

## Top 20 AP candidates (ranked)

| Rank | Slug | State | Score | Pattern |
|------|------|-------|------:|---------|
| 1 | `holmes-hapf30` | search_placeholder_rescue_needed | 81 | OEM search discovery |
| 2 | `winix-carbon-116131` | search_placeholder_rescue_needed | 77 | OEM search discovery |
| 3 | `winix-hepa-115115` | search_placeholder_rescue_needed | 77 | OEM search discovery |
| 4 | `blueair-particle-411` | **catalog_identity_gap** | 68+ | Blueair catalog identity |
| 5 | `shark-carbon-foam` | search_placeholder_rescue_needed | 63 | OEM search discovery |
| 6 | `blueair-f2-211` | search_placeholder_rescue_needed | 56 | Blueair search discovery |
| 7 | `blueair-pro-m-particle` | search_placeholder_rescue_needed | 52 | Blueair search discovery |
| 8 | `gg-flt5000` | search_placeholder_rescue_needed | 51 | OEM search discovery |
| 9 | `levoit-rf-rar040` | search_placeholder_rescue_needed | 48 | Levoit discovery |
| 10 | `levoit-rf-rar060` | search_placeholder_rescue_needed | 46 | Levoit discovery |
| 11 | `coway-max2-hepa` | search_placeholder_rescue_needed | 45 | OEM search discovery |
| 12–18 | Levoit family slugs | search_placeholder_rescue_needed | 42–44 | Levoit discovery |
| 19 | `shark-hepa-hp100` | search_placeholder_rescue_needed | 39 | Shark (search, not official PDP row) |
| 20 | `rabbit-biogs-minusa2` | search_placeholder_rescue_needed | 37 | OEM search discovery |

Ranking weights: GSC page/query impressions → blocked gate → compat breadth → PDP-likeness → proven pattern bonus.

---

## First 3 agent work packets

### 1. `ap-blueair-catalog-identity-v1` (owner review required)

- **Pattern:** Blueair catalog identity
- **Slugs:** `blueair-particle-411`, `blueair-f2-211`, `blueair-pro-m-particle`
- **Task:** Catalog/compat review before any particle-411 buyer-path
- **Proof:** F4MAX vs PART411; no alias `blueair-f4max-411` → `blueair-particle-411`
- **Allowed mutations:** Catalog/compat in approved task only
- **Reject:** Retailer-links-only F4MAX fix; gate weakening

### 2. `ap-levoit-oem-discovery-v1`

- **Pattern:** Levoit OEM PDP discovery
- **Slugs:** Top-ranked Levoit search-placeholder slugs (max 8)
- **Task:** Replace levoit.com search URLs after PDP + token proof
- **Reject:** Amazon-primary without exact RAR*/RF-* token on PDP

### 3. `ap-oem-search-placeholder-v1`

- **Pattern:** Generic OEM search-placeholder rescue
- **Slugs:** Holmes, Winix, Coway, GermGuardian, etc. (max 20)
- **Task:** Discover manufacturer PDP; `direct_buyable` only with Add to Cart + exact token
- **Allowed:** Update existing primary row in `data/air-purifier/retailer_links.csv` after proof

---

## What can be automated

- Per-slug gate classification from CSV + `launch-buy-links.ts`
- GSC demand join (Supabase artifact or local JSON)
- Compat-model-count ranking
- Pattern-grouped agent packets with reject rules
- Regression tests for Honeywell / Shark / Blueair / search-placeholder fixtures

---

## What requires owner review

- **Blueair F4MAX** catalog row + compat fix + redirect target
- **Medify Amazon-secondary** primary promotion policy
- **Levoit RAR029** wrong-family reject lift (Amazon token proof)
- Any new filter slug or alias/redirect for GSC drift URLs
- Extending official-reference allowlist beyond `shark-official`

---

## What must not be mutated yet

- `data/retailer_links.csv` (fridge batch)
- `data/air-purifier/retailer_links.csv` (except in approved browser-proof tasks)
- AP catalog CSVs without approved catalog task
- Buy gates, `/go` rules, search logic, compatibility mappings
- Supabase until deploy/import is explicitly authorized

---

## Catalog identity gaps (non-row)

| Gap ID | Issue |
|--------|-------|
| `blueair-f4max-411-gsc-slug` | GSC URL 404; F4MAX ≠ PART411; unsafe to alias |
| `blueair-411a-max-compat-f4max` | 411a Max may need F4MAX filter, not particle-411 |
| `blueair-f4max-missing-filter-row` | No catalog slug for F4MAX / 110036 |

---

## Provenance

| Label | Items |
|-------|-------|
| **PROVEN** | Report read-only; tests pass; gate helpers from production code |
| **INFERRED** | GSC impression attribution for F4MAX → particle-411 ranking |
| **UNKNOWN** | Supabase parity vs local CSV until import |

---

## Files

| Path | Role |
|------|------|
| `scripts/lib/air-purifier-batch-production-lane-v1.ts` | Classifier + report builder |
| `scripts/report-air-purifier-batch-production-lane-v1.ts` | JSON stdout CLI |
| `scripts/report-air-purifier-batch-production-lane-v1.test.ts` | Fixture tests |
