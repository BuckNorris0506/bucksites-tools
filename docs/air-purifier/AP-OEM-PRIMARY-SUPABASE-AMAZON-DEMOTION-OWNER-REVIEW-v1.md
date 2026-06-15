# AP OEM-primary — Supabase Amazon demotion owner review v1

## Ten-slug orphan Amazon cleanup

**Report type:** docs-only owner decision support — **scoped Supabase data cleanup authorization only**  
**Generated:** 2026-06-15  
**Repo checkpoint:** `7d292c4` or newer  
**Scope:** **ten** filter slugs only (see §1)  
**Prior audit:** OEM-vs-Amazon policy impact audit (read-only Supabase + CSV sort replay, 2026-06-15)  
**Related smoke:** `docs/air-purifier/AP-MEDIFY-MA-SERIES-PRODUCTION-SMOKE-RESULT-v1.md`, `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-PRODUCTION-SMOKE-RESULT-v1.md`

**This packet:** Requests owner authorization for **Option A scoped Supabase demotion** only. **Does not** perform mutation, authorize ranking-policy change, CSV edit, deploy, or owner-decision row creation.

---

## Executive summary

| Fact | Status | Label |
|------|--------|-------|
| Ten slugs have dual verified Amazon + OEM in production Supabase | Yes | **PROVEN** (read-only audit) |
| Runtime primary CTA is Amazon on all ten | Yes | **PROVEN** (`amazonExactOemPrimaryBoost`) |
| Committed CSV Amazon `browser_truth_*` empty for rows that exist | Yes | **PROVEN** (factory intent OEM-primary) |
| Six Levoit/Other slugs have **no** Amazon row in CSV — Supabase Amazon is orphan | Yes | **PROVEN** |
| OEM `oem-catalog` rows remain `direct_buyable` after cleanup | Yes (if demotion only) | **INFERRED** |
| `safe_cta_count` (committed CSV, 21) decreases from this cleanup | No | **PROVEN** — CSV untouched |
| Per-slug live safe CTA remains ≥1 when OEM stays gated | Yes | **INFERRED** |
| Ranking-policy / code change required for this Option A | No | **PROVEN** |
| Any mutation from this document alone | None | **PROVEN** |

---

## 1. Exact affected slug list

| # | Slug | Cohort | Current live primary | Intended primary (CSV/factory) |
|---|------|--------|----------------------|--------------------------------|
| 1 | `medify-ma25-rf` | Medify | Amazon | OEM Medify PDP |
| 2 | `medify-ma40-rf` | Medify | Amazon | OEM Medify PDP |
| 3 | `levoit-rf-rar040` | Levoit | Amazon | OEM Levoit PDP |
| 4 | `levoit-rf-rar060` | Levoit | Amazon | OEM Levoit PDP |
| 5 | `levoit-rf-cr200` | Levoit | Amazon | OEM Levoit PDP |
| 6 | `levoit-rf-c131` | Levoit | Amazon | OEM Levoit PDP |
| 7 | `gg-flt5000` | Other AP | Amazon | OEM Guardian PDP |
| 8 | `coway-max2-hepa` | Other AP | Amazon | OEM Coway PDP |
| 9 | `winix-hepa-115115` | Other AP | Amazon | OEM Winix PDP |
| 10 | `honeywell-hrf-r1` | Other AP | Amazon | OEM Honeywell PDP |

**Explicitly out of scope:** all other AP slugs, refrigerator water filters, `medify-ma35-rf`, ranking-policy edits, `launch-buy-links.ts`, deploy, CSV mutation.

---

## 2. Why this is data cleanup — not ranking-policy change

| Layer | Option A (this packet) | Ranking-policy change (not authorized) |
|-------|------------------------|----------------------------------------|
| **Mechanism** | Clear orphan/stale `browser_truth_*` on **Amazon** `air_purifier_retailer_links` rows so `filterRealBuyRetailerLinks()` drops them (`missing_browser_truth`) | Edit `amazonExactOemPrimaryBoost` / sort precedence in `src/lib/retailers/launch-buy-links.ts` |
| **Aligns with** | Committed `data/air-purifier/retailer_links.csv` (Amazon secondary, empty `browser_truth`) | New global rule: OEM wins when both verified |
| **Deploy** | Not required — runtime reads Supabase on next request | Requires code deploy |
| **Blast radius control** | Exactly ten Amazon rows | All current and future dual-verified exact-OEM pages |
| **Recurrence** | Re-breaks if Amazon `direct_buyable` is re-applied to Supabase without policy guard | Durable against future Amazon truth |

**PROVEN:** Production Amazon-primary on these ten slugs is caused by Supabase Amazon rows carrying `browser_truth_classification: direct_buyable` while CSV does not. Demotion restores CSV/factory posture **without** changing sort code.

---

## 3. Safe CTA count — does not decrease

**Committed CSV (`ap_safe_cta_count: 21`):** Unchanged — this packet does not edit `data/air-purifier/retailer_links.csv`.

**Per-slug buyer-path gate:**

- **Before cleanup:** Two rows pass gate (Amazon + OEM `direct_buyable`).
- **After cleanup:** One row passes gate (OEM `direct_buyable` only).
- **Safe CTA per slug:** Remains **≥1** — OEM verified buy path stays live.

**INFERRED:** Truth-spine `safe_cta_count` remains **21** after Supabase demotion (CSV-authoritative metric unchanged).

**INFERRED:** Live filter pages retain a BuckParts Verified Link (OEM primary) on all ten slugs; pages do not regress to “no verified link.”

---

## 4. Risks and tradeoffs

| Risk | Detail | Severity |
|------|--------|----------|
| **Amazon affiliate primary clicks decrease** | Primary `/go` shifts from `amazon.com/...?tag=buckparts20-20` to manufacturer PDP | **Expected** on all ten pages |
| **Amazon alternate may disappear** | After demotion, Amazon fails `filterRealBuyRetailerLinks` — no “Other BuckParts Verified Links” Amazon button unless Amazon is re-verified | **Expected** — matches CSV (secondary/unverified) |
| **Monetization** | Near-term affiliate revenue on primary CTA likely lower on flipped pages | **INFERRED** |
| **Trust / buyer path** | Primary aligns with factory-evidence OEM PDPs (Medify, Levoit Consumer Naming Bridge, etc.) | **Positive** |
| **OEM row accidental mutation** | Cleanup must touch **Amazon rows only** | **Mitigate** with slug-scoped apply + post-apply dry-run |
| **Regression if Amazon truth re-applied** | Orphan Amazon `direct_buyable` could return without policy guard | **INFERRED** — separate policy packet may be needed later |

---

## 5. Exact proposed Supabase cleanup scope (if Option A approved)

**Table:** `public.air_purifier_retailer_links`  
**Row selector (all must match):**

- Parent filter `slug` ∈ ten-slug list (§1)
- `retailer_key = 'amazon'`
- `status = 'approved'`
- Row currently has `browser_truth_classification = 'direct_buyable'` (orphan/stale vs CSV)

**Fields to clear (demote to CSV-equivalent):**

| Field | After value |
|-------|-------------|
| `browser_truth_classification` | `''` (empty) |
| `browser_truth_notes` | `''` (empty) |
| `browser_truth_checked_at` | `''` (empty) |

**Fields that must NOT change:**

- `affiliate_url`, `destination_url`
- `retailer_name`, `retailer_key`, `retailer_slug`
- `is_primary` (remain `false` where already false)
- `status`
- **All `oem-catalog` / `oem-parts-catalog` rows** on the ten slugs

**Expected post-cleanup runtime (per slug):**

- `filterRealBuyRetailerLinks()` → OEM only
- `sortBestVerifiedBuyLinks()` → OEM primary (no competing gated Amazon)
- Primary `/go` → manufacturer PDP per committed CSV / parity `after_row`

**Row count:** Up to **ten** Amazon row updates (one per slug where orphan `direct_buyable` exists).

---

## 6. Owner decision requested

Choose **exactly one** option and record in chat. **Do not** create `data/owner-decisions/` rows from this packet.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — AUTHORIZE SUPABASE AMAZON DEMOTION (ALL TEN)                    │
│                                                                             │
│  I authorize scoped Supabase cleanup: clear browser_truth_classification, │
│  browser_truth_notes, and browser_truth_checked_at on Amazon              │
│  air_purifier_retailer_links rows for all ten slugs in §1.                │
│                                                                             │
│  I do NOT authorize: CSV edit, deploy, launch-buy-links.ts change,         │
│  global ranking-policy change, oem-catalog row mutation, or slugs outside   │
│  the ten-slug list.                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — AUTHORIZE NAMED SUBSET ONLY                                     │
│                                                                             │
│  I authorize Supabase Amazon browser_truth demotion only for these slugs:   │
│  _______________________________________________                            │
│                                                                             │
│  Non-listed slugs remain unchanged.                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION C — HOLD                                                            │
│                                                                             │
│  I do not authorize Supabase Amazon demotion for this ten-slug cohort       │
│  at this time.                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Option A — chat template

```text
OPTION A — AUTHORIZE SUPABASE AMAZON DEMOTION (ALL TEN)

I authorize scoped Supabase cleanup per AP-OEM-PRIMARY-SUPABASE-AMAZON-DEMOTION-OWNER-REVIEW-v1 §5:
clear browser_truth_classification, browser_truth_notes, and browser_truth_checked_at
on Amazon air_purifier_retailer_links rows for:

  medify-ma25-rf
  medify-ma40-rf
  levoit-rf-rar040
  levoit-rf-rar060
  levoit-rf-cr200
  levoit-rf-c131
  gg-flt5000
  coway-max2-hepa
  winix-hepa-115115
  honeywell-hrf-r1

I do NOT authorize: CSV edit, deploy, launch-buy-links.ts, global ranking-policy change,
oem-catalog mutation, or slugs outside this list.
```

---

## 7. Hard boundaries

- [ ] **No** Supabase mutation from this document alone
- [ ] **No** `data/air-purifier/retailer_links.csv` edit
- [ ] **No** `launch-buy-links.ts` or ranking-policy change
- [ ] **No** deploy authorization
- [ ] **No** `data/owner-decisions/` row creation from this packet
- [ ] **No** oem-catalog / OEM row mutation
- [ ] **No** slugs outside the ten-slug list
- [ ] **No** global OEM-primary policy change (separate packet if needed)

---

## 8. Post-approval verification (read-only — not authorized by hold)

After a **separate** operator step executes demotion (not this doc):

1. Re-run production smoke probes on affected slugs (filter 200, primary `/go` → OEM PDP).
2. Confirm `safe_cta_count` unchanged in truth spine (CSV).
3. Confirm Amazon no longer appears as primary verified CTA on the ten pages.

Example read-only probe:

```bash
slug=medify-ma25-rf
html=$(curl -sS -L "https://buckparts.com/air-purifier/filter/$slug")
first=$(echo "$html" | rg -o '/air-purifier/go/[0-9a-f-]{36}' | head -1)
curl -sS -o /dev/null -w "%{url_effective}\n" -L "https://buckparts.com$first"
# Expect after demotion: medifyair.com/products/ma-25-replacement-filter-set
```

---

## 9. Related docs

- `docs/air-purifier/AP-MEDIFY-MA-SERIES-PRODUCTION-SMOKE-RESULT-v1.md`
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-PRODUCTION-SMOKE-RESULT-v1.md`
- `docs/air-purifier/AP-MEDIFY-MA-SERIES-SUPABASE-PARITY-RESULT-v1.md`
- `data/air-purifier/retailer_links.csv`
- `src/lib/retailers/launch-buy-links.ts` (`amazonExactOemPrimaryBoost`, `filterRealBuyRetailerLinks`)

---

## 10. Disclaimer

This packet authorizes **scoped Supabase Amazon browser_truth demotion** only — aligning production with committed CSV/factory OEM-primary intent on ten dual-verified pages. It does **not** change safe CTA inventory on OEM rows, does **not** edit CSV, does **not** change ranking policy, and does **not** perform mutation until owner Option A or B is recorded and a separate operator apply step runs.
