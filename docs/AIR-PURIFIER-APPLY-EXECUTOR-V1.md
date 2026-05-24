# Air Purifier Apply Executor v1

Guarded **apply executor** that applies an owner-approved apply plan to **`data/air-purifier/retailer_links.csv` only**. Default mode is **dry-run**; mutation requires explicit **`--apply`**.

**Deployment:** NOT DEPLOYED  
**Supabase:** untouched  
**Fridge CSV:** untouched  

---

## Why this exists

The apply planner produces exact before/after diffs and rollback snapshots. This executor is the first mutation step — but only after owner approval and only for `planned_changes` in the approved plan JSON.

---

## Run

```bash
# Dry-run (default) — validates plan + CSV, writes apply-run report, no CSV edit
npx tsx scripts/report-air-purifier-apply-executor-v1.ts

# Apply (requires owner-approved plan)
npx tsx scripts/report-air-purifier-apply-executor-v1.ts --apply

node --import tsx --test scripts/report-air-purifier-apply-executor-v1.test.ts
```

Optional flags:

| Flag | Purpose |
|------|---------|
| `--plan path` | Apply plan JSON (default: `apply-plans/ap-apply-plan-v1.json`) |
| `--out path` | Execution report JSON |
| `--markdown-out path` | Execution report Markdown |

Default artifacts:

| Artifact | Path |
|----------|------|
| Run JSON | `data/air-purifier/batch-production/apply-runs/ap-apply-run-v1.json` |
| Run MD | `data/air-purifier/batch-production/apply-runs/ap-apply-run-v1.md` |

---

## Guards

| Guard | Behavior |
|-------|----------|
| Default mode | Dry-run only |
| `--apply` | Requires `plan_status=READY_FOR_OWNER_APPROVAL`, `owner_approval_required=true`, `planned_change_count>0` |
| CSV match | Current row must exactly match plan `before_row` |
| Target file | Only `data/air-purifier/retailer_links.csv` is written |
| Scope | Only `planned_changes` — never `refused_changes` or owner-review rows |
| After row | Must be `direct_buyable` with PDP URLs (no search/category) |
| Duplicates | Refuses duplicate `filter_slug` + `retailer_key` targets |

---

## Post-apply validation

After `--apply`:

- Exactly N rows changed (N = planned count)
- Only target slugs changed
- All targets `direct_buyable` with null buy gate / `LIVE_DIRECT_BUYABLE`
- No search URLs on targets
- AP `safe_cta_count` delta matches applied count (local CSV)

---

## What it does NOT do

- Edit `data/retailer_links.csv` (fridge)
- Edit catalog CSVs
- Apply refused or owner-review rows
- Deploy, push, or touch Supabase
- Weaken buy gates or change search/compat logic

---

## Files

| Path | Role |
|------|------|
| `scripts/lib/air-purifier-apply-executor-v1.ts` | Executor core |
| `scripts/report-air-purifier-apply-executor-v1.ts` | CLI |
| `scripts/report-air-purifier-apply-executor-v1.test.ts` | Tests |

---

## Safe next action

1. Owner reviews `ap-apply-plan-v1.md` and approves.
2. Run dry-run, confirm `DRY_RUN_READY`.
3. Run `--apply`, confirm `APPLIED` and post-apply validation.
4. Re-run batch lane + demand-to-coverage to confirm +3 AP safe CTAs.
