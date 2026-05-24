# Air Purifier Agent Results Aggregator v1

Read-only **manager layer** that ingests parallel agent evidence files and produces **one owner review packet** — eliminating founder copy/paste reconciliation.

**Deployment:** NOT DEPLOYED  
**Supabase:** untouched  
**CSV mutation:** none (aggregator never applies `recommended_csv_mutation`)

---

## Why this exists

Agents submit `*.results.json` under `data/air-purifier/batch-production/agent-results/`. Without aggregation, the owner must paste every agent output into chat and manually bucket outcomes. This script:

1. Reads all result files
2. Validates each row against strict buy/reference rules
3. Groups into review categories
4. Projects coverage delta if owner later approves an apply planner
5. Writes optional JSON + Markdown review artifacts

---

## Input

```
data/air-purifier/batch-production/agent-results/*.results.json
```

Supported file shapes:

- Array of rows
- `{ "results": [...] }`
- `{ "rows": [...] }` (with optional packet metadata)

Malformed files → `invalid_files[]` (continues unless `--strict`).

---

## Run

```bash
# Summary JSON to stdout
npx tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts

# Write owner review artifacts
npx tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts \
  --out data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json \
  --markdown-out data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.md

node --import tsx --test scripts/report-air-purifier-agent-results-aggregator-v1.test.ts
```

---

## Classification rules

| Group | Criteria (summary) |
|-------|---------------------|
| **auto_apply_eligible** | `PASS_DIRECT_BUYABLE`, `direct_buyable`, buy action, PDP URL, exact tokens, **empty** wrong-family, apply plan fields, not owner-flagged |
| **reference_eligible** | `PASS_REFERENCE`, likely_valid / reference reason, PDP URL, exact tokens, empty wrong-family, allowlisted retailer when specified |
| **owner_review_required** | Owner flag, token equivalence, Amazon policy, validation failures on buy path, reference allowlist gap |
| **rejected** | `REJECT_WRONG_FAMILY`, `REJECT_SEARCH_CATEGORY` |
| **catalog_task_required** | `CATALOG_GAP`, `ALIAS_REDIRECT_GAP` |
| **no_safe_path** | `NO_SAFE_PATH` |

Invalid rows (e.g. `PASS_DIRECT_BUYABLE` without buy action) appear in `invalid_rows` and route to owner review.

---

## Output paths

| Artifact | Path |
|----------|------|
| Review JSON | `data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json` |
| Owner Markdown | `data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.md` |

Lane-local working copies — not canonical production truth.

---

## Leads to future apply planner

`auto_apply_eligible` rows include `recommended_csv_mutation` recommendations only. A future **apply planner** (not built here) may:

1. Consume `ap-agent-results-review-v1.json`
2. Owner-approve slugs
3. Apply gated CSV updates in a controlled step

This aggregator **does not** apply mutations.

---

## Files

| Path | Role |
|------|------|
| `scripts/lib/air-purifier-agent-results-aggregator-v1.ts` | Builder + validation + Markdown |
| `scripts/report-air-purifier-agent-results-aggregator-v1.ts` | CLI |
| `scripts/report-air-purifier-agent-results-aggregator-v1.test.ts` | Tests |

---

## Provenance

| Label | Items |
|-------|-------|
| **PROVEN** | Read-only; tests pass; CSVs unchanged |
| **INFERRED** | Coverage delta assumes one safe CTA per approved slug |
| **UNKNOWN** | Apply planner not implemented |
