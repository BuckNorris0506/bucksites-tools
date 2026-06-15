# AP Medify MA-series - executor apply owner review v1

## Six-slug OEM Medify cohort

**Report type:** docs-only owner decision support - **executor `--apply` authorization only**  
**Generated:** 2026-06-15  
**Scope:** **six** filter slugs only - `medify-ma18-rf`, `medify-ma22-rf`, `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf`, `medify-ma112-rf`  
**Apply plan:** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json`

---

## Executive summary

| Fact | Status | Label |
|------|--------|-------|
| Medify apply-plan `plan_status` | `READY_FOR_OWNER_APPROVAL` | **PROVEN** |
| Medify apply-plan `planned_change_count` | `6` | **PROVEN** |
| Executor dry-run `apply_status` | `DRY_RUN_READY` | **PROVEN** |
| Executor dry-run `planned_change_count` | `6` | **PROVEN** |
| Executor dry-run `before_row_match_count` | `6` | **PROVEN** |
| Executor dry-run `validation_errors` | `[]` | **PROVEN** |
| Executor dry-run `blocked_reasons` | `[]` | **PROVEN** |
| Any CSV, Supabase, deploy, executor, or owner-decision mutation from this packet | None | **PROVEN** |

This packet asks for one owner decision: whether to authorize executor `--apply` for the six scoped Medify MA-series rows after a clean dry-run.

---

## 1. Scoped apply targets

The apply must be limited to these six slugs:

| Slug | Scope status |
|------|--------------|
| `medify-ma18-rf` | In scope |
| `medify-ma22-rf` | In scope |
| `medify-ma25-rf` | In scope |
| `medify-ma40-rf` | In scope |
| `medify-ma50-rf` | In scope |
| `medify-ma112-rf` | In scope |

The apply must not include:

- `medify-ma35-rf`
- archived Amazon-secondary rows
- non-Medify rows
- Supabase writes
- deploy
- owner-decision rows

---

## 2. Exact apply command

If Option A or Option B is approved, run this command exactly:

```bash
npx tsx scripts/report-air-purifier-apply-executor-v1.ts \
  --apply \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json \
  --out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1-apply.json \
  --markdown-out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1-apply.md
```

This packet authorizes only the local executor apply against the committed Medify apply plan. Supabase, deploy, and owner-decision rows remain out of scope.

---

## 3. Owner decision requested

Record exactly one option in chat. Do not create `data/owner-decisions/` rows from this packet.

```text
OPTION A - APPROVE EXECUTOR --APPLY FOR ALL SIX MEDIFY SLUGS

I approve executor --apply for all six scoped Medify MA-series slugs using:
  data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json

Scoped slugs:
  medify-ma18-rf
  medify-ma22-rf
  medify-ma25-rf
  medify-ma40-rf
  medify-ma50-rf
  medify-ma112-rf

I do NOT approve: Supabase writes, deploy, owner-decision rows, evidence edits,
apply-plan edits, archived Amazon-secondary rows, medify-ma35-rf, or non-Medify
slugs.
```

```text
OPTION B - APPROVE NAMED SUBSET ONLY

I approve executor --apply only for these named Medify slugs:
  [owner lists slug(s)]

All unlisted Medify slugs remain on hold. The same non-authorization list as
Option A applies.
```

```text
OPTION C - HOLD

I do not approve executor --apply for the Medify MA-series cohort at this time.
```

---

## 4. Explicit non-authorization

This packet does not authorize:

- Touching Supabase
- Deploying or changing public UI
- Creating `data/owner-decisions/` rows
- Editing evidence rows
- Editing the Medify apply plan
- Including `medify-ma35-rf`
- Including archived Amazon-secondary rows
- Including non-Medify rows
- Changing aggregator duplicate-slug behavior
- Weakening planner, executor, wrong-family, direct-buyable, owner-review, or Amazon policy gates

---

## 5. Expected apply output

The apply step should create only:

- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1-apply.json`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1-apply.md`

The executor `--apply` step is expected to update only the six scoped `data/air-purifier/retailer_links.csv` rows described by the committed Medify apply plan. Any Supabase write, deploy, owner-decision row, evidence edit, apply-plan edit, or non-scope row change would be outside this packet.
