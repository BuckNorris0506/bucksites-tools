# AP Consumer Naming Bridge — production smoke result v1

## Four-slug Levoit cohort

**Report type:** Production smoke record (docs-only + read-only HTTP GET)  
**Recorded:** 2026-06-13  
**Repo checkpoint:** `23635d7` or newer  
**Scope:** four filter slugs only — `levoit-rf-rar040`, `levoit-rf-rar060`, `levoit-rf-c131`, `levoit-rf-cr200`  
**Prior parity:** `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-SUPABASE-PARITY-RESULT-v1.md`  
**Prior CTA-order audit:** read-only live Supabase + `buckparts.com` HTML probe (2026-06-13)

**Deploy note:** **No deploy was performed** in this packet or the prior parity/smoke steps. `deployed_commit` remains **UNKNOWN** unless a repo tool proves it. Live public exposure is **PROVEN** by read-only HTTP GET to `buckparts.com`, not by deployed-commit inference.

**This docs step:** Records read-only live smoke only. **Does not** authorize deploy, Supabase mutation, CSV mutation, sort-policy change, or owner-decision writes.

---

## 1. Factory proof (repo — unchanged by smoke)

### CSV executor apply

**Artifact:** `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.json`

| Field | Value | Label |
|-------|-------|-------|
| `apply_status` | `APPLIED` | **PROVEN** |
| `applied_change_count` | `4` | **PROVEN** |
| `ap_safe_cta_count_before` | `11` | **PROVEN** |
| `ap_safe_cta_count_after` | `15` | **PROVEN** |
| `ap_safe_cta_delta` | `+4` | **PROVEN** |
| Cohort slugs only | 4 Levoit RF slugs | **PROVEN** |

### Supabase parity

**Artifact:** `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-SUPABASE-PARITY-RESULT-v1.md`

| Stage | Result | Label |
|-------|--------|-------|
| Parity `--apply` | `apply_status: APPLIED`, `applied_change_count: 4` | **PROVEN** |
| Post-apply dry-run | `apply_status: ALREADY_APPLIED`, `already_applied_count: 4` | **PROVEN** |
| oem-catalog rows | Plan `after_row` (Levoit PDP + `direct_buyable`) | **PROVEN** |

Parity updated **only** `oem-catalog` slots. Orphan `amazon` rows in Supabase (not in committed CSV) were **not** modified by parity.

---

## 2. Commands / probes used (read-only)

### Filter route probe (all four)

```bash
for slug in levoit-rf-rar040 levoit-rf-rar060 levoit-rf-c131 levoit-rf-cr200; do
  curl -sS -o /dev/null -w "${slug} HTTP:%{http_code} URL:%{url_effective}\n" \
    -L "https://buckparts.com/air-purifier/filter/${slug}"
done
```

**Output (probe time 2026-06-13):**

| Slug | HTTP | Effective URL |
|------|------|---------------|
| `levoit-rf-rar040` | `200` | `https://buckparts.com/air-purifier/filter/levoit-rf-rar040` |
| `levoit-rf-rar060` | `200` | `https://buckparts.com/air-purifier/filter/levoit-rf-rar060` |
| `levoit-rf-c131` | `200` | `https://buckparts.com/air-purifier/filter/levoit-rf-c131` |
| `levoit-rf-cr200` | `200` | `https://buckparts.com/air-purifier/filter/levoit-rf-cr200` |

### Go-link ordering probe (primary + alternate on filter page HTML)

```bash
for slug in levoit-rf-rar040 levoit-rf-rar060 levoit-rf-c131 levoit-rf-cr200; do
  html=$(curl -sS -L "https://buckparts.com/air-purifier/filter/$slug")
  echo "=== $slug ==="
  echo "$html" | rg -o '/air-purifier/go/[0-9a-f-]{36}' | head -2
  first=$(echo "$html" | rg -o '/air-purifier/go/[0-9a-f-]{36}' | head -1)
  curl -sS -o /dev/null -w "primary_redirect: %{url_effective}\n" -L "https://buckparts.com$first"
done
```

### Primary go-link redirect (first CTA)

| Slug | Go UUID (primary) | Redirect destination | Label |
|------|-------------------|----------------------|-------|
| `levoit-rf-rar040` | `3d6e5426-a1ac-43b9-ba14-62400eae56ff` | `https://www.amazon.com/dp/B08SQQK6K7?tag=buckparts20-20` | **PROVEN** Amazon primary |
| `levoit-rf-rar060` | `30632792-47f5-4f05-8d82-aa3e85e8319e` | `https://www.amazon.com/dp/B09MK89TXN?tag=buckparts20-20` | **PROVEN** Amazon primary |
| `levoit-rf-c131` | `9099e927-aae6-42e4-8f09-064073fa90b9` | `https://www.amazon.com/dp/B06XDM7LT7?tag=buckparts20-20` | **PROVEN** Amazon primary |
| `levoit-rf-cr200` | `644e779d-ab7d-4de0-9014-46893d16eb20` | `https://www.amazon.com/dp/B08L971Z4L?tag=buckparts20-20` | **PROVEN** Amazon primary |

### Alternate go-link (second verified CTA — Levoit OEM oem-catalog)

| Slug | Go UUID (alternate) | oem-catalog `link_id` (parity) | Redirect destination (follow) | Label |
|------|---------------------|--------------------------------|-------------------------------|-------|
| `levoit-rf-rar040` | `46127e68-4cb9-4156-be42-8ff041a5a349` | `46127e68-…` | `https://levoit.com/products/core-400s-p-3-stage-replacement-filter` | **PROVEN** OEM alternate |
| `levoit-rf-rar060` | `bd21d26b-a6e8-4d77-a9cb-98a5358c754a` | `bd21d26b-…` | `https://levoit.com/products/core-600s-p-original-replacement-filter` | **PROVEN** OEM alternate |
| `levoit-rf-c131` | `b11d77cb-ce83-427f-88cf-2d370e51ddc5` | `b11d77cb-…` | `https://levoit.com/products/lv-pur131-air-purifier-replacement-filter` | **PROVEN** OEM alternate |
| `levoit-rf-cr200` | `c5a818b9-02c9-4349-8bae-af9c50cfd15f` | `c5a818b9-…` | `https://levoit.com/products/core-200s-p-replacement-filter` | **PROVEN** OEM alternate |

Alternate UUIDs match parity-recorded `oem-catalog` `link_id`s. Primary UUIDs match orphan Supabase `amazon` rows (`direct_buyable`, `is_primary: false`, not in committed `retailer_links.csv`).

---

## 3. Required smoke checks (cohort)

| # | Check | Result | Label |
|---|-------|--------|-------|
| 1 | Filter routes HTTP 200 (all four) | `200` on all four `/air-purifier/filter/{slug}` URLs | **PROVEN** pass |
| 2 | Verified buy CTAs present | BuckParts Verified Links section + `/air-purifier/go/` hrefs on each page | **PROVEN** pass |
| 3 | Primary go-link → Amazon | All four primary redirects to observed ASINs (see §2) | **PROVEN** pass |
| 4 | Alternate go-link → Levoit OEM PDP | Second CTA on each page → `levoit.com/products/…` PDP URLs | **PROVEN** pass |
| 5 | oem-catalog Supabase parity | `ALREADY_APPLIED` (4/4 `after_row`) per parity result doc | **PROVEN** pass |
| 6 | No `/go-unavailable` on filter pages | Not observed in live HTML probes | **PROVEN** pass |
| 7 | **OEM primary CTA** | Primary CTA is Amazon on all four — **not** Levoit oem-catalog | **NOT PROVEN** / **UNKNOWN** as success criterion |
| 8 | Stale runtime cache as cause | Live HTML go-UUIDs match live Supabase sort winners; `force-dynamic` on filter route | **DISPROVEN** as cause |

---

## 4. CTA ordering — why Amazon is primary (read-only audit)

| Fact | Label |
|------|-------|
| `TieredBuyLinks` primary = `sortBestVerifiedBuyLinks(...)[0]` | **PROVEN** (`src/components/TieredBuyLinks.tsx`) |
| `is_primary` DB flag is **not** used in sort logic | **PROVEN** (`src/lib/retailers/launch-buy-links.ts`) |
| Levoit slugs get `exactOemCatalogPart: true` → `amazonExactOemPrimaryBoost` prefers verified Amazon over other `direct_buyable` rows | **PROVEN** (policy + live Supabase sort audit) |
| Orphan `amazon` rows exist in Supabase with `direct_buyable`; absent from committed CSV for these four slugs | **PROVEN** |
| oem-catalog parity correct; Amazon-first is **policy + competing rows**, not parity failure | **PROVEN** |

**Do not claim:** Levoit OEM is the **primary** verified CTA on live pages. That is **NOT PROVEN** and is **false** per live smoke.

---

## 5. PROVEN / INFERRED / UNKNOWN / NOT PROVEN

| Claim | Label |
|-------|-------|
| CSV safe CTA 11 → 15 (+4) | **PROVEN** |
| Supabase parity `APPLIED` then `ALREADY_APPLIED` | **PROVEN** |
| All four filter routes HTTP 200 | **PROVEN** |
| Verified buy CTAs exist on live pages | **PROVEN** |
| Amazon is primary verified CTA (all four) | **PROVEN** |
| Levoit oem-catalog is alternate verified CTA (all four) | **PROVEN** |
| Amazon-first caused by CTA sort policy + orphan Supabase Amazon rows | **PROVEN** |
| Stale cache caused wrong primary | **DISPROVEN** |
| Levoit OEM primary CTA on live pages | **NOT PROVEN** |
| `deployed_commit` for production | **UNKNOWN** |
| Whether owner accepts Amazon-primary / OEM-alternate | **UNKNOWN** (product decision) |

---

## 6. Product decision remaining (not authorized here)

Choose **exactly one** path in a **separate** owner packet:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — ACCEPT AMAZON-PRIMARY / OEM-ALTERNATE                           │
│                                                                             │
│  Live smoke PROVEN: routes 200, verified CTAs exist, Amazon primary,        │
│  Levoit oem-catalog alternate. Factory + parity complete for oem-catalog.   │
│  No further mutation required for smoke closure.                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — PURSUE OEM-PRIMARY CTA (SEPARATE AUTHORIZATION)                 │
│                                                                             │
│  Requires one of:                                                           │
│    • Scoped Supabase demotion of orphan amazon rows (4 slugs, not in CSV)   │
│    • Sort-policy change in launch-buy-links.ts (broader blast radius)       │
│  NOT authorized by this smoke doc. Parity/CSV re-run NOT required.          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Boundaries

- [ ] **No** deploy performed or authorized
- [ ] **No** Supabase mutation
- [ ] **No** CSV mutation
- [ ] **No** sort-policy / code change
- [ ] **No** `data/owner-decisions/` rows
- [ ] **No** claim that OEM is primary CTA
- [ ] **No** smoke proof for slugs outside the four-slug cohort
- [ ] Does **not** replace parity docs — Supabase oem-catalog truth remains in `AP-CONSUMER-NAMING-BRIDGE-SUPABASE-PARITY-RESULT-v1.md`

---

## 8. Optional read-only re-verification

```bash
# Parity noop (oem-catalog)
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json

# Live primary redirect (example slug)
slug=levoit-rf-rar040
html=$(curl -sS -L "https://buckparts.com/air-purifier/filter/$slug")
first=$(echo "$html" | rg -o '/air-purifier/go/[0-9a-f-]{36}' | head -1)
curl -sS -o /dev/null -w "%{url_effective}\n" -L "https://buckparts.com$first"
```

Expect parity: `ALREADY_APPLIED`. Expect primary redirect: Amazon `B08SQQK6K7`.

---

## 9. Related docs

- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-SUPABASE-PARITY-RESULT-v1.md`
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-SUPABASE-PARITY-OWNER-REVIEW-v1.md`
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EXECUTOR-APPLY-OWNER-REVIEW-v1.md`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.json`
- `src/lib/retailers/launch-buy-links.ts`
- `src/components/TieredBuyLinks.tsx`
- `docs/air-purifier/AP-PRODUCTION-SMOKE-RESULT-WINIX-FILTER-H-116130-v1.md` (pattern only)

---

## 10. Disclaimer

Production smoke for the four-slug Levoit Consumer Naming Bridge cohort is **PROVEN** at the level of: live routes **200**, verified buy CTAs present, **Amazon primary**, **Levoit oem-catalog alternate**. CSV factory (+4 safe CTA) and Supabase oem-catalog parity are **PROVEN** complete. This packet **does not** prove OEM primary CTA, does **not** perform deploy, and does **not** authorize Amazon row demotion or sort-policy change without a separate owner decision.
