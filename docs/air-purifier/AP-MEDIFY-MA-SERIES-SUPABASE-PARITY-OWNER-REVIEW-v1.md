# AP Medify MA-series - Supabase parity owner review v1

## Six-slug OEM Medify cohort

**Report type:** docs-only owner decision support - **Supabase parity dry-run authorization only**  
**Generated:** 2026-06-15  
**Repo checkpoint:** `64e3dd388b00af9b95236e028c7807e4169d272a`  
**Scope:** **six** filter slugs only - `medify-ma18-rf`, `medify-ma22-rf`, `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf`, `medify-ma112-rf`  
**Apply plan:** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json`

---

## Executive summary

| Fact | Status | Label |
|------|--------|-------|
| Medify CSV apply is committed | Yes | **PROVEN** |
| Executor `apply_status` | `APPLIED` | **PROVEN** |
| Executor `applied_change_count` | `6` | **PROVEN** |
| `ap_safe_cta_count_before` | `15` | **PROVEN** |
| `ap_safe_cta_count_after` | `21` | **PROVEN** |
| `ap_safe_cta_delta` | `6` | **PROVEN** |
| Supabase parity `--apply` authorized by this packet | No | **PROVEN** |
| Any CSV, Supabase, deploy, evidence, apply-plan, or owner-decision mutation from this packet | None | **PROVEN** |

This packet asks for one owner decision: whether to authorize a read-only Supabase parity dry-run for the six scoped Medify rows now applied to local CSV.

---

## 1. Scoped parity targets

The parity dry-run must be limited to these six slugs:

| Slug | Scope status |
|------|--------------|
| `medify-ma18-rf` | In scope |
| `medify-ma22-rf` | In scope |
| `medify-ma25-rf` | In scope |
| `medify-ma40-rf` | In scope |
| `medify-ma50-rf` | In scope |
| `medify-ma112-rf` | In scope |

The dry-run must not include:

- `medify-ma35-rf`
- archived Amazon-secondary rows
- non-Medify rows
- Supabase `--apply`
- deploy
- CSV edits
- evidence edits
- apply-plan edits
- owner-decision rows

---

## 2. Exact parity dry-run command

If Option A is approved, run this command without `--apply`:

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json
```

Expected dry-run posture:

| Field | Expected |
|-------|----------|
| `mode` | `dry_run` |
| `data_mutation` | `false` |
| `planned_change_count` | `6` |
| Scope | six Medify planned rows only |

---

## 3. Owner decision requested

Record exactly one option in chat. Do not create `data/owner-decisions/` rows from this packet.

```text
OPTION A - AUTHORIZE SUPABASE PARITY DRY-RUN FOR SIX MEDIFY ROWS

I authorize a read-only Supabase parity dry-run for the six scoped Medify
MA-series rows using:
  data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json

Scoped slugs:
  medify-ma18-rf
  medify-ma22-rf
  medify-ma25-rf
  medify-ma40-rf
  medify-ma50-rf
  medify-ma112-rf

I do NOT approve: Supabase --apply, deploy, CSV edits, evidence edits,
apply-plan edits, owner-decision rows, archived Amazon-secondary rows,
medify-ma35-rf, or non-Medify slugs.
```

```text
OPTION B - HOLD

I do not authorize Supabase parity dry-run for the Medify MA-series cohort at
this time.
```

---

## 4. Explicit non-authorization

This packet does not authorize:

- Running Supabase parity with `--apply`
- Deploying or changing public UI
- Editing `data/air-purifier/retailer_links.csv`
- Editing evidence rows
- Editing the Medify apply plan
- Creating `data/owner-decisions/` rows
- Including `medify-ma35-rf`
- Including archived Amazon-secondary rows
- Including non-Medify rows
- Changing aggregator duplicate-slug behavior
- Weakening planner, executor, parity, wrong-family, direct-buyable, owner-review, or Amazon policy gates

---

## 5. Readiness basis

The local CSV apply has already completed for the six scoped Medify rows:

| Field | Value |
|-------|-------|
| `apply_status` | `APPLIED` |
| `applied_change_count` | `6` |
| `ap_safe_cta_count_before` | `15` |
| `ap_safe_cta_count_after` | `21` |
| `ap_safe_cta_delta` | `6` |

The parity dry-run is the next read-only check before any future owner packet for Supabase parity `--apply`.
