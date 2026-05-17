# BuckParts Batch Production Lane v1

**Status:** **PROVEN** read-only report builder + CLI stdout; **NOT PROVEN** queue/digest wiring or apply lane.

**Purpose:** Reduce founder copy/paste by producing **reviewable candidate batches** (links, products, pages, rescue targets) in one structured report per run, so Jared can approve, defer, or reject in bulk **before** any commit, deploy, or production mutation.

**Truth contract:** **PROVEN** = cited path or validator behavior exists in-repo today. **INFERRED** = reasonable follow-on from PROVEN facts. **UNKNOWN** = not evidenced until implemented.

**Audit alignment (2026-05-16):** External review of the Layer 6 / Codex control-plane bundle concluded **PROCEED WITH FIXES FIRST**; safe next business direction is a **review-only** candidate batch lane, not auto-publish. **PROVEN:** `layer_6_founder_only_approval` remains **`NOT_PROVEN`** in `buckparts_runner_step_v1` output (`scripts/buckparts-runner-step.ts`). **PROVEN:** Codex is a bounded **read-only worker / investigator**, not an autonomous code writer (`docs/BuckParts-RUNNER-STATUS.md`, `docs/BuckParts-HQ-HANDOFF.md` §0B).

---

## Contract id (planned)

| Field | Value |
|--------|--------|
| `contract` | `batch_production_lane_v1` |
| `read_only` | `true` (V1 generator must not mutate production) |
| `data_mutation` | `false` (no Supabase, no `retailer_links`, no production evidence JSON) |
| `implementation_status` | `PARTIAL` — library + report CLI only |

Planned review artifact contract (future script output):

| Field | Value |
|--------|--------|
| `contract` | `batch_production_review_report_v1` |
| `read_only` | `true` |
| `data_mutation` | `false` |

---

## Goals and non-goals

### Goals (V1 when implemented)

| Goal | Label |
|------|--------|
| Emit **5–10** candidate rows per run in a single founder-readable report | **INFERRED** (this doc); batch size enforced at implementation |
| Tie each candidate to **stable ids** and **source_queue_row_id** where applicable | **INFERRED** |
| Surface **why** each row is a candidate (read-only signals from existing read models / queue) | **INFERRED** |
| Make **stop conditions** explicit so a run halts instead of silently widening scope | **INFERRED** |
| Keep **approval** a separate human step (registry row, explicit “apply” command, or manual edit) | **PROVEN** intent aligned with `founder_decision_registry_v1` (`automation_input: false` today) |

### Non-goals (V1 — must not be claimed or built)

| Non-goal | Label |
|----------|--------|
| Auto-publish, auto-deploy, or Netlify/production promotion | **PROVEN** policy (this doc + HQ §0B) |
| Auto-commit or auto-PR | **PROVEN** policy |
| Direct Supabase writes, `retailer_links` mutation, production **evidence JSON** writes, affiliate URL changes | **PROVEN** policy (matches Founder Decision Registry prohibited actions) |
| Closed-loop Runner / Codex loop without founder review | **PROVEN** Layer 6 **NOT_PROVEN** |
| Treating `approve_readonly_findings` or `read_only_agent` registry rows as mutation approval | **PROVEN** in `founder-decision-registry-v1.ts` validator |
| Batch size **20–50** in first implementation | **PROVEN** deferred (see batch sizing) |

---

## Batch sizing

| Phase | Row count | Label |
|-------|-----------|--------|
| **V1 initial** | **5–10** candidates per report | **PROVEN** (normative in this contract) |
| **Future** | **20–50** per report | **INFERRED** target only after V1 report quality is **PROVEN** acceptable on repeated runs (founder sign-off + audit notes) |

**UNKNOWN:** Exact default (5 vs 10) until the first runner lands; implementation must hard-cap at **10** for `batch_production_lane_v1`.

---

## Current permitted V1 (when implemented)

**Single lane mode:** **read-only batch candidate review generator**.

| Permitted behavior | Label |
|--------------------|--------|
| Read existing repo read models and Founder Action Queue snapshots | **INFERRED** (inputs below) |
| Optionally invoke **read-only** Codex investigation **per candidate** or **per batch preamble** only inside existing Codex sandbox rules | **INFERRED** (same bounds as `scripts/run-buckparts-codex-next-execution-packet.ts`) |
| Write **lane-local draft artifacts** only (see Allowed writes) | **INFERRED** |
| Print machine JSON to stdout per `docs/BuckParts-JSON-STDOUT-CONTRACT.md` | **INFERRED** |

**NOT permitted in V1:** applying candidates to catalog, writing evidence packs, mutating affiliate links, or enqueueing Runner Step automatically from batch output.

---

## Allowed inputs (read-only)

Inputs must be **read-only** and **repo-local** unless explicitly expanded in a future contract revision.

| Input | Source (PROVEN paths today) | Notes |
|--------|----------------------------|--------|
| Founder Action Queue rows | `src/lib/owner-dashboard/founder-action-queue-v1.ts` | **PROVEN** — primary prioritization surface |
| Founder Decision Packets (read-only) | `src/lib/owner-dashboard/founder-decision-packet-v1.ts` | **PROVEN** — owner-only copy; not execution prompts |
| Founder Execution Packet snapshot (read-only) | `scripts/lib/buckparts-next-execution-packet.ts` | **PROVEN** — informs what is “agent-safe” vs blocked |
| Failure Pattern Registry read model | `src/lib/owner-dashboard/failure-pattern-registry-v1.ts` | **PROVEN** — informational guardrails |
| Layer 6 readiness summary inputs | `src/lib/owner-dashboard/layer-six-readiness-summary-v1.ts` | **PROVEN** — does not grant authority |
| Founder Decision Registry read model | `node --import tsx scripts/report-founder-decision-registry.ts` | **PROVEN** — visibility only; **not** automation input |
| Optional saved Codex proof JSON | Path via `FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH` pattern | **PROVEN** env pattern in digest; batch may accept equivalent **file path flag** when implemented |
| Optional saved Runner Step JSON | `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH` pattern | **PROVEN** env pattern in digest |
| Local operator / command-center JSON | `npm run buckparts:command-center`, `npm run buckparts:command-surface` | **PROVEN** scripts exist in `package.json` — batch runner must not claim live DB truth without founder-verified snapshots |

**Prohibited as V1 inputs:** Supabase credentials for mutation, live `retailer_links` write APIs, production evidence directories used as **write targets**.

---

## Allowed writes (V1)

| Write target | Label |
|--------------|--------|
| **Lane draft directory (planned):** `data/batch-production/drafts/` — review reports, run manifests, per-candidate notes | **INFERRED** — directory may not exist until first implementation |
| **Stdout JSON:** `batch_production_review_report_v1` envelope | **INFERRED** |
| **Optional human markdown export** alongside JSON (founder clipboard / digest paste) | **INFERRED** |

Draft files must be:

- Listed in `.gitignore` or committed **only** when founder explicitly chooses to version a reviewed batch (policy **UNKNOWN** until team convention).

---

## Prohibited writes (V1 — normative)

| Prohibited write | Label |
|------------------|--------|
| Supabase or any remote production database | **PROVEN** policy |
| `retailer_links` or retailer catalog mutation artifacts | **PROVEN** policy |
| Production evidence JSON under `data/evidence/` (or parallel evidence paths) | **PROVEN** policy |
| Affiliate program URLs, tracking parameters, or application state | **PROVEN** policy |
| Git commits, branches, or PR creation by the batch runner | **PROVEN** policy |
| Netlify deploy hooks or workflow dispatches | **PROVEN** policy (no workflow changes in V1 contract step) |
| Founder Decision Registry JSON (`data/owner-decisions/*.json`) **by the batch runner** | **INFERRED** — founder (or explicit separate CLI) records decisions; batch may **suggest** registry-shaped drafts in report only |
| Widening Runner Step allowlist | **PROVEN** — `scripts/lib/buckparts-runner-safety-contract-v1.ts` unchanged by this lane |

---

## Review report shape (`batch_production_review_report_v1` — planned)

Future stdout / draft JSON should include at minimum:

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `contract` | string | yes | `batch_production_review_report_v1` |
| `read_only` | boolean | yes | `true` |
| `data_mutation` | boolean | yes | `false` |
| `generated_at` | ISO 8601 | yes | Run timestamp |
| `lane_contract` | string | yes | `batch_production_lane_v1` |
| `batch_size_cap` | number | yes | Hard cap ≤ **10** for V1 |
| `candidate_count` | number | yes | Actual rows emitted (≤ cap) |
| `overall_status` | string | yes | One of: `OK`, `PARTIAL`, `STOPPED`, `NO_CANDIDATES` |
| `stop_reason` | string \| null | no | Set when `overall_status` is `STOPPED` |
| `candidates[]` | array | yes | See candidate row |
| `layer_truth.layer_6_founder_only_approval` | string | yes | Must be **`NOT_PROVEN`** |
| `provenance` | object | yes | Input paths / read-model contracts used (read-only) |

### Candidate row (planned)

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `candidate_id` | string | yes | Stable within report |
| `source_queue_row_id` | string \| null | no | When mapped from Founder Action Queue |
| `title` | string | yes | Human label |
| `candidate_kind` | string | yes | e.g. `link`, `product`, `page`, `rescue_target` — enum fixed at implementation |
| `priority` | string | yes | e.g. `high`, `medium`, `low` |
| `read_only_rationale` | string | yes | Why surfaced |
| `blockers[]` | string[] | yes | Non-empty allowed; use `[]` if none |
| `suggested_founder_action` | string | yes | Review-only wording; **must not** imply auto-apply |
| `codex_invocation_recommended` | boolean | yes | If true, only **read-only** Codex per existing wrappers |
| `registry_decision_hint` | string \| null | no | Informational; e.g. `needs_owner_mutation_approved_row` — **not** a recorded decision |

### `missing_evidence[]` (implemented in `batch-production-lane-v1.ts`)

**PROVEN:** `read_only_rationale` / operator `source_reason` alone does **not** clear buyer-path gaps.

When `buyer_path_safety` is **`unknown`**, each row includes at minimum:

- `exact-token retailer PDP proof not provided`
- `buyability proof not provided`
- `safe buyer path not proven`

When `candidate_kind` is **`rescue_target`** and `read_only_rationale` mentions missing/no Amazon evidence (e.g. `no data/evidence/amazon-{slug}-*.json`), also:

- `self-prefix Amazon evidence JSON missing`

**PROVEN:** `buyer_path_safety: safe` with complete row signals may yield `missing_evidence: []`.

---

## Stop conditions

A batch run **must stop** (no further candidates, `overall_status: STOPPED` or `PARTIAL`) when any of the following is true:

| # | Condition | Label |
|---|-----------|--------|
| 1 | `candidate_count` would exceed **10** | **PROVEN** (V1 cap) |
| 2 | Failure Pattern Registry reports **unguarded** or **unknown_guardrail** count above founder-configured threshold (default: any new **unguarded** > 0) | **INFERRED** |
| 3 | Layer 6 readiness `readiness_status` is `blocked` | **INFERRED** |
| 4 | Active Founder Decision Registry row for a source queue id has `allowed_next_scope: none` or `decision_status: rejected` for that candidate | **INFERRED** |
| 5 | Runner Step JSON (when supplied) has `overall_status` **FAIL** and policy flag `require_runner_pass_before_batch` is true (default **true** when path supplied) | **INFERRED** |
| 6 | Codex proof JSON (when supplied) shows `codex_task_outcome_status` **TASK_PARTIAL_OR_FAILED** and policy `stop_on_codex_task_failure` is true (default **true**) | **INFERRED** |
| 7 | Git working tree not clean when batch policy requires clean tree (align with Codex smoke) | **INFERRED** |
| 8 | Any attempted write outside **Allowed writes** | **PROVEN** policy — hard fail |

**UNKNOWN:** Threshold tuning UI until implementation.

---

## Approval gate (founder-only)

| Gate | Rule | Label |
|------|------|--------|
| **Report review** | Founder must read `batch_production_review_report_v1` (or markdown export) before any apply/mutation step | **PROVEN** policy |
| **No auto-apply** | Batch output does **not** change queues, packets, Runner Step, or production | **PROVEN** (registry + Layer 6 docs) |
| **Mutation-shaped work** | Requires a **separate** Founder Decision Registry row with `allowed_next_scope: owner_mutation_approved`, `decision_status: approved`, non-empty `owner_note`, `evidence_required_before_mutation: true`, and valid `expires_at` / `review_after` if used | **PROVEN** validator rules in `founder-decision-registry-v1.ts` |
| **Read-only follow-up** | May align with `read_only_agent` + Codex wrappers only; e.g. `request_followup_readonly` records **needs_more_evidence**, not approval | **PROVEN** on disk: `data/owner-decisions/codex-output-review-queue-amazon-agent-request-followup-readonly-2026-05-16.json` |
| **Codex approve_readonly_findings** | Does **not** authorize mutation; does **not** satisfy batch “go live” | **PROVEN** validator |

**INFERRED:** A future `batch_production_apply_v2` (out of scope for V1 contract) would require explicit founder command + `owner_mutation_approved` row per batch or per candidate.

---

## Founder Decision Registry relationship

| Topic | Rule | Label |
|-------|------|--------|
| Automation input | Registry rows are **not** consumed by Runner, queues, or mutation gates today | **PROVEN** (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`) |
| Batch runner | Must **not** write `data/owner-decisions/*.json` | **INFERRED** V1 |
| Batch report | May reference existing rows via read model counts and `source_queue_row_id` correlation | **INFERRED** |
| After review | Founder may manually add registry rows (e.g. defer, request follow-up, or rare `owner_mutation_approved`) | **PROVEN** human process |
| `active_mutation_approvals` | Batch lane must **not** increment; current repo report shows **0** | **PROVEN** at last report run |

See **Registry semantics (normative)** in `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md` (clarified 2026-05-16).

---

## Codex relationship

| Topic | Rule | Label |
|-------|------|--------|
| Role | Optional **read-only** investigator per candidate; **not** autonomous implementer | **PROVEN** |
| Invocation | Same host requirements as `npm run buckparts:codex-readonly-smoke` / `npm run buckparts:codex-next-execution-packet` | **PROVEN** |
| Sandbox | Must **not** run `npm run lint`, `npm run build`, or `npm run buckparts:operator-proof` inside read-only sandbox | **PROVEN** (Founder Execution Packet + wrapper) |
| Outcome | `codex_task_outcome_status` separate from transport PASS | **PROVEN** |
| Batch stop | May stop when task outcome partial/failed (see Stop conditions) | **INFERRED** |

---

## Runner / local validation relationship

| Topic | Rule | Label |
|-------|------|--------|
| Repo validation bundle | `node --import tsx scripts/buckparts-runner-step.ts` — lint, build, `buckparts:operator-proof` | **PROVEN** |
| Layer 6 field | `layer_truth.layer_6_founder_only_approval: "NOT_PROVEN"` must remain in Runner output | **PROVEN** |
| Batch V1 | Runner is **not** invoked automatically by batch generator unless founder passes saved JSON path as input | **INFERRED** |
| Post-implementation acceptance | Any code change from **manual** founder work still validated via Runner Step / CI — not via Codex sandbox | **PROVEN** |

---

## Layer 6 statement (explicit)

**NOT PROVEN:** Layer 6 founder-only approval loop, closed-loop autonomy, or batch-driven mutation authority.

**PROVEN:** `layer_six_readiness_summary_v1` and related digest surfaces are **informational** only.

Implementing Batch Production Lane v1 **does not** change Layer 6 status unless a **separate**, evidence-backed contract revision says otherwise (none exists today).

---

## Implementation checklist

| Item | Status |
|------|--------|
| `src/lib/owner-dashboard/batch-production-lane-v1.ts` | **PROVEN** — pure `buildBatchProductionReviewReportV1` |
| `src/lib/owner-dashboard/batch-production-lane-v1.test.ts` | **PROVEN** |
| `scripts/report-batch-production-review.ts` | **PROVEN** — stdout JSON only by default; `--source amazon-rescue-default` or `--stdin` / `--input` |
| `src/lib/owner-dashboard/batch-production-amazon-rescue-source-v1.ts` | **PROVEN** — read-only row builder from repo CSV + token controls + evidence listing |
| `src/lib/owner-dashboard/batch-evidence-collection-plan-v1.ts` | **PROVEN** — `batch_evidence_collection_plan_v1` from review report (no evidence writes) |
| `scripts/report-batch-evidence-collection-plan.ts` | **PROVEN** — `--source amazon-rescue-default` or `--stdin` review JSON |
| `npm run buckparts:batch-production-review` | **PROVEN** human alias; machine JSON: `node --import tsx scripts/report-batch-production-review.ts` |
| Digest / dashboard embed | **NOT_IMPLEMENTED** |
| Apply / mutation script | **NOT_IMPLEMENTED** (out of scope) |
| `data/batch-production/drafts/` writes | **NOT_IMPLEMENTED** (stdout-only default) |

**Commands:**

```bash
# Empty input → NO_CANDIDATES JSON
node --import tsx scripts/report-batch-production-review.ts

# Raw row array via stdin (lowest-friction; operator aliases part_token, candidate_url, source_reason)
printf '%s\n' '[{"row_id":"sample-1","part_token":"W10413645A","candidate_url":"https://example.com/sample","source_reason":"contract smoke only"}]' \
  | node --import tsx scripts/report-batch-production-review.ts --stdin

# Wrapper object (optional context)
echo '{"rows":[{"row_id":"r1","token":"x","url":"https://example.com","read_only_rationale":"test"}]}' \
  | node --import tsx scripts/report-batch-production-review.ts --stdin

# Repo-owned Amazon rescue default cohort (5 tokens; no hand-built JSON)
node --import tsx scripts/report-batch-production-review.ts --source amazon-rescue-default

# Evidence collection plan (owner browser capture checklist per token; stdout only)
node --import tsx scripts/report-batch-evidence-collection-plan.ts --source amazon-rescue-default
```

---

## Related docs

| Doc | Role |
|-----|------|
| `docs/BuckParts-HQ-HANDOFF.md` §0B | HQ continuation + active lane |
| `docs/BuckParts-RUNNER-STATUS.md` | Runner / Codex / Layer 6 canonical status |
| `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md` | Owner decision semantics |
| `docs/BuckParts-JSON-STDOUT-CONTRACT.md` | Future batch JSON stdout |
| `docs/BuckParts-FAILURE-PATTERN-REGISTRY.md` | Stop-condition guardrail inputs |

---

## Changelog (doc only)

| Date | Change |
|------|--------|
| 2026-05-16 | Initial Batch Production Lane v1 **contract only** (review-only, 5–10 cap, Layer 6 NOT_PROVEN). |
| 2026-05-17 | **PROVEN:** `batch-production-lane-v1.ts` + `report-batch-production-review.ts` (read-only stdout JSON; hard cap 10). |
