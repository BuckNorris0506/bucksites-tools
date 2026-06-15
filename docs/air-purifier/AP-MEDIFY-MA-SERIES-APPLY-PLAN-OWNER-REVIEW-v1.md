# AP Medify MA-series - apply-plan owner review v1

## Six-slug OEM Medify cohort

**Report type:** read-only owner decision support - **apply-plan artifact write authorization only**  
**Generated:** 2026-06-15  
**Repo checkpoint:** `1d798ad33f6d7c4fde408834321c8c8ef277fc77` or newer  
**Scope:** **six** filter slugs only - `medify-ma18-rf`, `medify-ma22-rf`, `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf`, `medify-ma112-rf`  
**Truth source:** Medify evidence-write packet, canonical OEM Medify evidence rows, Amazon-secondary reconciliation audit, normal AP agent-results aggregator

**Prior packet:** `docs/air-purifier/AP-MEDIFY-MA-SERIES-EVIDENCE-WRITE-OWNER-REVIEW-v1.md`

---

## Executive summary

| Fact | Status | Label |
|------|--------|-------|
| Canonical OEM Medify rows exist for all six scoped slugs | Yes | **PROVEN** |
| Normal aggregator reports all six scoped Medify slugs as `auto_apply_eligible` | Yes | **PROVEN** |
| Legacy Amazon-secondary duplicate rows removed from active aggregator scan path | Yes | **PROVEN** |
| Historical Amazon-secondary rows preserved under non-`.results.json` archive paths | Yes | **PROVEN** |
| Non-Medify Amazon-secondary evidence loss | None found | **PROVEN** |
| Apply-plan JSON written by this packet | No | **PROVEN** |
| Any CSV, Supabase, deploy, executor, or owner-decision mutation from this packet | None | **PROVEN** |

This packet asks for one owner decision: whether to authorize writing a cohort-scoped apply-plan artifact for the six OEM Medify rows that now pass strict aggregator validation.

---

## 1. Loss audit before this packet

Deleted active scan files were checked from `HEAD` before archival:

| Deleted active file | Row count | Slugs | Non-scope rows |
|---------------------|----------:|-------|----------------|
| `data/air-purifier/batch-production/agent-results/ap-amazon-secondary-v1.results.json` | 3 | `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf` | `[]` |
| `data/air-purifier/batch-production/agent-results-batch-v2/ap-amazon-secondary-v1.results.json` | 3 | `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf` | `[]` |

**PROVEN:** No non-Medify Amazon-secondary evidence was removed by the reconciliation.

Historical archive files now preserve the same three rows:

| Archive file | Archived from | Row count | Slugs |
|--------------|---------------|----------:|-------|
| `data/air-purifier/batch-production/agent-results/archive/ap-amazon-secondary-v1-medify-duplicates-archived.json` | `agent-results/ap-amazon-secondary-v1.results.json` | 3 | `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf` |
| `data/air-purifier/batch-production/agent-results-batch-v2/archive/ap-amazon-secondary-v1-medify-duplicates-archived.json` | `agent-results-batch-v2/ap-amazon-secondary-v1.results.json` | 3 | `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf` |

**PROVEN:** Archive files do not end in `.results.json`, so the normal aggregator does not scan them.

---

## 2. Current aggregator status

Read-only command:

```bash
node --import tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts \
  | jq '[.review_groups.auto_apply_eligible[] | select(.slug|startswith("medify")) | .slug]'
```

Output:

```json
[
  "medify-ma18-rf",
  "medify-ma22-rf",
  "medify-ma25-rf",
  "medify-ma40-rf",
  "medify-ma50-rf",
  "medify-ma112-rf"
]
```

Additional read-only aggregator snapshot:

| Field | Value |
|-------|-------|
| `result_file_count` | `3` |
| `row_count` | `22` |
| `auto_count` | `13` |
| Medify `owner_review_required` rows | `[]` |
| Medify `auto_apply_eligible` rows | all six scoped slugs |

**PROVEN:** The six OEM Medify rows surface through the normal AP aggregator without packet-precedence logic and without weakening duplicate-slug safety.

---

## 3. Per-slug apply-plan candidate status

Source evidence: `data/air-purifier/batch-production/agent-results/ap-medify-ma-series-cohort-v1.results.json`

| Slug | Final OEM PDP | Aggregator result |
|------|---------------|-------------------|
| `medify-ma18-rf` | `https://medifyair.com/products/ma-18-replacement-filter` | `auto_apply_eligible` |
| `medify-ma22-rf` | `https://medifyair.com/products/ma-22-replacement-filter` | `auto_apply_eligible` |
| `medify-ma25-rf` | `https://medifyair.com/products/ma-25-replacement-filter-set` | `auto_apply_eligible` |
| `medify-ma40-rf` | `https://medifyair.com/products/ma-40-replacement-filter-set` | `auto_apply_eligible` |
| `medify-ma50-rf` | `https://medifyair.com/products/ma-50-replacement-filter` | `auto_apply_eligible` |
| `medify-ma112-rf` | `https://medifyair.com/products/ma-112-filter-replacement-set` | `auto_apply_eligible` |

Each row remains subject to the existing aggregator gates:

- `decision: PASS_DIRECT_BUYABLE`
- `browser_truth_classification: direct_buyable`
- `buy_action_seen: true`
- PDP-like `final_url`
- non-empty `exact_tokens_seen`
- `wrong_family_tokens_seen: []`
- `owner_review_required: false`

**PROVEN:** This packet does not weaken wrong-family, `PASS_DIRECT_BUYABLE`, `owner_review_required`, direct-buyable, duplicate-slug, or Amazon policy gates.

---

## 4. Owner decision requested

Record exactly one option in chat. Do not create `data/owner-decisions/` rows from this packet.

```text
OPTION A - APPROVE APPLY-PLAN ARTIFACT WRITE FOR ALL SIX

I approve writing an apply-plan artifact for all six OEM Medify slugs:
  medify-ma18-rf
  medify-ma22-rf
  medify-ma25-rf
  medify-ma40-rf
  medify-ma50-rf
  medify-ma112-rf

I do NOT approve: apply-plan execution, executor dry-run, executor --apply,
retailer_links.csv edits, Supabase, deploy, owner-decision rows, Amazon row
promotion, or non-Medify slugs.
```

```text
OPTION B - APPROVE NAMED SUBSET ONLY

I approve writing an apply-plan artifact only for these named Medify slugs:
  [owner lists slug(s)]

All unlisted Medify slugs remain on hold. The same non-authorization list as
Option A applies.
```

```text
OPTION C - HOLD

I do not approve apply-plan artifact write for the Medify MA-series cohort at
this time.
```

---

## 5. Explicit non-authorization

This packet does not authorize:

- Writing apply-plan JSON or markdown before owner selects Option A or B
- Running an apply planner in write mode in this chat turn
- Running executor dry-run or executor `--apply`
- Editing `data/air-purifier/retailer_links.csv`
- Editing CSVs, compatibility mappings, aliases, or catalog rows
- Touching Supabase
- Deploying or changing public UI
- Creating `data/owner-decisions/` rows
- Promoting Amazon-secondary rows
- Adding packet precedence or changing aggregator duplicate-slug behavior

---

## 6. If Option A is approved later

The next step should be a separate, scoped apply-plan artifact write for the six listed Medify slugs only. After writing the artifact, re-run read-only validation and inspect planned slugs before any future executor packet.

Suggested post-write checks for that later turn:

```bash
node --import tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts \
  | jq '[.review_groups.auto_apply_eligible[] | select(.slug|startswith("medify")) | .slug]'

node --import tsx --test scripts/report-air-purifier-agent-results-aggregator-v1.test.ts
```

**Separate future owner authorization required:** any executor dry-run, executor `--apply`, Supabase parity, production smoke, or deploy.
