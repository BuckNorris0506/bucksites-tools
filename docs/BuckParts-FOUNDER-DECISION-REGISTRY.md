# Founder Decision Registry v1

**PROVEN:** This document defines a **read-only contract** for how founder-only outcomes *may* be recorded as structured state. **PROVEN:** TypeScript validation lives in `src/lib/owner-dashboard/founder-decision-registry-v1.ts`. **PROVEN:** Weekly digest and `npm run buckparts:founder-decision-registry` **read** optional JSON under `data/owner-decisions/*.json` via `founder_decision_registry_read_model_v1` (counts + Codex review linkage when `codex_output_review_context_v1` is set) — **no** repo automation mutates queues, packets, Runner Step, or gates from those files.

**INFERRED:** Registry rows do **not** grant closed-loop autonomy, Cursor/Codex/OpenAI automation, or mutation authority to agents. **PROVEN:** `allowed_next_scope` values are labels for human process only until explicitly wired elsewhere; `approve_readonly_findings` rows must use `read_only_agent` scope (validator-enforced) and still do **not** authorize Supabase, `retailer_links`, evidence JSON, affiliate edits, commits, or Runner input.

---

## Contract id

| Field | Value |
|--------|--------|
| `contract` | `founder_decision_registry_v1` |
| `read_only` | `true` (document semantics: validation-only in repo code today) |
| `data_mutation` | `false` (registry JSON is not production DB or `retailer_links`) |

---

## Document envelope (optional JSON file)

```json
{
  "contract": "founder_decision_registry_v1",
  "read_only": true,
  "data_mutation": false,
  "rows": []
}
```

---

## Row schema (`rows[]`)

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `decision_id` | string | yes | Stable id for this decision row (e.g. UUID or `decision-2026-05-08-queue-human-browser`). |
| `source_queue_row_id` | string | yes | Founder Action Queue row id this decision answers. |
| `source_decision_packet_id` | string | yes | Founder Decision Packet id (e.g. `decision_packet_v1:queue-human-browser`), **or** when `codex_output_review_context_v1` is set: `codex_output_review_packet_v1:${source_queue_row_id}` exactly. |
| `decided_at` | string (ISO 8601) | yes | When the founder recorded the decision. |
| `decision_status` | string | yes | One of: `approved`, `rejected`, `deferred`, `needs_more_evidence`. |
| `owner_note` | string | yes | Founder-authored text; **must be non-empty** when `allowed_next_scope` is `owner_mutation_approved`. |
| `allowed_next_scope` | string | yes | One of: `none`, `read_only_agent`, `human_external`, `owner_mutation_approved`. |
| `expires_at` | string (ISO 8601) or null | no | After this instant, the row must **not** be treated as an active standing approval for mutation-shaped scope. |
| `review_after` | string (ISO 8601) or null | no | After this instant, treat active approval as stale (same as `expires_at` for “active mutation approval” helpers). |
| `evidence_required_before_mutation` | boolean | yes | Must be **`true`** when `allowed_next_scope` is `owner_mutation_approved` (explicit evidence gate). |
| `prohibited_actions_still_apply` | string[] | yes | Non-empty; typically copied from the decision packet snapshot. |
| `codex_output_review_context_v1` | object | no | When present, records owner judgment for **`codex_output_review_packet_v1`** (digest/dashboard read model counts + digest correlation only). See subsection below. |
| `batch_production_owner_review_context_v1` | object | no | When present, records owner judgment for **`batch_owner_screenshot_draft_packet_v1`** / batch owner approval checklist. See subsection below. |
| `executive_recommendation_decision_priors` | string[] | no | Decision Priors Framework v1 (**INSTANTIATED_ZERO_AUTHORITY** — existence ≠ permission) — optional **labels only** that influenced the Executive recommendation. Catalog ids from `docs/BuckParts-DECISION-PRIORS-FRAMEWORK-CONTRACT-V1.md`. Retained on OAR / disagreement-shaped rows; no scoring, weighting, or behavior change. Any future non-zero Executive permission requires a fresh Evolution Gate authority-claim packet. |

### `codex_output_review_context_v1` (optional)

| Field | Type | Required | Notes |
|--------|------|----------|-------|
| `review_packet_contract` | string | yes | Must be exactly `codex_output_review_packet_v1`. |
| `founder_option_id` | string | yes | One of: `approve_readonly_findings`, `reject_findings`, `request_followup_readonly`, `defer_review` (same ids as digest `codex_output_review_packet_v1` founder options). |

**When `codex_output_review_context_v1` is set (PROVEN in validator):**

- `source_decision_packet_id` **must** be `codex_output_review_packet_v1:${source_queue_row_id}` (stable digest correlation key).
- **approve_readonly_findings** → `decision_status` = `approved`, `allowed_next_scope` = `read_only_agent` (does **not** grant `owner_mutation_approved` or any mutating authority).
- **reject_findings** → `rejected` + `none`.
- **request_followup_readonly** → `needs_more_evidence` + `read_only_agent`.
- **defer_review** → `deferred` + `none`.

### `batch_production_owner_review_context_v1` (optional)

| Field | Type | Required | Notes |
|--------|------|----------|-------|
| `review_packet_contract` | string | yes | Must be exactly `batch_owner_screenshot_draft_packet_v1`. |
| `founder_option_id` | string | yes | One of: `approve_for_next_planning_only`, `reject`, `request_more_evidence`, `defer` (batch owner approval checklist). |
| `batch_row_id` | string | yes | Batch production row id (e.g. `da97-08006b`). |
| `token` | string | yes | Part token for the row. |

**When `batch_production_owner_review_context_v1` is set (PROVEN in validator):**

- `source_decision_packet_id` **must** be `batch_owner_review_packet_v1:${batch_row_id}`.
- **approve_for_next_planning_only** → `approved` + `read_only_agent` (planning only — **not** production mutation or evidence commit).
- **reject** → `rejected` + `none`.
- **request_more_evidence** → `needs_more_evidence` + `read_only_agent`.
- **defer** → `deferred` + `none`.

---

## Semantic rules (PROVEN in validator)

1. **`read_only_agent`** — does **not** authorize mutating npm targets, Supabase, `retailer_links`, evidence JSON writes, or affiliate URL changes. It only labels that read-only agent packets may align with founder intent. **`evidence_required_before_mutation: false` on a `read_only_agent` row does not grant mutation authority** — that flag is only **required** to be `true` when `allowed_next_scope` is `owner_mutation_approved` (validator-enforced). Treat `read_only_agent` as **never** mutation-shaped regardless of `decision_status` or Codex review option.
2. **`owner_mutation_approved`** — requires non-empty `owner_note` and `evidence_required_before_mutation === true` (explicit mutation-scoped evidence gate). Optional `expires_at` / `review_after` bound standing approval: if the reference time is **on or after** either instant, `isFounderRegistryRowActiveMutationApproval` is **false** (`founder-decision-registry-v1.ts`). **INFERRED:** Even a valid active row is **not** consumed by Runner, queues, or gates today — it is founder-local structured intent only until separately wired.
3. **`approve_readonly_findings` (Codex review)** — validator requires `decision_status: approved` and `allowed_next_scope: read_only_agent`. **Must not** be treated as mutation approval, `owner_mutation_approved`, or authority for Supabase, `retailer_links`, evidence JSON, affiliate edits, commits, or Runner input. **PROVEN:** `founderRegistryRowGrantsMutatingRepoAuthority` returns **false** for these rows.
4. Invalid `decision_status` or `allowed_next_scope` values fail validation.
5. **`codex_output_review_context_v1`** — optional; when present, alignment rules in the subsection above are enforced (including **no** `owner_mutation_approved` pairing for `approve_readonly_findings`).
6. **`batch_production_owner_review_context_v1`** — optional; when present, alignment rules in the subsection above are enforced (**no** `owner_mutation_approved` for `approve_for_next_planning_only`).

---

## Activating mutation approval for guarded apply executors (PROVEN)

**PROVEN:** BuckParts **never** auto-flips a registry row from draft/inactive to mutation-active. A row on disk with `decision_status: deferred` and `allowed_next_scope: none` is **valid JSON** but **intentionally rejected** by guarded apply `--write-csv` paths (`founder_decision_missing: true` / `founder_owner_mutation_approved_missing_or_inactive`). This is **by design** — see `docs/ARCHITECTURE.md` **INV-006** and `docs/BuckParts-BATCH-PRODUCTION-LANE-V1.md` (approval is a separate human step).

### Authoritative storage (one source of truth)

| Layer | Role |
|--------|------|
| **`data/owner-decisions/*.json`** | **Only** durable store for founder mutation intent (`founder_decision_registry_v1` envelope + `rows[]`). |
| **`isFounderRegistryRowActiveMutationApproval`** (`founder-decision-registry-v1.ts`) | **Canonical** active-mutation predicate: `approved` + `owner_mutation_approved` + time bounds. |
| **Executor-specific matchers** | Read the same directory once per run; correlate row → slug/plan (e.g. `findActiveFounderDecisionForSupabaseCsvParitySlug` in `supabase-csv-parity-guarded-apply-v1.ts`, `findActiveFounderDecisionForSlug` in `manufacturer-rescue-guarded-apply-bridge-v1.ts`). **No second approval store.** |

**PROVEN:** Runner, Owner Decision Queue, Command Center, and digest **do not** grant mutation authority. Queue effective `APPROVED` **projects** from an active registry row — it does not replace it.

### Manual activation sequence (founder-only)

After reviewing read-only artifacts (apply-plan proposal, classification packet, guarded dry-run), the founder **manually** edits or commits a registry row:

| Step | Field | Inactive (draft / defer) | Active (authorizes guarded `--write-csv` when executor gates pass) |
|------|--------|---------------------------|---------------------------------------------------------------------|
| 1 | `decision_status` | `deferred`, `rejected`, or `needs_more_evidence` | **`approved`** |
| 2 | `allowed_next_scope` | `none`, `read_only_agent`, or `human_external` | **`owner_mutation_approved`** |
| 3 | `owner_note` | Any (may include `PENDING_OWNER_SIGNATURE`) | **Non-empty** founder-signed note (required by validator) |
| 4 | `evidence_required_before_mutation` | — | **`true`** (required when scope is `owner_mutation_approved`) |
| 5 | `decided_at` | Draft assembly timestamp OK | **Approval timestamp** (ISO 8601) |
| 6 | Optional slug context | e.g. `{slug}_apply_context_v1` with `owner_approved_by: null` | Set `owner_approved_by`, `approved_at` in apply-context blob when used |

**Typical workflow for Supabase CSV parity / owner-review insert slugs (e.g. `4396508`):**

1. Review `data/fridge/batch-production/drafts/fridge-safe-link-<slug>-apply-plan-proposal-v1.json` and owner classification packet.
2. Run dry-run: `npm run buckparts:supabase-csv-parity-guarded-apply -- --slug <slug>` (expect `DRY_RUN_READY`; `founder_decision_missing: true` until activation).
3. Copy or edit registry row under `data/owner-decisions/` (template may ship as `deferred` + `none`).
4. Activate row (table above), commit JSON.
5. Fresh precheck per apply-plan (e.g. `npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens <slug>`).
6. Re-run dry-run, then `npm run buckparts:supabase-csv-parity-guarded-apply -- --slug <slug> --write-csv`.

### Why inactive rows are rejected (not a resolver bug)

Guarded apply executors require **all** of:

1. Row validates (`validateFounderDecisionRegistryRowV1`).
2. `decision_status === "approved"`.
3. `allowed_next_scope === "owner_mutation_approved"`.
4. `isFounderRegistryRowActiveMutationApproval(row, nowIso) === true` (includes `expires_at` / `review_after`).
5. Slug / apply-plan correlation (structured `{slug}_apply_context_v1` or validated-row haystack).

A file **existing** with `deferred` + `none` means **“review recorded, mutation not authorized yet”** — not missing discovery.

### Bypass resistance (PROVEN)

- **`--write-csv`** sets `mutation_authorized` only when an active founder row is loaded **and** the universal guarded CSV executor is ready (`buildSupabaseCsvParityGuardedApplyMutationAuthorizationV1`).
- Each guarded-apply run loads registry rows **once** from disk; the same `founderRow` reference feeds both mutation-auth builds — no re-read, no alternate env bypass.
- `read_only_agent` / Codex `approve_readonly_findings` rows **cannot** satisfy mutation gates (validator + `isFounderRegistryRowActiveMutationApproval`).

---

## File placement (repo-consistent)

- **Normative spec:** this file (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`).
- **Optional data directory:** `data/owner-decisions/README.md` — founder-local JSON; `npm run buckparts:founder-decision-registry` and weekly digest scan `*.json` here read-only (see **Read model v1** below).

---

## Read model v1 (BuckParts)

**PROVEN:** `founder_decision_registry_read_model_v1` lives in `src/lib/owner-dashboard/founder-decision-registry-read-model-v1.ts` (pure aggregation; no writes). **PROVEN:** Digest passes Codex Output Review `source_queue_row_id` into the read model to report whether a matching `codex_output_review_context_v1` row exists (informational markdown only). **PROVEN:** `npm run buckparts:founder-decision-registry` invokes `scripts/report-founder-decision-registry.ts` (human-friendly alias). **PROVEN:** For piping to `JSON.parse`, use `node --import tsx scripts/report-founder-decision-registry.ts` per `docs/BuckParts-JSON-STDOUT-CONTRACT.md`. **PROVEN:** Digest and owner dashboard may embed short markdown / JSON summaries — they do **not** alter Founder Action Queue, Decision Packets, Execution Packets, Runner Step, or mutation gates.

---

## Changelog (doc only)

| Date | Change |
|------|--------|
| 2026-06-27 | Documented guarded-apply activation workflow: manual `deferred`/`none` → `approved`/`owner_mutation_approved`; single authoritative store; inactive-row rejection rationale. |
| 2026-05-16 | Clarified `read_only_agent` vs `owner_mutation_approved` vs `approve_readonly_findings` (no mutation authority from read-only scope or Codex approve-read-only). |
| 2026-05-16 | Optional `codex_output_review_context_v1` on registry rows + read-model counts + digest queue correlation + Layer 6 `founder_decision_recording_for_codex_review_v1` (visibility only; Layer 6 still NOT_PROVEN). |
| 2026-05-15 | Read model v1 + `buckparts:founder-decision-registry` report script + digest/dashboard surfacing (counts only). |
| 2026-05-15 | Initial Founder Decision Registry v1 contract + TS validator (`founder-decision-registry-v1.ts`). |
