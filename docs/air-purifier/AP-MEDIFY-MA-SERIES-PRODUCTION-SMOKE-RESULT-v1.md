# AP Medify MA-series — production smoke result v1

## Six-slug OEM Medify cohort

**Report type:** Production smoke record (docs-only + read-only HTTP GET)  
**Recorded:** 2026-06-15  
**Probe time (UTC):** `2026-06-15T18:36:21Z`  
**Repo checkpoint:** `7d292c4` or newer  
**Scope:** six filter slugs only — `medify-ma18-rf`, `medify-ma22-rf`, `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf`, `medify-ma112-rf`  
**Prior parity:** `docs/air-purifier/AP-MEDIFY-MA-SERIES-SUPABASE-PARITY-RESULT-v1.md`  
**Prior CSV apply:** `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1-apply.json`

**Deploy note:** **No deploy was performed** in this packet. `deployed_commit` remains **UNKNOWN** unless a repo tool proves it. Live public exposure is **PROVEN** by read-only HTTP GET to `buckparts.com`, not by deployed-commit inference.

**This docs step:** Records read-only live smoke only. **Does not** authorize deploy, Supabase mutation, CSV mutation, sort-policy change, or owner-decision writes.

---

## A. URLs tested

| Slug | Public filter URL | HTTP | Effective URL |
|------|-------------------|------|---------------|
| `medify-ma18-rf` | `https://buckparts.com/air-purifier/filter/medify-ma18-rf` | `200` | same |
| `medify-ma22-rf` | `https://buckparts.com/air-purifier/filter/medify-ma22-rf` | `200` | same |
| `medify-ma25-rf` | `https://buckparts.com/air-purifier/filter/medify-ma25-rf` | `200` | same |
| `medify-ma40-rf` | `https://buckparts.com/air-purifier/filter/medify-ma40-rf` | `200` | same |
| `medify-ma50-rf` | `https://buckparts.com/air-purifier/filter/medify-ma50-rf` | `200` | same |
| `medify-ma112-rf` | `https://buckparts.com/air-purifier/filter/medify-ma112-rf` | `200` | same |

**Expected Medify PDP destinations (evidence + CSV apply):**

| Slug | Expected OEM PDP |
|------|------------------|
| `medify-ma18-rf` | `https://medifyair.com/products/ma-18-replacement-filter` |
| `medify-ma22-rf` | `https://medifyair.com/products/ma-22-replacement-filter` |
| `medify-ma25-rf` | `https://medifyair.com/products/ma-25-replacement-filter-set` |
| `medify-ma40-rf` | `https://medifyair.com/products/ma-40-replacement-filter-set` |
| `medify-ma50-rf` | `https://medifyair.com/products/ma-50-replacement-filter` |
| `medify-ma112-rf` | `https://medifyair.com/products/ma-112-filter-replacement-set` |

---

## B. CTA state per slug

| Slug | BuckParts Verified Links section | `/air-purifier/go/` hrefs | Primary CTA label | Alternate CTA(s) | `/go-unavailable` observed |
|------|----------------------------------|---------------------------|-------------------|------------------|----------------------------|
| `medify-ma18-rf` | **Yes** | `b6908c1c-53a5-411d-854c-498f8a66487c` | OEM / manufacturer catalog | none (single verified CTA) | **No** |
| `medify-ma22-rf` | **Yes** | `4e336dec-cbf7-4574-9d51-fecf62b97def` | OEM / manufacturer catalog | none | **No** |
| `medify-ma25-rf` | **Yes** | `f7dabc20-…` (primary), `4f04ae5b-…` (alternate) | **Amazon** (primary) | OEM / manufacturer catalog | **No** |
| `medify-ma40-rf` | **Yes** | `242216a0-…` (primary), `d48041b8-…` (alternate) | **Amazon** (primary) | OEM / manufacturer catalog | **No** |
| `medify-ma50-rf` | **Yes** | `8f5abc4b-e095-4f99-80c8-8f42a6743a53` | OEM / manufacturer catalog | none | **No** |
| `medify-ma112-rf` | **Yes** | `8f73503a-ad86-4cba-8815-01e6c2cc0a74` | OEM / manufacturer catalog | none | **No** |

**PROVEN:** All six scoped filter pages render at least one BuckParts Verified Link (safe CTA) reachable via `/air-purifier/go/<uuid>`.

---

## C. Redirect destination per slug

Probes: `curl -sS -L` follow on first (primary) and second (alternate, when present) go-link extracted from live filter-page HTML.

| Slug | Primary go UUID | Primary redirect | Alternate go UUID | Alternate redirect | Expected OEM PDP match |
|------|-----------------|------------------|-------------------|--------------------|------------------------|
| `medify-ma18-rf` | `b6908c1c-53a5-411d-854c-498f8a66487c` | `https://medifyair.com/products/ma-18-replacement-filter` | — | — | **Primary ✓** |
| `medify-ma22-rf` | `4e336dec-cbf7-4574-9d51-fecf62b97def` | `https://medifyair.com/products/ma-22-replacement-filter` | — | — | **Primary ✓** |
| `medify-ma25-rf` | `f7dabc20-074e-4720-b7d7-3fee5da9681d` | `https://www.amazon.com/dp/B084Q965BF?tag=buckparts20-20` | `4f04ae5b-332b-4d2d-97a2-77eef603b034` | `https://medifyair.com/products/ma-25-replacement-filter-set` | **Primary ✗** / **Alternate ✓** |
| `medify-ma40-rf` | `242216a0-910d-45dd-8136-1d9873b81e4c` | `https://www.amazon.com/dp/B07MTQFFNT?tag=buckparts20-20` | `d48041b8-250f-4505-bf21-a67d65e979ab` | `https://medifyair.com/products/ma-40-replacement-filter-set` | **Primary ✗** / **Alternate ✓** |
| `medify-ma50-rf` | `8f5abc4b-e095-4f99-80c8-8f42a6743a53` | `https://medifyair.com/products/ma-50-replacement-filter` | — | — | **Primary ✓** |
| `medify-ma112-rf` | `8f73503a-ad86-4cba-8815-01e6c2cc0a74` | `https://medifyair.com/products/ma-112-filter-replacement-set` | — | — | **Primary ✓** |

**302 headers (primary, sample):** all primary go-links return `302` → destination above (`server: Netlify` observed on follow).

---

## D. PASS/FAIL summary

### Per-slug (strict smoke criteria)

| # | Check | `ma18` | `ma22` | `ma25` | `ma40` | `ma50` | `ma112` |
|---|-------|--------|--------|--------|--------|--------|---------|
| 1 | Filter route HTTP 200 | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| 2 | Safe verified CTA present | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| 3 | Primary `/go` resolves (no dead link) | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| 4 | Primary → expected Medify PDP | **PASS** | **PASS** | **FAIL** | **FAIL** | **PASS** | **PASS** |
| 5 | No Amazon-primary override | **PASS** | **PASS** | **FAIL** | **FAIL** | **PASS** | **PASS** |
| 6 | OEM PDP reachable on page (any CTA) | **PASS** | **PASS** | **PASS** (alternate) | **PASS** (alternate) | **PASS** | **PASS** |

### Cohort rollup

| Criterion | Result | Label |
|-----------|--------|-------|
| All six filter routes live (`200`) | 6/6 | **PROVEN** pass |
| All six have safe verified CTAs | 6/6 | **PROVEN** pass |
| All six primary `/go` links resolve | 6/6 | **PROVEN** pass |
| All six primary → Medify OEM PDP | 4/6 | **NOT PROVEN** — **FAIL** on `medify-ma25-rf`, `medify-ma40-rf` |
| No Amazon-primary on any slug | 4/6 | **NOT PROVEN** — **FAIL** on `medify-ma25-rf`, `medify-ma40-rf` |
| All six have *some* CTA → correct Medify PDP | 6/6 | **PROVEN** pass (ma25/ma40 via alternate OEM CTA) |

**Overall cohort verdict (strict OEM-primary buyer path):** **PARTIAL PASS** — 4/6 slugs fully pass; 2/6 fail Amazon-primary override.

**Overall cohort verdict (safe CTA reachability only):** **PASS** — 6/6 slugs expose verified buy paths that resolve live.

---

## E. Production/runtime discrepancies

| Discrepancy | Affected slugs | Detail | Label |
|-------------|----------------|--------|-------|
| Amazon-primary CTA sort | `medify-ma25-rf`, `medify-ma40-rf` | Primary verified CTA is **Amazon** despite committed CSV `oem-catalog` primary with `direct_buyable` Medify PDP. Alternate CTA is OEM and hits correct PDP. Matches Levoit-class `amazonExactOemPrimaryBoost` behavior when competing `amazon` rows carry `direct_buyable`. | **PROVEN** |
| Amazon `browser_truth_checked_at` stale on live primary | `medify-ma25-rf`, `medify-ma40-rf` | Live HTML footnote on Amazon primary CTA shows check date **2026-04-23**; OEM alternate reflects post-apply parity state. | **PROVEN** |
| Single-CTA OEM pages | `medify-ma18-rf`, `medify-ma22-rf`, `medify-ma50-rf`, `medify-ma112-rf` | No Amazon verified CTA rendered — only OEM oem-catalog. | **PROVEN** |
| CSV factory vs live primary ordering | `medify-ma25-rf`, `medify-ma40-rf` | CSV apply + Supabase parity **PROVEN** correct for oem-catalog `after_row`; live primary ordering diverges due to runtime CTA sort policy + competing Amazon rows, not CSV/parity failure. | **PROVEN** |
| `deployed_commit` | all | Not inferred from smoke probes. | **UNKNOWN** |

**Not observed:** `/go-unavailable` on any scoped filter page.

---

## 1. Factory proof (repo — unchanged by smoke)

### CSV executor apply

**Artifact:** `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1-apply.json`

| Field | Value | Label |
|-------|-------|-------|
| `apply_status` | `APPLIED` | **PROVEN** |
| `applied_change_count` | `6` | **PROVEN** |
| `ap_safe_cta_count_before` | `15` | **PROVEN** |
| `ap_safe_cta_count_after` | `21` | **PROVEN** |
| `ap_safe_cta_delta` | `+6` | **PROVEN** |

### Supabase parity

**Artifact:** `docs/air-purifier/AP-MEDIFY-MA-SERIES-SUPABASE-PARITY-RESULT-v1.md`

| Stage | Result | Label |
|-------|--------|-------|
| Parity `--apply` | `APPLIED`, `applied_change_count: 6` | **PROVEN** |
| Post-apply dry-run | `ALREADY_APPLIED`, `already_applied_count: 6` | **PROVEN** |

---

## 2. Commands / probes used (read-only)

### Filter route probe (all six)

```bash
for slug in medify-ma18-rf medify-ma22-rf medify-ma25-rf medify-ma40-rf medify-ma50-rf medify-ma112-rf; do
  curl -sS -o /dev/null -w "${slug} HTTP:%{http_code} URL:%{url_effective}\n" \
    -L "https://buckparts.com/air-purifier/filter/${slug}"
done
```

### Go-link + redirect probe (primary and alternate)

```bash
for slug in medify-ma18-rf medify-ma22-rf medify-ma25-rf medify-ma40-rf medify-ma50-rf medify-ma112-rf; do
  html=$(curl -sS -L "https://buckparts.com/air-purifier/filter/$slug")
  echo "=== $slug ==="
  echo "$html" | rg -o '/air-purifier/go/[0-9a-f-]{36}' | sort -u
  first=$(echo "$html" | rg -o '/air-purifier/go/[0-9a-f-]{36}' | head -1)
  curl -sS -o /dev/null -w "primary_redirect: %{url_effective}\n" -L "https://buckparts.com$first"
done
```

Node follow-up probe (labels + pass flags) executed at probe time `2026-06-15T18:36:21Z` against the same six URLs.

---

## 3. CTA ordering — why Amazon is primary on ma25/ma40 (read-only audit)

| Fact | Label |
|------|-------|
| `TieredBuyLinks` primary = `sortBestVerifiedBuyLinks(...)[0]` | **PROVEN** (`src/components/TieredBuyLinks.tsx`) |
| `is_primary` DB flag is **not** used in sort logic | **PROVEN** (`src/lib/retailers/launch-buy-links.ts`) |
| Committed CSV has `amazon` secondary rows for ma25/ma40 with `is_primary: false` | **PROVEN** |
| Live pages show Amazon as primary when both Amazon + OEM are `direct_buyable` | **PROVEN** (ma25, ma40 probes) |
| OEM Medify PDP reachable as **alternate** verified CTA on ma25/ma40 | **PROVEN** |

**Do not claim:** Medify OEM is the **primary** verified CTA on live pages for `medify-ma25-rf` or `medify-ma40-rf`. That is **NOT PROVEN** and is **false** per live smoke.

---

## F. No-mutation confirmation

| Constraint | Status |
|------------|--------|
| CSV edited | **No** |
| Supabase touched | **No** |
| Deploy performed | **No** |
| Application code changed | **No** |
| Apply plans created or executed | **No** |
| `data/owner-decisions/` rows | **No** |
| Only authorized artifact | **Yes** — this docs-only smoke report |

---

## 4. Product decision remaining (not authorized here)

For `medify-ma25-rf` and `medify-ma40-rf`, owner must choose in a **separate** packet whether Amazon-primary / OEM-alternate is acceptable (Levoit-class) or whether OEM-primary requires scoped Amazon row demotion or sort-policy change. This smoke doc records facts only; it does **not** authorize mutation.

---

## 5. Optional read-only re-verification

```bash
slug=medify-ma25-rf
html=$(curl -sS -L "https://buckparts.com/air-purifier/filter/$slug")
first=$(echo "$html" | rg -o '/air-purifier/go/[0-9a-f-]{36}' | head -1)
curl -sS -o /dev/null -w "%{url_effective}\n" -L "https://buckparts.com$first"
# Expect: https://www.amazon.com/dp/B084Q965BF?tag=buckparts20-20

second=$(echo "$html" | rg -o '/air-purifier/go/[0-9a-f-]{36}' | sed -n '2p')
curl -sS -o /dev/null -w "%{url_effective}\n" -L "https://buckparts.com$second"
# Expect: https://medifyair.com/products/ma-25-replacement-filter-set
```

---

## 6. Related docs

- `docs/air-purifier/AP-MEDIFY-MA-SERIES-SUPABASE-PARITY-RESULT-v1.md`
- `docs/air-purifier/AP-MEDIFY-MA-SERIES-EVIDENCE-WRITE-OWNER-REVIEW-v1.md`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1-apply.json`
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-PRODUCTION-SMOKE-RESULT-v1.md` (Levoit Amazon-primary precedent)
- `src/lib/retailers/launch-buy-links.ts`
- `src/components/TieredBuyLinks.tsx`

---

## 7. Disclaimer

Production smoke for the six-slug Medify MA-series cohort is **PROVEN** at the level of: live routes **200**, verified buy CTAs present on all six pages, and `/go` links resolving live. **Four** slugs (`ma18`, `ma22`, `ma50`, `ma112`) pass strict OEM-primary buyer-path checks. **Two** slugs (`ma25`, `ma40`) **fail** strict OEM-primary checks due to **Amazon-primary** verified CTA ordering; OEM Medify PDP is reachable via **alternate** CTA. CSV factory (+6 safe CTA) and Supabase oem-catalog parity are **PROVEN** complete per prior artifacts. This packet does **not** perform deploy, does **not** mutate production data, and does **not** authorize Amazon demotion or sort-policy change.
