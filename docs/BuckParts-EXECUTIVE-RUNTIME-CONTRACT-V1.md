# BuckParts Executive Runtime Contract v1

**Status:** Instantiated as a **docs sequencing contract** only. No runtime executor ships in this lane.  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`. Operating loop remains `AGENTS.md` + current stopping point in `docs/BuckParts-HQ-HANDOFF.md`.  
**Question this contract answers:** *When the Executive wakes up, exactly what sequence of operations does it perform before sleeping again?*  
**Permission claimed:** none. This document sequences **existing** components. It does not assign NBA, Dispatch, Daily Operator, mutation, scoring, or steering authority.

---

## 0. Hard non-goals

- Do not create philosophy, governance, registries, dashboards, organs, stores, scores, or weights.
- Do not redefine Constitution, AGENTS, Command Center, HQ, OAR, ODR, Outcome Join, Evolution Gate, or Precedent Clause.
- Do not treat this contract as a wake daemon, cron, or auto-apply loop.
- Do not wire Outcome Join into NBA / Dispatch / Daily Operator (HQ Drift Watch F2).
- Do not implement `docs/COMMAND-CENTER-CONTROL-LOOP-V1.md` recommended new CC lane (`command_center_control_loop_summary_v1`). That audit remains an audit.

Default on any new permission/scope claim: Executive Evolution Gate → `PARK` or `REJECT`.

---

## 1. Binding artifacts (cite only)

| Name in this contract | Existing artifact | Role in one wake cycle |
|-----------------------|-------------------|------------------------|
| Constitution | `docs/BuckParts-CONSTITUTION.md` | Binding values; Trust Hierarchy; fail-closed public buy guidance |
| AGENTS | `AGENTS.md` | Mandatory Discover→Plan→… loop; founder gates; no autonomous apply |
| HQ Handoff | `docs/BuckParts-HQ-HANDOFF.md` | Current stopping point / operational NBA context; not HEAD/truth by itself |
| Command Center | `npm run buckparts:command-center` → `.command_center_v2` | World-model builder for the cycle |
| Canonical decision | `.command_center_v2.canonical_final_operating_decision_v1` | Existing NBA + dispatch binding (single owner-facing winner) |
| Founder Decision Queue | `founder_action_queue_v1` **and** `owner_decision_queue_v1` | Owner-facing candidates (FAQ) + pending ODRs (ODQ). **No third queue.** |
| ODR | `owner_decision_request_v1` under `data/owner-decisions/queue/requests/` | Escalation packet; never auto-approves |
| OAR | `founder_decision_registry_v1` under `data/owner-decisions/*.json` | Closed / active founder outcomes; only durable mutation-intent store |
| Outcome Join | `.command_center_v2.phase4_outcome_capture_v1` | First Sensory Path; observe only; `steering_authority=false` |
| Evolution Gate | `docs/BuckParts-EXECUTIVE-EVOLUTION-GATE-V1.md` | Authority-claim gate; existence ≠ permission |
| Precedent Clause | `docs/BuckParts-PRECEDENT-CLAUSE-DRAFTING-CONTRACT-V1.md` | Read-only drafting text on ODR / decision packets; weights = NONE |
| Dispatch | `npm run buckparts:command-center:run-dispatch` + allowlist | Executes **only** allowlisted exact commands when canonical `dispatch_status=READY` |
| Agent Contract | `docs/BuckParts-AGENT-CONTRACT-V1.md` | External-operator halt / result validate; `mutation_authorized=false` on manifests |

Daily Operator (`npm run buckparts:daily`) is an existing **observe-only** sibling. It is not this runtime’s NBA and is not merged into Command Center JSON.

---

## 2. Wake and sleep

**Wake** = a cycle starts. Existing triggers (any one):

1. An agent session begins (must run AGENTS Discover first).
2. Operator runs `npm run buckparts:command-center`.
3. Operator runs `npm run buckparts:command-center:run-dispatch` (still must pass stage 6 gates).

**Sleep** = this cycle stops. The Executive does not start a second lane. Next wake re-reads repo truth; memory is not HEAD.

Sleep is mandatory when any stop-rule in §4–§8 fires.

---

## 3. Authority locks (this contract)

| Lock | Value |
|------|--------|
| `read_only` | `true` for the contract itself |
| `data_mutation` | `false` |
| `mutation_authorized` | `false` |
| `steering_authority` | `false` |
| `nba_authority` | `false` (reads existing canonical NBA; does not mint one) |
| `dispatch_authority` | `false` (may invoke existing dispatch runner only when that runner’s own gates pass) |

Guarded `--apply` / `--write-csv` remain **outside** this runtime. They require a valid active OAR row **and** explicit founder authorization for that session/scope (`AGENTS.md`). Presence of an approval file is not “run `--apply` now.”

---

## 4. Cycle stages

Each stage states: **READ**, **DELEGATE**, **STOP**. Stages run in order. Do not skip 4.1–4.2. Do not reorder.

### 4.1 Observation

**READ**

- `git status --short`, `git rev-parse HEAD` (short). Dirty tree is a fact, not a license to mix lanes.
- HQ stopping-point section (current operational context).
- Constitution only where a trust conflict appears (do not “re-derive” values).
- Command Center JSON, including:
  - `.command_center_v2.phase4_outcome_capture_v1` (Outcome Join)
  - `.command_center_v2.phase4_decision_capture_v1`
  - `.command_center_v2.canonical_final_operating_decision_v1`
  - `.command_center_v2.owner_decision_queue_v1`
  - `revenue_snapshot.click_visibility` (telemetry visibility, not outcomes)
- Closed OAR substrate if any ODR/packet will be drafted this cycle (`loadClosedOarPrecedentSubstratesV1`).

**DELEGATE:** none. Observation does not choose work.

**STOP if:** Command Center cannot be built; click rows unavailable is **UNKNOWN** (Outcome Join fail-closed), not a zero; HQ and HEAD disagree — record both, invent neither.

### 4.2 World-model construction

**READ / COMPOSE (existing report only):** the Command Center v2 object **is** the world model for this cycle. Do not write a second model.

Minimum fields to keep:

| Field | Use |
|-------|-----|
| `canonical_final_operating_decision_v1` | Selected NBA + exact_command + dispatch_status |
| `competing_steering_candidates_v1` | Advisory losers; do not execute them |
| Outcome Join handoff counts / blockers | Sensory; never a score |
| ODQ pending_count + request statuses | Escalation load |
| Founder Action Queue rows | Owner-facing candidate list |
| `system_health_summary` / issue-registry blockers | Bottleneck inputs |

**DELEGATE:** none.

**STOP if:** canonical decision missing; `command_executable` / `dispatch_status` absent — treat dispatch as refused.

### 4.3 Bottleneck detection

**READ** existing blockers only. Rank is constitutional, not a new scorer:

1. Trust / public buy-path harm (Constitution §4).
2. Founder-gated surfaces already blocked (`AGENTS.md` founder gate list).
3. `brain_stop_the_line` if canonical precedence selected it.
4. ODQ `PENDING_OWNER_DECISION` (work waiting on founder, not on agents).
5. Outcome Join `UNKNOWN` / `handoff_join_key_unqualified` (measurement gap — **not** a mandate to build organs).
6. Dirty or unknown provenance (dispatch runner already refuses this).

**DELEGATE:** none.

**STOP if:** bottleneck is founder-gated or ODQ-pending — go to §4.7 Escalation. Do not “helpfully” mutate.

### 4.4 Candidate generation

**READ**

- Canonical winner (`next_best_action`, `why_this_action`, `exact_command`).
- Founder Action Queue rows (`needs_owner` / `agent_safe` / `blocked` / `waiting` / `do_not_touch`).
- Competing steering candidates (visibility only).
- HQ stopping-point NBA **as context**, not as a second executable.

**DELEGATE:** packet builders already in repo (Founder Decision Packets, ODR-from-runner-halt). Attach Precedent Clause. Do not invent closures or weights.

**STOP if:** generating a candidate would require a new Executive permission, new metric, or Outcome Join consumer → Evolution Gate (default `PARK`/`REJECT`) → §4.7.

### 4.5 Lawful selection

Select **at most one** lane. Use existing selectors; do not merge HQ and canonical into a new NBA.

| Condition | Selection |
|-----------|-----------|
| Constitution vs any tactical NBA | Constitution wins |
| Work claims new named permission/scope | Evolution Gate; no selection of that claim |
| Work is public buy / CSV / Supabase / routes / sitemap / robots / buy CTA | No selection until matching **active** OAR (`approved` + `owner_mutation_approved` + time bounds) **and** founder session authorization |
| Canonical `dispatch_status` is `READY` and `command_executable=true` and command allowlisted | That exact_command is the only dispatchable selection |
| Canonical `OWNER_REVIEW_REQUIRED` / `REFUSE_NO_EXECUTABLE` / `BLOCKED` / `UNKNOWN` | Do not substitute another candidate |
| HQ stopping point and canonical winner **conflict** on this cycle’s action | Do not pick silently → §4.7 |
| Outcome Join / Precedent Clause | Never selected as the action; they inform or draft only |
| FAQ row `do_not_touch` or `blocked` | Not selectable |
| Dirty tree with unrelated changes | Refuse mixed work |

**DELEGATE:** founder remains accountable (Constitution §13). Runtime does not close truth.

### 4.6 Dispatch

**READ:** canonical `exact_command`, allowlist metadata, provenance, `mutation_posture.mutation_allowed` (must remain `false` on the dispatch runner).

**DELEGATE (existing only)**

- If §4.5 selected a READY allowlisted command: `npm run buckparts:command-center:run-dispatch` (or `--resume-run-id` when recovery contract applies).
- If selected work is AGENTS read-only / dry-run: run that lane’s owner-review or `--dry-run` packet. Default remains dry-run.
- If Agent Contract halt: write/read dispatch manifest + result as already specified; never set `mutation_authorized` on the manifest.

**STOP — do not dispatch — if any of:**

- `command_executable=false`
- `dispatch_status !== READY`
- exact_command not allowlisted
- dirty/unknown provenance (existing runner refuse)
- `owner_review_required=true`
- command looks mutating / `--apply` / `--write-csv` / `--write`
- no active OAR when AGENTS founder gate applies
- Outcome Join values used as ranking input

Guarded apply is **not** a dispatch-runner action. After OAR + explicit founder apply authorization, execution follows `AGENTS.md` steps 6–9, not this contract’s dispatch stage.

### 4.7 Escalation

**READ:** FAQ `needs_owner` rows; ODQ pending ODRs; HQ operating rule (execution surface + exact copy/paste command).

**DELEGATE**

- Upsert/keep ODR (`PENDING_OWNER_DECISION`) via existing ODQ builders; include Precedent Clause.
- Emit founder-facing exact command (HQ rule). Surfaces already named: Terminal, Cursor, HyperAgent, Browser, Supabase SQL, Boardy.
- Halt `EXTERNAL_AGENT_REQUIRED` when Agent Contract requires an off-repo result.

**STOP.** After escalation, go to §4.9 Sleep. Do not continue the lane as if approved.

Escalate immediately when:

- Founder gate surfaces would change
- Canonical status is `OWNER_REVIEW_REQUIRED`
- HQ vs canonical conflict
- UNKNOWN would require inventing a command (HQ exception: no trailing invented prompt)
- Evolution Gate would be needed for a new permission claim
- OAR missing/inactive/expired for mutation-shaped work

### 4.8 Learning

**READ (measure, do not steer)**

- Outcome Join fields after any cycle that could have produced a `/go` or CC rebuild.
- Closed OARs for Precedent Clause on any new draft.
- Lane tests / `npm run build` when product/runtime was touched (`AGENTS.md` validate).

**DELEGATE:** none. Learning outcomes insert plans remain owner-review. Weights changed = NONE.

**STOP if:** “learning” would require a score, rank, auto-NBA, or Outcome Join consumer. That is a new authority claim → Evolution Gate, not this stage.

HQ handoff update runs **only** after commit **when Jared asks** (`AGENTS.md` step 9). This stage does not rewrite HQ by default.

### 4.9 Sleep

**WRITE (allowed existing paths only, if this cycle produced them):** dispatch-run artifact from the existing runner; ODR/queue files from existing ODQ upsert; Precedent text on those drafts.

**RECORD (in the session / existing artifact, not a new registry):** HEAD; observation status of Outcome Join (PROVEN/UNKNOWN as emitted); selected exact_command or escalation; what was **not** claimed.

**STOP.** Do not start another lane. Next wake begins at §4.1.

---

## 5. Information vs decision vs halt (summary)

| Kind | What | Who decides |
|------|------|-------------|
| Information read | HEAD, HQ stopping point, CC world model, Outcome Join, ODQ, FAQ, OAR, allowlist | Nobody — facts |
| Delegated (existing) | Canonical NBA winner; dispatch of READY allowlisted read-only commands; dry-run packets | Existing CC / dispatch / AGENTS rules |
| Founder-only | Mutation, buy CTA, CSV/Supabase/public routes, new Executive permission, HQ vs canonical conflict, ODR approval | Founder via OAR / explicit session authorization |
| Must halt | UNKNOWN command, dirty mixed tree, non-READY dispatch, missing OAR, Evolution Gate fail, Outcome Join used as steering | Runtime sleeps |

---

## 6. Fail-closed rules

1. UNKNOWN beats invented certainty (Constitution §5–§6; Outcome Join no false zero).
2. Evidence precedes authority (Constitution §7; Evolution Gate).
3. One lane; no mixed dirty trees (`AGENTS.md`).
4. Read-only packet before mutation; no autonomous apply (`AGENTS.md`).
5. Dispatch never normalizes `OWNER_REVIEW_REQUIRED` / `BLOCKED` / `UNKNOWN` / `REFUSE_NO_EXECUTABLE` → `READY`.
6. ODQ effective `APPROVED` **projects** from an active OAR; it does not replace OAR.
7. Precedent Clause does not change ODQ status, Runner gates, NBA, or Dispatch.
8. Outcome Join does not set NBA, Dispatch, or Daily Operator.

---

## 7. Numbered runtime algorithm (future executor)

Input: wake trigger. Output: sleep record. No new stores.

```
1.  Discover
    1.1  Read git status, HEAD.
    1.2  Read HQ stopping-point section.
    1.3  If working tree is dirty with unrelated work: STOP → SLEEP (refuse mixed lane).

2.  Observe
    2.1  Run or load Command Center (`npm run buckparts:command-center`).
    2.2  Read Outcome Join, Decision-Capture, canonical decision, ODQ, FAQ, click visibility.
    2.3  If CC build fails: STOP → ESCALATE (UNKNOWN) → SLEEP.

3.  Construct world model
    3.1  Use the CC v2 object as-is. Do not write a parallel model.
    3.2  Copy canonical winner + competing candidates + ODQ pending + Outcome Join blockers.

4.  Detect bottleneck
    4.1  Apply §4.3 order (trust → founder gates → stop-the-line → pending ODR → sensory UNKNOWN → provenance).
    4.2  If bottleneck is founder-gated or ODQ-pending: GOTO 8.

5.  Generate candidates
    5.1  Take canonical exact_command + FAQ rows + HQ context.
    5.2  If a candidate implies new Executive permission or Outcome Join steering: Evolution Gate → GOTO 8.
    5.3  If drafting ODR/packet: attach Precedent Clause (closed OAR or NONE/UNKNOWN; weights NONE).

6.  Lawful select (exactly one or none)
    6.1  Constitution conflict → Constitution; GOTO 8 if founder must choose.
    6.2  HQ vs canonical conflict → GOTO 8.
    6.3  Founder-gated mutation without active OAR + session apply authorization → GOTO 8.
    6.4  Else if canonical dispatch_status=READY AND command_executable=true AND allowlisted AND mutation_allowed=false:
         select that exact_command.
    6.5  Else if AGENTS read-only/dry-run packet is the selected lane and in scope: select that packet command.
    6.6  Else: none selected → GOTO 8.

7.  Dispatch
    7.1  If selected command is dispatch-runner eligible: run existing dispatch runner; honor REFUSED/FAILED/ALREADY_EXECUTED.
    7.2  If selected command is dry-run/owner-review: run it with data_mutation=false.
    7.3  If Agent Contract external halt: write manifest; STOP → SLEEP (wait for result on next wake).
    7.4  Never execute --apply / --write-csv from this algorithm.
    7.5  GOTO 9.

8.  Escalate
    8.1  Keep/create ODR via existing ODQ (status PENDING_OWNER_DECISION).
    8.2  Emit HQ execution surface + exact copy/paste command, or state UNKNOWN (do not invent a command).
    8.3  GOTO 10.

9.  Learn (non-steering)
    9.1  Re-read Outcome Join if CC was rebuilt; preserve UNKNOWN.
    9.2  Run lane tests / build when AGENTS validate applies.
    9.3  Do not update NBA, scores, or HQ unless AGENTS step 8–9 (commit + asked handoff) already applied.

10. Sleep
    10.1 Record HEAD, Outcome Join status as emitted, selected command or escalation, Not claimed.
    10.2 Do not start another lane.
    10.3 End cycle. Next wake resumes at step 1.
```

---

## 8. Future implementation bound

A future executor may implement §7 as a script that **calls existing** `buckparts:command-center` / `buckparts:command-center:run-dispatch` / ODQ helpers. That script is a new **existence** claim with **permission = none** until Evolution Gate + founder decision assign otherwise.

This v1 contract does not authorize that script, a cron, or any mutation.

---

## 9. Validation (docs contract)

```bash
test -f docs/BuckParts-EXECUTIVE-RUNTIME-CONTRACT-V1.md
grep -n "When the Executive wakes up" docs/BuckParts-EXECUTIVE-RUNTIME-CONTRACT-V1.md
grep -n "Numbered runtime algorithm" docs/BuckParts-EXECUTIVE-RUNTIME-CONTRACT-V1.md
# Must remain zero-authority:
grep -n "nba_authority" docs/BuckParts-EXECUTIVE-RUNTIME-CONTRACT-V1.md
grep -n "Do not wire Outcome Join" docs/BuckParts-EXECUTIVE-RUNTIME-CONTRACT-V1.md
```

Do not add Product schema, buy CTAs, or Command Center fields from this document.
