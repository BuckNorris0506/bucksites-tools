# AP Consumer Naming Bridge — Supabase parity owner review v1

## Four-slug Levoit cohort

**Report type:** read-only owner decision support — **Supabase parity `--apply` authorization only**  
**Generated:** 2026-06-13  
**Repo checkpoint:** `67c864c`  
**Scope:** **four** filter slugs only — `levoit-rf-rar040`, `levoit-rf-rar060`, `levoit-rf-c131`, `levoit-rf-cr200`  
**Truth source:** committed CSV, cohort apply plan, cohort executor apply-run, parity script contract, live parity dry-run (2026-06-13)

**Prior factory stages (local CSV — PROVEN complete):**

Catalog → Discovery → Validation → Canonical Evidence → Aggregator → Apply Plan → Executor Dry-run → Executor Apply → `retailer_links.csv` `direct_buyable` (+4 safe CTA)

**Not PROVEN:** Supabase parity applied · live public deploy · production safe CTA on live site

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner authorization for **Supabase parity `--apply`** on four existing `air_purifier_retailer_links` rows | Authorization for `seed:import:air-purifier` |
| Bounded update path via cohort-scoped apply plan | SQL insert plan, alias edits, or compatibility mapping edits |
| Scope lock on **four Levoit slugs** via cohort apply plan | Deploy, public UI code change, or CSV mutation |
| Docs-only until owner records Option A in chat | `data/owner-decisions/` row creation (unless separately requested) |

**PROVEN:** Parity dry-run (`mode: dry_run`) sets `data_mutation: false` and performs no Supabase writes.

**PROVEN:** Parity `--apply` mutates **only** `public.air_purifier_retailer_links` — update-by-`id` on exactly one approved `oem-catalog` row per slug. No insert path.

**PROVEN:** This packet does **not** authorize seed import, SQL insert, CSV changes, deploy, or non-cohort slugs unless owner separately approves those paths.

---

## Owner decision box

Choose **exactly one** and record in chat.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE SUPABASE PARITY --apply (FOUR SLOTS)                    │
│                                                                             │
│  I authorize Supabase parity --apply for the Levoit Consumer Naming Bridge  │
│  cohort (four slugs) using the cohort apply plan per §4.                    │
│                                                                             │
│  Command (apply — mutates Supabase):                                        │
│    npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts                 │
│      --plan data/air-purifier/batch-production/apply-plans-batch-v2/        │
│        ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json           │
│      --apply                                                                  │
│                                                                             │
│  Expected: apply_status APPLIED, applied_change_count 4.                    │
│                                                                             │
│  I do NOT approve: seed import, SQL insert, CSV mutation, deploy,          │
│  alias edits, compatibility edits, or any non-cohort slug.                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — HOLD                                                            │
│                                                                             │
│  I do not approve Supabase parity --apply for the four-slug Levoit cohort   │
│  at this time. Local CSV remains ahead of Supabase.                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. CSV apply proof (PROVEN at `67c864c`)

**Artifact:** `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.json`

| Field | Value |
|-------|-------|
| `apply_status` | `APPLIED` |
| `planned_change_count` | `4` |
| `applied_change_count` | `4` |
| `changed_slugs` | `levoit-rf-rar040`, `levoit-rf-rar060`, `levoit-rf-c131`, `levoit-rf-cr200` |
| `blocked_reasons` | `[]` |
| `only_target_slugs_changed` | `true` |
| `all_direct_buyable` | `true` |
| `no_search_urls_on_targets` | `true` |
| `ap_safe_cta_count_before` | `11` |
| `ap_safe_cta_count_after` | `15` |
| `ap_safe_cta_delta` | `+4` |

**Per-slug post-apply gate:** all four → `retailer_link_state: LIVE_DIRECT_BUYABLE`, `gate_failure_kind: null`.

**File:** `data/air-purifier/retailer_links.csv` — primary `oem-catalog` rows for all four slugs are PDP URLs with `browser_truth_classification: direct_buyable`.

| Slug | `destination_url` (committed CSV) |
|------|-------------------------------------|
| `levoit-rf-rar040` | `https://levoit.com/products/core-400s-p-3-stage-replacement-filter` |
| `levoit-rf-rar060` | `https://levoit.com/products/core-600s-p-original-replacement-filter` |
| `levoit-rf-c131` | `https://levoit.com/products/lv-pur131-air-purifier-replacement-filter` |
| `levoit-rf-cr200` | `https://levoit.com/products/core-200s-p-replacement-filter` |

---

## 2. Supabase parity dry-run proof (PROVEN — read-only, 2026-06-13)

**Command (no `--apply`):**

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json
```

**Live result summary:**

| Field | Value |
|-------|-------|
| `apply_status` | `DRY_RUN_READY` |
| `planned_change_count` | `4` |
| `already_applied_count` | `0` |
| `blocked_reasons` | `[]` |
| `mode` | `dry_run` |
| `data_mutation` | `false` |

**Per-row dry-run (all four):**

| Slug | `match_mode` | `would_update` | `filter_id` | `link_id` |
|------|--------------|----------------|-------------|-----------|
| `levoit-rf-rar040` | `before_row` | `true` | `f04f2d7f-1a89-4388-9f48-b575b6d57fde` | `46127e68-4cb9-4156-be42-8ff041a5a349` |
| `levoit-rf-rar060` | `before_row` | `true` | `82727461-7d26-4fb1-9961-4204a4808cab` | `bd21d26b-a6e8-4d77-a9cb-98a5358c754a` |
| `levoit-rf-c131` | `before_row` | `true` | `8695166f-2c73-4429-9d87-f9d01a3c5403` | `b11d77cb-ce83-427f-88cf-2d370e51ddc5` |
| `levoit-rf-cr200` | `before_row` | `true` | `829d8a4a-c378-4f49-b7bf-8c1de07f2bf3` | `c5a818b9-02c9-4349-8bae-af9c50cfd15f` |

**PROVEN:** Live Supabase still holds plan `before_row` (search-placeholder URLs, empty `browser_truth_*`). Local CSV holds plan `after_row` (PDP + `direct_buyable`). Parity `--apply` is the intended bridge.

**Contrast (Winix pattern):** Net-new slug `winix-filter-h-116130` dry-ran `BLOCKED` (`air_purifier_filters.slug not found`) and required seed/SQL before parity. This cohort does **not** have that blocker.

---

## 3. No seed import / SQL insert needed (PROVEN)

| Prerequisite | Levoit cohort status |
|--------------|----------------------|
| `air_purifier_filters.slug` exists for all four | **PROVEN** (dry-run resolved `filter_id` for each) |
| Exactly one approved `oem-catalog` link per slug | **PROVEN** (dry-run resolved `link_id` for each) |
| DB matches plan `before_row` | **PROVEN** (`match_mode: before_row`, all four) |
| Net-new filter/link insert | **Not required** |

**Explicit non-authorization in this packet:**

- No `npm run seed:import:air-purifier`
- No slug-scoped SQL insert plan
- No `filter_aliases.csv` mutation
- No `compatibility_mappings.csv` mutation

Parity script notes: *"Do not use npm run seed:import:air-purifier for this parity apply."*

---

## 4. Cohort apply plan contract (PROVEN)

**Path:** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json`

| Field | Value |
|-------|-------|
| `report_name` | `air_purifier_apply_planner_batch_v2_v1` (accepted by parity script) |
| `plan_status` | `READY_FOR_OWNER_APPROVAL` |
| `planned_change_count` | `4` |
| `planned_changes[].filter_slug` | cohort four only |
| `retailer_key` | `oem-catalog` (all four) |
| `before_row` | search placeholder + empty `browser_truth_*` |
| `after_row` | official Levoit PDP + `direct_buyable` |

**Parity update fields** (`AP_SUPABASE_PARITY_UPDATE_FIELDS_V1`):  
`affiliate_url`, `destination_url`, `retailer_name`, `is_primary`, `retailer_key`, `retailer_slug`, `browser_truth_classification`, `browser_truth_notes`, `browser_truth_checked_at`

---

## 5. Exact parity apply command (Option A only)

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json \
  --apply
```

**Requires:** `SUPABASE_URL` + service role in `.env.local` (dry-run already connected successfully).

**Expected result after owner Option A:**

| Field | Expected |
|-------|----------|
| `apply_status` | `APPLIED` |
| `applied_change_count` | `4` |
| `already_applied_count` | `0` (first apply) |
| `blocked_reasons` | `[]` |
| `data_mutation` | `true` |
| Per-row `match_mode` (post-apply) | `after_row` |
| Per-row `updated` | `true` (all four) |

**If re-run after successful apply:** expect `apply_status: ALREADY_APPLIED`, `applied_change_count: 0`, `already_applied_count: 4`.

---

## 6. Safety gates (no weakening)

| Gate | Status |
|------|--------|
| Plan `after_row.browser_truth_classification` | `direct_buyable` — **PROVEN** (all four) |
| Parity refuses non-`oem-catalog` `retailer_key` | **PROVEN** (unit tests) |
| Parity refuses multiple approved rows per target | **PROVEN** (unit tests) |
| Parity refuses DB drift (neither before nor after match) | **PROVEN** (unit tests) |
| No insert path on parity deps | **PROVEN** (unit tests + file header) |
| Scope limited to plan `planned_changes` slugs | **PROVEN** — plan has 4 cohort slugs only |
| Executor apply touched only cohort slugs | **PROVEN** (`only_target_slugs_changed: true`) |

---

## 7. Hard boundaries

- [ ] No deploy / Netlify API mutation from this packet
- [ ] No public UI code mutation
- [ ] No CSV mutation (`retailer_links.csv` frozen at post-apply `67c864c` state)
- [ ] No `seed:import:air-purifier`
- [ ] No SQL insert / upsert scripts
- [ ] No `filter_aliases.csv` edits
- [ ] No `compatibility_mappings.csv` edits
- [ ] No non-cohort slugs (`levoit-rf-rar029`, `levoit-vital200-rf`, Winix, GG, Coway, Rabbit, etc.)
- [ ] No `data/owner-decisions/` rows unless separately requested
- [ ] No parity `--apply` until owner records Option A in chat

---

## 8. Validation commands

### Read-only contract tests (no Supabase)

```bash
npx tsx --test scripts/apply-air-purifier-supabase-parity-v1.test.ts
```

### Read-only parity dry-run (re-verify before apply)

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json
```

**Expected at `67c864c`:** `DRY_RUN_READY`, `already_applied_count: 0`, four rows `before_row` / `would_update: true`.

### Confirm local CSV cohort rows (no Supabase)

```bash
awk -F',' '$1 ~ /^levoit-rf-rar040|levoit-rf-rar060|levoit-rf-c131|levoit-rf-cr200/ && $4=="true" {
  print $1, $7, $8
}' data/air-purifier/retailer_links.csv
```

### Confirm plan scope

```bash
node -e "
const p=require('./data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json');
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
| Local CSV executor apply complete for four slugs | **PROVEN** |
| Local safe CTA count 11 → 15 (+4) | **PROVEN** |
| Cohort apply plan committed with 4 planned changes | **PROVEN** |
| Parity dry-run `DRY_RUN_READY`, 4/4 `before_row` | **PROVEN** (live dry-run) |
| All four `filter_id` + `link_id` resolved in Supabase | **PROVEN** |
| Seed import / SQL insert not required | **PROVEN** |
| Parity script is update-only on `air_purifier_retailer_links` | **PROVEN** |
| Post Option A parity reports `APPLIED`, `applied_change_count: 4` | **INFERRED** (dry-run preconditions met) |
| Live public site exposes safe CTA for four slugs | **UNKNOWN** |
| Supabase parity applied for four slugs | **UNKNOWN** (pending Option A) |
| Production deploy reflects CSV change | **UNKNOWN** |

---

## 10. Related docs

- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md`
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EVIDENCE-WRITE-OWNER-REVIEW-v1.md`
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-APPLY-PLAN-OWNER-REVIEW-v1.md`
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EXECUTOR-DRYRUN-OWNER-REVIEW-v1.md`
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EXECUTOR-APPLY-OWNER-REVIEW-v1.md`
- `docs/air-purifier/AP-SUPABASE-PARITY-READINESS-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` (pattern only)
- `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.json`
- `scripts/lib/air-purifier-supabase-apply-parity-v1.ts`

---

## 11. Disclaimer

Local CSV factory completion at `67c864c` does **not** imply Supabase parity or live public coverage. Dry-run proves parity **readiness** (`DRY_RUN_READY`) — Supabase still holds search-placeholder `before_row` URLs for all four slugs. Owner Option A authorizes the bounded parity `--apply` command in §5 only. Seed import, SQL insert, CSV edits, alias/compatibility edits, deploy, and non-cohort slugs remain **out of scope** unless separately authorized.
