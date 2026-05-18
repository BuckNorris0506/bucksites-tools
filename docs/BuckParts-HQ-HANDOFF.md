# BuckParts HQ — Agent Handoff

**How to use:** Paste this whole file into a new ChatGPT / Cursor chat when picking up BuckParts work.

**Canonical truth map:** `docs/BuckParts-TRUTH-MAP.md` is the primary source-of-truth navigation index for policy/runtime/measurement/operator files. Treat this handoff as operational context layered on top of that map.

**Evidence timestamp:** Re-run `npm run buckparts:command-center` and `npm run buckparts:command-surface` before trusting live numbers. **Batch Production Lane v1 (non-Amazon review + owner approval gate):** refreshed through pushed HEAD **`ab3aedc`** (see **Current stopping point** below). **Layer 6 / Codex / Runner control-plane:** refreshed **`2026-05-16`** (repo through **`40ad6eb`** and related Layer 6 commits — see §0B). **Older business metrics** in §4–§16 may still cite **`2026-05-03`** / **`9229144`** unless re-run — treat stale numbers as **UNKNOWN** until refreshed.

**Rule:** If a fact is not in this file, a cited repo path, or the output of a named command, treat it as **UNKNOWN**—do not invent.

---

## Current stopping point / chat migration state (through `ab3aedc`)

Use this block first in a new HQ or implementation chat. It records the **exact** repo stopping point before chat migration.

### Repo HEAD (PROVEN)

| Item | Value |
|------|--------|
| Latest pushed HEAD | **`ab3aedc`** — *Update HQ handoff for batch owner approval gate* |
| Recent chain | `399251a` Add batch owner approval gate · `1362b65` Add batch owner review report · `2d5032c` Separate owner review readiness from production evidence gates |

### Batch Production Lane v1 — status (PROVEN in-repo)

**PROVEN:** Read-only Batch Production Lane v1 is **implemented** for **non-Amazon PDP** cohort review and **owner approval gate** (planning/read-model only). **Owner-facing surfaces are Markdown-first:** owner review report (`scripts/report-batch-owner-review.ts`) and owner approval checklist (`scripts/report-batch-owner-approval-checklist.ts`). Machine JSON (`batch_owner_screenshot_draft_packet_v1`, `batch_owner_approval_packet_v1`) is **debug/support only**.

**PROVEN — non-Amazon PDP cohort (`--source non-amazon-pdp-candidates`):** 5 candidate rows:

| row_id | token |
|--------|--------|
| `da97-08006b` | DA97-08006B |
| `da97-15217d` | DA97-15217D |
| `da29-00012b` | DA29-00012B |
| `adq75795101` | ADQ75795101 |
| `rpwfe` | RPWFE |

**PROVEN — source-based owner approval checklist (no Jared JSON):**

```bash
node --import tsx scripts/report-batch-owner-approval-checklist.ts --source non-amazon-pdp-candidates
```

- Checklist is generated from repo `--source` without hand-authored `draft-review.json` or agent-filled facts JSON.
- Parser reads **sentinel active decision blocks only** (`BEGIN_ACTIVE_DECISION row_id=…` … `END_ACTIVE_DECISION`); fenced examples and prose option lists are ignored.
- Unfilled `founder_decision: _choose_one_` checklists **fail closed** at compile with **exit code 2**.
- **No** `founder_decision_registry_v1` export is emitted when any row is invalid or unfilled.
- `approve_for_next_planning_only` **fails closed** unless the row is `draft_ready_for_owner_review=yes` (requires agent facts / owner-review-ready draft).
- `defer`, `reject`, and `request_more_evidence` may compile for **planning-seed** rows when actively selected in the active block only.

**PROVEN — no mutation authority introduced:** batch approval artifacts keep `read_only: true`, `data_mutation: false`, `may_mutate: false`, `may_write_production_evidence: false`, `automation_input: false`. No Supabase writes, no `retailer_links` mutation, no `data/evidence/` writes, no affiliate URL edits, no apply/mutation executor.

**PROVEN — validation before commit (this gate):** 28 targeted tests pass (`batch-owner-approval-v1`, `batch-production-lane-pipeline-v1`, `founder-decision-registry-v1`); `npm run lint` pass; `npm run build` pass.

**PROVEN — readiness split (commit `2d5032c`):**

- `draft_ready_for_owner_review` = agent facts structurally usable for founder review.
- **Non-Amazon** owner-review-ready does **not** require ASIN or committed screenshot.
- `production_evidence_commit_blockers` (screenshot commit; ASIN on Amazon) gate **durable** `data/evidence/` writes only — not owner review.

**PROVEN — doctrine:** Owner approval gate is **planning/read-model only**. Production mutation remains **blocked**. Generated `data/batch-production/drafts/*` files are **lane-local** working artifacts — **not** canonical truth unless intentionally promoted to a small, reviewed outcome artifact (generated drafts were removed and not committed at `399251a`).

**INFERRED:** Amazon rescue default lane (`--source amazon-rescue-default`) remains a **fallback** only; do **not** restart an Amazon interstitial / screenshot loop as the main path.

### What remains NOT_PROVEN / UNKNOWN

| Area | Status |
|------|--------|
| End-to-end with real agent-filled facts on disk | **NOT_PROVEN** — no committed lane facts JSON in repo at this stop |
| Jared row-level decisions for the 5 rows | **NOT_PROVEN** — checklist compile requires filled active blocks; no committed registry export for this cohort |
| Digest / dashboard surfacing of owner approval decisions | **NOT_IMPLEMENTED** |
| Production evidence commit for this cohort | **NOT_PROVEN** |
| Supabase / `retailer_links` mutation from batch lane | **NOT_PROVEN** — no apply/mutation script |
| Layer 6 founder-only production mutation approval | **NOT_PROVEN** (`layer_6_founder_only_approval` stays `NOT_PROVEN` on batch artifacts) |
| `data/batch-production/drafts/*` as durable source of truth | **NOT PROVEN** — lane-local only unless intentionally promoted |

### Operator rules (do not regress)

**HQ / agent chat behavior:** Do not give Jared the "best next move" without giving the exact copy/paste prompt or command in the same chat message. If HQ states a next move, the prompt/command must be included immediately.

- **Do not** restart the Amazon interstitial loop as the primary batch path.
- **Do not** make Jared manually author JSON facts — agent fills facts → founder reviews and approves via **Markdown**.
- **Do not** commit generated `data/batch-production/drafts/*` as production evidence or canonical truth unless intentionally converted to a small, reviewed outcome artifact.
- **Do not** treat owner approval as authorization to mutate Supabase, `retailer_links`, `data/evidence/`, affiliate URLs, deploy, or apply execution.

### Next best move after chat migration (INFERRED)

**Agent fills lane draft facts** for the 5 non-Amazon PDP rows → founder completes **Markdown approval checklist** with real `founder_decision:` per row → compile with `--facts` when approving planning rows. **Not** production mutation or evidence commit until Layer 6 and evidence gates are separately proven.

**Normative commands:** `docs/BuckParts-BATCH-PRODUCTION-LANE-V1.md` · `npm run buckparts:batch-owner-approval-checklist` · `npm run buckparts:batch-owner-approval` (after checklist filled).

---

## 0) Current HQ continuation brief (2026-05-12)

This section is the current executive operating memory for a new BuckParts HQ chat. It supersedes older tactical metric snapshots below unless those snapshots are refreshed by named commands.

### CURRENT STRATEGIC MODE

BuckParts is in **foundation-first mode**. The near-term goal is not more public polish by default; it is to move backend/foundation maturity toward roughly **75%** so BuckParts becomes an autonomous replacement-intelligence operating system rather than a hobby dependent on the founder.

Customer-facing improvements still matter, but they should follow foundation work when the foundation proves what customers want, what BuckParts safely covers, what evidence is missing, and which next actions are agent-safe.

### FOUNDATION-FIRST DOCTRINE

The backend/foundation should become a durable operating system that can:

- detect customer demand;
- identify what BuckParts does not safely cover;
- rank what is worth verifying;
- separate agent-safe actions from owner-approval actions;
- preserve `UNKNOWN` instead of creating fake confidence;
- produce owner-readable next actions without founder micromanagement.

Do not over-prioritize customer-facing polish until this operating loop is stronger. The target is not "good enough"; the target is the smallest correct durable implementation that is excellent within its declared scope.

### CUSTOMER-FACING RULE

Public pages must not surface weak-confidence "maybe buy" products. Weak-confidence demand belongs in backend learning, queues, and verification tasks, not public buy guidance.

Public buy paths graduate only after evidence clears trust gates. Buying options should appear only when the destination has passed the relevant safe buyer-path policy. Demand is not fit proof, revenue proof, conversion proof, or buyer-path proof.

### BACKEND 75% TARGET

The next maturity target is a backend/foundation that can run most routine operating judgment without the founder manually deciding every queue item. Approximate target state:

- demand inputs are read and classified;
- coverage state is known or explicitly `UNKNOWN`;
- evidence gaps are named;
- verification tasks are ranked;
- owner-vs-agent authority is explicit;
- silent failures are monitored;
- Daily Operator / Command Center recommendations use only `BRIGHT` or explicitly scoped `PARTIAL` proof.

### DEMAND-TO-COVERAGE ENGINE V1

The next strategic backend milestone is **Demand-to-Coverage Engine v1**. It should connect these steps:

1. Demand detected.
2. Coverage state known.
3. Evidence gap identified.
4. Verification task recommended.
5. Agent-safe and owner-approval paths separated.

This should build on existing read-only reports and authority rules. Do not jump straight to new public pages or public buying options from demand alone.

### CURRENT PROVEN SYSTEMS

Proven from current prompt context and repo files:

- Sentry production capture is proven: the temporary proof route returned `client_source=global`, and Sentry showed `buckparts_sentry_proof_v1` in production.
- The temporary proof route has been removed after proof.
- Real Sentry setup remains:
  - `next.config.mjs` with `withSentryConfig`;
  - `experimental.instrumentationHook: true`;
  - `src/instrumentation.ts`;
  - `sentry.server.config.ts`;
  - `src/app/global-error.tsx`;
  - `src/lib/monitoring/error-monitoring.ts`;
  - `/go` click monitoring;
  - search telemetry monitoring.
- Daily Operator and Command Center are the owner/operator reporting surfaces; fresh command output is required before trusting live numbers.
- Revenue/conversions remain `UNKNOWN` unless a real revenue/conversion feed is connected and reconciled.

### CURRENT SETUP / OPERATOR TASKS

- `support@buckparts.com` Zoho setup is underway.
- Domain DNS for email is managed in **Porkbun**, not Netlify.
- Netlify deploys the website. Porkbun controls DNS unless nameservers are moved.
- Track email proof before treating support email as complete:
  - inbound Gmail -> support;
  - outbound support -> Gmail;
  - SPF;
  - DKIM;
  - DMARC.
- Deploy only for production proof, production fixes, or meaningful customer/business improvements.
- Protect Codex/Cursor/Netlify usage: prompts should be efficient, validation should be one step at a time, and deploys should not be wasted.

### WHAT NOT TO DO

- Do not drift into customer-facing polish too early.
- Do not expose weak-confidence products as public buy guidance.
- Do not infer revenue, conversion, valuation, buyer intent, or fit proof from clicks, impressions, search demand, or GA4 aggregate counts.
- Do not use `DARK` or `UNKNOWN` signals for positive recommendations.
- Do not create dashboards without decisions.
- Do not deploy unless the change is production proof, a production fix, or a meaningful customer/business improvement.
- Do not waste Codex/Cursor/Netlify credits on broad scans, full test loops, or speculative work when a targeted step is enough.

### HOW THE ASSISTANT SHOULD INTERACT WITH USER

The assistant/HQ role is CEO/co-strategist, not a passive task mirror. It should keep the business headed in the right direction, protect efficiency, reduce hesitation in business choices, and challenge drift.

The owner/founder role is to judge what customers see, read, and trust; approve important business choices; and ask better questions.

Operating style:

- use the BuckParts Truth Contract;
- give direct copy/paste prompts;
- move one step at a time when validation output is needed;
- state Proven / Inferred / UNKNOWN for non-trivial claims;
- prefer the smallest concrete next move;
- do not ask broad open-ended follow-ups when one best move exists;
- do not treat "good enough" as a target.

### NEXT BEST HQ PROMPT FOR NEW CHAT

Use the starter prompt below to open the next main HQ chat.

### NEW HQ CHAT STARTER PROMPT

```text
You are BuckParts HQ: CEO/co-strategist and operating partner.

Use the BuckParts Truth Contract:
- Repo truth over memory.
- Exact paths/commands only.
- Proven / Inferred / UNKNOWN on non-trivial claims.
- UNKNOWN if not proven.
- No invented repo facts.
- Smallest concrete next move.
- No "done" without validation.
- Do not deploy unless explicitly approved.
- Do not git push unless explicitly approved.
- Do not print secrets.
- Do not commit generated artifacts.

Current doctrine:
- BuckParts is foundation-first right now.
- The target is to move backend/foundation maturity toward roughly 75% before prioritizing major customer-facing polish.
- The backend should become an autonomous replacement-intelligence operating system, not a hobby dependent on the founder.
- Do not over-prioritize customer-facing polish until the foundation can detect demand, identify coverage gaps, rank verification work, and produce authority-scoped next actions.
- Customer-facing pages must not surface weak-confidence "maybe buy" products.
- Weak-confidence demand belongs in backend learning, queues, and verification tasks, not public buy guidance.
- Public buy paths graduate only after evidence clears trust gates.

Next strategic backend milestone:
- Demand-to-Coverage Engine v1:
  1. demand detected;
  2. coverage state known;
  3. evidence gap identified;
  4. verification task recommended;
  5. agent-safe vs owner-approval paths separated.

Current proven monitoring state:
- Sentry production capture has been proven.
- The temporary proof route returned client_source=global.
- Sentry showed buckparts_sentry_proof_v1 in production.
- The temporary proof route was removed.
- Real Sentry setup remains: next.config.mjs with withSentryConfig, instrumentationHook true, src/instrumentation.ts, sentry.server.config.ts, src/app/global-error.tsx, src/lib/monitoring/error-monitoring.ts, /go click monitoring, and search telemetry monitoring.

Current setup task:
- support@buckparts.com Zoho setup is underway.
- Email DNS is managed in Porkbun, not Netlify.
- Netlify deploys the website; Porkbun controls DNS unless nameservers are moved.
- Need proof for inbound Gmail -> support, outbound support -> Gmail, SPF, DKIM, and DMARC.

Operating rules:
- Deploy only for production proof, production fixes, or meaningful customer/business improvements.
- Protect Codex/Cursor/Netlify usage; prompts should be efficient.
- Give direct copy/paste prompts.
- Work one step at a time when validation output is needed.
- Do not drift into customer polish too early.
- The owner judges what customers see/read/trust and approves important business choices.
- HQ should keep the business pointed at the right next move and reduce hesitation without inventing facts.

First task:
Read docs/BuckParts-HQ-HANDOFF.md (especially **Current stopping point** and §0B) and docs/BuckParts-TRUTH-MAP.md, then propose the single best next HQ move. Do not implement until asked.
```

---

## 0B) Layer 6 control-plane & Codex/Runner truth (2026-05-16)

**Supersedes** any older HQ claims about Cursor/Codex automation, Runner “full loop,” or Layer 6 being complete. Canonical detail also lives in `docs/BuckParts-RUNNER-STATUS.md`, `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`, and `docs/BuckParts-JSON-STDOUT-CONTRACT.md`.

### Active lane (HQ priority order)

1. **Batch Production Lane v1 — non-Amazon review + owner approval gate** (**current stop** through **`399251a`**) — **PROVEN:** source-based Markdown approval checklist, sentinel active-block parser, fail-closed compile; planning-only registry scope. **NOT PROVEN:** agent facts on disk, Jared row decisions, production mutation. See **Current stopping point** above.
2. **Layer 6 control-plane documentation + audit** — prove what the repo can and cannot claim about founder judgment, Codex read-only execution, Runner validation, and registry visibility (**this handoff + freshness guard are part of that**). **NOT PROVEN:** Layer 6 complete.
3. **Batch lane follow-ons (deferred)** — digest embed, apply/mutation script, **20–50** row batches. V1 cap **10** rows.

**Meta-system rule:** Do **not** keep expanding packets, digests, registries, or wrappers unless they **reduce founder copy/paste** or produce **coverage/revenue work**. If a change only adds ceremony, stop.

### What Layer 6 now proves (PROVEN in-repo)

| Claim | Evidence |
|--------|----------|
| Failure-pattern guardrail snapshot | `layer_six_readiness_summary_v1` in `src/lib/owner-dashboard/layer-six-readiness-summary-v1.ts`; digest + owner dashboard surface `readiness_status` only. |
| Codex read-only subprocess + capture | `npm run buckparts:codex-readonly-smoke` → `scripts/run-buckparts-codex-readonly-smoke.ts`; `npm run buckparts:codex-next-execution-packet` → `scripts/run-buckparts-codex-next-execution-packet.ts`. |
| Codex packet proof read model | `codex_packet_proof_read_model_v1` / contract `buckparts_codex_next_execution_packet_v1` in `src/lib/owner-dashboard/codex-packet-proof-read-model-v1.ts`. |
| Codex output review surface | `codex_output_review_packet_v1` in `src/lib/owner-dashboard/codex-output-review-packet-v1.ts`; digest section when `FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH` set. |
| Transport ≠ task success | `codex_task_outcome_status` (`TASK_SUCCESS_PROVEN` / `TASK_PARTIAL_OR_FAILED` / `TASK_OUTCOME_UNKNOWN`) — separate from PASS transport/capture JSON. |
| Founder decision recording (read visibility) | `founder_decision_registry_v1` + `founder_decision_registry_read_model_v1`; optional `codex_output_review_context_v1` on rows; digest correlation via `source_queue_row_id`. |
| Repo-owned validation bundle | `npm run buckparts:runner-step` → `scripts/buckparts-runner-step.ts` (allowlist: lint, build, operator-proof only). |
| CI Runner Step artifact path | `.github/workflows/buckparts-runner-step.yml`; digest workflow may embed `buckparts-runner-step.json` via `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH`. |
| JSON stdout discipline | `docs/BuckParts-JSON-STDOUT-CONTRACT.md` + `scripts/json-stdout-contract.test.ts`. |
| Failure pattern catalog | `failure_pattern_registry_read_model_v1` / `docs/BuckParts-FAILURE-PATTERN-REGISTRY.md`. |

### What Layer 6 does NOT prove (NOT_PROVEN / UNKNOWN)

- **NOT PROVEN:** Layer 6 “complete,” closed-loop autonomy, or founder-only approval automated end-to-end (`layer_6_founder_only_approval` stays **`NOT_PROVEN`** in Runner Step JSON and Codex summary JSON).
- **NOT PROVEN:** Registry rows are consumed by Runner, queues, Execution Packets, or mutation gates (`automation_input: false` on review/readiness surfaces).
- **NOT PROVEN:** Codex is an autonomous code writer or may run **`npm run lint` / `npm run build` / `npm run buckparts:operator-proof`** inside read-only sandbox (packet + wrapper **forbid** those; failures there are sandbox/environment, not repo-invalidity).
- **NOT PROVEN:** `approve_readonly_findings` grants Supabase writes, `retailer_links` mutation, evidence JSON writes, affiliate URL changes, or git commits.
- **UNKNOWN:** Cursor/OpenAI API loop from repo; Codex CLI on every host (`codex login` required).

### Codex role today (PROVEN wording)

Codex is a **read-only worker / investigator**: bounded `codex exec --sandbox read-only`, repo-built prompts, JSONL + final-message capture, clean-git check. It is **not** a self-directed engineer that ships commits or passes full validation inside the sandbox.

**External validation (Runner / local CI / founder terminal):** Founder Execution Packets include **EXTERNAL REPO VALIDATION BUNDLE** / **DO NOT RUN INSIDE CODEX SANDBOX** — `npm run lint`, `npm run build`, `npm run buckparts:operator-proof` run via **`npm run buckparts:runner-step`** or CI, **not** inside Codex read-only sandbox.

### Runner truth (PROVEN)

- **Runner Step v1:** `node --import tsx scripts/buckparts-runner-step.ts` (alias `npm run buckparts:runner-step` for humans only per JSON stdout contract).
- **Allowlist:** `lint`, `build`, `buckparts:operator-proof` — `scripts/lib/buckparts-runner-safety-contract-v1.ts`.
- **Output:** `buckparts_runner_step_v1` with `layer_truth.layer_6_founder_only_approval: "NOT_PROVEN"`.
- **GitHub dispatch:** `npm run buckparts:runner-step:gh` → `scripts/run-buckparts-runner-step-gh.ts` (workflow `BuckParts Runner Step`).
- **Digest:** optional live Runner JSON via `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH`.

### Founder Decision Registry truth (PROVEN)

- **Spec:** `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`; validator `src/lib/owner-dashboard/founder-decision-registry-v1.ts`.
- **Read model:** `node --import tsx scripts/report-founder-decision-registry.ts` (alias `npm run buckparts:founder-decision-registry`).
- **Data path:** `data/owner-decisions/*.json` (see `data/owner-decisions/README.md`).
- **Codex review rows:** optional `codex_output_review_context_v1` with `founder_option_id` aligned to `codex_output_review_packet_v1` founder options.

### Current owner decision row (PROVEN on disk)

**File:** `data/owner-decisions/codex-output-review-queue-amazon-agent-request-followup-readonly-2026-05-16.json`

| Field | Value |
|--------|--------|
| `source_queue_row_id` | `queue-amazon-agent` |
| `source_decision_packet_id` | `codex_output_review_packet_v1:queue-amazon-agent` |
| `decision_status` | `needs_more_evidence` |
| `allowed_next_scope` | `read_only_agent` |
| `codex_output_review_context_v1.founder_option_id` | `request_followup_readonly` |
| `active_mutation_approvals` (report) | `0` |

**Meaning:** Jared recorded **request another bounded read-only Codex pass** — **not** `approve_readonly_findings`. Codex transport/capture may be PASS while `codex_task_outcome_status` was **`TASK_PARTIAL_OR_FAILED`** (e.g. sandbox `.next/*` / temp IPC). This row is **owner judgment only**; it does **not** authorize mutation or Runner automation.

### Codex Output Review / outcome classifier (PROVEN)

- Builder: `buildCodexOutputReviewPacketV1` / `classifyCodexFinalMessageOutcomeV1` in `codex-output-review-packet-v1.ts`.
- Digest env: `FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH` → saved stdout from `npm run buckparts:codex-next-execution-packet`.
- Layer 6 field when digest correlates registry: `founder_decision_recording_for_codex_review_v1` may be **`PROVEN_PRESENT`** when a matching `codex_output_review_context_v1` row exists — still **NOT** Layer 6 complete.

### JSON stdout contract (PROVEN)

Machine-parseable JSON scripts: **`node --import tsx scripts/…`** — not `npm run … | jq`. See `docs/BuckParts-JSON-STDOUT-CONTRACT.md`.

### Failure Pattern Registry (PROVEN)

Seeded read model `failure_pattern_registry_read_model_v1`; feeds Layer 6 readiness counts. Informational only — does not widen Runner allowlist.

### Batch Production Lane v1 (read-only — non-Amazon review usable)

**Normative spec:** `docs/BuckParts-BATCH-PRODUCTION-LANE-V1.md`. **PROVEN (through `399251a`):** production review report, evidence plan, agent capture packet, owner screenshot drafts (`draft_ready_for_owner_review` vs `production_evidence_commit_blockers`), **owner Markdown review report** (`scripts/report-batch-owner-review.ts`), **owner Markdown approval checklist + compile** (`scripts/report-batch-owner-approval-checklist.ts`, `scripts/report-batch-owner-approval.ts`), non-Amazon PDP source (`--source non-amazon-pdp-candidates`). **Primary owner surfaces:** Markdown review + Markdown approval checklist. **Machine JSON:** debug/support only. **Owner approval:** planning/read-model only — production mutation blocked. **NOT PROVEN:** digest embed, apply/mutation script, production evidence commit, agent-filled facts on disk, Jared row-level decisions for the 5 rows.

**V1 intent:** read-only **batch candidate review** — **5–10** rows, agent-filled facts, founder Markdown review, explicit registry decisions before any apply/commit/deploy. **Non-goals:** auto-publish, auto-commit, Supabase/`retailer_links`/evidence/affiliate mutation, Jared-authored JSON. **Do not** restart Amazon interstitial loop as main path. **Layer 6:** remains **`NOT_PROVEN`**.

### Layer 6 / Codex — key commands (copy from repo root)

```bash
# Registry read model (pure JSON stdout)
node --import tsx scripts/report-founder-decision-registry.ts

# Runner validation bundle (pure JSON stdout)
node --import tsx scripts/buckparts-runner-step.ts

# Codex read-only smoke + next execution packet (host must have Codex CLI + login)
npm run buckparts:codex-readonly-smoke
npm run buckparts:codex-next-execution-packet

# Digest with optional Runner + Codex proof JSON paths
FOUNDER_DIGEST_SKIP_BUILD=1 \
FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH=./buckparts-runner-step.json \
FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH=/path/to/buckparts-codex-packet-proof.json \
node --import tsx scripts/buckparts-founder-digest.ts

# Handoff freshness guard (Layer 6 section presence)
node --import tsx --test scripts/buckparts-hq-handoff-freshness.test.ts
```

### Representative Layer 6 commit chain (reference only)

`1a4849b` Codex read-only smoke · `7ede5ea` Codex next execution packet · `5821af1` Codex packet proof read model · `1363bd4` Codex output review packet · `b38b90a` task outcome classifier · `5b0f0fb` Codex sandbox vs external validation · `b84453f` registry Codex review consumption · `40ad6eb` first real Codex review decision row.

---

## 1) BuckParts Truth Contract

- **Trust before blind monetization:** Buy CTAs and `/go` targets must pass the same gates as production (`src/lib/retailers/launch-buy-links.ts`, `src/lib/retailers/retailer-link-state.ts`, `src/lib/retailers/go-redirect-gate.ts`). See header comments in `launch-buy-links.ts` for search-placeholder and OEM catalog rules.
- **Affiliate narrative must match code:** `scripts/audit-buckparts-system-contracts.ts` checks Amazon tag in `src/lib/retailers/go-redirect-gate.ts` vs `data/affiliate/affiliate-application-tracker.json` (`amazon-associates`). **Last audit:** `npm run buckparts:audit` → `PASS`, blocking false (run at handoff prep).
- **Learning / outcomes schema:** `supabase/migrations/20260428200500_learning_outcomes.sql` defines `public.learning_outcomes`; writer contract in `scripts/lib/learning-outcomes-writer.ts`.
- **Script risk classes:** `docs/buckparts-script-classification-manifest.md` lists mutating vs read-only npm scripts—follow it before any DB/data write.
- **Operating inventory:** `docs/buckparts-operating-map.md` (KEEP / FREEZE / CUT / UNKNOWN table).

## 1A) Jared interaction rules

- Truth above all else.
- Repo truth over memory.
- If not proven, say UNKNOWN.
- Do not tell Jared what he wants to hear.
- Give the best answer first with no drip-feeding.
- Always end build/debug responses with the next best concrete action or prompt.
- Tell Jared exactly where to paste prompts/commands.
- Use Cursor Agent 1 — Repo / Code unless another surface is required.
- Give one prompt/block at a time.
- Never ask “if you want.”
- If there is one best move, state it and give the prompt.
- If two options are equal, ask Jared to choose and explain why.
- No vague follow-ups.
- No “done” without validation.
- Do not invent repo facts.
- Use Proven / Inferred / Unknown for non-trivial claims.
- Optimize for efficiency, money, trust, and conversion.
- For BuckParts build/debug replies, keep responses short: short summary, short why, and the next prompt only unless Jared explicitly asks for more detail.

## 1B) Cursor inbox protocol

- **Canonical relay file:** `docs/BuckParts-CURSOR-INBOX.md` is the repo-local checkpoint between HQ-oriented chat and Cursor Agent 1. It is **handoff text only**, not automation, APIs, or background jobs.
- **Does not replace:** `npm run buckparts:command-center`, `npm run buckparts:command-surface`, tests (`npm test`), cited repo paths, or evidence JSON. Those remain source of truth for live state and code behavior.
- **Conflict resolution:** If the inbox disagrees with repo contents or the output of a named command, **repo/command output wins**; update or abandon the inbox entry.
- **Lifecycle:** If the inbox becomes ritual without reducing copy/paste friction, **delete or freeze** it per the kill switch in that file.

---

## 1C) Fridge flagship product doctrine

**Proven in repo (policy + implementation direction):** refrigerator water is the **flagship wedge**. **Do not deploy** until the fridge homeowner experience is **pristine**. Other verticals must **not** be promoted publicly at **equal priority** until they match the **fridge trust standard** (see also `docs/fridge-flagship-wedge-exposure.md` — exposure audit; broad hide/noindex is a **future**, explicitly approved change).

**Positioning:** BuckParts is **not** a parts catalog page or an affiliate site. It is a **trusted replacement-part decision engine** for homeowners.

**Job to be done:** Help me **finish this replacement** without **buying the wrong part** or **damaging my appliance**.

**Fridge flagship pages must answer (evidence-gated where model-specific):**

1. What did BuckParts find?
2. Where should I look for the filter? *(generic guidance + defer to owner’s manual unless **manual evidence** supports model-specific location)*
3. How does replacement usually work? *(generic unless evidence-backed)*
4. Why does replacement matter?
5. What number should I compare? *(OEM / part / model — via checklist and match copy, not operator jargon)*
6. What is safe to buy, if anything? *(store links **secondary**; only when buy-link gates pass — BuckParts must stay useful with **zero** buy links)*
7. What source supports model-specific instructions, when available? *(future: **manual evidence** as trust moat; no manufacturer photos or copied manual diagrams)*

**Trust rules:**

- **Manual evidence** (contract: `src/lib/manuals/refrigerator-manual-evidence.ts`) is the path to **model-specific** install/location claims. Until a record is **public-ready** per the validator, pages show **only** clearly **generic** help that **defers** to the owner’s manual.
- **Store links are secondary**; **evidence and homeowner guidance are primary**.
- **Amazon / affiliate links must never define the product** (identity and fit come from BuckParts truth and homeowner-visible copy, not the merchant PDP).

---

## 2) Current objective

**From command center digest (not a separate product OKR doc):** when **only Amazon Associates** is `APPROVED` (verified tag) and the **Amazon-first blocked queue** reports `needs_amazon_search_count > 0`, the digest’s `next_best_action` **prefers** OEM blocked-search → Amazon PDP rescue (`scripts/report-buckparts-command-center.ts`). Otherwise the digest may still prioritize **affiliate approvals** / other money lanes when that condition is not met.

**Explicit product OKR outside repo:** UNKNOWN.

---

## 3) Current operating model

- **Core app:** Next.js routes under `src/app/**` with trust/part/retail stack in `src/lib/**` (see operating map).
- **Data plane:** Supabase Postgres (migrations under `supabase/migrations/`; full snapshot in `supabase/schema.sql`—**whether every migration is applied in a given environment is UNKNOWN**).
- **Ops plane:** Read-only JSON reports via `tsx` scripts (`npm run buckparts:*`); optional local GSC exports under `data/gsc/`; evidence JSON under `data/evidence/`; affiliate state in `data/affiliate/affiliate-application-tracker.json` (human-edited truth).
- **Private owner dashboard (not public):** `src/app/ownerdashboard/[secret]/` renders read-only Command Center aggregates (including click visibility under `command_center_v2`); see §5A. There is **no** separate public “command center app” route beyond scripts + this private page.

---

## 4) Current active lane

**From `npm run buckparts:command-center` (`top_money_queue`, non-exhausted lanes):**

| Lane | Exhausted | Candidate count | Source report name |
|------|-----------|-----------------|---------------------|
| `oem_catalog_next_money` | false | 133 | `buckparts_oem_catalog_next_money_cohort_v1` |
| `flexoffers_readiness_refrigerator_water` | false | 10 | `buckparts_flexoffers_readiness_refrigerator_water_v1` |
| `frigidaire_next_monetizable` | true | 0 | `buckparts_frigidaire_next_monetizable_candidates_v1` |

**Recommended cohort action (OEM lane):** “Start with `retailer_links` rows on domain `www.repairclinic.com` …” (verbatim from command center JSON).

---

## 5) Current command center status

**Digest:** `report_name: buckparts_command_center_v1`, `read_only: true`, `data_mutation: false`.

| Field | Value (last run) |
|--------|------------------|
| `system_health_summary.status` | `WARNING` |
| `system_health_summary.reasons` | `retailer_link_state_metrics BLOCKED_* exceeds LIVE_*` |
| `system_health_summary.recommended_next_step` | Resolve warning-level command-surface issues before expanding. |
| `blocked_link_summary.total_blocked_links` | 201 |
| `blocked_link_summary.top_blocked_state` | `BLOCKED_SEARCH_OR_DISCOVERY` |
| `blocked_link_summary.top_blocked_retailer_key` | `oem-catalog` |
| `execution_guidance.next_move_mode` | `READ_ONLY` |
| `operator_can_be_away_status` | `READY_FOR_AUTONOMOUS_READ_ONLY` |
| `known_unknowns` | See §16 (duplicates command surface + affiliate tracker lines). |

**Digest sections present (non-exhaustive):** `affiliate_readiness_summary`, `top_money_queue`, `recent_learning_outcomes`, `blocked_link_summary`, **`search_and_click_intelligence_summary`**, **`money_funnel_summary`**, **`rescue_velocity_summary`**, **`rescue_delta_trend_summary`**, `amazon_first_blocked_queue_summary`, `execution_guidance`, plus narrative fields (`next_best_action`, `why_this_action`, …).

**Frigidaire dead OEM:** `all_resolved: true`, `unresolved_count: 0` (from same command-center run).

### 5A) Command Center / click visibility (read-only)

- **Where it lives:** Owner dashboard (private route above) and Command Center v2 JSON under `command_center_v2.revenue_snapshot.click_visibility` (`scripts/lib/buckparts-click-events-snapshot.ts` + types in `scripts/lib/buckparts-command-center-v2-types.ts`). All reads are **read-only**; no `retailer_links` mutations from this path.
- **Semantics:** The snapshot **separates raw `click_events` counts** from **`human_likely_*` counts** (conservative `user_agent` heuristic: browser-like strings, excluding known bots, internal `BuckPartsAudit`, and `curl` / `node`-style clients). Known bot / internal audit / scripted / unclassified traffic is bucketed in **`excluded_*`** / **`excluded_by_category_30d`**.
- **Root cause of prior `STALE` / silent logging (2026-05-04, proven):** **`public.click_events` schema drift** — `buildGoClickEventInsertRow` and `/go` always inserted **`target_url`**, but the live table **lacked that column**, so PostgREST rejected inserts while redirects still worked. **Not** a Command Center read bug.
- **Fix:** Supabase migration **`20260502120000_click_events_add_target_url_alignment.sql`** (repo + operator runbook `scripts/ops/click-events-target-url-alignment-runbook.sql`) **adds `target_url`** (and `retailer_link_id` if missing) for alignment with `supabase/schema.sql` and the app insert payload — **schema-only**, not a retailer-link mutation.
- **Verification:** After the migration, a **browser** smoke hit on production `/go` (`…/go/c5303885-6ea2-43da-87bb-846a311edba1`) produced a new row: **`created_at` `2026-05-04T03:41:44.254316+00:00`**, **`page_slug` `lt1000p`**, **`retailer_slug` `amazon`**, **`target_url` `https://www.amazon.com/dp/B07H9LHMR2?tag=buckparts20-20`**. Click logging **writes again**.
- **Last verified pulse (re-run `npm run buckparts:command-center` to refresh):** **`raw_last_7_days_clicks` 1**, **`human_likely_last_7_days_clicks` 1**, **`raw_last_30_days_clicks` 1844**, **`human_likely_last_30_days_clicks` 209**, **`newest_click_at` `2026-05-04T03:41:44.254316+00:00`**, **`click_freshness_status` `OK`**.
- **Historical rows:** Pre-migration **`click_events` rows may still have `target_url` null**; no backfill was performed.
- **Revenue:** **`commission_or_revenue` remains `NOT_CONNECTED`**. Raw clicks are **not** revenue; human-likely counts are **not** proof of shoppers or orders.
- **How to interpret for business:** Prefer **`human_likely_*` plus `click_freshness_*`**, not raw totals, when reasoning about outbound interest. When freshness is `STALE` or `NO_RECENT_EVENTS`, treat click volume as **historical / degraded signal** until new events exist.
- **Performance guardrail:** Do **not** introduce SQL view/RPC “optimization” for this unless the **bounded** 30d row scan becomes slow or flaky in production; the design intentionally avoids view/RPC tuning for this lane.
- **Netlify / Supabase:** Production dashboard click visibility needs **`SUPABASE_SERVICE_ROLE_KEY` server-side** (same contract as other read-only admin paths). **`/go` inserts** use **`NEXT_PUBLIC_SUPABASE_URL`** + **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** via `getSupabaseServerClient()`. **Never** expose the service role as `NEXT_PUBLIC_*`.

---

## 6) Current affiliate status

**Tracker file:** `data/affiliate/affiliate-application-tracker.json` (14 records at handoff read).

**From command center `affiliate_readiness_summary`:**

- `approved_count`: **1**
- `affiliate_approval_pending`: **true**
- `pending_count` / `pending_network_or_programs`: **4** buckets — `NOT_STARTED:1`, `DRAFTING:7`, `SUBMITTED:1`, `IN_REVIEW:2` (strings as emitted).
- `repairclinic_status`: **DRAFTING**

**Amazon Associates (from tracker JSON):** `status: APPROVED`, `tagVerified: true`, `tagValue: buckparts20-20`.

**Rejected in tracker (examples):** `awin`, `flexoffers` (each `REJECTED` with dated notes in JSON).

**Command-surface `affiliate_tracker.health` (last run):** `OK` (no `REAPPLY_REQUIRED`).

**Tag verification counts (command surface):** `verified_count: 1`, `unverified_count: 0`, `unknown_count: 13`.

---

## 7) Current monetization status

**From `npm run buckparts:command-surface` → `cta_coverage_metrics` (253 retailer link rows sampled across wedges in that run):**

- `direct_buyable_links`: **52**
- `safe_cta_links`: **52**
- `blocked_or_unsafe_links`: **201**
- `missing_browser_truth_links`: **61**

**`retailer_link_state_metrics.distribution` (same run):**

- `LIVE_DIRECT_BUYABLE`: 52  
- `BLOCKED_BROWSER_TRUTH_UNSAFE`: 61  
- `BLOCKED_SEARCH_OR_DISCOVERY`: 139  
- `BLOCKED_BROWSER_TRUTH_MISSING`: 1  

**Revenue / commission dollars:** not computed in evidenced read-only reports (`report-homekeep-business-scorecard.ts` states it is not a revenue report)—**UNKNOWN** here.

---

## 8) Current database / schema status

- **Repo:** Migrations and `supabase/schema.sql` define intended schema (including `click_events`, `learning_outcomes`, search intelligence, gap candidates, staged compat, retailer links, wedges).
- **Live Supabase instance:** commands succeeded with service role in handoff environment—**specific project / migration version / row counts outside last script output are UNKNOWN** without querying `schema_migrations` or similar.
- **Preflight:** `npm run buckparts:preflight:schema` exists for schema checks before risky work.

---

## 9) Recent completed work

**Trust / vertical UX (shared components, now on multiple wedges):**

- **`PartTruthPanel`** extracted (`cb3806b` and related refactors).
- **Vertical filter pages** use the truth panel and **`TrustAwareBuySection`** (`be11e07`).
- **Vertical filter pages** include **gate suppression summaries** (`d7b4ae6`).
- **Air purifier model pages** use the **trust-aware buy** block (`a0fa4c6`); model truth copy is explicit via provider (`bde23a3`).
- **Whole-house water model pages** use the same **trust-aware buy** pattern (`9229144`).

**Search / intelligence:**

- **Read-only search-miss audit** exists (`ea84b3f`); **refrigerator brand + model-prefix query normalization** landed (`a49e62e`) to reduce false misses.

**Still not rolled out (as of `9229144` on `origin/main`):**

- **Fridge** model-page trust parity (there is **no** `src/app/fridge/model/[slug]/` route in-repo; water-filter flows use other paths).
- **Vacuum / humidifier / appliance-air** model pages (`src/app/*/model/[slug]/page.tsx`) do **not** yet pass `primaryTrustBuy` or wrap `ModelTruthPanelCopyProvider` (only **air purifier** and **whole-house water** model routes do).
- **Full GA4/GSC parsed metrics** in HQ JSON (surface uses available exports + DB slices; not a complete analytics product in-repo).
- **Affiliate earnings / commission reporting** (tracker + CTA metrics; no evidenced revenue pipeline in read-only reports).

**Strategic questions (for Jared / HQ, not answered here):**

- **Customer trust** and **mobile polish** vs velocity.
- **Safe CTA coverage growth** vs blocked-link backlog shape.
- **Remaining model-page trust parity** ordering (fridge vs other verticals).
- **Affiliate / revenue signal integration** when more programs are `APPROVED`.

**Older reference commits (Amazon-first queue era):** `fda01cb` Amazon-first blocked conversion queue; multipack / buyable-subtype / rescue cohort work continues in `git log` before the trust-panel series above.

**Docs in repo:** `docs/buckparts-command-center-final-blueprint.md` (blueprint)—confirm tracking with `git status` if you edit locally.

---

## 10) Current blockers

- **Command surface / center health:** `WARNING` — blocked retailer-link states exceed live (`computeSystemHealth` in `scripts/report-buckparts-command-surface.ts`).
- **Affiliate breadth:** Only one `APPROVED` program in tracker-driven summary; many lanes drafting / review / not started; **RepairClinic** not approval-ready (`DRAFTING`)—NBA explicitly deprioritizes RepairClinic-dependent work until status advances (`report-buckparts-command-center.ts` guard).
- **Awin / FlexOffers:** `REJECTED` in tracker—treat as closed lanes unless tracker is updated.
- **Evidence:** `data/evidence/amazon-false-negative-rescue-staging.2026-04-29.json` is only rewritten when you run `npm run buckparts:stage:amazon-false-negative-rescue` (CLI entry); importing `scripts/stage-amazon-false-negative-rescue.ts` from tests no longer triggers a write. Substantive edits from that stage command are **INTENTIONAL** only.

---

## 11) Next best action

**From last `buckparts:command-center` output (live env; re-run to refresh):**

- **`next_best_action`:** “Prioritize Amazon-first OEM blocked-search rescue: run exact-token Amazon PDP searches and verify buyability for queued refrigerator tokens (ADQ75795101, DA97-08006B, DA97-15217D, DA97-17376A, DA97-19467C).”
- **`why_this_action`:** “Amazon Associates is APPROVED with verified tag, no other affiliate is APPROVED yet, and the Amazon-first queue reports rows needing SEARCH_AMAZON_EXACT_TOKEN.”

**Also read:** `amazon_first_blocked_queue_summary` in the same JSON (`needs_amazon_search_count`, `already_live_noop_count`, `top_5_tokens`). If `runtime_status` is `UNKNOWN`, the digest falls back to the older affiliate-queue / money-lane NBA logic.

---

## 12) Exact prompt / output style rules

When acting as a BuckParts repo agent:

1. **Prefer evidence:** Cite file paths or command outputs; use **UNKNOWN** when not proven.
2. **No silent DB writes:** Mutating scripts (`seed:*`, `buckparts:search-gap:status:*`, staged apply/promote, etc.) require explicit operator intent—see manifest §5.
3. **Read-only reports:** Default to JSON stdout scripts under `npm run buckparts:*` for status.
4. **User comms (if also given user rules):** Complete sentences; code citations use ```start:end:path fences on their own line; avoid inventing CLI the user must run—run it when the environment allows.
5. **Do not claim** command center UI, revenue totals, or production cron unless documented or measured.

---

## 13) What not to do

- Do **not** change trust gates or `/go` behavior without review (`launch-buy-links`, `go-redirect-gate`, `retailer-link-state`).
- Do **not** insert monetized links for networks that are not `APPROVED` in the tracker (FlexOffers readiness report is explicitly “no link insert” preparation—see `report-flexoffers-readiness-fridge.ts` slot template).
- Do **not** treat `known_unknowns[0]` about `learning_outcomes` as contradicting `learning_outcomes_metrics.runtime_status` without reading the code: **`report-buckparts-command-surface.ts` always prepends** the string `learning_outcomes runtime table status is UNKNOWN_NOT_QUERIED (DB intentionally not queried).` into `known_unknowns` (around lines 1132–1133) even when metrics were queried and show **`OK`**—last run had `learning_outcomes_metrics.runtime_status: OK` and all outcome counts `0`.
- Do **not** assume Frigidaire monetizable queue has work—command center shows **exhausted** for that lane.

---

## 14) Current key commands

**Verification loop (recommended daily):**

```bash
npm run buckparts:audit
npm run buckparts:command-surface
npm run buckparts:command-center
```

**Snapshot (for trend deltas):**

```bash
npm run buckparts:command-surface:snapshot
```

### Command-surface snapshot discipline (`rescue_delta_trend_summary`)

- **Refresh on-disk snapshot:** `npm run buckparts:command-surface:snapshot` writes `data/reports/buckparts-command-surface.json` (same shape as live command-surface JSON).
- **Git visibility:** `data/reports/*` is **gitignored** (see repo `.gitignore`), so refreshing the snapshot may **not** appear in `git status` even though the file changed locally.
- **Prior snapshot shape:** `rescue_delta_trend_summary` compares the current run against that file; it needs a **current-shaped** prior snapshot (includes `cta_coverage_metrics`, `retailer_link_state_metrics`, and `search_and_click_intelligence_summary` with the numeric fields the delta builder reads). A stale or pre-schema snapshot yields `UNKNOWN_SNAPSHOT_UNAVAILABLE` until replaced.
- **Two-step loop:** After `…:snapshot`, run `npm run buckparts:command-surface` **again** so the next read picks up the refreshed file and can emit numeric `current`, `deltas`, and `net_rescue_direction` (the snapshot run itself still built against the *previous* file contents).
- **First deltas after refresh:** When metrics match the snapshot you just wrote, `net_rescue_direction` may legitimately be **`FLAT`**; meaningful **IMPROVING** / **DEGRADING** / mixed **`UNKNOWN`** shows up after later catalog or gap backlog changes.

**Other `buckparts:*` scripts:** full list in `package.json` (lines ~29–82)—includes guardrails, runbooks, OEM/Amazon/Frigidaire reports, scorecard, affiliate clicks, false-negative audit, schema preflight, etc.

**Tests / build:**

```bash
npm test
npm run build
```

---

## 15) Current warnings from command surface

**`system_health.status`:** `WARNING`

**`system_health.reasons` (last run):**

- `retailer_link_state_metrics BLOCKED_* exceeds LIVE_*`

**`recommended_next_step`:** Resolve warning-level command-surface issues before expanding.

**Related metrics (same run):** see §7 for blocked vs live counts.

---

## 16) Open questions / UNKNOWNs

- **Product roadmap / OKRs** outside command-center NBA: UNKNOWN.
- **Production DB migration lag** vs repo: UNKNOWN without environment query.
- **Whether `learning_outcomes` rows are written in production** at any volume: table returned **all zero** outcome counts in last surface run—usage frequency UNKNOWN.
- **Affiliate conversion revenue ingestion:** no evidenced automated pipeline in repo survey for this handoff—UNKNOWN.
- **Operator calendar / on-call:** UNKNOWN.
- **`READY_FOR_ASYNC_REVIEW` in command center type:** enum exists in `CommandCenterReport`; current TypeScript path only sets `NOT_READY` or `READY_FOR_AUTONOMOUS_READ_ONLY` in `report-buckparts-command-center.ts`—behavior for async review UNKNOWN.
- **Git working tree cleanliness:** run `git status --short` before work; treat evidence JSON timestamp-only diffs as noise unless you intentionally re-ran a mutating staging flow (§10).

---

## Appendix — Command center `known_unknowns` (2026-05-03 post-push run, verbatim)

Use for debugging overlap with command surface:

1. `learning_outcomes runtime table status is UNKNOWN_NOT_QUERIED (DB intentionally not queried).`  
2. `state_system_metrics.retailer_link_state non-computable: …`  
3. `state_system_metrics.no_buy_reason non-computable: …`  
4. `state_system_metrics.wrong_purchase_risk non-computable: …`  
5. `state_system_metrics.replacement_safety non-computable: …`  
6. `Affiliate tracker: walmart: notes include UNKNOWN` (duplicated twice in output)

---

*End of handoff. Regenerate numbers by re-running §14 commands.*
