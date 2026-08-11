# BuckParts Precedent Clause Drafting Contract v1

**Status:** PROVEN as a **read-only drafting discipline** only.  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md` (Executive Constitution) and the Executive Operating System execution loop (`AGENTS.md`, current HQ stopping point in `docs/BuckParts-HQ-HANDOFF.md`). Does **not** authorize mutation, NBA, Dispatch, Daily Operator, Command Center steering, scoring, weighting, or behavior change.  
**Reuse:** Existing Owner Approval Records (OAR = `founder_decision_registry_v1` under `data/owner-decisions/*.json`).  
**Non-overlap:** Does **not** redefine, duplicate, or supersede Outcome Join / Phase 4 Outcome Capture (`docs/BuckParts-PHASE4-OUTCOME-CAPTURE-CONTRACT-V1.md`). Outcome Join is the First Sensory Path; this contract only drafts precedent text from closed OARs. This lane does **not** mutate HQ handoff narrative.

---

## 1. Purpose

Wherever an Executive recommendation or decision draft is generated, append a read-only **Precedent Clause** so founders see closed history of the same class — without inventing closures, weights, or causal narratives.

---

## 2. Exact drafting templates

### When closed precedents exist for the class

```
Closed precedents of this class:
- decision_id=… status=… decided_at=… packet=…
Weights changed since:
NONE
This differs because:
<proven open-vs-closed facts only>
```

### When substrate was loaded and zero class matches

```
Closed precedents: NONE (zero closures)
Weights changed: NONE
Difference: FIRST CLOSED DECISION OF THIS CLASS
```

### When closed OAR substrate was not supplied

```
Closed precedents of this class:
UNKNOWN (closed OAR substrate not supplied to draft)
Weights changed since:
NONE
This differs because:
UNKNOWN (closed OAR substrate not supplied to draft)
```

---

## 3. Hard rules

1. **No new stores / engines.**
2. **No invented history** — missing substrate ⇒ UNKNOWN, not zero.
3. **Weights changed = NONE** in v1 — no decision-weight/scoring system exists to cite.
4. **No authority / behavior change** — clause text only; does not alter ODQ effective status, Runner gates, NBA, Dispatch, Daily Operator, or Command Center.
5. **Class match** uses existing OAR fields only (`source_queue_row_id`, `source_decision_packet_id` / prefix).

---

## 4. Attach points (v1)

| Surface | Behavior |
|---------|----------|
| `buildFounderDecisionPacketsV1` | Appends clause to `recommended_next_prompt_or_command` |
| `buildOwnerDecisionRequestFromRunnerHaltV1` / upsert | Sets optional `precedent_clause` on ODR |
| Founder digest + owner dashboard | Load closed OARs via `loadClosedOarPrecedentSubstratesV1` and pass into packet builder |
| `appendPrecedentClauseToDraftV1` | Shared helper for other draft markdown generators |

---

## 5. Validation

```bash
BUCKPARTS_TEST_FILES='src/lib/owner-dashboard/precedent-clause-drafting-v1.test.ts src/lib/owner-dashboard/founder-decision-packet-v1.test.ts scripts/lib/owner-decision-queue-v1.test.ts' bash scripts/npm-test-v1.sh
```
