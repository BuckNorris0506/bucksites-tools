# BuckParts Decision Priors Framework Contract v1

**Status:** **TEMPORARY ONLY** — read-only labels-only experiment for tagging candidate executive decisions. **Not** a permanent Executive organ. Permanence has **not** been earned.  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`, the Executive Operating System (`AGENTS.md` + HQ stopping point), and `docs/BuckParts-EXECUTIVE-EVOLUTION-GATE-V1.md`. Does **not** authorize mutation, NBA, Dispatch, Daily Operator, Command Center steering, scoring, weighting, or behavior change.  
**Reuse:** Existing Owner Approval Records (OAR = `founder_decision_registry_v1` / `data/owner-decisions/*-owner-approval*.json`) and Owner Decision Requests (ODR = `owner_decision_request_v1`).  
**Gate verdict (applied):** `PARK` for permanence under Executive Evolution Gate v1 — may ship only as **TEMPORARY ONLY**.

---

## 0. Executive Evolution Gate packet (honest — current)

```text
EXECUTIVE EVOLUTION GATE v1 — ORGAN PROPOSAL
proposer: PR #4 / Decision Priors Framework v1
proposed_organ_name: decision_priors_framework_v1
temporary_or_permanent_claim: TEMPORARY ONLY
gate_verdict_applied: PARK (permanence not earned)

1. Observation gained: PROVEN
   Optional decision_priors[] on ODR and executive_recommendation_decision_priors[]
   on OAR; readable via decision_priors_framework_v1 projection when tags exist.

2. External outcome expected: INFERRED
   Stated aim is founder/executive “later learning / review.” Customer/reality link
   (decision quality → harm reduction) is implied by catalog labels, not written
   as a direct external outcome.

3. Existing organ overlap: INFERRED
   Reuses OAR/ODR; no new durable store. Overlap with Precedent Clause
   (closed-OAR drafting on main): priors are labels on ODR/OAR; Precedent cites
   closed OARs — different jobs; no duplicate store. Why a peer framework vs
   field-only registry extension is not fully proven.

4. Constitutional necessity: UNKNOWN
   No Constitution § fails if this experiment does not exist. Catalog restates
   rules already binding via Constitution / AGENTS.md. Aids §5/§9 disagreement
   memory only if tags exist — does not invent necessity.

5. Measurable learning increase: UNKNOWN
   No before/after decision change named. No auto-injection into Runner-halt ODR
   builders. Real tagged history in repo is not yet required for this temporary
   claim. Validator proves framework honesty, not learning.

6. Failure mode: PROVEN
   Unknown labels fail closed; empty tags valid; scoring/weighting/behavior_change
   false; authority locks false; not attached to NBA/Dispatch/Daily/CC steering.

7. Removal test: UNKNOWN (for permanence)
   Removal is cheap (optional fields + framework files). Proven customer or
   decision-quality loss if deleted: none evidenced yet — therefore permanence
   is not earned. TEMPORARY ONLY accepts removable experiment cost.

8. Graduation criteria: UNKNOWN until met (see §0.1 below)
   Tests/validator alone do not graduate. Permanence requires real tagged history
   and founder permanence approval.

authority_locks_claimed:
  read_only: true
  data_mutation: false
  mutation_authorized: false
  steering_authority: false
  nba_authority: false
  dispatch_authority: false

verdict_requested: PARK / TEMPORARY ONLY (not GATE PASS for permanence)
```

### 0.1 Graduation (required before any permanence claim)

Decision Priors may be reconsidered for permanence **only** when **all** hold:

1. **Real tagged history** — at least one real ODR with non-empty `decision_priors` and/or one real OAR/disagreement row with non-empty `executive_recommendation_decision_priors` in repo (not fixtures alone).
2. **Non-steering posture held** — authority locks still false; no NBA / Dispatch / Daily / Command Center steering attach.
3. **Founder permanence approval** — explicit founder decision that permanence is granted after a fresh Executive Evolution Gate review.
4. **Re-submitted gate packet** — all eight fields re-answered; no field left UNKNOWN that the gate treats as fail-closed for permanence.

Until then: **TEMPORARY ONLY**. Do **not** describe this as a permanent Executive organ. Do **not** claim permanence has already been earned.

---

## 1. What Decision Priors are

`decision_priors` are **closed-catalog labels** that record which standing Executive priors influenced a candidate recommendation.

### Hard rules

1. **Labels only** in v1 — no scores, weights, ranks, or numeric influence.
2. **No behavior change** — tagging does not alter NBA, Dispatch, Daily Operator, Runner, or Command Center authority.
3. **Reuse stores** — ODR carries optional `decision_priors`; OAR / founder registry rows may retain `executive_recommendation_decision_priors`.
4. **Disagreement retention** — when founder status is `rejected` | `deferred` | `needs_more_evidence`, disagreement projections keep the priors that influenced the Executive recommendation.
5. **Fail closed** on unknown prior labels.
6. **No new durable store** unless later explicitly authorized.
7. **TEMPORARY ONLY** — not a permanent Executive organ until §0.1 graduation + founder permanence approval.

---

## 2. Catalog (`decision_priors` ids)

| Prior id | Intent (label only) |
|----------|---------------------|
| `harm_reduction_over_coverage` | Trust hierarchy: harm reduction beats coverage/speed/revenue |
| `fail_closed_on_unknown` | Prefer UNKNOWN over invented certainty |
| `no_autonomous_apply` | Dry-run / approval required; no autonomous `--apply` |
| `no_buy_cta_without_proof` | Live buy paths require proven eligibility |
| `read_only_packet_before_mutation` | Owner-review / dry-run before mutation |
| `single_lane_no_mixed_dirty_tree` | One lane per working tree / commit |
| `founder_authority_required` | Founder gate for CSV / buy / Supabase / routes |
| `no_invented_facts` | No fake fit, prices, reviews, offers, or proof |

---

## 3. Surfaces

| Surface | Field | Role |
|---------|-------|------|
| ODR `owner_decision_request_v1` | optional `decision_priors[]` | Tag candidate Executive recommendation |
| OAR `founder_decision_registry_v1` row | optional `executive_recommendation_decision_priors[]` | Retain priors on founder record / disagreement |
| Projection `decision_priors_framework_v1` | read-only | Index tagged candidates + disagreement records |

---

## 4. Deliverable

- Contract: `decision_priors_framework_v1` (**TEMPORARY ONLY**)
- Impl: `src/lib/owner-dashboard/decision-priors-framework-v1.ts`
- Disk projection: `scripts/lib/buckparts-decision-priors-framework-v1.ts`
- Posture: `read_only=true`, `data_mutation=false`, `mutation_authorized=false`, `steering_authority=false`, `nba_authority=false`, `dispatch_authority=false`, `daily_operator_authority=false`, `command_center_authority=false`
- Validator: `npm run buckparts:decision-priors-framework` (proves label/authority honesty — **not** permanence)
- **Not attached** to Command Center NBA / Dispatch / Daily Operator paths in v1

---

## 5. Authority boundary

- Does **not** change ODQ effective status resolution semantics beyond optional unused fields
- Does **not** set or compete for `next_best_action`
- Does **not** write new ops JSONL / Supabase tables
- Recommendations remain human-readable labels for later learning / review only
- Does **not** claim permanent Executive-organ status

---

## 6. Out of scope

- Scoring / weighting / ranking of priors
- Auto-injection of priors into Runner-halt ODR builders
- Command Center attachment as steering source
- CSV / Supabase / retailer_links / public CTA mutation
- HQ rewrite unless separately asked after commit
- Claiming permanence or Executive-organ graduation without §0.1

---

## 7. Validation

```bash
BUCKPARTS_TEST_FILES='src/lib/owner-dashboard/decision-priors-framework-v1.test.ts scripts/lib/buckparts-decision-priors-framework-v1.test.ts src/lib/owner-dashboard/founder-decision-registry-v1.test.ts' bash scripts/npm-test-v1.sh
npm run buckparts:decision-priors-framework
```
