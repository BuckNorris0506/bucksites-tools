# BuckParts External Signals Ingest Contract v1

**Status:** DESIGN — read-only contract; no runtime mutation authorized  
**Date:** 2026-06-29  
**Scope:** Command Center visibility for HyperAgent, GitHub Actions, Sentry, Cursor, and owner browser proof packets  
**Forbidden:** CSV mutation, Supabase mutation, public UI mutation, evidence mutation, owner-decision mutation, production authorization from external signals

---

## 1. Problem statement

HyperAgent audit reports, GitHub Actions results, Sentry issues, Cursor implementation summaries, and manual owner browser proof packets can become **stale or disconnected** from Command Center (CC). Operators need these signals **visible and prioritized** in CC without allowing them to authorize mutation or override repo truth.

**Repo truth wins.** External signals are **candidate inputs only** until revalidated against committed repo artifacts and validation commands.

---

## 2. Relationship to existing contracts

| Existing artifact | Role today | Gap this contract fills |
|-------------------|------------|-------------------------|
| `external_quality_signal_usefulness_v1` | Filesystem audit: are GH/Sentry wired? (`NOT_PROVEN` for live ingest) | Does not index individual signals or staleness |
| `wrong_code_prevention_v1` | Single HyperAgent audit artifact with freshness | Not a unified multi-source registry |
| `command_center_issue_registry_v1` | Issue lifecycle with repo-evidence gates | Issues ≠ all external tool findings |
| `buckparts_hyperagent_ingest_packet_v1` | HyperAgent discovery handoff | Per-mission; not CC-indexed |
| `buckparts_cursor_validation_packet_v1` | Cursor repo cross-check | Scattered under `drafts/`; not CC-indexed |
| `session_*_owner_browser_proof_intake_v1` | Owner proof intake | Not unified with other external signals |
| `evidence_freshness_recovery_v1` | Repo-truth staleness for buyer paths | Security halt; separate from tool telemetry |

This contract **unifies projection** into one CC lane. It does **not** replace repo-truth lanes or decision precedence.

---

## 3. Signal sources (minimum v1)

| `source_type` | `source_name` examples | Typical artifact locations (PROVEN in repo) |
|---------------|------------------------|---------------------------------------------|
| `hyperagent_audit` | `wrong_code_prevention`, `hyperagent_safe_link_evidence` | `data/command-center/audits/wrong-code-prevention-v1.json`; `data/fridge/batch-production/drafts/*-hyperagent-ingest-packet-v1.json` |
| `github_actions` | `buckparts-founder-digest`, `buckparts-daily-operator`, `buckparts-runner-step` | `.github/workflows/*.yml` (workflows exist); **live run status NOT ingested** (`github_actions_live_status` → `cc_json_path: null` in brain manifest) |
| `sentry_runtime` | `production_errors` | `sentry.server.config.ts`, `src/lib/monitoring/error-monitoring.ts`, `src/instrumentation.ts` (SDK wired); **incidents NOT ingested** (`sentry_error_monitoring` → `cc_json_path: null`) |
| `cursor_implementation` | `cursor_validation`, `cursor_session_summary` | `data/**/drafts/*cursor-validation*.json` (`buckparts_cursor_validation_packet_v1`); Cursor chat summaries have **no committed contract today** |
| `owner_browser_proof` | `session_owner_browser_proof_intake` | `data/fridge/batch-production/drafts/session-*-owner-browser-proof-intake-v1.json` |

**NOT_PROVEN today:** GitHub API ingest, Sentry API ingest, Cursor chat auto-export, HyperAgent live push to repo.

---

## 4. Canonical artifact layout (recommended)

```
data/command-center/external-signals/
  registry-v1.json                    # CC lane primary read model (built or committed)
  signals/                            # Optional per-signal committed drops
    <signal_id>.json                  # buckparts_external_signal_v1
  ingest/
    github-actions/                   # Future: workflow_run JSON from GHA artifact upload
    sentry/                           # Future: scheduled Sentry issue export
  drafts/
    external-signals-registry-v1.example.json
```

**Design doc path (this file):** `docs/command-center/BuckParts-EXTERNAL-SIGNALS-INGEST-CONTRACT-V1.md`

**JSON schema recommendation:** `data/command-center/external-signals/drafts/external-signals-schema-v1.json` (draft; not enforced at runtime until loader ships)

**Example registry:** `data/command-center/external-signals/drafts/external-signals-registry-v1.example.json`

---

## 5. Per-signal record (`buckparts_external_signal_v1`)

Every ingested signal MUST include:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `contract` | `"buckparts_external_signal_v1"` | yes | |
| `signal_id` | string | yes | Stable id: `{source_type}:{source_name}:{content_hash_prefix}` |
| `source_type` | enum | yes | See §3 |
| `source_name` | string | yes | Human/tool identifier |
| `generated_at` | ISO-8601 | yes | When the external tool produced the finding |
| `observed_repo_head` | string \| null | yes | Git SHA at observation; `null` if unknown |
| `observed_dirty_tree_status` | `"CLEAN"` \| `"DIRTY"` \| `"UNKNOWN"` | yes | From `git status --porcelain` when available |
| `scope` | object | yes | `{ wedge?, slugs?, routes?, issue_ids?, workflow?, environment? }` |
| `findings` | array | yes | `{ finding_id, summary, detail?, evidence_rel_paths?, severity }` |
| `severity` | `"CRITICAL"` \| `"HIGH"` \| `"MEDIUM"` \| `"LOW"` \| `"INFO"` | yes | Roll-up for the signal |
| `expires_at` | ISO-8601 \| null | yes | Hard expiry; after this, signal cannot block mutation without escalation |
| `freshness_policy` | object | yes | See §8 |
| `validation_status` | enum | yes | `CANDIDATE` \| `REPO_VALIDATED` \| `SUPERSEDED` \| `STALE` \| `REJECTED` |
| `promoted_to_learning_rule` | boolean | yes | Default `false`; only founder promotion path |
| `blocks_command_center` | boolean | yes | Surfaces in stop-the-line / attention panels |
| `blocks_mutation` | boolean | yes | May feed decision precedence **only** when `validation_status=REPO_VALIDATED` and not expired |
| `owner_action_required` | boolean | yes | |
| `artifact_rel_path` | string | yes | Committed file backing this signal |
| `read_only` | `true` | yes | |
| `data_mutation` | `false` | yes | |
| `mutation_authorized` | `false` | yes | Always false for external signals |
| `truth_closure_authorized` | `false` | yes | HyperAgent/Cursor cannot close truth |

### Registry aggregate (`buckparts_external_signals_registry_v1`)

| Field | Purpose |
|-------|---------|
| `contract` | `"buckparts_external_signals_registry_v1"` |
| `generated_at` | Registry build time |
| `current_repo_head` | HEAD at registry build |
| `signals` | `buckparts_external_signal_v1[]` |
| `indexes` | Precomputed lists (§7) |
| `security_hardening_external_signals` | Security slice (§9) |
| `provenance` | `{ signals_discovered, signals_loaded, signals_rejected, discovery_roots[] }` |

---

## 6. Safety rules (normative)

1. **Candidate inputs only** — No external signal may set `page_classification`, CSV row state, evidence verdict, or owner approval.
2. **HyperAgent cannot close work** — `DISCOVERY_COMPLETE`, audit `PASS`, or ingest packet claims do not advance issue lifecycle without `command_center_issue_lifecycle_audit_v1` repo evidence gates.
3. **GitHub Actions** — May set `blocks_deploy_readiness` (future) on `REPO_VALIDATED` workflow failure at matching HEAD; **cannot** prove buyer-path truth or evidence freshness.
4. **Sentry** — May set `blocks_public_trust` candidate + `owner_action_required` for production `CRITICAL`/`HIGH`; **cannot** mutate repo truth. Resolution requires `REPO_VALIDATED` (fix merged + validation command pass).
5. **Cursor summaries** — `validation_status` starts `CANDIDATE`; promotion to `REPO_VALIDATED` requires `commands_run[]` pass + cited `evidence_rel_paths` exist on disk at `current_repo_head`.
6. **Owner browser proof packets** — Intake is visible signal only; committed evidence and founder approval remain separate gates.
7. **CC may surface and prioritize** — `external_signals_v1` feeds attention queues and operator digest hints.
8. **Coverage/Truth gates revalidate** — `guarded_apply_evidence_freshness_v1`, `evidence_freshness_recovery_v1`, `fridge-safe-link-evidence-precedence-v1`, and `buckparts_decision_precedence_resolver_v1` remain authoritative for mutation.

### Decision precedence integration

External signals map to `DecisionSignalV1` only when:

```text
validation_status === "REPO_VALIDATED"
AND blocks_mutation === true
AND NOT expired (see §8)
AND source_type policy allows blocking (see below)
```

| source_type | Allowed `dimension` values | May block mutation? | May block public trust? |
|-------------|---------------------------|---------------------|-------------------------|
| `hyperagent_audit` | `external_audit_candidate` | **No** (visibility only until repo cross-check) | No |
| `github_actions` | `deploy_readiness`, `ci_integrity` | Deploy/commit readiness only | No |
| `sentry_runtime` | `public_trust_incident`, `runtime_defect` | No (investigation gate) | Yes (candidate → validated) |
| `cursor_implementation` | `external_validation_candidate` | **No** unless `REPO_VALIDATED` | No |
| `owner_browser_proof` | `owner_proof_intake` | **No** | No |

**Security audit findings** (category `security` in `findings` or `scope.security_domain`) use dimension `security_hardening_external` and **must block non-security factory steering** when `REPO_VALIDATED` + `blocks_mutation` until resolved or `REJECTED` by founder.

---

## 7. Command Center lane shape

**JQ path:** `.command_center_v2.external_signals_v1`

**Contract:** `external_signals_v1`

```typescript
type ExternalSignalsCommandCenterLaneV1 = {
  contract: "external_signals_v1";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  deploy_authorized: false;
  recommended_jq_path: ".command_center_v2.external_signals_v1";
  registry_rel_path: "data/command-center/external-signals/registry-v1.json";
  registry_load_status: "loaded" | "missing" | "stale" | "invalid_contract";
  generated_at: string;
  current_repo_head: string | "UNKNOWN";
  signal_counts: {
    total: number;
    by_source_type: Record<string, number>;
    by_validation_status: Record<string, number>;
    by_severity: Record<string, number>;
  };
  // Required exposure surfaces (§ user spec)
  active_critical_signals: ExternalSignalSummaryV1[];
  stale_signals: ExternalSignalSummaryV1[];
  unvalidated_hyperagent_findings: ExternalSignalSummaryV1[];
  failing_github_actions: ExternalSignalSummaryV1[];
  open_sentry_production_issues: ExternalSignalSummaryV1[];
  signals_blocking_mutation: ExternalSignalSummaryV1[];
  signals_blocking_public_trust: ExternalSignalSummaryV1[];
  signals_needing_owner_action: ExternalSignalSummaryV1[];
  blocking_stale_critical: ExternalSignalSummaryV1[];  // BLOCKING_STALE_CRITICAL visibility
  security_hardening_external_signals: SecurityHardeningExternalSignalsStatusV1;
  recommended_next_action: string;
  proven_facts: string[];
  not_proven_facts: string[];
  unknown_facts: string[];
};

type ExternalSignalSummaryV1 = {
  signal_id: string;
  source_type: string;
  source_name: string;
  severity: string;
  validation_status: string;
  summary: string;
  artifact_rel_path: string;
  generated_at: string;
  expires_at: string | null;
  blocks_mutation: boolean;
  blocks_command_center: boolean;
  owner_action_required: boolean;
  stale_reason?: string;
};

type SecurityHardeningExternalSignalsStatusV1 = {
  status: "CLEAR" | "ATTENTION" | "BLOCKING" | "UNKNOWN";
  open_security_signal_count: number;
  blocking_non_security_work: boolean;
  unresolved_without_repo_validation: number;
  signals: ExternalSignalSummaryV1[];
  ties_to_lane: "evidence_freshness_recovery_v1" | "guarded_apply_evidence_freshness_v1";
};
```

**Lane category:** Engineering Telemetry (same as `external_quality_signal_usefulness_v1`). Does **not** set `next_best_action` directly except via `security_hardening` interaction (§9).

---

## 8. Staleness and expiry rules

### Freshness policy object

```json
{
  "stale_after_ms": 86400000,
  "head_match_required": true,
  "revalidation_command": "npm run buckparts:external-signals-registry",
  "escalation_after_expiry": "BLOCKING_STALE_CRITICAL"
}
```

### Rules

| Condition | `validation_status` transition | Blocking behavior |
|-----------|-------------------------------|-------------------|
| `observed_repo_head !== current_repo_head` and `head_match_required` | → `STALE` (or `NEEDS_REVALIDATION` alias in summaries) | `blocks_mutation` forced **false**; remains in `stale_signals` |
| `now > expires_at` | → `STALE` | Cannot block mutation; if severity was `CRITICAL` and unresolved → `blocking_stale_critical` |
| Newer signal same `(source_type, source_name, scope fingerprint)` | Older → `SUPERSEDED` | Superseded signals never block |
| Repo validation command passes + evidence paths exist | `CANDIDATE` → `REPO_VALIDATED` | Policy-dependent blocking |
| Founder explicit reject artifact | → `REJECTED` | Never blocks |
| Age > `stale_after_ms` without revalidation | → `STALE` | Same as expiry |

### Source-specific defaults

| source_type | `stale_after_ms` | `head_match_required` | Default `expires_at` |
|-------------|------------------|----------------------|----------------------|
| `hyperagent_audit` | 24h | **true** | `generated_at + 7d` |
| `github_actions` | 12h | **true** | last workflow run window + 48h |
| `sentry_runtime` | 1h | false | `generated_at + 30d` (incident stays visible) |
| `cursor_implementation` | 48h | **true** | `generated_at + 14d` |
| `owner_browser_proof` | 45d | false | align with `GUARDED_APPLY_COMMITTED_EVIDENCE_MAX_AGE_DAYS_V1` |

**BLOCKING_STALE_CRITICAL:** Critical findings past `expires_at` that remain unresolved stay listed in `blocking_stale_critical` with `blocks_command_center: true`, `blocks_mutation: false`, forcing operator visibility without silent expiry.

---

## 9. Security hardening interaction

**Current PROVEN behavior** (`scripts/lib/buckparts-security-hardening-steering-v1.ts`):

- `resolveSecurityHardeningSteeringHaltV1` halts factory steering when `evidence_freshness_recovery_v1` or `guarded_apply_evidence_freshness_v1` triggers decision precedence `DENY`.
- CC report sets `steeringOverrideSource = "security_hardening"` (see `scripts/report-buckparts-command-center.ts`).

**Designed extension (not implemented):**

```text
security_hardening_external_signals.status = BLOCKING
  WHEN any signal with scope.security_domain
       AND validation_status IN (REPO_VALIDATED, CANDIDATE with severity CRITICAL)
       AND NOT REJECTED
       AND NOT SUPERSEDED
```

- External security findings **cannot** be marked resolved in registry without:
  1. `observed_repo_head === current_repo_head`
  2. Cited fix paths exist
  3. `validation_status: REPO_VALIDATED`
- `security_hardening_external_signals.blocking_non_security_work` feeds the same precedence layer as evidence freshness during security-only mode.
- Does **not** override `evidence_freshness_recovery_v1` — both must be clear for factory mutation.

---

## 10. GitHub Actions / Sentry repo audit (PROVEN paths)

### GitHub Actions — PROVEN filesystem; NOT_PROVEN live ingest

| Path | Purpose |
|------|---------|
| `.github/workflows/buckparts-founder-digest.yml` | Weekly build + runner step + founder digest; uploads artifacts |
| `.github/workflows/buckparts-daily-operator.yml` | Daily read-only operator |
| `.github/workflows/buckparts-runner-step.yml` | Runner step workflow |
| `scripts/buckparts-runner-step-append-github-step-summary.ts` | Step summary formatter |
| `scripts/lib/external-quality-signal-usefulness-v1.ts` | CC lane auditing workflow presence |
| `scripts/lib/buckparts-brain-coverage-manifest-v1.ts` | `github_actions_live_status` → `cc_json_path: null`, verdict `MISSING` |

**Informs CC today:** Only via `external_quality_signal_usefulness_v1` (static audit). **Does not** ingest PASS/FAIL.

**Minimal future ingest:** GHA job uploads `data/command-center/external-signals/ingest/github-actions/<run_id>.json` with workflow name, conclusion, head SHA, run URL. Registry builder reads committed drops only (no GitHub API in CC build).

### Sentry — PROVEN SDK; NOT_PROVEN CC feed

| Path | Purpose |
|------|---------|
| `sentry.server.config.ts` | Sentry Next.js server config |
| `src/lib/monitoring/error-monitoring.ts` | Safe capture wrapper |
| `src/instrumentation.ts` | Runtime hooks |
| `next.config.mjs` | `withSentryConfig` |
| `scripts/lib/buckparts-brain-coverage-manifest-v1.ts` | `sentry_error_monitoring` → `cc_json_path: null` |

**Informs CC today:** Nothing. **UNKNOWN:** live DSN in production env.

**Minimal future ingest:** Scheduled workflow or manual export → `data/command-center/external-signals/ingest/sentry/issues-<date>.json`. Registry maps open production issues to signals.

---

## 11. Consumer map (repo paths / functions)

### Registry builder (future — not authorized in security-only mode)

| Path | Function | Role |
|------|----------|------|
| `scripts/lib/external-signals-registry-v1.ts` | `buildExternalSignalsRegistryV1()` | Discover + normalize signals from committed artifacts |
| `scripts/lib/external-signals-command-center-v1.ts` | `buildExternalSignalsCommandCenterLaneV1()` | Project registry → CC lane |
| `scripts/report-external-signals-registry-v1.ts` | CLI | `npm run buckparts:external-signals-registry` |

### CC integration point

| Path | Function | Role |
|------|----------|------|
| `scripts/report-buckparts-command-center.ts` | report builder | Wire `external_signals_v1` lane |
| `scripts/lib/buckparts-command-center-v2-types.ts` | types | Add lane to `CommandCenterV2Report` |
| `scripts/lib/buckparts-command-center-v2.ts` | lane list | Register lane name |

### Signal discovery roots (read-only scan)

| Path | Function | Signal type |
|------|----------|-------------|
| `scripts/lib/wrong-code-prevention-v1.ts` | `loadWrongCodePreventionArtifactV1` | `hyperagent_audit` |
| `scripts/lib/hyperagent-dispatch-registry-v1.ts` | cursor-validation discovery | `cursor_implementation` |
| `scripts/lib/fridge-safe-link-batch-factory-v1.ts` | hyperagent ingest paths | `hyperagent_audit` |
| `scripts/lib/buckparts-ops-agent-workflow-v1.ts` | ingest packet validation | `hyperagent_audit` |
| `scripts/lib/external-quality-signal-usefulness-v1.ts` | GH/Sentry presence | metadata for `github_actions` / `sentry_runtime` stubs |
| Glob: `data/fridge/batch-production/drafts/session-*-owner-browser-proof-intake-v1.json` | — | `owner_browser_proof` |

### Decision / security consumers (future)

| Path | Function | Role |
|------|----------|------|
| `scripts/lib/buckparts-decision-precedence-resolver-v1.ts` | `resolveDecisionPrecedenceV1` | Accept `security_hardening_external` signals |
| `scripts/lib/buckparts-security-hardening-steering-v1.ts` | `resolveSecurityHardeningSteeringHaltV1` | Include `security_hardening_external_signals` |
| `scripts/lib/buckparts-decision-precedence-signals-v1.ts` | signal builders | Map external signals → `DecisionSignalV1` |

### Adjacent lanes (do not duplicate)

| Lane | Keep separate because |
|------|----------------------|
| `wrong_code_prevention_v1` | Specialized HyperAgent audit semantics |
| `external_quality_signal_usefulness_v1` | Meta-audit of tooling usefulness |
| `command_center_issue_registry_v1` | Issue lifecycle truth |
| `evidence_freshness_recovery_v1` | Repo-truth buyer-path staleness |

---

## 12. What is safe to implement now (security-only mode)

| Item | Safe? | Notes |
|------|-------|-------|
| This design doc | ✅ | Read-only |
| Example registry JSON + JSON schema draft | ✅ | Under `drafts/`; not loaded by CC |
| `external-signals-registry-v1.ts` read-only discovery | ✅ | Scans committed files only; no writes outside `data/command-center/external-signals/` |
| `report-external-signals-registry-v1.ts` CLI | ✅ | Emits JSON stdout or writes registry artifact only |
| CC lane `external_signals_v1` projection | ✅ | Read-only embed in CC report |
| Unit tests for staleness / head-drift | ✅ | No mutation |
| GHA artifact upload workflow | ⚠️ | Adds automation but read-only drops; defer if security focus is narrow |
| Sentry API pull workflow | ❌ | Requires secrets + network; wait |
| Wiring external signals into mutation gates | ❌ | Wait — service-role Slices 1–3 do not consume external signals yet |
| Replacing `wrong_code_prevention_v1` | ❌ | Wait |

---

## 13. What must wait until after security hardening

**Partial update (HEAD `2122959`):** Core security hardening (buyer-path `/go`, AP/RPWFE Supabase apply gates, MCP deploy preflight, RLS ERROR reconcile, service-role Slices 1–3) is **landed in repo**. Items below remain deferred until ingest/seed lanes are gated and external-signals wiring is explicitly scoped.

1. **Any `blocks_mutation: true` from external signals** affecting guarded apply, CSV apply, or evidence writes.
2. **GitHub Actions deploy-readiness gate** blocking merge/deploy from CC JSON.
3. **Sentry-driven public trust halt** beyond visibility (must not override evidence freshness recovery).
4. **HyperAgent auto-prioritization** in `next_best_action` / factory steering overrides.
5. **Deprecation of specialized lanes** (`wrong_code_prevention_v1`, etc.) in favor of unified registry.
6. **Dashboard UI** surfacing external signals in `src/app/ownerdashboard` (public UI mutation scope).

---

## 14. Validation commands (future)

```bash
# Build registry from committed artifacts (read-only discovery)
npm run buckparts:external-signals-registry

# CC lane spot-check
npm run buckparts:command-center | jq '.command_center_v2.external_signals_v1.active_critical_signals'

# Meta-audit: GH/Sentry usefulness (exists today)
npm run buckparts:command-center | jq '.command_center_v2.external_quality_signal_usefulness_v1'
```

---

## 15. Versioning

- **v1** frozen semantics above.
- Breaking changes require `buckparts_external_signal_v2` and new CC lane key `external_signals_v2`.
- Registry includes `contract_version: 1`.
