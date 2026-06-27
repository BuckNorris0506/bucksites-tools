# BuckParts Agent Contract + Dispatch Manifest v1

**Contract:** `agent_contract_v1`  
**Governing:** `docs/BuckParts-CONSTITUTION.md` §5 Truth Contract, §7 Evidence Standards  
**Status:** Foundation v2 — v1 scope **COMPLETE**

---

## Purpose

Vendor-agnostic handoff between **BuckParts Runner** and **external operators** (humans or automation outside the repo). The Runner:

- **Writes** dispatch manifests to disk
- **Reads** result artifacts from disk
- **Validates** results before continuing a mission
- **Never** references HyperAgent, Cursor, Codex, Claude, or other vendor APIs

Truth closure and mutation remain **founder-gated** — validated dispatch results do not grant `mutation_authorized` or `csv_apply_authorized`.

---

## Operating flow

```
Runner agent_dispatch step
  → write manifest (data/command-center/agent-dispatch/manifests/<run_id>/<step_id>.json)
  → halt EXTERNAL_AGENT_REQUIRED if no result
External operator completes work off-repo
  → write result (data/command-center/agent-dispatch/results/<manifest_id>.json)
  → write output files referenced by result.output_artifact_rel_paths
Runner resume
  → read + validate result
  → PASS or retry or FAIL (DISPATCH_EXHAUSTED)
```

Command Center lane: `.command_center_v2.agent_contract_v1`  
CLI: `npm run buckparts:agent-contract`

---

## Schemas

### Dispatch manifest — `buckparts_agent_dispatch_manifest_v1`

| Field | Required | Notes |
|-------|----------|-------|
| `contract` | yes | Must be `buckparts_agent_dispatch_manifest_v1` |
| `manifest_id` | yes | Stable hash of run + step + attempt |
| `dispatch_id` | yes | UUID per attempt |
| `run_id`, `mission_id`, `step_id` | yes | Runner correlation |
| `template_id` | yes | e.g. `read_only_evidence_collection_v1` |
| `execution_surface` | yes | `EXTERNAL_OPERATOR` or `EXTERNAL_AUTOMATION` — not vendor names |
| `objective_summary` | yes | Must not contain vendor tokens |
| `input_artifact_rel_paths` | yes | Repo-relative inputs for operator |
| `result_artifact_rel_path` | yes | Where operator writes result |
| `timeout_at` | yes | ISO timestamp |
| `retry_policy` | yes | `max_attempts`, `attempt_number`, retry flags |
| `ownership_boundaries` | yes | Who may write what |
| `mutation_authorized` | yes | Always `false` on manifest |

### Result artifact — `buckparts_agent_result_v1`

| Field | Required | Notes |
|-------|----------|-------|
| `contract` | yes | Must be `buckparts_agent_result_v1` |
| `manifest_id`, `dispatch_id` | yes | Must match manifest |
| `completion_status` | yes | `COMPLETE`, `PARTIAL`, or `FAILED` |
| `output_artifact_rel_paths` | yes | Evidence files on disk |
| `mutation_authorized` | yes | Must be `false` |
| `truth_closure_claimed` | yes | Must be `false` |
| `csv_apply_authorized` | when template requires | Must be `false` |
| `evidence_write_authorized` | when template requires | Must be `false` |

Result JSON must not contain vendor product name tokens (enforced at validation).

### Validation contract — `buckparts_agent_result_validation_v1`

Produced in-memory when Runner validates a result. Fields include `validation_pass`, `validation_errors`, `retry_eligible`, `attempts_remaining`.

---

## Timeout behavior

| Condition | Runner behavior |
|-----------|-----------------|
| No result before `timeout_at` | Manifest status → `TIMED_OUT` |
| Attempts remaining | New manifest attempt; halt `EXTERNAL_AGENT_REQUIRED` with retry detail |
| No attempts remaining | Step `FAIL`, halt `DISPATCH_EXHAUSTED` |

Default timeout: **24 hours** (`read_only_evidence_collection_v1` template).

---

## Retry behavior

| Trigger | Retry when |
|---------|------------|
| Validation fail | `attempt_number < max_attempts` and `retry_after_validation_fail` |
| Timeout | `attempt_number < max_attempts` and `retry_after_timeout` |

Default **max_attempts: 3** for evidence collection template.

On retry, Runner writes a **new manifest** with incremented `attempt_number` and a new `result_artifact_rel_path`.

---

## Failure behavior

| Outcome | Runner step status | Mission overall |
|---------|-------------------|-----------------|
| Result pending | `HALTED` | `HALTED_EXTERNAL_AGENT` |
| Validation pass | `PASS` | continues |
| Retries exhausted | `FAIL` | `FAILED` |
| `completion_status=FAILED` in result | validation fail → retry or exhaust |

Analysis-phase halt still allows **validation phase** to run (existing Runner v1 behavior).

---

## Ownership boundaries

| Actor | May write |
|-------|-----------|
| **Runner** | Dispatch manifests, runner checkpoints, runner run artifacts |
| **External operator** | Result artifact, output evidence files listed in result |
| **Founder only** | CSV apply, Supabase mutation, truth closure to PROVEN buyer path |

Runner **must not**: call vendor APIs, auto-approve external outputs, mutate truth from result prose alone.

---

## Runner integration

### Step kind: `agent_dispatch`

```typescript
{
  step_id: "external_agent_dispatch",
  kind: "agent_dispatch",
  dispatch: {
    template_id: "read_only_evidence_collection_v1",
    input_artifact_rel_paths: ["data/..."],
    objective_summary: "Collect read-only evidence ...",
    timeout_ms: 86_400_000,  // optional
    max_attempts: 3,         // optional
  },
  halt_policy: "external_agent_if_dispatch_requires",
  ...
}
```

**Module:** `scripts/lib/buckparts-runner-v1.ts`  
**Agent contract module:** `scripts/lib/buckparts-agent-contract-v1.ts`

---

## Migration from `coordination_halt` (Foundation v1)

| v1 (removed) | v2 (current) |
|--------------|--------------|
| `kind: "coordination_halt"` | `kind: "agent_dispatch"` |
| `step_id: "hyperagent_coordination"` | `step_id: "external_agent_dispatch"` |
| Immediate halt with vendor-specific message | Manifest on disk + result validation loop |

**Operational migration for evidence work:**

1. Run evidence sprint — Runner writes manifest under `data/command-center/agent-dispatch/manifests/`.
2. External operator performs read-only discovery using any tool — **do not** embed vendor names in result JSON.
3. Write result artifact to path in manifest (`result_artifact_rel_path`).
4. Reference discovery output files in `output_artifact_rel_paths` (must exist on disk).
5. Resume runner: `node --import tsx scripts/report-buckparts-runner-v1.ts --mission evidence_sprint_v1 --resume <run_id>`.
6. Continue existing repo validation paths (e.g. mechanical validators, founder review) before any mutation.

Legacy HyperAgent ingest bundles (`buckparts_hyperagent_ingest_packet_v1`) remain valid **downstream evidence inputs** — they are not referenced by Runner v2 dispatch code.

---

## Commands

```bash
# Agent contract projection (stdout JSON)
npm run buckparts:agent-contract

# Command Center lane
node --import tsx scripts/report-buckparts-command-center.ts 2>/dev/null | jq '.command_center_v2.agent_contract_v1 | {pending_result_count, recommended_next_action, latest_manifests: .latest_manifests[0].result_artifact_rel_path}'

# Tests
node --import tsx --test scripts/lib/buckparts-agent-contract-v1.test.ts scripts/lib/buckparts-runner-v1.test.ts
```

---

## Tests

| Test file | Coverage |
|-----------|----------|
| `scripts/lib/buckparts-agent-contract-v1.test.ts` | Config validation, manifest, halt/pass, timeout retry, CC lane |
| `scripts/lib/buckparts-runner-v1.test.ts` | Mission validation, evidence sprint dispatch halt |

Coverage sprint mission validation bundle includes agent contract tests.

---

## SAFE_TO_COMMIT gate

Same as other foundation modules:

```bash
npm run build
node --import tsx --test scripts/lib/buckparts-agent-contract-v1.test.ts scripts/lib/buckparts-runner-v1.test.ts
node --import tsx scripts/report-buckparts-deploy-classifier-v1.ts --working-tree
node --import tsx scripts/report-buckparts-security-gate-v1.ts
```

Commit only when all pass and classifier/security gate allow.
