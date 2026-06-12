# AP Supabase parity readiness owner review — Winix Filter H `116130` v1

## `winix-filter-h-116130`

**Report type:** read-only owner decision support — **Supabase parity dry-run / readiness only**  
**Generated:** 2026-06-10  
**Repo checkpoint:** `b341441`  
**Scope:** **one** filter slug only — `winix-filter-h-116130` — **not** `winix-filter-s-1712-0096-00`, **not** `winix-carbon-116131` demotion/repair  
**Truth source:** committed CSV, slug-scoped apply plan, parity script contract, live parity dry-run (2026-06-10)

**Prior factory stages (local CSV — PROVEN complete):**

Catalog → Discovery → Validation → Canonical Evidence → Aggregator → Apply Plan → Dry-run → Executor Apply → `retailer_links.csv` `direct_buyable`

**Not PROVEN:** Supabase parity · live public deploy · production safe CTA on live site

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner authorization for **Supabase parity dry-run** inspection (read-only DB) | Authorization for parity `--apply` (Supabase mutation) |
| Readiness analysis for net-new slug parity path | Authorization for `seed:import:air-purifier` (separate packet) |
| Scope lock on **one slug** via slug-scoped apply plan | Deploy, public UI code change, or CSV mutation |
| Docs-only until owner records Option A in chat | `data/owner-decisions/` row creation (unless separately requested) |

**PROVEN:** Parity dry-run (`mode: dry_run`) sets `data_mutation: false` and performs no Supabase writes.

**PROVEN:** This packet alone does **not** authorize parity `--apply`, full vertical seed, deploy, or public UI mutation.

---

## Owner decision box

Choose **exactly one** and record in chat.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE SUPABASE PARITY DRY-RUN / READINESS ONLY                │
│                                                                             │
│  I authorize read-only Supabase parity inspection for winix-filter-h-116130 │
│  using the slug-scoped apply plan per §5.                                   │
│                                                                             │
│  Command (dry-run — no --apply):                                            │
│    npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts                 │
│      --plan data/air-purifier/batch-production/apply-plans-batch-v2/        │
│        ap-apply-plan-winix-filter-h-116130-v1.json                          │
│                                                                             │
│  I do NOT approve: parity --apply, seed import, deploy, CSV changes,        │
│  other slugs, or winix-carbon-116131 mapping changes.                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — DO NOT APPROVE                                                  │
│                                                                             │
│  I do not approve Supabase parity inspection or mutation for                │
│  winix-filter-h-116130 at this time.                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Separate authorization required for Supabase mutation:**

- `seed:import:air-purifier` — if net-new rows must be inserted (see §4)
- `apply-air-purifier-supabase-parity-v1.ts --apply` — if parity update path is viable after preconditions

---

## 1. Current committed CSV row (PROVEN at `b341441`)

**File:** `data/air-purifier/retailer_links.csv`  
**Row:** `filter_slug=winix-filter-h-116130`, `retailer_key=oem-catalog`, `is_primary=true`

| Column | Value |
|--------|-------|
| `destination_url` | `https://www.winixamerica.com/product/filter-h-116130/` |
| `affiliate_url` | `https://www.winixamerica.com/product/filter-h-116130/` |
| `browser_truth_classification` | `direct_buyable` |
| `browser_truth_notes` | Populated (live re-proof 2026-06-10 evidence notes) |
| `browser_truth_checked_at` | `2026-06-12T18:47:54.123Z` |

**PROVEN:** Local CSV executor apply complete (`ap-apply-run-winix-filter-h-116130-v1-apply.json`, `apply_status: APPLIED`).

**PROVEN:** Committed local safe CTA count = **11** (executor post-apply: 10 → 11, `ap_safe_cta_delta: 1`).

---

## 2. Supabase tables / rows (from repo scripts)

### Parity script target (update-only)

| Table | Role | Match key |
|-------|------|-----------|
| `air_purifier_filters` | Resolve `filter_id` by `slug` | `slug = winix-filter-h-116130` (read) |
| `air_purifier_retailer_links` | **Update** approved OEM link | `air_purifier_filter_id` + `retailer_key = oem-catalog` + `status = approved` |

**PROVEN:** Parity patches these fields on matched link row (`AP_SUPABASE_PARITY_UPDATE_FIELDS_V1`):

`affiliate_url`, `destination_url`, `retailer_name`, `is_primary`, `retailer_key`, `retailer_slug`, `browser_truth_classification`, `browser_truth_notes`, `browser_truth_checked_at`

### Full vertical seed path (insert/upsert — separate command)

If net-new identity is absent from Supabase, `npm run seed:import:air-purifier` may also touch:

| Table | CSV source | Net-new for `116130` |
|-------|------------|----------------------|
| `brands` | `data/air-purifier/brands.csv` | **INFERRED** `winix` already exists |
| `air_purifier_filters` | `data/air-purifier/filters.csv` | **INFERRED** insert/upsert needed |
| `air_purifier_filter_aliases` | `data/air-purifier/filter_aliases.csv` | **INFERRED** alias `116130` |
| `air_purifier_compatibility_mappings` | `data/air-purifier/compatibility_mappings.csv` | **INFERRED** `winix-5500-2` mapping |
| `air_purifier_retailer_links` | `data/air-purifier/retailer_links.csv` | **INFERRED** primary `oem-catalog` link |

**PROVEN:** Parity script does **not** insert into any table.

---

## 3. Repo parity / import commands

| Command | Purpose | Mutates Supabase? |
|---------|---------|-------------------|
| `npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan <plan>` | Parity **dry-run** (default) | **No** |
| `npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan <plan> --apply` | Parity **apply** (update only) | **Yes** — `air_purifier_retailer_links` only |
| `npm run seed:import:air-purifier` | Full AP vertical CSV → Supabase seed | **Yes** — multiple AP tables |

**Slug-scoped plan path (required for this packet):**

`data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json`

**Plan contract (PROVEN):**

- `plan_status`: `READY_FOR_OWNER_APPROVAL`
- `planned_change_count`: `1`
- `planned_changes[0].filter_slug`: `winix-filter-h-116130`
- `before_row`: search placeholder (`…/search?q=WINIX-116130`)
- `after_row`: PDP + `direct_buyable`

---

## 4. Update vs insert — net-new slug behavior

| Path | Can insert net-new filter/link? | Label |
|------|----------------------------------|-------|
| `apply-air-purifier-supabase-parity-v1.ts` | **No** — update-by-`id` on existing approved row only | **PROVEN** (file header + tests) |
| `import-air-purifier-seed.ts` | **Yes** — upsert/insert via `vertical-seed` + `bulkApplyRetailerLinksByAffiliateMatch` | **PROVEN** (script exists) |
| Parity after seed with current CSV | May report `ALREADY_APPLIED` if DB matches plan `after_row` | **INFERRED** |
| Parity without prior seed for net-new slug | **BLOCKED** — filter slug not found | **PROVEN** (live dry-run below) |

### Live parity dry-run result (2026-06-10, read-only)

```json
{
  "apply_status": "BLOCKED",
  "blocked_reasons": [
    "winix-filter-h-116130: air_purifier_filters.slug not found"
  ],
  "rows": [{
    "filter_slug": "winix-filter-h-116130",
    "filter_id": null,
    "link_id": null,
    "match_mode": "none",
    "would_update": false
  }]
}
```

**PROVEN:** Supabase does **not** currently have `air_purifier_filters.slug = winix-filter-h-116130`.

**INFERRED:** Parity `--apply` cannot succeed until filter (and approved link row) exist in Supabase.

**UNKNOWN:** Whether a partial seed or manual DB row exists under a different slug alias (dry-run used exact slug match).

---

## 5. Preconditions before any Supabase mutation

| # | Precondition | Current status |
|---|--------------|----------------|
| 1 | Local CSV factory complete for slug | **PROVEN** — `direct_buyable` in `retailer_links.csv` |
| 2 | Slug-scoped apply plan committed | **PROVEN** — `ap-apply-plan-winix-filter-h-116130-v1.json` |
| 3 | Executor apply-run artifact | **PROVEN** — `ap-apply-run-winix-filter-h-116130-v1-apply.json` |
| 4 | `SUPABASE_URL` + service role in `.env.local` | **PROVEN** present (dry-run connected) |
| 5 | `air_purifier_filters.slug` exists in Supabase | **PROVEN missing** (live dry-run) |
| 6 | Exactly one approved `air_purifier_retailer_links` row (`oem-catalog`) | **UNKNOWN** — blocked at step 5 |
| 7 | DB row matches plan `before_row` OR `after_row` | **UNKNOWN** — no link row resolved |
| 8 | Owner authorization for chosen mutation path | **PROVEN pending** — this packet is readiness only |
| 9 | No deploy / public UI authorization bundled | **PROVEN** — out of scope |

### Recommended sequence (informational — not authorized by this packet)

1. **Separate owner packet** → `npm run seed:import:air-purifier` (insert net-new filter + link from current CSV)
2. Re-run parity dry-run with slug-scoped plan
3. If `DRY_RUN_READY` → **separate owner packet** → parity `--apply`
4. If `ALREADY_APPLIED` after seed → document parity noop; verify live runtime separately
5. **Separate** deploy / production smoke authorization

---

## 6. Safety gates (no weakening)

| Gate | Status |
|------|--------|
| Parity plan `after_row.browser_truth_classification` | `direct_buyable` — **PROVEN** |
| Parity refuses non-`oem-catalog` `retailer_key` | **PROVEN** (unit tests) |
| Parity refuses multiple approved rows per target | **PROVEN** (unit tests) |
| Parity refuses DB drift (neither before nor after match) | **PROVEN** (unit tests) |
| No insert path on parity deps | **PROVEN** (unit tests) |
| Scope limited to plan `planned_changes` slugs | **PROVEN** — plan has 1 slug only |

---

## 7. Hard boundaries

- [ ] No deploy / Netlify API mutation from this packet
- [ ] No public UI code mutation
- [ ] No CSV mutation (`retailer_links.csv` frozen at post-apply state)
- [ ] No other slug parity or seed side effects (use slug-scoped plan only)
- [ ] No `winix-carbon-116131` compat mapping changes
- [ ] No `data/owner-decisions/` rows unless separately requested
- [ ] No parity `--apply` without separate owner authorization
- [ ] No full `seed:import:air-purifier` without separate owner authorization

---

## 8. Validation commands

### Read-only contract tests (no Supabase)

```bash
node --import tsx --test scripts/apply-air-purifier-supabase-parity-v1.test.ts
```

**Expected:** 20/20 pass (**PROVEN** at packet authoring).

### Read-only parity inspection (live Supabase, no mutation)

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json
```

**Current expected result at `b341441`:** `apply_status: BLOCKED`, reason `air_purifier_filters.slug not found`.

### Confirm local CSV row (no Supabase)

```bash
awk -F',' '$1=="winix-filter-h-116130" && $4=="true" {
  print "destination_url:", $7
  print "browser_truth_classification:", $8
  print "browser_truth_checked_at:", $10
}' data/air-purifier/retailer_links.csv
```

### Confirm plan scope

```bash
node -e "
const p=require('./data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json');
console.log({
  plan_status: p.plan_status,
  count: p.planned_change_count,
  slugs: p.planned_changes.map(c=>c.filter_slug),
  rollback: p.rollback_rows.length
});
"
```

---

## 9. PROVEN / INFERRED / UNKNOWN summary

| Claim | Label |
|-------|-------|
| Local CSV row is `direct_buyable` PDP for `winix-filter-h-116130` | **PROVEN** |
| Local safe CTA count = 11 | **PROVEN** (executor post-apply) |
| Slug-scoped apply plan exists with 1 planned change | **PROVEN** |
| Parity script is update-only on `air_purifier_retailer_links` | **PROVEN** |
| Parity dry-run performs no Supabase writes | **PROVEN** |
| `air_purifier_filters.slug` missing in live Supabase | **PROVEN** (live dry-run `b341441`) |
| Net-new slug requires seed import before parity can update | **INFERRED** |
| After seed with current CSV, parity may report `ALREADY_APPLIED` | **INFERRED** |
| Live public site exposes safe CTA for this slug | **UNKNOWN** |
| Supabase parity applied for this slug | **UNKNOWN** (not applied; dry-run blocked) |
| Production deploy reflects CSV change | **UNKNOWN** |

---

## 10. Related docs

- `docs/air-purifier/AP-EXECUTOR-DRY-RUN-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`
- `docs/air-purifier/AP-APPLY-AUTHORIZATION-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`
- `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json`
- `scripts/lib/air-purifier-supabase-apply-parity-v1.ts`

---

## 11. Disclaimer

This packet authorizes **read-only** Supabase parity inspection only. Local CSV factory completion does **not** imply Supabase parity or live public coverage. Net-new slug `winix-filter-h-116130` is **BLOCKED** on parity today because the filter row is absent from Supabase. Insert/upsert requires a **separate** `seed:import:air-purifier` authorization before parity update can be evaluated.
