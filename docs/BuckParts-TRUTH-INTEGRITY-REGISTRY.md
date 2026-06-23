# BuckParts Truth Integrity Registry v1

**Department:** Truth Integrity Department (read-only audit ledger)  
**Governing:** `docs/BuckParts-CONSTITUTION.md` §5 Truth Contract, §7 Evidence Standards  
**Status:** Contract + committed JSON artifact — **not** production mutation authority

**PROVEN:** This registry records **integrity gaps** between what BuckParts claims, what tests prove, and what runtime shows homeowners. **PROVEN:** Rows are **read-only planning artifacts** until a separate founder-authorized mutation path applies a fix. **PROVEN:** This registry does **not** alter Supabase, CSVs, `retailer_links`, buy gates, HQ handoff, or Command Center JSON at runtime.

**INFERRED:** HyperAgent, Cursor, and Codex audits **append or update** rows here to turn one-off investigations into durable truth debt tracking — replacing chat memory with committed evidence.

---

## Contract id

| Field | Value |
|--------|--------|
| `contract` | `truth_integrity_registry_v1` |
| `read_only` | `true` |
| `data_mutation` | `false` |
| `mutation_authorized` | `false` |
| `artifact_path` | `data/truth-integrity/truth-integrity-registry-v1.json` |

---

## Document envelope

```json
{
  "contract": "truth_integrity_registry_v1",
  "schema_version": "1.0",
  "read_only": true,
  "data_mutation": false,
  "mutation_authorized": false,
  "department": "Truth Integrity Department",
  "governing_docs": ["docs/BuckParts-CONSTITUTION.md"],
  "created_at": "<ISO-8601>",
  "last_re_audit_at": "<ISO-8601> | null",
  "git_head_at_population": "<full sha>",
  "findings": []
}
```

---

## Finding row schema (`findings[]`)

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `finding_id` | string | yes | Stable id: `TIR-YYYY-NNNN` (zero-padded sequence per year). |
| `finding_code` | string | yes | Short audit code (e.g. `R1`, `R5`) — not unique across time; use `finding_id` for keys. |
| `title` | string | yes | One-line integrity gap title. |
| `status` | string | yes | Lifecycle status — see **Status lifecycle** below. |
| `severity` | string | yes | One of: `critical`, `high`, `medium`, `low`, `informational`. |
| `truth_surface` | string | yes | Primary surface: `buy_path_gate`, `browser_truth_freshness`, `hq_handoff`, `runtime_cta`, `test_contract`, `command_center`, `other`. |
| `constitution_refs` | string[] | yes | Constitution sections violated or at risk (e.g. `§5 Truth Contract`, `§7 point-in-time checks`). |
| `summary` | string | yes | Plain-language gap statement. Labels **PROVEN** / **INFERRED** / **UNKNOWN** inline. |
| `proven_gap` | string | yes | What is **PROVEN** wrong or missing today. |
| `false_safety_risk` | string | yes | How a green test or doc can mislead operators. |
| `smallest_safe_fix` | string | yes | Recommendation only until `status: FIXED` and fix commit cited in evidence. |
| `blast_radius` | object | no | Optional `{ "30d": string, "60d": string, "90d": string }` drift estimates. |
| `related_finding_ids` | string[] | no | Cross-links within this registry. |
| `related_audit_artifacts` | string[] | no | Repo-relative paths to batch audits, parity packets, HyperAgent exports. |
| `evidence` | object | yes | See **Evidence object** below. |
| `validation_commands` | object | yes | See **Validation commands** below. |
| `re_audit` | object | yes | See **Re-audit object** below. |
| `status_history` | array | yes | Non-empty; append-only transitions. |

### Status lifecycle

| Status | Meaning | Typical next step |
|--------|---------|-------------------|
| `OPEN` | Gap identified; no mitigation in repo. | HyperAgent investigation → `MEASURED` or `SHADOWED`. |
| `SHADOWED` | Gap visible in shadow/count/diagnostic mode only; **not enforced** on live CTAs or `/go`. | Owner approves enforcement plan → work toward `FIXED`. |
| `MEASURED` | Gap fully characterized with reproducible commands; fix not merged. | Implement smallest safe fix → `FIXED` or `REJECTED`. |
| `FIXED` | Mitigation merged; regression commands pass; evidence cites fix commit. | Periodic re-audit → stay `FIXED` or reopen `OPEN`. |
| `REJECTED` | Founder explicitly accepts risk or defers permanently; rationale required in `status_history`. | None unless reopened. |

**PROVEN:** `SHADOWED` and `MEASURED` both allow live user-facing behavior to remain unchanged — distinction is whether instrumentation exists.

### Evidence object (`evidence`)

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `proof_status` | string | yes | `PROVEN`, `INFERRED`, or `UNKNOWN` for the gap as a whole. |
| `discovered_at` | string (ISO 8601) | yes | When the gap was first recorded in this registry. |
| `last_confirmed_at` | string (ISO 8601) | yes | Last HyperAgent or operator re-audit that confirmed the gap still exists (or fix still holds). |
| `discovered_by` | string | yes | e.g. `hyperagent_audit`, `cursor_investigation`, `founder_report`. |
| `git_heads` | string[] | yes | Short or full SHAs where gap was proven or fix landed. |
| `artifacts` | object[] | yes | See artifact entry below. |

**Artifact entry:**

| Field | Type | Required |
|--------|------|----------|
| `path` | string | yes — repo-relative |
| `role` | string | yes — `primary`, `supporting`, `counterevidence`, `fix` |
| `excerpt_or_pointer` | string | yes — line range, JSON pointer, or grep needle |

### Validation commands (`validation_commands`)

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `prove_gap` | string[] | yes | Copy/paste commands that **demonstrate the integrity gap** (read-only). |
| `prove_mitigation` | string[] | no | Commands that show shadow/measurement mode works (`SHADOWED` / `MEASURED`). |
| `prove_fixed` | string[] | no | Commands that must pass after `FIXED` (regression). |
| `prove_not_regressed` | string[] | no | Periodic guard commands (CI or manual). |

Use `node --import tsx` for JSON scripts per `docs/BuckParts-JSON-STDOUT-CONTRACT.md`.

### Re-audit object (`re_audit`)

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `workflow` | string | yes | Human-readable steps — see **Re-audit workflow** below. |
| `cadence_days` | number | yes | Suggested days between re-audits while not `FIXED` or `REJECTED`. |
| `next_re_audit_after` | string (ISO 8601) | yes | Scheduler hint for operators / HyperAgent. |
| `last_re_audit_at` | string (ISO 8601) or null | yes | Null until first re-audit completes. |
| `re_audit_owner` | string | yes | `hyperagent`, `cursor_readonly`, `founder`, `command_center_operator`. |

### Status history entry (`status_history[]`)

| Field | Type | Required |
|--------|------|----------|
| `from_status` | string | yes |
| `to_status` | string | yes |
| `at` | string (ISO 8601) | yes |
| `actor` | string | yes |
| `note` | string | yes — cite evidence path or commit |
| `git_head` | string | no |

---

## Re-audit workflow

**Purpose:** Turn one-off HyperAgent audits into a standing Truth Integrity Department loop.

### 1. Intake (new finding)

1. HyperAgent or Cursor investigation completes with **PROVEN** gap (not speculation).
2. Assign next `TIR-YYYY-NNNN` (scan existing `findings[].finding_id` in JSON).
3. Append row with `status: OPEN` or `MEASURED` (if investigation complete).
4. Fill `evidence`, `validation_commands.prove_gap`, and `re_audit.next_re_audit_after`.
5. Set registry `last_re_audit_at` to intake timestamp.
6. **Do not** mutate Supabase, CSV, or production as part of intake.

### 2. Periodic re-audit (existing finding)

1. Load `data/truth-integrity/truth-integrity-registry-v1.json`.
2. Select findings where `now >= re_audit.next_re_audit_after` and `status` not in (`REJECTED`).
3. Run `validation_commands.prove_gap` (and `prove_mitigation` / `prove_fixed` as appropriate).
4. Update `evidence.last_confirmed_at`, `re_audit.last_re_audit_at`, bump `next_re_audit_after` by `cadence_days`.
5. Append `status_history` only if status changes.
6. If gap no longer reproduces → transition to `FIXED` with fix commit in `evidence.git_heads`.
7. If gap worsens → update `severity` and `blast_radius` in `status_history` note.

### 3. Mitigation landed (shadow or fix)

| Mitigation type | Target status | Required evidence |
|-----------------|---------------|-------------------|
| Shadow/count/diagnostic only | `SHADOWED` | `prove_mitigation` output + path to shadow code |
| Full enforcement merged | `FIXED` | `prove_fixed` pass + `git_heads` includes fix SHA |
| Founder accepts risk | `REJECTED` | `status_history` note with founder rationale |

### 4. HyperAgent append protocol

When a HyperAgent audit produces a new integrity gap:

```text
1. Read docs/BuckParts-TRUTH-INTEGRITY-REGISTRY.md (this file).
2. Read data/truth-integrity/truth-integrity-registry-v1.json.
3. If finding_code already exists and gap is the same → update evidence + re_audit timestamps only.
4. If new gap → append finding; never delete rows (use REJECTED).
5. Link batch audits under related_audit_artifacts (e.g. data/air-purifier/batch-production/audits/*.json).
6. Commit JSON + doc update in same PR as audit artifacts (founder approval).
```

**PROVEN:** No automation in repo reads this JSON for buy gates today — **INFERRED:** future Command Center lane may surface a read model (`truth_integrity_registry_read_model_v1`) without changing mutation authority.

---

## Relationship to other registries

| Registry | Difference |
|----------|------------|
| `docs/BuckParts-FAILURE-PATTERN-REGISTRY.md` | Build/CI/process failure classes + guardrails. |
| `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md` | Founder approval outcomes for specific queue rows. |
| **Truth Integrity Registry** | **Truth debt** — gaps between evidence, tests, docs, and homeowner-facing behavior. |

---

## Changelog (doc only)

| Date | Change |
|------|--------|
| 2026-06-23 | Initial Truth Integrity Registry v1 contract + seeded `TIR-2026-0001` (R1), `TIR-2026-0002` (R5). |
