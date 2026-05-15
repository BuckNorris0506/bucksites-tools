# BuckParts Failure Pattern Registry v1

**PROVEN:** This document defines a **read-only contract** for recording recurring **process / build failure classes** and mapping each class to **guardrails** (docs, tests, workflow shapes) that prevent recurrence. **PROVEN:** TypeScript types and validation live in `src/lib/owner-dashboard/failure-pattern-registry-v1.ts`. **PROVEN:** Digest and owner dashboard may surface a **read model** built only from **seeded** rows that have in-repo evidence (`failure_pattern_registry_read_model_v1`).

**PROVEN:** This registry does **not** alter Runner Step allowlists, GitHub Actions workflow semantics beyond documentation, Founder Action Queue, Decision Packets, Execution Packets, Decision Packet eligibility, mutation gates, or any automation input path. **INFERRED:** It strengthens **Layer 5** (validation / interpretation / owner routing) by making failure–guardrail links explicit without claiming **Layer 6** (founder-only approval) is automated or closed-loop.

**Truth contract:** Labels **PROVEN**, **INFERRED**, and **UNKNOWN** in row text follow the same discipline as `docs/BuckParts-RUNNER-STATUS.md` — **PROVEN** requires a cited path or test in-repo; **INFERRED** is a reasonable follow-on; **UNKNOWN** marks residual uncertainty.

---

## Contract ids

| Artifact | `contract` value |
|----------|------------------|
| Row (TypeScript) | N/A — rows are exported constants in `failure-pattern-registry-v1.ts` (no JSON file envelope). |
| Read model (digest / dashboard) | `failure_pattern_registry_read_model_v1` |

| Read-model field | Value |
|------------------|--------|
| `read_only` | `true` |
| `data_mutation` | `false` |
| `informational_only` | `true` |

---

## Row schema (`FailurePatternRegistryRowV1`)

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `failure_id` | string | yes | Stable `snake_case` id (e.g. `npm_run_json_stdout_parse`). |
| `title` | string | yes | Short human title. |
| `status` | string | yes | One of: `observed`, `guarded`, `recurring`, `retired`. |
| `first_seen_context` | string | yes | Where / how the class showed up (may include PROVEN/INFERRED/UNKNOWN prefixes). |
| `last_seen_at` | string (ISO 8601) | yes | Last update or last known relevance instant. |
| `observed_examples` | string[] | yes | Non-empty; cite repo paths or tests where possible. |
| `root_cause` | string | yes | Why the failure happens. |
| `correct_pattern` | string | yes | What to do instead. |
| `guardrail_paths` | string[] | yes | Repo-relative paths to docs, tests, or workflows; `guarded` + `proof_status: PROVEN` rows must list at least one path evidenced in-repo. |
| `proof_status` | string | yes | One of: `PROVEN`, `INFERRED`, `UNKNOWN` (evidence strength for the row as a whole). |
| `remaining_risk` | string | yes | What can still go wrong. |

---

## Read model v1 (`failure_pattern_registry_read_model_v1`)

**PROVEN:** `buildFailurePatternRegistryReadModelV1` in `failure-pattern-registry-v1.ts` aggregates:

| Field | Meaning |
|--------|---------|
| `guarded_count` | Rows with `status === "guarded"`. |
| `unguarded_count` | Rows with `status === "observed"`. |
| `recurring_count` | Rows with `status === "recurring"`. |
| `unknown_guardrail_count` | Rows with `proof_status === "UNKNOWN"` **or** (`guardrail_paths.length === 0` and `status !== "retired"`). |
| `rows[]` | Validated row snapshots (same order as validated input). |

Digest copy includes the informational line: **Failure Pattern Registry: X guarded, Y unguarded; informational only.** (plus recurring / unknown_guardrail counts in the markdown detail).

---

## Changelog (doc only)

| Date | Change |
|------|--------|
| 2026-05-08 | Initial Failure Pattern Registry v1 contract + TS model + tests + digest/dashboard surfacing (informational only). |
