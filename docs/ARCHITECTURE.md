# BuckParts Architecture

**Status:** Repo-truth architecture reference — derived from committed docs and source only.  
**Governing:** `docs/BuckParts-CONSTITUTION.md` (Trust Hierarchy, Truth Contract, Automation Doctrine)  
**Primary context:** `docs/BuckParts-HQ-HANDOFF.md`, `docs/BuckParts-AGENT-CONTRACT-V1.md`, `docs/BuckParts-OPERATIONS-METRICS-V1.md`, `docs/BuckParts-PRODUCTION-MISSION-V1.md`

**PROVEN:** This document describes what exists in-repo. It does not authorize mutation, deploy, or new systems.

---

## 1. SYSTEM LAYERS

Operating model from `docs/BuckParts-HQ-HANDOFF.md` (Foundation v1 stack):

```
Truth → Command Center → Runner → External AI → Validation → Owner Decision Queue → Approved Mutation
```

Four architectural layers below map to that flow.

### Truth

**What it reads from**

- **PROVEN:** Committed catalog CSVs (e.g. `data/retailer_links.csv`, `data/filters.csv` — referenced by guarded apply and parity factories).
- **PROVEN:** Supabase read models (queried read-only by parity/diff reports such as `scripts/report-fridge-supabase-vs-csv-retailer-links-diff-v1.ts`).
- **PROVEN:** Evidence artifacts under `data/evidence/` and wedge-specific evidence paths (Constitution §7; HQ handoff).
- **PROVEN:** Census and classification outputs (e.g. `scripts/report-all-product-safe-buyer-path-census-v1.ts` → `SAFE_BUYER_PATH_PROVEN` counts).
- **PROVEN:** Batch-production drafts and committed factory artifacts under `data/fridge/batch-production/`, `data/air-purifier/batch-production/`, etc.
- **PROVEN:** Founder Decision Registry documents under `data/owner-decisions/*.json` (`src/lib/owner-dashboard/founder-decision-registry-v1.ts`).

**What it produces**

- **PROVEN:** Read-only report JSON from `scripts/report-*.ts` factories (orchestrator, director, readiness gate, apply-plan factory, parity guarded apply dry-runs, etc.).
- **PROVEN:** Classification labels (`SAFE_BUYER_PATH_PROVEN`, `UNKNOWN`, readiness statuses, runner stages) — outputs only; not mutation authority by themselves.
- **PROVEN:** Command Center input artifacts indexed by `scripts/report-buckparts-command-center.ts`.

**What it is never allowed to do**

- **PROVEN:** Invent fit or buyer-path authority without evidence (Constitution §6–§7).
- **PROVEN:** Mutate production CSV, Supabase, or public UI from read-only report scripts (`read_only: true`, `mutation_authorized: false` on report contracts).
- **PROVEN:** Auto-close truth from agent prose alone (`docs/BuckParts-AGENT-CONTRACT-V1.md` — `truth_closure_claimed` must be `false` on results).
- **PROVEN:** Treat demand, clicks, or coverage gaps as proof of safe buy path (Constitution §6; HQ handoff).

---

### Intelligence

**What it reads from**

- **PROVEN:** Truth-layer artifacts listed above.
- **PROVEN:** Command Center v2 lane projections built in `scripts/report-buckparts-command-center.ts` from `scripts/lib/buckparts-command-center-v2.ts` and per-lane builders (demand-to-coverage, census, rescue director/runner, execution ledger, runner lane, owner decision queue, agent contract, operations metrics, production mission, etc.).
- **PROVEN:** Registry scans (`src/lib/owner-dashboard/founder-decision-registry-scan-v1.ts`) for founder decision summary lanes.
- **PROVEN:** Owner Decision Queue projection (`src/lib/owner-dashboard/owner-decision-queue-v1.ts` → `scripts/lib/owner-decision-queue-command-center-v1.ts`).

**What it produces**

- **PROVEN:** Single Command Center JSON (`command_center_v2`) with `next_best_action`, `next_owner_action`, per-lane `recommended_next_action`, and steering fields (`scripts/report-buckparts-command-center.ts`).
- **PROVEN:** Read-only rankings and batch plans (e.g. `scripts/lib/coverage-production-sprint-v2.ts`, demand-to-coverage next lane).
- **PROVEN:** Operations metrics aggregates (`scripts/lib/buckparts-operations-metrics-v1.ts`) — measurement only per `docs/BuckParts-OPERATIONS-METRICS-V1.md`.

**What it is never allowed to do**

- **PROVEN:** Execute missions or mutate product data — HQ handoff: Command Center **shows** stage state; it does **not** execute one orchestrated flow or auto-run the next script (`docs/BuckParts-HQ-HANDOFF.md` — end-to-end orchestration **PARTIAL**).
- **PROVEN:** Grant `mutation_authorized`, `csv_apply_authorized`, or `owner_mutation_approved` (steering is not mutation authority).
- **PROVEN:** Auto-approve owner decisions (`owner_decision_queue_v1` — `mutation_authorized: false` always; HQ handoff §3).
- **PROVEN:** Replace founder-gated guarded apply executors.

---

### Execution

**What it reads from**

- **PROVEN:** Mission definitions in `scripts/lib/buckparts-runner-v1.ts` (`BUCKPARTS_RUNNER_MISSIONS_V1`).
- **PROVEN:** Existing `scripts/report-*.ts` steps, npm validation targets, and agent dispatch manifests (`scripts/lib/buckparts-agent-contract-v1.ts`).
- **PROVEN:** Runner checkpoints at `data/command-center/runner-checkpoints/<run_id>.json`.
- **PROVEN:** Agent dispatch manifests at `data/command-center/agent-dispatch/manifests/<run_id>/` and results at `data/command-center/agent-dispatch/results/`.
- **PROVEN:** Owner Decision Queue for halt unlock (`ownerDecisionRequestApprovalSatisfiesRunnerGateV1` in `src/lib/owner-dashboard/owner-decision-queue-v1.ts`).

**What it produces**

- **PROVEN:** Runner run artifacts `data/command-center/runner-runs/buckparts-runner-<mission>-<run_id>.json` (`buckparts_runner_v1`).
- **PROVEN:** Agent dispatch manifests and validation records (`buckparts_agent_dispatch_manifest_v1`, `buckparts_agent_result_v1`).
- **PROVEN:** Owner decision request artifacts on approval halts (`data/owner-decisions/queue/requests/odr-v1-*.json`).
- **PROVEN:** Production mission lifecycle artifacts `data/command-center/production-missions/buckparts-production-mission-<run_id>.json` (`buckparts_production_mission_lifecycle_v1`).
- **PROVEN:** Operations metrics history append on production mission runs (`data/command-center/operations-metrics/history-v1.jsonl`).
- **INFERRED:** Guarded apply **dry-run** JSON from mission steps; **PROVEN:** Runner never passes `--write-csv` or `--apply` (`FORBIDDEN_ARG_PATTERNS_V1` in `scripts/lib/buckparts-runner-v1.ts`).

**What it is never allowed to do**

- **PROVEN:** Bypass founder approval or mutation gates (`evaluateStepHaltV1`, readiness gate, guarded apply bridge).
- **PROVEN:** Pass forbidden argv (`--write-csv`, `--apply`, `--mutate`, `--supabase-apply`, `git commit`, `git push`) in mission step definitions.
- **PROVEN:** Call vendor APIs from Runner (`docs/BuckParts-AGENT-CONTRACT-V1.md`).
- **PROVEN:** Auto-resume after founder approval without explicit `--resume <run_id>` (HQ handoff — **NOT IMPLEMENTED**).
- **PROVEN:** Write CSV or Supabase inside `production_mission_v1` (`docs/BuckParts-PRODUCTION-MISSION-V1.md` — write runs **outside** Runner).

**Missions (PROVEN — `scripts/lib/buckparts-runner-v1.ts`)**

| Mission ID | Role |
|------------|------|
| `coverage_sprint_v1` | Demand → census → rescue readiness → parity diff → lifecycle guarded apply dry-run → validation |
| `evidence_sprint_v1` | Batch production lane → demand-to-coverage → `agent_dispatch` → validation |
| `safe_link_sprint_v1` | Rescue orchestrator/director/runner → readiness gate → guarded apply bridge dry-run → validation |
| `production_mission_v1` | Foundation v2 reference end-to-end mission (`docs/BuckParts-PRODUCTION-MISSION-V1.md`) |

---

### Owner

**What it reads from**

- **PROVEN:** Pending decision requests `data/owner-decisions/queue/owner-decision-queue-v1.json` and `data/owner-decisions/queue/requests/*.json` (`owner_decision_request_v1`).
- **PROVEN:** Founder Decision Registry rows `data/owner-decisions/*.json` (`founder_decision_registry_v1`).
- **PROVEN:** Owner approval packets and templates under `data/fridge/batch-production/drafts/*-owner-approval*` and related paths.

**What it produces**

- **PROVEN:** Human-recorded registry rows (`decision_status`, `allowed_next_scope`, `owner_note`) — **not** written by queue or Runner (HQ handoff §3 deferred: queue does not write registry rows).
- **PROVEN:** Effective `APPROVED` projection on queue requests when `isFounderRegistryRowActiveMutationApproval` matches (`src/lib/owner-dashboard/owner-decision-queue-v1.ts`).
- **PROVEN:** Founder-authorized guarded apply writes via separate executor CLIs with explicit flags (e.g. `scripts/report-manufacturer-rescue-guarded-apply-bridge-v1.ts`, `scripts/report-supabase-csv-parity-guarded-apply-v1.ts` — write commands documented as blocked in production mission lifecycle artifacts).

**What it is never allowed to do (automated systems)**

- **PROVEN:** Auto-approve queue requests (`mutation_authorized: false` on queue contract).
- **PROVEN:** Treat queue `APPROVED` projection as CSV/Supabase mutation — bridge still required (HQ handoff §3).
- **PROVEN:** Override physical fit truth (Constitution §13 — founder may override **decisions**, not **facts**).

---

## 2. STATE MACHINE

**UNKNOWN:** A single unified “rescue candidate” state machine spanning all wedges is **not proven** in one type or enum. **PROVEN:** Refrigerator manufacturer safe-link rescue uses **two coupled partial state machines** plus adjacent plan/owner states documented below.

### Partial state machine A — Readiness Gate (`manufacturer_safe_link_rescue_readiness_gate_v1`)

**Source:** `scripts/lib/manufacturer-safe-link-rescue-readiness-gate-v1.ts` — `MANUFACTURER_RESCUE_READINESS_STATUSES_V1`

| State | Transition trigger (PROVEN checks) | Blocks advancement |
|-------|-----------------------------------|-------------------|
| `READY_FOR_APPLY` | All readiness checks PASS; no blocking reasons | **PROVEN:** Only one slug promoted to `READY_FOR_APPLY` at a time via runner (`manufacturer_safe_link_rescue_runner_v1` — `ready_for_apply_enforced: true`) |
| `PENDING_BROWSER_REFRESH` | Deploy marker unknown or `browser_proof_after_deploy_marker` UNKNOWN | Missing/stale browser proof vs deploy marker |
| `PENDING_CONFUSION_FAMILY_REVIEW` | `confusion_family_cleared` FAIL | Confusion-family review incomplete |
| `PENDING_OWNER_APPROVAL` | `owner_approval_exists` FAIL or `owner_apply_lane_eligible` FAIL | No active `owner_mutation_approved` registry row for slug |
| `PENDING_APPLY_PLAN` | `apply_plan_exists` FAIL | No apply-plan artifact |
| `BLOCKED_WRONG_FAMILY_RISK` | `wrong_family_safe` FAIL | Wrong-family risk |
| `BLOCKED_MISSING_PROOF` | `browser_proof_exists` FAIL | Browser proof missing |
| `UNKNOWN_READINESS` | Unresolved blockers, UNKNOWN checks, or `direct_buyable_exact_token_safe` FAIL | Gate cannot classify safe apply |

**PROVEN:** Readiness gate is **sole** `READY_FOR_APPLY` promotion authority — apply-plan factory and guarded apply bridge do not bypass it (`scripts/lib/manufacturer-safe-link-rescue-apply-plan-factory-v1.ts`, `scripts/lib/manufacturer-rescue-guarded-apply-bridge-v1.ts`).

---

### Partial state machine B — Rescue Runner stages (`manufacturer_safe_link_rescue_runner_v1`)

**Source:** `scripts/lib/manufacturer-safe-link-rescue-runner-v1.ts` — `MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1`

| Stage | Transition trigger (PROVEN in `classifyRunnerStageForRowV1`) | Blocks advancement |
|-------|--------------------------------------------------------------|-------------------|
| `DISCOVER` | Adapter/discovery not ready; early blocked reasons | Missing discovery URL/provenance |
| `BROWSER_PROOF` | Browser work candidate; stale/missing proof; `PENDING_BROWSER_REFRESH` / `BLOCKED_MISSING_PROOF` | Proof not PASS/fresh |
| `OWNER_REVIEW` | Owner-review candidate; `PENDING_OWNER_APPROVAL` / `PENDING_APPLY_PLAN`; gate not loaded but guarded-apply candidate | Owner approval / apply plan |
| `READY_FOR_APPLY` | Readiness gate loaded; slug matches `ready_for_apply_slug`; `readiness_status === READY_FOR_APPLY`; guarded-apply candidate | Another slug holds apply slot; gate not fresh |
| `APPLIED` | CSV primary not search placeholder; browser truth not PASS | Awaiting reaudit path |
| `REAUDIT_DUE` | CSV primary not placeholder; `browser_truth_status === PASS` | Post-apply verification |
| `COMPLETE` | **PROVEN:** enum exists; transition logic **UNKNOWN** in excerpted classifier — treat as terminal stage label only unless artifact proves entry |
| `BLOCKED` | Wrong-family blockers; `UNKNOWN_READINESS`; unresolved blockers | Hard stop until resolved |

**PROVEN:** Runner `readiness_status` on slug state may also be `NOT_IN_READINESS_GATE` or `UNKNOWN_READINESS_GATE_STALE_OR_MISSING` when gate artifact missing/stale.

---

### Adjacent — Apply plan status (`manufacturer_safe_link_rescue_apply_plan_factory_v1`)

**Source:** `scripts/lib/manufacturer-safe-link-rescue-apply-plan-factory-v1.ts` — `MANUFACTURER_RESCUE_APPLY_PLAN_STATUSES_V1`

| State | Meaning |
|-------|---------|
| `READY_FOR_OWNER_REVIEW` | Plan ready for founder review — **does not** grant `READY_FOR_APPLY` |
| `BLOCKED_*` | Various blockers (missing/stale proof, confusion family, wrong family, CSV row, URL mismatch, supersession, not guarded candidate) |
| `UNKNOWN` | Unclassified |

---

### Adjacent — Owner Decision Queue request status (`owner_decision_request_v1`)

**Source:** `src/lib/owner-dashboard/owner-decision-queue-v1.ts`

| Status | Resolution |
|--------|------------|
| `PENDING_OWNER_DECISION` | Default; no matching registry approval |
| `APPROVED` | **PROVEN:** Projected when active `founder_decision_registry_v1` row matches with `owner_mutation_approved` — queue does not mutate |
| `REJECTED` | Matching registry row with `decision_status: rejected` |
| `STALE` | `expires_or_stale_after` passed |
| `SUPERSEDED` | **PROVEN:** Type exists; supersede wiring **DEFERRED** (HQ handoff — auto-supersede not implemented) |

---

### Adjacent — Runner mission halt / overall status (`buckparts_runner_v1`)

**Source:** `scripts/lib/buckparts-runner-v1.ts`

**Halt reasons:** `FOUNDER_APPROVAL_REQUIRED`, `MUTATION_GATE_BLOCKED`, `EXTERNAL_AGENT_REQUIRED`, `DISPATCH_EXHAUSTED`, `STEP_FAILED`, `RESUME_MISMATCH`

**Overall status:** `COMPLETE`, `RESUMED_COMPLETE`, `HALTED_APPROVAL_REQUIRED`, `HALTED_EXTERNAL_AGENT`, `HALTED_MUTATION_GATE`, `FAILED`

**PROVEN:** Analysis phase may halt; validation phase still runs (`docs/BuckParts-HQ-HANDOFF.md` §1 Runner v1).

---

### Production mission lifecycle phases (`buckparts_production_mission_lifecycle_v1`)

**Source:** `scripts/lib/buckparts-production-mission-v1.ts`, artifacts under `data/command-center/production-missions/`

Phases: `coverage_sprint_ranking`, `census_baseline`, `production_mission_plan`, `external_agent_dispatch`, `agent_result`, `validation`, `owner_decision_queue`, `guarded_apply_primary`, `operations_metrics`

**Foundation v2 live audit outcome (PROVEN — lifecycle artifacts on disk):**

| Run ID | Artifact | `runner_overall_status` | `lifecycle_complete` | `safe_buyer_path_proven` | Primary slug |
|--------|----------|-------------------------|----------------------|--------------------------|--------------|
| `a9ab9a89-c216-4a4e-bd86-132620591a5f` | `data/command-center/production-missions/buckparts-production-mission-a9ab9a89-c216-4a4e-bd86-132620591a5f.json` | `FAILED` | `false` | baseline 48 → at_run 48, **delta 0** | `edr4rxd1` |
| `a6b27301-e040-4405-b613-5adcb6c99bb6` | `data/command-center/production-missions/buckparts-production-mission-a6b27301-e040-4405-b613-5adcb6c99bb6.json` | `RESUMED_COMPLETE` | **`true`** | baseline 48 → at_run 49, **delta +1** | `edr4rxd1` |

**Run `a9ab9a89…` (failed audit):** **PROVEN** orchestration only — phases recorded through agent dispatch halt and partial validation, but `validation_build` **FAILED**; guarded apply dry-run and Owner Decision Queue never reached meaningfully; `lifecycle_complete: false`, `delta: 0`; artifact notes founder-guarded CSV write not executed.

**Run `a6b27301…` (successful reference):** **PROVEN** Foundation v2 operating loop complete per lifecycle artifact — `lifecycle_complete: true`, `lifecycle_complete_reason` states `SAFE_BUYER_PATH_PROVEN delta +1`; `primary_apply_slug=edr4rxd1`; external guarded CSV write occurred outside Runner (manufacturer rescue bridge `--write-csv`); Runner itself remained dry-run (`mutation_authorized: false` on runner report).

**PROVEN:** Production Mission v1 reference lifecycle is **proven once** by run `a6b27301…`; run `a9ab9a89…` remains the documented **failed** first live audit (delta 0).

---

## 3. INVARIANTS

Rules that must hold regardless of agent, mission, or prompt. Sources: Constitution, Runner safety contract, Agent Contract, HQ handoff, readiness gate authority.

**Enforcement column:** **RUNTIME_ENFORCED** = repository code rejects or blocks violation on the cited path; **DOCUMENTED** = contract, constitution, or report fields only; **NOT_PROVEN** = explicitly unproven or not implemented.

| ID | Rule | Source | Enforcement |
|----|------|--------|-------------|
| **INV-001** | Public buy guidance requires evidence that passes buy-path policy — no buying option without evidence. | Constitution §6–§7, §14 | DOCUMENTED |
| **INV-002** | `mutation_authorized: false` on Runner reports, queue artifacts, agent manifests/results, and read-only factory outputs unless a **separate** founder-authorized executor is invoked with explicit mutation flags. | Report contracts; `docs/BuckParts-AGENT-CONTRACT-V1.md` | DOCUMENTED |
| **INV-003** | Runner mission steps must not include `--write-csv`, `--apply`, `--mutate`, `--supabase-apply`, `git commit`, or `git push` (`FORBIDDEN_ARG_PATTERNS_V1`; validated by `validateMissionDefinitionV1` / `validateRunnerStepCommandV1`). | `scripts/lib/buckparts-runner-v1.ts` | RUNTIME_ENFORCED |
| **INV-004** | `manufacturer_safe_link_rescue_readiness_gate_v1` is the sole `READY_FOR_APPLY` promotion authority for manufacturer rescue apply. | `scripts/lib/manufacturer-safe-link-rescue-readiness-gate-v1.ts`; apply-plan factory; guarded apply bridge | RUNTIME_ENFORCED |
| **INV-005** | At most one slug in `READY_FOR_APPLY` runner stage at a time (`ready_for_apply_enforced: true`). | `scripts/lib/manufacturer-safe-link-rescue-runner-v1.ts` | RUNTIME_ENFORCED |
| **INV-006** | Owner Decision Queue never auto-approves — effective `APPROVED` requires active `founder_decision_registry_v1` row with `allowed_next_scope: owner_mutation_approved` (`isFounderRegistryRowActiveMutationApproval`). Queue `mutation_authorized: false` always. | `src/lib/owner-dashboard/owner-decision-queue-v1.ts` | RUNTIME_ENFORCED |
| **INV-007** | Agent dispatch results must have `mutation_authorized: false` and `truth_closure_claimed: false`. | `docs/BuckParts-AGENT-CONTRACT-V1.md` | RUNTIME_ENFORCED |
| **INV-008** | Runner does not call vendor APIs; external work is off-repo with disk manifest/result contract. | `docs/BuckParts-AGENT-CONTRACT-V1.md`; `scripts/lib/buckparts-agent-contract-v1.ts` | RUNTIME_ENFORCED |
| **INV-009** | Analysis halt does not skip validation phase in Runner v1 missions. | `scripts/lib/buckparts-runner-v1.ts`; `scripts/lib/buckparts-runner-v1.test.ts` | RUNTIME_ENFORCED |
| **INV-010** | Founder may override sequencing/decisions, not facts or physical fit. | Constitution §13 | DOCUMENTED |
| **INV-011** | Demand and coverage gaps do not substitute for fit or listing evidence. | Constitution §6; HQ handoff | DOCUMENTED |
| **INV-012** | Apply-plan `READY_FOR_OWNER_REVIEW` does not authorize CSV write — separate guarded executor + registry approval required. | `scripts/lib/manufacturer-safe-link-rescue-apply-plan-factory-v1.ts`; guarded apply bridge | RUNTIME_ENFORCED |
| **INV-013** | Operations Metrics v1 is read-only measurement — no mission execution or product mutation. | `docs/BuckParts-OPERATIONS-METRICS-V1.md` | DOCUMENTED |
| **INV-014** | Command Center JSON is a read-only steering surface — not a mutation or deploy trigger by itself. | `scripts/report-buckparts-command-center.ts`; HQ handoff (orchestration **PARTIAL**) | DOCUMENTED |
| **INV-015** | **UNKNOWN / NOT PROVEN:** Full Layer 6 closed-loop autonomy — HQ handoff documents `layer_6_founder_only_approval: NOT_PROVEN` (`docs/BuckParts-RUNNER-STATUS.md` reference in HQ handoff). | HQ handoff; Runner status doc | NOT_PROVEN |

---

## 4. DECISION LOG

Each entry: what changed, why, and **invariant IDs enforced** (or **at risk** if the decision were misused).  
**PROVEN** from HQ handoff and module contracts unless noted.

### Runner v1 as mission orchestration engine

- **What changed:** `buckparts_runner_v1` (`scripts/lib/buckparts-runner-v1.ts`) runs ordered missions over existing `scripts/report-*.ts` factories with checkpoints and consolidated artifacts.
- **Why it changed:** Eliminate manual orchestration while preserving trust boundaries (`docs/BuckParts-HQ-HANDOFF.md` §1).
- **Invariants enforced:** **INV-003** (forbidden argv blocked at mission validation), **INV-002** (runner reports `mutation_authorized: false`), **INV-008** (no vendor API calls).

### Analysis-then-validation phases

- **What changed:** Runner steps split `analysis` vs `validation`; analysis may `HALT` while validation still runs.
- **Why it changed:** Prove repo health even when founder approval or external agent blocks forward progress (HQ handoff §1; `scripts/lib/buckparts-runner-v1.test.ts`).
- **Invariants enforced:** **INV-009** (validation phase runs after analysis halt).

### Owner Decision Queue v1

- **What changed:** `owner_decision_queue_v1` indexes `owner_decision_request_v1` artifacts; Runner upserts on approval halts; CC lane `.command_center_v2.owner_decision_queue_v1`.
- **Why it changed:** First-class pending owner decisions visible to Runner, Command Center, and readiness flows without replacing registry (`docs/BuckParts-HQ-HANDOFF.md` §3).
- **Invariants enforced:** **INV-006** (queue never auto-approves; registry bridge required), **INV-002** (queue artifacts `mutation_authorized: false`). **At risk if misused:** bypassing **INV-006** by treating queue `APPROVED` projection as CSV write authority — **documented blocked** by **INV-012** and HQ handoff §3.

### Founder Decision Registry remains mutation authority

- **What changed:** Queue projects `APPROVED` only via `isFounderRegistryRowActiveMutationApproval`; registry not replaced.
- **Why it changed:** Compatibility with existing guarded apply checks (`hasOwnerApprovalForSlug`, parity bridge, lifecycle mutation auth).
- **Invariants enforced:** **INV-006**, **INV-002**, **INV-012** (registry + executor still required for CSV/Supabase mutation).

### Agent Contract + Dispatch Manifest v1 (Foundation v2)

- **What changed:** `coordination_halt` replaced by `agent_dispatch` + disk manifest/result validation (`scripts/lib/buckparts-agent-contract-v1.ts`).
- **Why it changed:** Vendor-agnostic external operator handoff without Runner calling HyperAgent/Cursor/Codex APIs (`docs/BuckParts-AGENT-CONTRACT-V1.md`).
- **Invariants enforced:** **INV-007** (`truth_closure_claimed: false` on results), **INV-008** (external work off-repo), **INV-002** (results `mutation_authorized: false`). **At risk if misused:** treating validated dispatch result as truth closure — violates **INV-001**, **INV-007**.

### Readiness gate sole READY_FOR_APPLY authority

- **What changed:** Apply-plan factory and guarded apply bridge document readiness gate as sole promotion authority.
- **Why it changed:** Prevent parallel “ready” signals from bypassing browser proof, owner approval, and blocker checks.
- **Invariants enforced:** **INV-004** (sole promotion authority), **INV-005** (one-at-a-time apply slot via runner). **At risk if misused:** promoting apply from plan factory alone — violates **INV-004**, **INV-012**.

### Production Mission v1 reference lifecycle

- **What changed:** `production_mission_v1` mission writes `buckparts_production_mission_lifecycle_v1` artifacts and appends operations metrics snapshots.
- **Why it changed:** End-to-end Foundation v2 exercise without new orchestration framework (`docs/BuckParts-PRODUCTION-MISSION-V1.md`).
- **Invariants enforced:** **INV-003**, **INV-002** (Runner dry-run inside mission; CSV write outside Runner). **PROVEN:** run `a9ab9a89…` — `lifecycle_complete: false`, `delta: 0`; run `a6b27301…` — `lifecycle_complete: true`, `delta: +1` after founder-authorized external write.

### Operations Metrics v1 (measurement mode)

- **What changed:** `operations_metrics_v1` indexes runner, dispatch, queue, census artifacts; optional `history-v1.jsonl` snapshots.
- **Why it changed:** Measure throughput before building new foundation (`docs/BuckParts-OPERATIONS-METRICS-V1.md`).
- **Invariants enforced:** **INV-013** (measurement only; no auto-dispatch or auto-approve). **At risk if misused:** using metrics as mutation trigger — violates **INV-002**, **INV-013**.

### Command Center as read-only steering (not orchestrator)

- **What changed:** Command Center v2 aggregates lanes; core builder omits owner-only lanes filled in `scripts/report-buckparts-command-center.ts`.
- **Why it changed:** Single operator JSON surface for NBA and lane status.
- **Invariants enforced:** **INV-014** (read-only steering; no auto-execute). **Documented partial:** end-to-end orchestration remains **PARTIAL** (HQ handoff) — CC does not replace Runner (**INV-014** preserved; does not violate **INV-002** because CC lanes carry `mutation_authorized: false`).

### Coverage Production Sprint v2 (batch ranking)

- **What changed:** `coverage_production_sprint_v2_v1` ranks executable batches by expected `SAFE_BUYER_PATH_PROVEN` delta using existing factories only.
- **Why it changed:** Stop slug-by-slug optimization; prioritize batches with proven executability (`docs/BuckParts-HQ-HANDOFF.md` §2).
- **Invariants enforced:** **INV-011** (demand/ranking does not substitute for evidence), **INV-014** (read-only ranking), **INV-001** (no buy authority from ranking alone).

---

## Appendix — Key paths and jq surfaces

| System | Contract | Primary path / command |
|--------|----------|------------------------|
| Command Center | `command_center_v2` | `node --import tsx scripts/report-buckparts-command-center.ts` |
| Runner | `buckparts_runner_v1` | `npm run buckparts:runner` → `.command_center_v2.buckparts_runner_v1` |
| Owner Decision Queue | `owner_decision_queue_v1` | `data/owner-decisions/queue/` → `.command_center_v2.owner_decision_queue_v1` |
| Agent Contract | `agent_contract_v1` | `data/command-center/agent-dispatch/` → `.command_center_v2.agent_contract_v1` |
| Operations Metrics | `operations_metrics_v1` | `data/command-center/operations-metrics/history-v1.jsonl` → `.command_center_v2.operations_metrics_v1` |
| Production Mission | `production_mission_v1` | `data/command-center/production-missions/` → `.command_center_v2.production_mission_v1` |
| Founder Decision Registry | `founder_decision_registry_v1` | `data/owner-decisions/*.json` → `.command_center_v2.founder_decision_registry_summary_v1` |
| Readiness Gate | `manufacturer_safe_link_rescue_readiness_gate_v1` | `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-gate-v1.json` |
| Rescue Runner | `manufacturer_safe_link_rescue_runner_v1` | `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-runner-v1.json` |

---

## Deferred / NOT IMPLEMENTED (PROVEN from HQ handoff)

Items below are **NOT IMPLEMENTED** in v1 scope. No priority order is implied — HQ handoff lists these as deferred without ranked sequencing.

| Deferred item | What breaks if this stays deferred |
|---------------|-----------------------------------|
| Automatic mutation steps inside Runner missions | **PROVEN:** Runner missions remain read-only; guarded apply with `--write-csv` / `--apply` stays a **separate** founder-authorized executor step outside Runner (`docs/BuckParts-PRODUCTION-MISSION-V1.md`; **INV-003**, **INV-002** preserved). **PROVEN:** Manual handoff between Runner halt and CSV/Supabase apply persists (HQ handoff §1 deferred list). |
| Vendor auto-invocation or closed-loop ingest without manifest/result validation | **PROVEN:** External discovery requires human operator + disk manifest/result (`docs/BuckParts-AGENT-CONTRACT-V1.md`); missions halt `HALTED_EXTERNAL_AGENT` until validated result (**INV-008**, **INV-007** preserved). **UNKNOWN:** Whether operator latency blocks throughput — measure via **INV-013** / `operations_metrics_v1`. |
| Queue writing founder registry rows | **PROVEN:** Founder must manually record outcomes in `data/owner-decisions/*.json` per `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md` (HQ handoff §3). **PROVEN:** Gap between queue request artifact and registry row remains a human step (**INV-006** preserved). |
| Command Center single orchestration entrypoint that auto-runs next script | **PROVEN:** End-to-end orchestration stays **PARTIAL** — CC shows stage state but does not execute one orchestrated flow (HQ handoff). **PROVEN:** No single read-only command returns next exact command + blocked stage + mutation allowed/denied (HQ handoff — **MISSING/PARTIAL**). Operator must select scripts manually (**INV-014** preserved). |
| Dynamic mission definitions from Command Center | **PROVEN:** Missions remain code-defined in `scripts/lib/buckparts-runner-v1.ts`; new missions require code change and deploy of runtime lib when applicable. **UNKNOWN:** Impact on mission iteration speed. |
| Auto-resume after founder approval without explicit `--resume <run_id>` | **PROVEN:** Operator must re-run Runner with `--resume` (HQ handoff §1 deferred). **PROVEN:** Halted runs stay halted on disk until explicit resume (**INV-009** validation-on-resume behavior unchanged). |
| Queue auto-stale / auto-supersede without operator review | **PROVEN:** `SUPERSEDED` status type exists; supersede wiring **NOT IMPLEMENTED** (HQ handoff §3). **PROVEN:** Stale requests may remain `PENDING_OWNER_DECISION` or project `STALE` by timestamp only — no automatic cleanup. **UNKNOWN:** Operational clutter at scale. |
| Layer 6 closed-loop autonomy | **PROVEN:** Documented **NOT PROVEN** — `layer_6_founder_only_approval: NOT_PROVEN` (HQ handoff; **INV-015**). **PROVEN:** Founder approval remains required for mutation-shaped scope; no autonomous apply loop. |

**Not deferred — lifecycle proof status (unchanged):** Foundation v2 reference lifecycle **PROVEN once** by production mission run `a6b27301-e040-4405-b613-5adcb6c99bb6` (`lifecycle_complete: true`, `SAFE_BUYER_PATH_PROVEN` delta **+1** for `edr4rxd1`). First live audit run `a9ab9a89-c216-4a4e-bd86-132620591a5f` did **not** prove lifecycle (`lifecycle_complete: false`, **delta 0**). See §2 Production mission lifecycle phases.
