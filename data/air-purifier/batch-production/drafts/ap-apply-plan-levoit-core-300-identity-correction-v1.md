# Levoit Core 300 Family — Catalog Identity Correction (Owner Review)

**Contract:** `ap_apply_plan_levoit_core_300_identity_correction_v1`  
**Anchor filter:** `levoit-rf-rar029`  
**Mode:** Owner-review apply plan only — **no CSV apply, no Supabase mutations**

---

## Identity verdict (committed repo sources)

| Source | Verdict |
|--------|---------|
| `ap-levoit-oem-discovery-v1.results.json` | **REJECT_WRONG_FAMILY** — RAR029 search 0 results; Amazon B0DR6X4N35 is Pet Care 300-RF-PA |
| `ap-model-first-levoit-rf-rar029-live-browser-v1.results.json` | **MODEL_FILTER_MAPPING_REVIEW_REQUIRED** — official tokens Core 300-P-RF / Core 300-RF; RAR029 not on levoit.com |
| `BuckParts-PRODUCT-ADDITION-MODEL-FIRST-CONTRACT.md` | **PROVEN** — `levoit-rf-rar029` maps to Core 300-P-RF / Core 300-RF, not RAR029 |

**Problem:** `LEVOIT-RF-RAR029` is stored as the canonical OEM part number, but Levoit does not use RAR029 on official pages. Official cartridge identity is **Core 300-P-RF** (current buyable) and **Core 300-RF** (legacy).

---

## Correction type

| Type | Applies? |
|------|----------|
| Slug rename | **No** — keep `levoit-rf-rar029` for URL stability |
| Full split | **Deferred** — Option B only if owner rejects single-anchor |
| **Alias / supersession + catalog identity correction** | **Yes (recommended Option A)** |

Correct the canonical `oem_part_number`, add official consumer aliases, demote RAR029 to legacy search aliases, promote OEM primary to official PDP, remove wrong-family Amazon secondary.

---

## Recommended Option A — exact proposed CSV changes

### 1. `filters.csv` — 1 row update

**Before:**

```csv
levoit,levoit-rf-rar029,LEVOIT-RF-RAR029,Core 300 / Core 300S HEPA 3-in-1 filter,6,HEPA + carbon prefilter bundle for Core 300 family
```

**After:**

```csv
levoit,levoit-rf-rar029,LEVOIT-CORE-300-P-RF,Core 300 Series Original Filter (Core 300-P-RF),6,Official Levoit cartridge family; supersedes legacy internal RAR029 label. Aliases retain Core 300-RF legacy token. Shopify HEACAFLVNUS0012A; UPC 817915026880.
```

### 2. `filter_aliases.csv` — 4 rows add (retain existing 3)

**Retain:** `RF-RAR029`, `Core 300 filter`, `RAR029` (legacy search only)

**Add:**

```csv
levoit-rf-rar029,Core 300-P-RF
levoit-rf-rar029,Core 300-RF
levoit-rf-rar029,Core 300-P 3-Stage Original Filter
levoit-rf-rar029,HEACAFLVNUS0012A
```

### 3. `retailer_links.csv` — primary update + Amazon delete

**Primary (oem-catalog) — before:**

```csv
levoit-rf-rar029,OEM / manufacturer catalog (keyword lookup),https://levoit.com/search?q=LEVOIT-RF-RAR029,true,oem-catalog,oem-catalog,https://levoit.com/search?q=LEVOIT-RF-RAR029,,,
```

**Primary — after:**

```csv
levoit-rf-rar029,OEM / manufacturer catalog (keyword lookup),https://levoit.com/products/core300-p-air-purifier-replacement-filter,true,oem-catalog,oem-catalog,https://levoit.com/products/core300-p-air-purifier-replacement-filter,direct_buyable,"Core 300 identity correction + Consumer Naming Bridge Option A; model-first live browser 2026-05-30: Core 300 Series Original Filter; Core 300-P-RF tokens; HEACAFLVNUS0012A; Add to cart $29.99 available:true. RAR029 absent from primary. Legacy Core 300-RF PDP sold out.",2026-05-30T06:00:00.000Z
```

**Delete Amazon row:**

```csv
levoit-rf-rar029,Amazon,https://www.amazon.com/dp/B0DR6X4N35?tag=buckparts20-20,false,amazon,amazon,https://www.amazon.com/dp/B0DR6X4N35?tag=buckparts20-20,,,
```

Reason: REJECT_WRONG_FAMILY Pet Care 300-RF-PA variant.

### 4. `models.csv` — 16 rows notes update

| Slugs (5) | Before notes | After notes |
|-----------|--------------|-------------|
| levoit-core-300, levoit-core-300s, levoit-core-300-rf, levoit-core-300-rac, levoit-core-300-rwm | Uses Core 300 cartridge (RF-RAR029) | Uses Core 300-P-RF / Core 300-RF cartridge (official Levoit) |

| Slugs (10) | Before | After |
|------------|--------|-------|
| lap-c302/303 variants, core-300 color variants, core-p350, core-300-smart | Batch-2 expansion; Core 300 cartridge family | Batch-2 expansion; Core 300-P-RF / Core 300-RF cartridge family |

| Slug | Before | After |
|------|--------|-------|
| levoit-lap-c301s | Levoit SKU variant of Core 300S | Levoit SKU variant of Core 300S; Core 300-P-RF cartridge family |

### Unchanged (Option A)

- `compatibility_mappings.csv` — all 16 rows stay on `levoit-rf-rar029`
- `model_aliases.csv`

---

## Option B — split alternative (owner only)

If single-anchor is rejected:

| New slug | OEM token | Primary PDP | Candidate models |
|----------|-----------|-------------|------------------|
| `levoit-rf-core-300-rf` | LEVOIT-CORE-300-RF | legacy Core 300-RF PDP (sold out) | core-300, core-p350, core-300-rac |
| `levoit-rf-core-300-p-rf` | LEVOIT-CORE-300-P-RF | Core 300-P-RF PDP (buyable) | core-300s family, LAP-C30x, smart variants |

Deprecate `levoit-rf-rar029`. Requires **compat_mappings.csv** remapping. Owner must assign: `levoit-core-300-rf`, `levoit-core-300-rwm`, `levoit-core-300-black`, `levoit-core-300-white`.

---

## Affected model slugs (16)

`levoit-core-300`, `levoit-core-300s`, `levoit-core-300-rf`, `levoit-core-300-rac`, `levoit-core-300-rwm`, `levoit-lap-c301s`, `levoit-lap-c302s-wusr`, `levoit-lap-c303s-wusr`, `levoit-core-300-black`, `levoit-core-300-white`, `levoit-core-300s-black`, `levoit-core-300s-white`, `levoit-lap-c302s-waaa`, `levoit-lap-c303s-waaa`, `levoit-core-p350`, `levoit-core-300-smart`

---

## Projected impact (Option A, if approved)

| Metric | Delta |
|--------|------:|
| Safe edges | **+16** |
| Stranded models relieved | **+16** |
| Direct-buy safe CTAs | **+1** (filter primary) |

---

## Safety risks

1. **High** — Amazon B0DR6X4N35 is Pet Care wrong-family; must be removed.
2. **Medium** — Legacy Core 300-RF vs current Core 300-P-RF may not cover all 16 models on one PDP; split if owner disagrees.
3. **Medium** — `levoit-core-300-rf` slug may collide with filter cartridge nomenclature.
4. **Medium** — Core 300-RWM official replacement UNKNOWN.
5. **Medium** — Supabase drift until `seed:import:air-purifier` after apply.

---

## Validation commands (post-apply)

```bash
npm run lint
npm run build
npx tsx scripts/report-air-purifier-weak-buyer-path-audit-v1.ts
npm run buckparts:guardrails:air-purifier
npm run seed:import:air-purifier -- --dry-run
```

---

## PROVEN / INFERRED / UNKNOWN

### PROVEN

- Canonical OEM `LEVOIT-RF-RAR029` is incorrect per committed identity verdict.
- Official buyable PDP: `core300-p-air-purifier-replacement-filter` with Add to cart.
- RAR029 / RF-RAR029 not on checked levoit.com pages.
- Amazon secondary is REJECT_WRONG_FAMILY.
- 16 compat edges currently weak on this filter.

### INFERRED

- Option A sufficient for +16 safe edges if P-line PDP compatibility is authoritative.
- RAR029 was internal BuckParts label, not manufacturer token.

### UNKNOWN

- Core 300-RWM official replacement SKU.
- `levoit-core-300-rf` unit vs filter nomenclature.
- Owner Option A vs B preference.

---

## Artifacts

| File | Role |
|------|------|
| `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-core-300-identity-correction-v1.json` | Machine-readable apply plan |
| This file | Owner-review narrative |

**Do not apply without explicit owner approval.**
