# AP Medify MA-series - executor dry-run owner review v1

## Six-slug OEM Medify cohort

**Report type:** docs-only owner decision support - **executor dry-run authorization only**  
**Generated:** 2026-06-15  
**Repo checkpoint:** `1f4cc1aea37d924947bc6316891e7808e1575cc3`  
**Scope:** **six** filter slugs only - `medify-ma18-rf`, `medify-ma22-rf`, `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf`, `medify-ma112-rf`  
**Apply plan:** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json`

---

## Executive summary

| Fact | Status | Label |
|------|--------|-------|
| Medify apply-plan artifact exists | Yes | **PROVEN** |
| `plan_status` | `READY_FOR_OWNER_APPROVAL` | **PROVEN** |
| `planned_change_count` | `6` | **PROVEN** |
| Planned slugs are limited to the six scoped Medify MA-series slugs | Yes | **PROVEN** |
| `medify-ma35-rf` is included | No | **PROVEN** |
| Any CSV, Supabase, deploy, executor, or owner-decision mutation from this packet | None | **PROVEN** |

This packet asks for one owner decision: whether to authorize an executor dry-run using the committed Medify apply plan.

---

## 1. Scoped planned targets

The committed apply plan is scoped to these six slugs:

| Slug | Planned target |
|------|----------------|
| `medify-ma18-rf` | Medify OEM PDP |
| `medify-ma22-rf` | Medify OEM PDP |
| `medify-ma25-rf` | Medify OEM PDP |
| `medify-ma40-rf` | Medify OEM PDP |
| `medify-ma50-rf` | Medify OEM PDP |
| `medify-ma112-rf` | Medify OEM PDP |

The dry-run requested here must not include:

- `medify-ma35-rf`
- archived Amazon-secondary rows
- non-Medify rows
- CSV apply
- Supabase
- deploy
- owner-decision rows

---

## 2. Exact dry-run command

If Option A or Option B is approved, run the executor in dry-run mode only:

```bash
npx tsx scripts/report-air-purifier-apply-executor-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json \
  --out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1.json \
  --markdown-out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1.md
```

This command must be run without any `--apply` flag.

---

## 3. Owner decision requested

Record exactly one option in chat. Do not create `data/owner-decisions/` rows from this packet.

```text
OPTION A - AUTHORIZE EXECUTOR DRY-RUN FOR ALL SIX

I authorize executor dry-run only for all six scoped Medify MA-series slugs
using the committed Medify apply plan:
  data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json

Scoped slugs:
  medify-ma18-rf
  medify-ma22-rf
  medify-ma25-rf
  medify-ma40-rf
  medify-ma50-rf
  medify-ma112-rf

I do NOT approve: executor --apply, retailer_links.csv edits, Supabase,
deploy, owner-decision rows, evidence edits, apply-plan edits, archived
Amazon-secondary rows, medify-ma35-rf, or non-Medify slugs.
```

```text
OPTION B - AUTHORIZE DRY-RUN FOR NAMED SUBSET ONLY

I authorize executor dry-run only for these named Medify slugs:
  [owner lists slug(s)]

All unlisted Medify slugs remain on hold. The same non-authorization list as
Option A applies.
```

```text
OPTION C - HOLD

I do not authorize executor dry-run for the Medify MA-series cohort at this
time.
```

---

## 4. Explicit non-authorization

This packet does not authorize:

- Running executor `--apply`
- Editing `data/air-purifier/retailer_links.csv`
- Editing evidence rows
- Editing the Medify apply plan
- Touching Supabase
- Deploying or changing public UI
- Creating `data/owner-decisions/` rows
- Including `medify-ma35-rf`
- Including archived Amazon-secondary rows
- Changing aggregator duplicate-slug behavior
- Weakening planner, executor, wrong-family, direct-buyable, owner-review, or Amazon policy gates

---

## 5. Expected dry-run output

The dry-run should create only:

- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1.json`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1.md`

Any CSV mutation, Supabase write, deploy, owner-decision row, or evidence/apply-plan edit would be outside this packet.
