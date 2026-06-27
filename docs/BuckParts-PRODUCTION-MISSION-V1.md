# BuckParts Production Mission v1

**Runner mission:** `production_mission_v1`  
**Contract:** `buckparts_production_mission_v1`  
**Status:** Reference implementation for all future BuckParts production missions

---

## Purpose

First **end-to-end production mission** exercising Foundation v2 without new orchestration:

```
Coverage Sprint → Census → Mission Plan → Agent Dispatch → Parity Factory → Guarded Apply (dry-run) → Operations Metrics → Validation
                                      ↓
                            Owner Decision Queue (on halt)
                                      ↓
                         Lifecycle artifact + metrics snapshot
```

Runner **never** writes CSV. Founder-approved guarded apply write runs **outside** Runner.

---

## Run

```bash
npm run buckparts:runner -- --mission production_mission_v1
```

Resume after agent result on disk:

```bash
node --import tsx scripts/report-buckparts-runner-v1.ts --mission production_mission_v1 --resume <run_id>
```

Plan only (read-only):

```bash
npm run buckparts:production-mission-plan
```

---

## Agent dispatch handoff

1. Runner writes manifest under `data/command-center/agent-dispatch/manifests/<run_id>/external_agent_dispatch.json`
2. External operator writes `buckparts_agent_result_v1` to path in manifest
3. Reference template: `data/command-center/production-missions/reference/agent-result-reference-v1.json`
4. `output_artifact_rel_paths` must include existing browser proof results, e.g. `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-edr4rxd1-v1.json`

---

## Lifecycle artifact

Written automatically on every production mission run (including halts):

```
data/command-center/production-missions/buckparts-production-mission-<run_id>.json
```

Documents phases: dispatch, agent result, validation, owner decision queue, guarded apply, operations metrics.

Command Center: `.command_center_v2.production_mission_v1`

---

## Operations metrics

Production mission **automatically appends** an operations metrics snapshot to:

```
data/command-center/operations-metrics/history-v1.jsonl
```

No separate `--record-snapshot` required when running via Runner.

---

## Expected proven delta

Primary slug resolved from coverage sprint winning batch (default: **First4 deblocked** cohort, primary **edr4rxd1**).

| Stage | PROVEN delta |
|-------|----------------|
| Runner dry-run complete | 0 (no CSV write) |
| After founder-approved `--write-csv` | +1 per successful guarded apply slug |

---

## Validation bundle

Mission validation phase runs: lint, build, production mission + agent contract + operations metrics tests, deploy classifier, security gate.

---

## SAFE_TO_COMMIT gate

```bash
npm run build
node --import tsx --test scripts/lib/buckparts-production-mission-v1.test.ts
node --import tsx scripts/report-buckparts-deploy-classifier-v1.ts --working-tree
node --import tsx scripts/report-buckparts-security-gate-v1.ts
```
