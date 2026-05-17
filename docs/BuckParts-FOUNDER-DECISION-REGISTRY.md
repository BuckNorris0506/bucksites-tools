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

---

## Semantic rules (PROVEN in validator)

1. **`read_only_agent`** — does **not** authorize mutating npm targets, Supabase, `retailer_links`, evidence JSON writes, or affiliate URL changes. It only labels that read-only agent packets may align with founder intent. **`evidence_required_before_mutation: false` on a `read_only_agent` row does not grant mutation authority** — that flag is only **required** to be `true` when `allowed_next_scope` is `owner_mutation_approved` (validator-enforced). Treat `read_only_agent` as **never** mutation-shaped regardless of `decision_status` or Codex review option.
2. **`owner_mutation_approved`** — requires non-empty `owner_note` and `evidence_required_before_mutation === true` (explicit mutation-scoped evidence gate). Optional `expires_at` / `review_after` bound standing approval: if the reference time is **on or after** either instant, `isFounderRegistryRowActiveMutationApproval` is **false** (`founder-decision-registry-v1.ts`). **INFERRED:** Even a valid active row is **not** consumed by Runner, queues, or gates today — it is founder-local structured intent only until separately wired.
3. **`approve_readonly_findings` (Codex review)** — validator requires `decision_status: approved` and `allowed_next_scope: read_only_agent`. **Must not** be treated as mutation approval, `owner_mutation_approved`, or authority for Supabase, `retailer_links`, evidence JSON, affiliate edits, commits, or Runner input. **PROVEN:** `founderRegistryRowGrantsMutatingRepoAuthority` returns **false** for these rows.
4. Invalid `decision_status` or `allowed_next_scope` values fail validation.
5. **`codex_output_review_context_v1`** — optional; when present, alignment rules in the subsection above are enforced (including **no** `owner_mutation_approved` pairing for `approve_readonly_findings`).

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
| 2026-05-16 | Clarified `read_only_agent` vs `owner_mutation_approved` vs `approve_readonly_findings` (no mutation authority from read-only scope or Codex approve-read-only). |
| 2026-05-16 | Optional `codex_output_review_context_v1` on registry rows + read-model counts + digest queue correlation + Layer 6 `founder_decision_recording_for_codex_review_v1` (visibility only; Layer 6 still NOT_PROVEN). |
| 2026-05-15 | Read model v1 + `buckparts:founder-decision-registry` report script + digest/dashboard surfacing (counts only). |
| 2026-05-15 | Initial Founder Decision Registry v1 contract + TS validator (`founder-decision-registry-v1.ts`). |
