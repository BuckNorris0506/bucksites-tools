# BuckParts ops-agent workflow v1 (doctrine + packet contracts)

**Status:** Doctrine and packet shapes only — **not** a full Mission Control / Task Queue implementation.

**Operating truth:** `npm run buckparts:command-center` → `scripts/report-buckparts-command-center.ts` remains the repo-owned board. This document defines how **future** ops-agent automation must route work without bypassing gates.

**Related:** `docs/BuckParts-HQ-HANDOFF.md` (Efficiency Contract + stopping point), `docs/BuckParts-JSON-STDOUT-CONTRACT.md` (machine JSON), `scripts/lib/fridge-safe-link-batch-factory-v1.ts` (batch-first safe-link example).

---

## Workflow (required order)

```
Command Center
  ↓
Mission Control Orchestrator
  ↓
Task Queue
  ↓
HyperAgent specialists / external discovery
  ↓
Structured ingest packet
  ↓
Cursor / repo truth gates / batch factory
  ↓
Validation result
  ↓
Command Center status update
  ↓
New permanent repo tool (if task repeats)
```

| Stage | Owner | Role |
|-------|--------|------|
| **Command Center** | Repo | Truth board and **task source** — lanes, blockers, cohort counts, `next_best_action` hints |
| **Mission Control** | HQ / future orchestrator | **Request classifier and dispatcher** — picks specialists, never closes truth |
| **Task Queue** | Repo / ops store | **Structured work packets** — one `command_center_task_packet_v1` per mission |
| **HyperAgent** | External swarm | **Parallel discovery / source-finding only** — candidates, URLs, conflicts; **not** apply or Verified Link |
| **Structured ingest** | HyperAgent → repo file | **`hyperagent_ingest_packet_v1`** — discovery input until Cursor validates |
| **Cursor / repo** | Repo | **Validation, gates, tests, batch factory, safe-apply planning** — only path that may classify apply-eligible states |
| **Validation result** | Repo | **`cursor_validation_packet_v1`** — **only** path to task closure |
| **CC status update** | Repo | **`command_center_status_update_packet_v1`** — **only** after validation references PASS (or explicit FAIL closeout) |
| **Permanent tool** | Repo | Any repeated owner-relay step must become a script/lane/test — not chat-only |

---

## Doctrine rules (PROVEN policy; implementation UNKNOWN)

1. **HyperAgent statuses are discovery/workflow statuses** — e.g. `DISCOVERY_OPEN`, `DISCOVERY_COMPLETE`, `DISCOVERY_BLOCKED`. They must **not** equal batch-factory truth states (`APPLY_ELIGIBLE_*`, `NO_SAFE_LINK_FOUND_*`, `CONFLICT_REQUIRES_RECONCILIATION`) or Command Center lane `OK`/`PROVEN` closure.
2. **Command Center completion requires repo validation** — no lane or task may be marked complete from HyperAgent prose alone.
3. **Safe-link coverage missions are batch-first by default** — default `mission_type` is `SAFE_LINK_BATCH`; single-slug work requires `one_product_exception` ∈ `TEST` | `PROOF` | `DEBUG` | `BLOCKER_RECONCILIATION`.
4. **Repeated owner-relay work → permanent repo tool** — third manual repetition of the same step triggers a script or CC lane before more chat ops.
5. **No production mutation** unless explicit owner approval on the specific action (unchanged ship guard).

---

## Packet: `buckparts_command_center_task_packet_v1`

Emitted from Command Center / Mission Control planning (read-only mission planning).

```json
{
  "contract": "buckparts_command_center_task_packet_v1",
  "task_id": "uuid",
  "created_at": "ISO-8601",
  "mission_type": "SAFE_LINK_BATCH | FOH | GRANT | RUNNER | CUSTOM",
  "mission_type_default": "SAFE_LINK_BATCH",
  "title": "string",
  "source_command_center_lanes": ["fridge_safe_link_batch_factory_v1"],
  "cohort_key": "refrigerator_water_missing_safe_link",
  "expected_coverage_delta": 1,
  "owner_browser_needed_count": 21,
  "read_only": true,
  "data_mutation": false,
  "mutation_authorized": false,
  "hyperagent_dispatch_authorized": true,
  "cursor_validation_required": true,
  "one_product_exception": null,
  "one_product_exception_allowed": ["TEST", "PROOF", "DEBUG", "BLOCKER_RECONCILIATION"],
  "proven_facts": [],
  "unknown_facts": []
}
```

**Rules:** `one_product_exception` must be **null** for `SAFE_LINK_BATCH` unless explicitly overridden with an allowed exception token.

---

## Packet: `buckparts_hyperagent_ingest_packet_v1`

HyperAgent output — **discovery input only**.

```json
{
  "contract": "buckparts_hyperagent_ingest_packet_v1",
  "ingest_id": "uuid",
  "task_id": "uuid",
  "created_at": "ISO-8601",
  "discovery_status": "DISCOVERY_OPEN | DISCOVERY_COMPLETE | DISCOVERY_BLOCKED",
  "truth_closure_claimed": false,
  "specialist_outputs": [
    { "specialist": "Discovery | TruthRisk | RepoIngestPlanner | Marketing | DesignFOH | StrategyHQ", "summary": "string" }
  ],
  "candidate_rows": [
    { "slug": "string", "candidate_url": "string | null", "source_type": "string", "notes": "string" }
  ],
  "conflicts": [],
  "read_only": true,
  "data_mutation": false,
  "not_authorized": [
    "retailer_links_csv_mutation",
    "supabase_mutation",
    "evidence_mutation",
    "deploy",
    "verified_link_authorization",
    "go_click"
  ],
  "proven_facts": [],
  "unknown_facts": []
}
```

**Rules:** `truth_closure_claimed` must be **false**. `discovery_status` must **not** use truth-closure vocabulary (see TypeScript forbidden list in `scripts/lib/buckparts-ops-agent-workflow-v1.ts`).

---

## Packet: `buckparts_hyperagent_batch_bundle_v1` (Mission Control export — required for Cursor validation)

Full cohort ingest from HyperAgent / Mission Control. **Cursor validation must reject stubbed, materialized, or repo-reconstructed bundles.**

| Requirement | Rule |
|-------------|------|
| `contract` | `buckparts_hyperagent_batch_bundle_v1` |
| `manifest.contract` | `buckparts_hyperagent_batch_manifest_v1` |
| `packet_count` | **26** (= `manifest.total_slugs`) |
| Per-slug packets | One **full** `buckparts_hyperagent_ingest_packet_v1` per cohort slug |
| `ingest_id` | Non-empty UUID per packet (not `materialized-*`) |
| `read_only` / `truth_closure_claimed` | `true` / `false` on every packet |
| `discovery_status` | `DISCOVERY_*` only (not batch-factory closure states) |
| `batch_factory_state_at_discovery` | Required on every packet |
| `proposed_state` | Required even when unchanged |
| Provenance | **No** `materialized_from_manifest`, `packet_body_source` ∈ {stub, materialized, synthetic, repo_join, cursor_synthesis, dev_only} |
| Specialist bodies | Non-stub `specialist_outputs` (Discovery + TruthRisk with real summaries) |
| Fact arrays | `proven_facts`, `inferred_facts`, `unknown_facts` arrays present |
| `identity_status` | Required on every packet |

**Canonical path:** `data/fridge/batch-production/drafts/fridge-safe-link-hyperagent-ingest-bundle-v1.json`

**DEV_ONLY stub (INVALID_FOR_TRUTH_VALIDATION):** `scripts/DEV_ONLY-materialize-fridge-hyperagent-ingest-bundle-v1.ts` → `data/fridge/batch-production/drafts/DEV_ONLY-fridge-safe-link-hyperagent-ingest-bundle-stub-v1.json`

**Cursor validation failure:** `FULL_HYPERAGENT_PACKET_BODIES_REQUIRED` → `validation_status: VALIDATION_FAIL`, `state_changes_confirmed: 0`, `command_center_status_update_allowed: false`.

**Guards:** `validateHyperAgentBatchBundleForCursorValidationV1()` in `scripts/lib/buckparts-ops-agent-workflow-v1.ts`

---

## Packet: `buckparts_cursor_validation_packet_v1`

Repo validation — **only** closure authority.

```json
{
  "contract": "buckparts_cursor_validation_packet_v1",
  "validation_id": "uuid",
  "task_id": "uuid",
  "ingest_id": "uuid | null",
  "validated_at": "ISO-8601",
  "validation_status": "VALIDATION_PASS | VALIDATION_FAIL | VALIDATION_PARTIAL",
  "commands_run": ["npm run lint", "node --import tsx --test scripts/lib/buckparts-ops-agent-workflow-v1.test.ts"],
  "batch_factory_artifacts": ["data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json"],
  "truth_closure_authorized": false,
  "read_only": true,
  "data_mutation": false,
  "mutation_authorized": false,
  "proven_facts": [],
  "unknown_facts": []
}
```

**Rules:** `truth_closure_authorized` may be **true** only when `validation_status` is `VALIDATION_PASS` and all referenced gates passed. Batch factory outputs may inform classification but do not replace this packet. **`VALIDATION_FAIL` with `failure_code: FULL_HYPERAGENT_PACKET_BODIES_REQUIRED`** blocks all state-change confirmation and Command Center status updates.

---

## Packet: `buckparts_command_center_status_update_packet_v1`

Post-validation CC mirror — **repo-validated only**.

```json
{
  "contract": "buckparts_command_center_status_update_packet_v1",
  "update_id": "uuid",
  "task_id": "uuid",
  "validation_id": "uuid",
  "requires_validation_id": true,
  "updated_at": "ISO-8601",
  "lane_status_deltas": [
    { "lane": "string", "status": "OK | ATTENTION | UNKNOWN", "note": "string" }
  ],
  "cc_refresh_command": "node --import tsx scripts/report-buckparts-command-center.ts",
  "read_only": true,
  "data_mutation": false,
  "applied": false,
  "proven_facts": [],
  "unknown_facts": []
}
```

**Rules:** `validation_id` is **required**. `applied: true` is **UNKNOWN** until a future owner-authorized automation exists; until then, operators re-run Command Center manually after validation.

---

## Re-prove (copy/paste)

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2 | keys | length'
node --import tsx scripts/report-fridge-safe-link-batch-factory-v1.ts | jq '.cohort_summary'
node --import tsx --test scripts/lib/buckparts-ops-agent-workflow-v1.test.ts
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
```
