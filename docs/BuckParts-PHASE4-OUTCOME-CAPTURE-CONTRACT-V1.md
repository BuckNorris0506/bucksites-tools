# BuckParts Phase 4 Outcome-Capture Contract v1

**Status:** PROVEN as the durable read-only Outcome-Capture sibling — the **fourth and final** Phase 4 instrumentation lane.  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`. Does not authorize mutation, deploy, founder approval, dispatch, NBA steering, owner approval, prioritization, page recommendations, or HyperAgent eligibility.  
**Siblings (unchanged):**  
- `phase4_coverage_scoreboard_v1` (supply)  
- `phase4_decision_capture_v1` (decision outcomes)  
- `phase4_demand_capture_v1` (demand visibility)

---

## 1. What Outcome-Capture measures

Outcome-Capture measures a **handoff from a confident decision** (Decision-Capture BUY / DO-NOT-BUY), not raw inventory, not supply coverage, and not raw click volume.

### Hard rules

1. Outcome = handoff **from** a confident decision — never “clicks happened.”
2. **Never reward raw clicks** (Goodhart guard).
3. **Wrong-part clicks are never positive outcomes.**
4. Preserve **`UNKNOWN`** whenever post-handoff truth is unavailable.
5. **`UNKNOWN` must never become numeric zero.**
6. Count **`/go-unavailable`** as its own outcome class where evidence supports it (else UNKNOWN).
7. Revenue, retailer conversions, returns, LTV, SERP rank remain explicit **UNKNOWN** placeholders unless proven.
8. Fail closed. No mutation, steering, dispatch, NBA, or prioritization.

### Dimensions (v1)

| Dimension | Meaning |
|-----------|---------|
| `confident_decision_origin_status` | Whether Decision-Capture origin universe is available |
| `handoff_from_confident_buy_count` | Post-decision successful handoffs from BUY — or `UNKNOWN` |
| `handoff_from_confident_do_not_buy_count` | Post-decision handoffs from DO-NOT-BUY — or `UNKNOWN` |
| `go_unavailable_count` | `/go-unavailable` class volume — or `UNKNOWN` |
| `wrong_part_click_count` | Wrong-part click outcomes — or `UNKNOWN` (never positive) |
| `remain_no_buy_decision_preserved_count` | Decision-side remain-no-buy preservation (not a click reward) |
| `raw_click_events_visibility_status` | Click telemetry visibility only (not an outcome score) |
| `revenue_status` | Placeholder — UNKNOWN unless proven |
| `retailer_conversion_status` | Placeholder — UNKNOWN unless proven |
| `returns_status` | Placeholder — UNKNOWN unless proven |
| `ltv_status` | Placeholder — UNKNOWN unless proven |
| `serp_rank_status` | Placeholder — UNKNOWN unless proven |
| `goodhart_guard` | Explicit anti-Goodhart posture |

v1: without a proven join of Decision-Capture universe ↔ click_events / go-unavailable telemetry, handoff and go-unavailable counts remain **`UNKNOWN`**.

---

## 2. Deliverable

- Contract: `phase4_outcome_capture_v1`
- CC path: `.command_center_v2.phase4_outcome_capture_v1`
- Impl: `scripts/lib/buckparts-phase4-outcome-capture-v1.ts`
- Posture: `read_only=true`, `data_mutation=false`, `mutation_authorized=false`, `steering_authority=false`, `dispatch_authority=false`, `owner_approval_authority=false`, `nba_authority=false`
- Validator: `npm run buckparts:phase4-outcome-capture`

---

## 3. Authority boundary

- Does **not** change Coverage / Decision-Capture / Demand-Capture behavior
- Does **not** set NBA / dispatch / credit / owner-approval authority
- Recommendations remain evidence-oriented visibility notes only

---

## 4. Out of scope

- CSV / Supabase / retailer_links / evidence / approval / dispatch / public-page mutation
- HQ rewrite, commit, push, deploy
- Claiming Phase 4 complete, revenue, SEO, HyperAgent eligibility
- Using raw clicks or page counts as outcome denominators

---

## 5. Validation

```bash
BUCKPARTS_TEST_FILES='scripts/lib/buckparts-phase4-outcome-capture-v1.test.ts' bash scripts/npm-test-v1.sh
npm run buckparts:phase4-outcome-capture
npm run buckparts:phase4-demand-capture
npm run buckparts:phase4-decision-capture
npm run buckparts:phase4-p4-entry
```

Prove CC field:

```bash
node --import tsx scripts/report-buckparts-command-center.ts \
  | jq '.command_center_v2.phase4_outcome_capture_v1 | {contract,read_only,mutation_authorized,steering_authority,handoff_from_confident_buy_count,go_unavailable_count,wrong_part_click_count,revenue_status,goodhart_guard}'
```
