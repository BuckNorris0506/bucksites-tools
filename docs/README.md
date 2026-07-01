# BuckParts documentation

**Purpose:** Entry point for humans and AI agents working in this repository.

**Truth contract:** Repo truth over memory. Label non-trivial claims **PROVEN**, **INFERRED**, or **UNKNOWN**. Do not treat documentation as mutation authority.

---

## Single source of truth for current project state

| Question | Authority | Notes |
|----------|-----------|--------|
| **What should we do next operationally?** | **`docs/BuckParts-HQ-HANDOFF.md`** — **ONLY** current operational handoff | Read **§ Current stopping point — Security / RLS / service-role gating (`2122959`)** first. |
| **What principles bind all work?** | `docs/BuckParts-CONSTITUTION.md` | Governs when HQ guidance conflicts with durable principles. |
| **How is the system structured?** | `docs/ARCHITECTURE.md` | Layers, partial state machines, invariants — repo-derived only. |
| **What are live counts / NBA right now?** | **UNKNOWN** from docs alone | **PROVEN:** Re-run `node --import tsx scripts/report-buckparts-command-center.ts` before citing live Command Center numbers (`docs/BuckParts-HQ-HANDOFF.md`). |
| **What may mutate production?** | Founder Decision Registry + explicit guarded apply executors | **PROVEN:** Queue, Runner, and Command Center are read-only for mutation (`docs/ARCHITECTURE.md`). |

**PROVEN:** `docs/BuckParts-HQ-HANDOFF.md` is the **only** operational handoff document for current execution.

**PROVEN:** Sections inside `docs/BuckParts-HQ-HANDOFF.md` labeled **`historical — superseded`** (and prior stopping-point blocks explicitly marked superseded) are **historical evidence only** — context for past milestones, not current state. **Never** treat them as the active stopping point unless a fresh Command Center run proves otherwise.

**UNKNOWN:** A separate `docs/archive/` handoff directory — not present in repo; superseded material lives as labeled sections within HQ handoff or in git history.

---

## Required reading order (AI and operators)

Read in this order before taking operational action:

| # | Document | Why read it |
|---|----------|-------------|
| 1 | [`BuckParts-CONSTITUTION.md`](./BuckParts-CONSTITUTION.md) | Durable principles: trust hierarchy, truth contract, evidence standards, automation doctrine, founder authority limits. |
| 2 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System layers (Truth, Intelligence, Execution, Owner), partial rescue state machines, invariants, decision log. |
| 3 | [`BuckParts-HQ-HANDOFF.md`](./BuckParts-HQ-HANDOFF.md) | **Only** current operational handoff — foundation stack status, missions, deferred scope, exact commands. |
| 4 | [`BuckParts-AGENT-CONTRACT-V1.md`](./BuckParts-AGENT-CONTRACT-V1.md) | Vendor-agnostic Runner dispatch manifest/result contract; external operator boundaries. |
| 5 | [`BuckParts-PRODUCTION-MISSION-V1.md`](./BuckParts-PRODUCTION-MISSION-V1.md) | Reference end-to-end `production_mission_v1` mission; lifecycle artifacts; expected proven delta rules. |
| 6 | [`BuckParts-OPERATIONS-METRICS-V1.md`](./BuckParts-OPERATIONS-METRICS-V1.md) | Read-only throughput measurement; snapshot history; interpretation rules. |

After reading 1–6, use wedge-specific owner-review docs, batch-production drafts under `data/`, and Command Center JSON for task-scoped evidence — not as substitutes for the handoff.

---

## Foundational documents (brief)

### `BuckParts-CONSTITUTION.md`

Governing document for BuckParts judgment and values. Defines mission (wrong-part harm reduction), customer promise, trust hierarchy, truth and uncertainty doctrine, evidence standards, automation limits, and what never changes. Subordinate docs must not contradict it.

### `ARCHITECTURE.md`

Repo-truth map of four layers, manufacturer rescue partial state machines, system invariants, and architectural decision log. Documents Foundation v2 live audit outcome: orchestrated runs with `lifecycle_complete: false` and `SAFE_BUYER_PATH_PROVEN` delta `0` until founder-guarded apply runs outside Runner.

### `BuckParts-HQ-HANDOFF.md`

**The only current operational handoff.** **Current stopping point:** Security / RLS / service-role gating at HEAD **`2122959`** (13 `write_guarded` / 7 `write_unguarded` service-role inventory). Foundation v1 stack, owner browser proof refresh director, HyperAgent evidence production director, operating model, exact CLI paths, proven validation commands, and explicit **NOT IMPLEMENTED** deferred scope. Superseded sections (e.g. `56b4167` owner browser proof) are historical only.

### `BuckParts-AGENT-CONTRACT-V1.md`

Foundation v2 external-operator contract: `buckparts_agent_dispatch_manifest_v1`, `buckparts_agent_result_v1`, timeout/retry rules, ownership boundaries. Runner writes manifests; operators write results; validated results do not grant `mutation_authorized`.

### `BuckParts-PRODUCTION-MISSION-V1.md`

Reference Runner mission `production_mission_v1` exercising the Foundation v2 stack end-to-end. Runner never writes CSV; lifecycle artifacts under `data/command-center/production-missions/`; operations metrics append on run.

### `BuckParts-OPERATIONS-METRICS-V1.md`

Contract `operations_metrics_v1` — indexes runner, dispatch, queue, and census artifacts. Append-only `data/command-center/operations-metrics/history-v1.jsonl`. Measurement only; no orchestration or product mutation.

---

## Related docs (not in required reading order)

Use when the task scope requires them — they do **not** replace the handoff for current operational state:

- `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md` — recording founder approve/reject/defer outcomes
- `docs/BuckParts-RUNNER-STATUS.md` — Runner Step vs Runner v1; layer truth notes
- `docs/BuckParts-JSON-STDOUT-CONTRACT.md` — parsing `report-*.ts` stdout
- Wedge owner-review packets under `docs/air-purifier/`, `docs/grants/`, etc. — bounded evidence and apply reviews for specific slugs/batches

---

## Quick commands (after reading handoff)

```bash
# Current operational steering (stdout JSON — re-run before citing)
node --import tsx scripts/report-buckparts-command-center.ts

# Owner browser proof refresh queue (read-only control plane)
npm run buckparts:owner-browser-proof-refresh-director

# HyperAgent 14 cohort evidence production ranking (read-only)
npm run buckparts:hyperagent-safe-link-evidence-production-director

# edr3rxd1 + ultrawf evidence readiness audit (read-only)
npm run buckparts:edr3rxd1-ultrawf-evidence-readiness-director

# List Runner missions
node --import tsx scripts/report-buckparts-runner-v1.ts --list-missions

# Operations metrics snapshot
npm run buckparts:operations-metrics
```

**PROVEN:** Docs-only changes classify as `NO_DEPLOY_NEEDED` (`docs_only` rule in `scripts/lib/buckparts-deploy-classifier-v1.ts`).
