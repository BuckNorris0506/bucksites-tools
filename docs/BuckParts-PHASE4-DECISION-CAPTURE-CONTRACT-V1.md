# BuckParts Phase 4 Decision-Capture Contract v1

**Status:** PROVEN as the durable read-only Decision-Capture sibling to P4-ENTRY supply coverage.  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`. Does not authorize mutation, deploy, founder approval, NBA steering, or HyperAgent eligibility.  
**Sibling:** `docs/BuckParts-PHASE4-COVERAGE-CONTRACT-V1.md` / `phase4_coverage_scoreboard_v1` remains the supply-side scoreboard and must not be overwritten by this contract.

---

## 1. What Decision-Capture measures

Decision-Capture counts **customer decision opportunities**, not raw inventory and not product-page supply coverage.

### Denominator (evidence-based)

Decision opportunities that have entered the BuckParts decision system through evidence-backed evaluation (mapping, owner review, proven BUY, proven DO-NOT-BUY, or honest UNKNOWN). **Raw inventory does not enter the denominator until it becomes a customer decision opportunity.**

v1 fridge-first universe (PROVEN sources):

- Models in the artifact-backed CTA/go proof pack scope (`SAFE_BUYER_PATH_PASS` / `FAIL` rows)
- Models excluded from that pack after evaluation (quarantined / PARTIAL lists in the same artifact)

### Mutually exclusive outcomes

| Outcome | Meaning | v1 evidence |
|---------|---------|-------------|
| `confident_buy` | Customer-facing buy path proven for the model decision | CTA/go `SAFE_BUYER_PATH_PASS` |
| `confident_do_not_buy` | Evidence-backed do-not-buy / remain-no-buy | Spine remain-no-buy + CTA/go FAIL for that slug |
| `honest_unknown` | Entered evaluation; neither BUY nor DO-NOT-BUY proven | Quarantine / PARTIAL / other non-PASS non-DO-NOT-BUY |

Counts must sum to `decision_universe_count`. No double counting.

### Wrong-part prevention

Wrong-part prevention counts only **current evidence-backed** conclusions (e.g. remain-no-buy). Dated audits without a fresh re-run are not silently treated as live DO-NOT-BUY totals.

### Demand overlay

`demand_signal_status` ∈ `PROVEN | STALE | UNKNOWN`. Missing or unusable GSC/GA4/click demand **never** becomes numeric zero demand. Demand cannot override safety or invent BUY.

---

## 2. Deliverable

- Contract: `phase4_decision_capture_v1`
- CC path: `.command_center_v2.phase4_decision_capture_v1`
- Impl: `scripts/lib/buckparts-phase4-decision-capture-v1.ts`
- Posture: `read_only=true`, `data_mutation=false`, `mutation_authorized=false`, `steering_authority=false`
- Validator: `npm run buckparts:phase4-decision-capture`

---

## 3. Authority boundary

- Does **not** change `phase4_coverage_scoreboard_v1` supply dimensions
- Census remains canonical for supply `SAFE_BUYER_PATH_*` page counts
- Does **not** set NBA / dispatch / credit authority
- Recommendations remain evidence-oriented and read-only

---

## 4. Out of scope

- CSV / Supabase / retailer_links / evidence / approval / dispatch mutation
- WHW or sample-wedge public opening
- Page-count Goodhart / raw inventory denominator
- Claiming Phase 4 complete, revenue, SEO, or HyperAgent eligibility

---

## 5. Validation

```bash
BUCKPARTS_TEST_FILES='scripts/lib/buckparts-phase4-decision-capture-v1.test.ts' bash scripts/npm-test-v1.sh
npm run buckparts:phase4-decision-capture
npm run buckparts:phase4-p4-entry
```

Prove CC field:

```bash
node --import tsx scripts/report-buckparts-command-center.ts \
  | jq '.command_center_v2.phase4_decision_capture_v1 | {contract,read_only,mutation_authorized,steering_authority,decision_universe_count,confident_buy_count,confident_do_not_buy_count,honest_unknown_count,demand_signal_status}'
```
