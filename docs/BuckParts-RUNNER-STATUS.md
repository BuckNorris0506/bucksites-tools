# BuckParts — Runner status (canonical)

**Purpose:** One living document for Runner-adjacent **repo truth**: capabilities, execution surfaces, gaps, and what not to claim. Supersedes `docs/BuckParts-RUNNER-CAPABILITY-AUDIT.md` and the former product-audit doc (merged 2026-05-08).

**Truth contract:** **PROVEN** = path or `package.json` script exists in-repo and/or command output captured below. **INFERRED** = follow-on from PROVEN, not a full product claim. **UNKNOWN** = not evidenced in repo or host-dependent without a local proof.

**Maintain:** When queue, packet, digest, or workflows change, update the tables and “Last verified” line.

**Last verified against repo:** 2026-05-08 (Runner Safety Contract v1 tests + docs pass locally).

**Line budget:** Keep this file roughly **150–250** lines; extend only when facts change.

---

## Executive verdict

| Topic | Verdict |
|-------|---------|
| **Partial Runner core** | **PROVEN** — Founder Action Queue, Founder Execution Packet, digest, CLIs, operator proof, owner dashboard control plane compose read-only founder/operator infrastructure. |
| **Layer 3 for repo-owned scripts** | **PROVEN** — GitHub Actions: e.g. `.github/workflows/buckparts-founder-digest.yml` runs `npm ci`, `npm run build`, then `node --import tsx scripts/buckparts-runner-step.ts` (writes `buckparts-runner-step.json`), then `node --import tsx scripts/buckparts-founder-digest.ts` with optional `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH`; `.github/workflows/buckparts-daily-operator.yml` runs `npm ci` then `npm run buckparts:daily`; `.github/workflows/buckparts-runner-step.yml` (`workflow_dispatch`) runs `npm ci` then `node --import tsx scripts/buckparts-runner-step.ts` and uploads `buckparts-runner-step.json`. Local `spawnSync` in `scripts/buckparts-operator-proof.ts` and clipboard in `scripts/buckparts-copy-next-execution-packet.ts`. |
| **Layer 3 for Cursor / Codex / OpenAI agent** | **UNKNOWN / not proven** — no in-repo integration; see execution surfaces. |
| **Copy/paste** | **PARTIAL** — `buckparts:next-execution-packet` + macOS `buckparts:copy-next-execution-packet` reduce hunting/pasting the packet; IDE/chat handoff remains human. |

---

## Repo-proven Runner capabilities

| Capability | `package.json` / path |
|------------|------------------------|
| Next execution packet (stdout / `--json` / `--list`) | `npm run buckparts:next-execution-packet` → `scripts/buckparts-next-execution-packet.ts`, `scripts/lib/buckparts-next-execution-packet.ts` |
| Clipboard copy of next packet (macOS `pbcopy`) | `npm run buckparts:copy-next-execution-packet` → `scripts/buckparts-copy-next-execution-packet.ts` |
| Founder digest (markdown stdout) | `npm run buckparts:founder-digest` → `scripts/buckparts-founder-digest.ts`, `scripts/lib/buckparts-founder-digest-v1.ts` |
| Founder Action Queue | `src/lib/owner-dashboard/founder-action-queue-v1.ts` |
| Founder Decision Packets (owner-only v1) | `src/lib/owner-dashboard/founder-decision-packet-v1.ts` — **PROVEN:** read-only builder from Founder Action Queue; digest + dashboard; **not** agent execution prompts. **PROVEN:** Row-class shaping uses stable queue row ids from `founder-action-queue-v1.ts` (e.g. human browser, affiliate readiness, mutating gate, `next_best_action`, generic fallback). **INFERRED:** When Runner Step `overall_status` is `NO_PACKET`, owner decision `why_jared` appends that signal in digest CI runs. |
| Owner dashboard / Founder Control Plane | `src/app/ownerdashboard/[secret]/page.tsx`, `src/lib/owner-dashboard/founder-control-plane-model.ts` |
| Runner Step v1 (JSON validation bundle) | `npm run buckparts:runner-step` → `scripts/buckparts-runner-step.ts`, `scripts/lib/buckparts-runner-step-v1.ts` |
| Runner Step visibility (founder digest + owner dashboard) | `scripts/lib/buckparts-runner-step-summary-v1.ts` — **PROVEN:** owner dashboard remains modeled-only (`live_runner_step_json` **UNKNOWN**). **PROVEN:** weekly Founder Digest workflow sets `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH` so digest markdown embeds live Runner Step JSON when that file exists; local `npm run buckparts:founder-digest` without the env still uses the modeled Runner section. |
| Runner Safety Contract v1 (allowlist + default prohibition snapshot) | `scripts/lib/buckparts-runner-safety-contract-v1.ts`, `scripts/buckparts-runner-safety-contract.test.ts` |
| CI: Runner Step v1 (manual JSON + artifact) | `.github/workflows/buckparts-runner-step.yml` — `workflow_dispatch` only; `npm ci`; `node --import tsx scripts/buckparts-runner-step.ts > buckparts-runner-step.json`; `GITHUB_STEP_SUMMARY`; artifact `buckparts-runner-step`. **PROVEN:** Runner Step can now be run manually in GitHub Actions and uploaded as an artifact. |
| CI: build + digest + Runner Step JSON + artifacts + summary | `.github/workflows/buckparts-founder-digest.yml` — **PROVEN:** uploads `founder-digest.md` and `buckparts-runner-step.json`; appends concise Runner Step block to `GITHUB_STEP_SUMMARY` before digest output. |
| CI: daily operator pattern | `.github/workflows/buckparts-daily-operator.yml` (**PROVEN** path exists; same class as digest) |
| Upstream Command Center | `npm run buckparts:command-center` → `scripts/report-buckparts-command-center.ts` |

**Packet eligibility (PROVEN):** `founder-execution-packet-v1.ts` emits packets only when `status === "agent_safe"` AND `recommended_actor === "agent"` AND `mutation_authority === "read_only"`. Default validation text names `npm run lint`, `npm run build`, `npm run buckparts:operator-proof`.

**CLI read-only posture (PROVEN from script comments):** next-packet and digest scripts state they do not mutate Supabase, `retailer_links`, evidence, or affiliate data; copy script is local-only, not CI-wired.

---

## Execution surfaces

| Surface | In repo | Callable for “agent Runner loop” |
|---------|---------|----------------------------------|
| **Cursor** | `docs/BuckParts-CURSOR-INBOX.md`, `docs/BuckParts-HQ-HANDOFF.md` — human handoff | **UNKNOWN** — no code invoking Cursor; inbox doc says not automation/API. |
| **Codex** | HQ handoff mentions credits; **not** wired | **UNKNOWN** |
| **OpenAI API/CLI** | **PROVEN** no `openai` npm dependency in `package.json`; UA string checks elsewhere, not a client | **UNKNOWN** |
| **GitHub Actions** | **PROVEN** workflows: checkout, setup-node, `npm ci`, scripts, `GITHUB_STEP_SUMMARY`, `upload-artifact` | **PROVEN** for **repo scripts** only — not Cursor/Codex inside the job. |
| **Local terminal** | **PROVEN** `tsx`/`node`, `npm run`, `spawnSync` patterns | **PROVEN** for subprocesses **you** invoke. |
| **`gh` CLI** | Workflows use Actions, not `gh` from app code | **UNKNOWN** on any given laptop until `command -v gh`. |
| **Netlify** | **PROVEN** `@netlify/plugin-nextjs` in `package.json`; `netlify.toml` `command = "npm run build"` | **INFERRED** deploy/build surface, not a generic agent runner unless added. |
| **Slack / email** | **PROVEN absent** for digest — `buckparts-founder-digest-v1.ts` + `scripts/buckparts-founder-digest-workflow.test.ts` | N/A for Runner alerts today. |

---

## Copy/paste status

**PROVEN reduced:** Bounded `copy_paste_prompt`, digest/dashboard surfaces, `buckparts:next-execution-packet`, and macOS `buckparts:copy-next-execution-packet` make the **next** packet easier to obtain than ad-hoc assembly.

**PROVEN not eliminated:** There is no in-repo path that pastes into or reads from Cursor/Codex/ChatGPT automatically. Non-macOS has no `pbcopy` path in the copy script (**PROVEN** — script gates `darwin`).

---

## Current Runner layer verdict

- Layer 1 — Repo decides next packet: **PROVEN**
- Layer 2 — Packet can be copied to clipboard: **PROVEN on macOS via pbcopy**
- Layer 3 — Repo sends prompt directly to Cursor/Codex/OpenAI agent: **UNKNOWN / not proven**
- Layer 4 — Repo captures agent output automatically: **UNKNOWN / not proven**
- Layer 5 — Repo validates/interprets output: **PARTIAL**
- Layer 6 — Jared only approves/judges quality: **NOT PROVEN**

---

## Layer map (detail)

| Layer | Target | BuckParts | Evidence |
|-------|--------|-----------|----------|
| 1 | Decide next work packet | **PROVEN** | Queue + packet builders + `buildNextExecutionPacketSnapshotV1` |
| 2 | Surface / copy prompt | **PROVEN** (stdout + macOS clipboard) | `buckparts:next-execution-packet`, `buckparts:copy-next-execution-packet`, digest, dashboard |
| 3 | Send prompt to execution tool | **PARTIAL** — **PROVEN** for internal npm/tsx in CI/local; **UNKNOWN** for IDE agents | Workflows + scripts vs. no agent API |
| 4 | Collect output | **PARTIAL** — **PROVEN** subprocess/CI logs; **UNKNOWN** for agent chat | `buckparts-operator-proof.ts`, digest workflow `tee` |
| 5 | Validate / interpret | **PARTIAL** — exit-code checks in prompts + operator proof; no semantic parser for agent prose | `founder-execution-packet-v1.ts` |
| 6 | Founder only judges quality | **NOT PROVEN** | Paste, git, mutations still human-gated |

---

## Do not claim yet

- Do not claim autonomy.
- Do not claim closed-loop Runner.
- Do not claim Cursor/Codex/OpenAI integration.
- Do not claim the Runner product is sellable.
- Do not claim copy/paste hell is solved; only reduced.

---

## Why autonomy is currently bounded

- **PROVEN:** Runner Step v1 (`npm run buckparts:runner-step` → `scripts/buckparts-runner-step.ts`) runs only `npm run lint`, `npm run build`, and `npm run buckparts:operator-proof`; the allowlist is canonical in `scripts/lib/buckparts-runner-safety-contract-v1.ts` and enforced by tests under `scripts/buckparts-runner-safety-contract.test.ts` and `scripts/buckparts-runner-step.test.ts`.
- **PROVEN:** That CLI never uses the packet’s validation text for subprocess arguments — tests assert `scripts/buckparts-runner-step.ts` contains no `validation_command` identifier (see safety contract test file).
- **PROVEN:** Founder Execution Packets are emitted only for queue rows with `status: "agent_safe"`, `recommended_actor: "agent"`, and `mutation_authority: "read_only"` (`src/lib/owner-dashboard/founder-execution-packet-v1.ts`); default `prohibited_actions` are locked to the same lines as the safety contract module (drift tests in `founder-execution-packet-v1.test.ts`).
- **PROVEN:** LLM-facing text still requires human paste and judgment; `layer_6_founder_only_approval` remains **NOT_PROVEN** in Runner Step JSON (`scripts/lib/buckparts-runner-step-v1.ts`).
- **UNKNOWN:** Whether an external agent obeys `prohibited_actions` or mutates production — enforcement is policy + review, not kernel-level.

---

## Honest automation boundaries

**Can automate without lying (PROVEN):** Run read-only `tsx` / `npm` steps in CI or locally; capture stdout/stderr; write digest markdown to logs/artifacts; copy next packet to macOS clipboard.

**Cannot claim yet:** Repo sends packet to Cursor and ingests reply; Codex/OpenAI CLI loop; Slack/email on digest completion; semantic pass/fail on arbitrary agent text without a schema.

---

## Recommended next proof

Smallest honest next step is not broad autonomy. It is proving a repo-owned loop surface:

- pick GitHub Actions or local subprocess as the first Runner execution surface
- generate a work packet
- execute repo-owned validation
- capture logs/artifacts
- summarize result
- produce the next packet or blocked state
- require human approval for mutation

**Design-only options (not implemented here):** optional `workflow_dispatch` workflow running `npm run lint`, `npm run build`, `npm run buckparts:operator-proof` with summary + artifact; optional inbox/outbox dirs for the same validation bundle. Do **not** wrap only the prompt generator and call it a Runner — deliverable should be **validation evidence** and structured status, not simulated LLM output.

---

## Risks & mutation gates

- **PROVEN:** Packets and Command Center carry `mutating_blocked` / `prohibited_actions` text; enforcement is process + human review, not kernel-level.
- **PROVEN:** Operator-style scripts use **fixed** argv (not user-controlled shell strings) — changing that would be high risk.
- **PROVEN:** Workflows use secrets for Supabase; logs must not echo secrets.
- **INFERRED:** More workflows increase CI minutes and secret surface.

---

## What Jared still does

Paste or drive external agents; interpret agent narrative; git/PR; open Actions for artifacts; approve any mutation outside read-only packets.

---

## Appendix — PATH snapshot (this machine only)

Re-run on your laptop; results differ by install.

```text
command -v cursor   # (empty this run)
command -v codex   # (empty)
command -v gh      # (empty)
command -v openai  # (empty)
command -v netlify # /usr/local/bin/netlify
command -v node    # /usr/local/bin/node
command -v npm     # /usr/local/bin/npm
node --version     # v24.13.1
npm --version      # 11.8.0
netlify --version  # netlify-cli/24.3.0 darwin-arm64 node-v24.13.1
```

---

## Changelog (doc only)

| Date | Change |
|------|--------|
| 2026-05-08 | Collapsed `BuckParts-RUNNER-CAPABILITY-AUDIT.md` + prior status/product material into this single canonical `BuckParts-RUNNER-STATUS.md`. |
| 2026-05-15 | Founder `founder_decision_packet_v1` (`src/lib/owner-dashboard/founder-decision-packet-v1.ts`): digest + owner dashboard show **owner-only** decision packets for `needs_owner` / `blocked` / `waiting` queue rows; row-class copy by stable `queue-*` ids; when Runner Step reports `NO_PACKET`, digest `why_jared` appends that status (not agent-safe execution packets). |
| 2026-05-15 | Weekly `.github/workflows/buckparts-founder-digest.yml` also runs Runner Step v1, uploads `buckparts-runner-step.json`, appends concise Runner summary to `GITHUB_STEP_SUMMARY`, and passes `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH` so digest markdown embeds live Runner JSON. |
| 2026-05-08 | Manual GitHub Actions workflow `.github/workflows/buckparts-runner-step.yml` for Runner Step v1 JSON artifact + job summary. |
