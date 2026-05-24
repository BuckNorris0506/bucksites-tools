# Air Purifier Agent Packets v1

Turns the read-only AP Batch Production Lane factory into **durable, assignable packet artifacts** so multiple agents can work in parallel without row-by-row founder micromanagement.

**Deployment:** NOT DEPLOYED  
**Supabase:** untouched  
**Product CSVs:** untouched by packet generation

---

## Why this exists

A normal company does not manually rescue three air-purifier links at a time. The factory report (`air_purifier_batch_production_lane_v1`) already classifies **57** filter slugs and emits `agent_work_packets`. This layer materializes those packets as JSON files an agent can take, execute, and return standardized evidence against — owner reviews a **batch summary**, not every SKU manually.

---

## Path choice

**Canonical lane-local path (recommended):**

```
data/air-purifier/batch-production/agent-packets/
data/air-purifier/batch-production/agent-results/   # agents write evidence here
```

Mirrors fridge lane pattern (`data/batch-production/drafts/`). These are **working artifacts**, not canonical production truth until owner review and an explicit apply step. Safe to regenerate; do not treat as committed catalog truth unless promoted after review.

---

## Run

```bash
# Summary JSON to stdout only (no files)
npx tsx scripts/report-air-purifier-agent-packets-v1.ts

# Write durable packet artifacts
npx tsx scripts/report-air-purifier-agent-packets-v1.ts \
  --out-dir data/air-purifier/batch-production/agent-packets

# Tests
node --import tsx --test scripts/report-air-purifier-agent-packets-v1.test.ts
```

---

## How agents use packets

1. Take one packet file (e.g. `ap-levoit-oem-discovery-v1.json`).
2. For each `candidate_slug`, browser-proof the primary URL or discover OEM PDP.
3. Return one evidence row per slug using `expected_output_schema`.
4. Save combined results to `data/air-purifier/batch-production/agent-results/{packet_id}.results.json`.
5. Do **not** edit CSVs in the evidence step.

---

## What agents may do

- Read AP CSVs and live manufacturer/retailer URLs
- Browser-proof PDPs (Playwright or manual)
- Return structured evidence JSON with `decision` + notes
- Recommend (not apply) `recommended_csv_mutation` when proof is complete

---

## What agents may not do

- Deploy, push, or commit unless explicitly instructed
- Mutate `data/air-purifier/retailer_links.csv` or catalog CSVs during evidence collection
- Touch Supabase or fridge batch (`data/retailer_links.csv`)
- Weaken buy gates, `/go`, search, or compatibility mappings
- Mark `direct_buyable` without Add to Cart + exact token proof
- Alias GSC drift URLs (e.g. `blueair-f4max-411` → `blueair-particle-411`) without catalog proof

---

## Agent output schema (per slug)

```json
{
  "packet_id": "ap-oem-search-placeholder-v1",
  "slug": "coway-max2-hepa",
  "decision": "PASS_DIRECT_BUYABLE",
  "candidate_url": "https://coway.com/search?q=...",
  "final_url": "https://coway.com/products/...",
  "browser_truth_classification": "direct_buyable",
  "exact_tokens_seen": ["3304899"],
  "wrong_family_tokens_seen": [],
  "buy_action_seen": true,
  "reference_only_reason": null,
  "evidence_notes": "Playwright: ...",
  "recommended_csv_mutation": null,
  "owner_review_required": false
}
```

**Decisions:** `PASS_DIRECT_BUYABLE` | `PASS_REFERENCE` | `CATALOG_GAP` | `ALIAS_REDIRECT_GAP` | `REJECT_WRONG_FAMILY` | `REJECT_SEARCH_CATEGORY` | `NEEDS_OWNER_REVIEW` | `NO_SAFE_PATH`

---

## Owner review required

| Packet | Why |
|--------|-----|
| `ap-blueair-catalog-identity-v1` | F4MAX vs PART411; no buyer-path until catalog fixed |
| `ap-amazon-secondary-v1` | Medify Amazon-primary policy |

---

## First packets (typical generation)

| packet_id | When emitted |
|-----------|----------------|
| `ap-blueair-catalog-identity-v1` | Always (catalog identity workstream) |
| `ap-levoit-oem-discovery-v1` | Levoit search-placeholder candidates |
| `ap-oem-search-placeholder-v1` | Top OEM search rescue slugs |
| `ap-amazon-secondary-v1` | When `owner_review` candidates exist (Medify) |
| `ap-shark-official-reference-v1` | Only when new `reference_candidate` slugs exist |
| `ap-honeywell-store-direct-buy-v1` | Only when remaining Honeywell `direct_buy_candidate` slugs exist |

---

## Files

| Path | Role |
|------|------|
| `scripts/lib/air-purifier-agent-packets-v1.ts` | Packet builder + schema |
| `scripts/report-air-purifier-agent-packets-v1.ts` | CLI |
| `scripts/report-air-purifier-agent-packets-v1.test.ts` | Tests |

---

## Provenance

| Label | Items |
|-------|-------|
| **PROVEN** | Read-only; tests pass; CSVs unchanged |
| **INFERRED** | Parallel agent throughput vs serial founder review |
| **UNKNOWN** | Owner batch-summary aggregator (future task) |
