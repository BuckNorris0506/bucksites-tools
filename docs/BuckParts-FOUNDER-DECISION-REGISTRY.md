# Founder Decision Registry v1

**PROVEN:** This document defines a **read-only contract** for how founder-only outcomes *may* be recorded as structured state. **PROVEN:** TypeScript validation lives in `src/lib/owner-dashboard/founder-decision-registry-v1.ts`. **INFERRED:** No workflow, Runner Step, digest builder, or dashboard code **reads** or **writes** registry files yet — founders append or edit JSON manually (or via future tooling outside this task).

**INFERRED:** Registry rows do **not** grant closed-loop autonomy, Cursor/Codex/OpenAI automation, or mutation authority to agents. **PROVEN:** `allowed_next_scope` values are labels for human process only until explicitly wired elsewhere.

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
| `source_decision_packet_id` | string | yes | e.g. `decision_packet_v1:queue-human-browser` from Founder Decision Packet v1. |
| `decided_at` | string (ISO 8601) | yes | When the founder recorded the decision. |
| `decision_status` | string | yes | One of: `approved`, `rejected`, `deferred`, `needs_more_evidence`. |
| `owner_note` | string | yes | Founder-authored text; **must be non-empty** when `allowed_next_scope` is `owner_mutation_approved`. |
| `allowed_next_scope` | string | yes | One of: `none`, `read_only_agent`, `human_external`, `owner_mutation_approved`. |
| `expires_at` | string (ISO 8601) or null | no | After this instant, the row must **not** be treated as an active standing approval for mutation-shaped scope. |
| `review_after` | string (ISO 8601) or null | no | After this instant, treat active approval as stale (same as `expires_at` for “active mutation approval” helpers). |
| `evidence_required_before_mutation` | boolean | yes | Must be **`true`** when `allowed_next_scope` is `owner_mutation_approved` (explicit evidence gate). |
| `prohibited_actions_still_apply` | string[] | yes | Non-empty; typically copied from the decision packet snapshot. |

---

## Semantic rules (PROVEN in validator)

1. **`read_only_agent`** — does **not** authorize mutating npm targets, Supabase, `retailer_links`, evidence JSON writes, or affiliate URL changes. It only labels that read-only agent packets may align with founder intent.
2. **`owner_mutation_approved`** — requires non-empty `owner_note` and `evidence_required_before_mutation === true`. Time bounds: if `expires_at` or `review_after` is set and the reference time is **on or after** that instant, `isFounderRegistryRowActiveMutationApproval` is **false**.
3. Invalid `decision_status` or `allowed_next_scope` values fail validation.

---

## File placement (repo-consistent)

- **Normative spec:** this file (`docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`).
- **Optional data directory:** `data/owner-decisions/README.md` — founder-local JSON or append-only lists; not read by CI in v1.

---

## Changelog (doc only)

| Date | Change |
|------|--------|
| 2026-05-15 | Initial Founder Decision Registry v1 contract + TS validator (`founder-decision-registry-v1.ts`). |
