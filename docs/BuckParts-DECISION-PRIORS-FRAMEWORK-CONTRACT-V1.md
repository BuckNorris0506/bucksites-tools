# BuckParts Decision Priors Framework Contract v1

**Status:** PROVEN as a **read-only labels-only** framework for tagging candidate executive decisions.  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`. Does **not** authorize mutation, NBA, Dispatch, Daily Operator, Command Center steering, scoring, weighting, or behavior change.  
**Reuse:** Existing Owner Approval Records (OAR = `founder_decision_registry_v1` / `data/owner-decisions/*-owner-approval*.json`) and Owner Decision Requests (ODR = `owner_decision_request_v1`).

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

- Contract: `decision_priors_framework_v1`
- Impl: `src/lib/owner-dashboard/decision-priors-framework-v1.ts`
- Disk projection: `scripts/lib/buckparts-decision-priors-framework-v1.ts`
- Posture: `read_only=true`, `data_mutation=false`, `mutation_authorized=false`, `steering_authority=false`, `nba_authority=false`, `dispatch_authority=false`, `daily_operator_authority=false`, `command_center_authority=false`
- Validator: `npm run buckparts:decision-priors-framework`
- **Not attached** to Command Center NBA / Dispatch / Daily Operator paths in v1

---

## 5. Authority boundary

- Does **not** change ODQ effective status resolution semantics beyond optional unused fields
- Does **not** set or compete for `next_best_action`
- Does **not** write new ops JSONL / Supabase tables
- Recommendations remain human-readable labels for later learning / review only

---

## 6. Out of scope

- Scoring / weighting / ranking of priors
- Auto-injection of priors into Runner-halt ODR builders
- Command Center attachment as steering source
- CSV / Supabase / retailer_links / public CTA mutation
- HQ rewrite unless separately asked after commit

---

## 7. Validation

```bash
BUCKPARTS_TEST_FILES='src/lib/owner-dashboard/decision-priors-framework-v1.test.ts scripts/lib/buckparts-decision-priors-framework-v1.test.ts src/lib/owner-dashboard/founder-decision-registry-v1.test.ts' bash scripts/npm-test-v1.sh
npm run buckparts:decision-priors-framework
```
