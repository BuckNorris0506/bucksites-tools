# BuckParts Operations Metrics v1

**Contract:** `operations_metrics_v1`  
**Mode:** Measurement (read-only — no orchestration, no new automation)  
**Governing:** BuckParts Truth Contract — UNKNOWN over guessing

---

## Purpose

Measure whether **Foundation v2** is increasing throughput before building new foundation capabilities. This contract indexes existing operational artifacts only; it does not run missions, dispatch agents, or mutate product data.

---

## Metrics tracked

| Metric | Source |
|--------|--------|
| Mission duration | Runner run artifacts + checkpoints (wall clock or step sum) |
| Validation duration | Runner validation-phase steps |
| Dispatch duration | Agent manifest `created_at` → result `submitted_at` |
| Agent success rate | Dispatches with `validation_pass` / completed dispatches |
| Validation pass rate | Runner validation steps PASS / (PASS + FAIL) |
| Retry count | Agent manifest `attempt_number - 1` |
| Timeout count | Manifests with status `TIMED_OUT` |
| Owner decision count | Owner decision requests linked to `run_id` |
| Owner wait time | Request `updated_at - created_at` (pending uses now) |
| SAFE_BUYER_PATH_PROVEN delta | Census step in runner artifact; consecutive run diff |
| Founder effort per mission | `founder_effort_units` from linked queue requests |
| Queue depth over time | `pending_count` / `stale_count` in history snapshots |

---

## Historical storage

Append-only JSONL (metrics metadata only — not product truth):

```
data/command-center/operations-metrics/history-v1.jsonl
```

Record a snapshot explicitly:

```bash
npm run buckparts:operations-metrics -- --record-snapshot
```

Each line is a `buckparts_operations_metrics_snapshot_v1` with aggregate KPIs and queue depth at record time.

---

## Commands

```bash
# Current metrics (stdout JSON)
npm run buckparts:operations-metrics

# Append trend snapshot
npm run buckparts:operations-metrics -- --record-snapshot

# Command Center lane
node --import tsx scripts/report-buckparts-command-center.ts 2>/dev/null | jq '.command_center_v2.operations_metrics_v1 | {aggregate, trend: .trend.throughput_hypothesis}'
```

---

## Trend / throughput hypothesis

The `trend.throughput_hypothesis` block compares:

- `agent_success_rate_latest` vs `agent_success_rate_prior` (from history)
- `safe_buyer_path_proven_delta_since_first` (from snapshot series)
- `validation_pass_rate_latest`

**Interpretation rule:** Require ≥2 snapshots over real operating time before concluding Foundation v2 improved throughput.

---

## Ownership boundaries

| Allowed | Forbidden |
|---------|-----------|
| Read runner, agent dispatch, owner queue, census artifacts | CSV / Supabase / production mutation |
| Append metrics history with `--record-snapshot` | Auto-dispatch, auto-approve, new orchestrators |
| Command Center projection | Vendor API coupling |

---

## Tests

```bash
node --import tsx --test scripts/lib/buckparts-operations-metrics-v1.test.ts
```

---

## SAFE_TO_COMMIT gate

```bash
npm run build
node --import tsx --test scripts/lib/buckparts-operations-metrics-v1.test.ts
node --import tsx scripts/report-buckparts-deploy-classifier-v1.ts --working-tree
node --import tsx scripts/report-buckparts-security-gate-v1.ts
```
