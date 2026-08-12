# BuckParts Decision Priors Framework Contract v1

**Status:** **INSTANTIATED_ZERO_AUTHORITY** — capability may exist and be tested in-repo as read-only labels-only tagging. **Permission claimed: none** (advisory labels only; all Executive authority locks false). Existence is **not** an authority grant.  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`, the Executive Operating System (`AGENTS.md` + HQ stopping point), and `docs/BuckParts-EXECUTIVE-EVOLUTION-GATE-V1.md`. Does **not** authorize mutation, NBA, Dispatch, Daily Operator, Command Center steering, scoring, weighting, or behavior change.  
**Reuse:** Existing Owner Approval Records (OAR = `founder_decision_registry_v1` / `data/owner-decisions/*-owner-approval*.json`) and Owner Decision Requests (ODR = `owner_decision_request_v1`).  
**Gate verdict (applied):** `INSTANTIATED_ZERO_AUTHORITY` for existence; `PARK` for any non-zero Executive permission / scope expansion. Capability existence, evidence, permission, scope, availability, and authority claims are distinct and must not be collapsed into one status.

---

## 0. Executive Evolution Gate packet (honest — current)

```text
EXECUTIVE EVOLUTION GATE v1 — AUTHORITY CLAIM PACKET
proposer: PR #4 / Decision Priors Framework v1
capability_name: decision_priors_framework_v1
existence_claim: instantiated
evidence_summary: UNKNOWN for learning/authority; PROVEN for label/lock honesty when tagged
permission_claimed: none | advisory_labels_only
scope_claimed: ODR optional decision_priors[]; OAR optional executive_recommendation_decision_priors[]; read-only projection
availability_claim: available when owner-decisions artifacts load (else empty projection)
dependencies: founder_decision_registry_v1 scan; owner_decision_request_v1 artifacts
deletion_protection_claimed: none
gate_verdict_applied: INSTANTIATED_ZERO_AUTHORITY (existence); PARK (any non-zero permission)

1. Observation gained: PROVEN
   Optional decision_priors[] on ODR and executive_recommendation_decision_priors[]
   on OAR; readable via decision_priors_framework_v1 projection when tags exist.

2. External outcome expected: INFERRED
   Stated aim is founder/executive “later learning / review.” Customer/reality link
   (decision quality → harm reduction) is implied by catalog labels, not written
   as a direct external outcome.

3. Existing capability overlap: INFERRED
   Reuses OAR/ODR; no new durable store. Overlap with Precedent Clause
   (closed-OAR drafting): priors are labels on ODR/OAR; Precedent cites closed
   OARs — different jobs; no duplicate store. Why a peer framework vs field-only
   registry extension is not fully proven.

4. Constitutional necessity: UNKNOWN
   No Constitution § fails if zero-authority instantiation is withheld.
   Catalog restates rules already binding via Constitution / AGENTS.md.
   Does not invent necessity for a permission grant.

5. Measurable learning increase: UNKNOWN
   No before/after decision change named. No auto-injection into Runner-halt ODR
   builders. Validator proves framework honesty, not learning. Real tagged history
   is evidence for a future authority claim — not an authority assignment.

6. Failure mode: PROVEN
   Unknown labels fail closed; empty tags valid; scoring/weighting/behavior_change
   false; authority locks false; not attached to NBA/Dispatch/Daily/CC steering.

7. Removal / retention test: UNKNOWN (no proven harm if deleted)
   Removal is cheap (optional fields + framework files). Proven customer or
   decision-quality loss if deleted: none evidenced. Deletion protection: none.
   Historical retention of any future tagged rows would be ordinary OAR/ODR data,
   not an authority assignment.

8. Authority-assignment criteria: PARK until a new packet clears them
   Any future non-zero permission (steering, mutation, NBA/Dispatch/Daily attach,
   or “must retain / protected”) requires a fresh gate packet with PROVEN learning
   evidence (including real tagged history where relevant), named scope, and
   founder acknowledgment. Tests/merge alone do not assign permission.

authority_locks_claimed:
  read_only: true
  data_mutation: false
  mutation_authorized: false
  steering_authority: false
  nba_authority: false
  dispatch_authority: false

verdict_requested: INSTANTIATED_ZERO_AUTHORITY
```

### 0.1 Future authority claims (not automatic)

Decision Priors may later request a **named permission in a named scope** only via a new Evolution Gate packet. Until then:

- **Existence:** allowed (instantiated, tested)
- **Permission:** none / advisory labels only
- Documents must describe explicit authority claims, named permissions, and named scopes rather than lifecycle labels

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
7. **INSTANTIATED_ZERO_AUTHORITY** — existence ≠ permission; no Executive authority assignment in v1.

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

- Contract: `decision_priors_framework_v1` (**INSTANTIATED_ZERO_AUTHORITY**)
- Impl: `src/lib/owner-dashboard/decision-priors-framework-v1.ts`
- Disk projection: `scripts/lib/buckparts-decision-priors-framework-v1.ts`
- Posture: `read_only=true`, `data_mutation=false`, `mutation_authorized=false`, `steering_authority=false`, `nba_authority=false`, `dispatch_authority=false`, `daily_operator_authority=false`, `command_center_authority=false`
- Validator: `npm run buckparts:decision-priors-framework` (proves label/lock honesty — **not** an authority grant)
- **Not attached** to Command Center NBA / Dispatch / Daily Operator paths in v1

---

## 5. Authority boundary

- Does **not** change ODQ effective status resolution semantics beyond optional unused fields
- Does **not** set or compete for `next_best_action`
- Does **not** write new ops JSONL / Supabase tables
- Recommendations remain human-readable labels for later learning / review only
- Does **not** claim Executive permission from instantiation, tests, or merge

---

## 6. Out of scope

- Scoring / weighting / ranking of priors
- Auto-injection of priors into Runner-halt ODR builders
- Command Center attachment as steering source
- CSV / Supabase / retailer_links / public CTA mutation
- HQ rewrite unless separately asked after commit
- Any non-zero permission claim without a fresh Evolution Gate packet

---

## 7. Validation

```bash
BUCKPARTS_TEST_FILES='src/lib/owner-dashboard/decision-priors-framework-v1.test.ts scripts/lib/buckparts-decision-priors-framework-v1.test.ts src/lib/owner-dashboard/founder-decision-registry-v1.test.ts' bash scripts/npm-test-v1.sh
npm run buckparts:decision-priors-framework
```
