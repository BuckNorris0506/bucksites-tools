# Air Purifier Apply Planner v1

Read-only **apply planner** that consumes the aggregator review JSON and produces an **owner-approval plan** with exact proposed CSV row changes and rollback snapshots. This is **not** the apply executor — no CSVs are written.

**Deployment:** NOT DEPLOYED  
**Supabase:** untouched  
**CSV mutation:** none

---

## Why this exists

After agents submit evidence and the aggregator buckets outcomes, the owner still needs exact before/after row diffs before any CSV edit. This planner:

1. Reads `ap-agent-results-review-v1.json`
2. Plans only `auto_apply_eligible` rows
3. Validates against live `data/air-purifier/retailer_links.csv` (read-only)
4. Emits `planned_changes`, `rollback_rows`, and `refused_changes`
5. Writes optional JSON + Markdown under `apply-plans/`

---

## Run

```bash
npx tsx scripts/report-air-purifier-apply-planner-v1.ts

npx tsx scripts/report-air-purifier-apply-planner-v1.ts \
  --out data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.json \
  --markdown-out data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.md

node --import tsx --test scripts/report-air-purifier-apply-planner-v1.test.ts
```

Optional: `--review path/to/review.json`

---

## Planner rules (summary)

| Rule | Behavior |
|------|----------|
| Source rows | `review_groups.auto_apply_eligible` only |
| Target file | `data/air-purifier/retailer_links.csv` only |
| CSV match | Exactly one row by `filter_slug` + `retailer_key` |
| After row | Updates URLs + `browser_truth_*`; preserves other columns |
| Refused | All other review groups + validation/CSV failures |

---

## Output

| Artifact | Path |
|----------|------|
| Plan JSON | `data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.json` |
| Plan Markdown | `data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.md` |

`plan_status`: `READY_FOR_OWNER_APPROVAL` | `BLOCKED` | `EMPTY`

---

## What it does NOT do

- Apply `recommended_csv_mutation` to disk
- Deploy, push, or commit
- Touch Supabase or fridge CSV
- Weaken buy gates or change search/compat logic

**`apply_executor_available: false`** — future executor task applies approved plan only.

---

## Files

| Path | Role |
|------|------|
| `scripts/lib/air-purifier-apply-planner-v1.ts` | Planner builder |
| `scripts/report-air-purifier-apply-planner-v1.ts` | CLI |
| `scripts/report-air-purifier-apply-planner-v1.test.ts` | Tests |

---

## Provenance

| Label | Items |
|-------|-------|
| **PROVEN** | Read-only; tests pass; CSV unchanged |
| **INFERRED** | Coverage delta if executor applies plan |
| **UNKNOWN** | Apply executor v1 (not built) |
