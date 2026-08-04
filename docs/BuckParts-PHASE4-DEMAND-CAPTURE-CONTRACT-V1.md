# BuckParts Phase 4 Demand-Capture Contract v1

**Status:** PROVEN as the durable read-only Demand-Capture sibling to Phase 4 Coverage and Decision-Capture.  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`. Does not authorize mutation, deploy, founder approval, dispatch, NBA steering, owner approval, prioritization, page recommendations, or HyperAgent eligibility.  
**Siblings (unchanged):**  
- `docs/BuckParts-PHASE4-COVERAGE-CONTRACT-V1.md` / `phase4_coverage_scoreboard_v1` (supply)  
- `docs/BuckParts-PHASE4-DECISION-CAPTURE-CONTRACT-V1.md` / `phase4_decision_capture_v1` (decision outcomes)

---

## 1. What Demand-Capture measures

Demand-Capture summarizes **customer demand visibility**, not supply coverage and not BUY/DO-NOT-BUY decision outcomes.

### Hard rules

- Missing or unusable telemetry → status / count **`UNKNOWN`**
- UNKNOWN must never become numeric zero
- No prioritization, ranking, or page recommendations
- No mutation, dispatch, owner-approval, NBA, or steering authority
- Fail closed when required evidence lanes are absent

### Dimensions (v1)

| Dimension | Meaning |
|-----------|---------|
| `demand_signal_status` | Demand next-lane overlay (`PROVEN` / `STALE` / `UNKNOWN`) |
| `gsc_status` | GSC artifact usability + freshness |
| `ga4_status` | GA4 artifact usability + freshness |
| `search_events_status` | Live `search_events` query posture |
| `click_events_status` | Live `click_events` query posture |
| `demand_questions_observed` | Count or `UNKNOWN` (no invented zero) |
| `demand_questions_resolved` | Count or `UNKNOWN` |
| `demand_questions_unknown` | Count or `UNKNOWN` |
| `demand_blocked_by_no_safe_path` | Count or `UNKNOWN` |
| `freshness_status` | Overall external measurement freshness |
| `evidence_timestamp` | Best available evidence timestamp or `UNKNOWN` |

When a dedicated demand-questions / blocked-by-no-safe-path evidence lane is not proven, those counts remain **`UNKNOWN`** (not `0`).

---

## 2. Deliverable

- Contract: `phase4_demand_capture_v1`
- CC path: `.command_center_v2.phase4_demand_capture_v1`
- Impl: `scripts/lib/buckparts-phase4-demand-capture-v1.ts`
- Posture: `read_only=true`, `data_mutation=false`, `mutation_authorized=false`, `steering_authority=false`, `dispatch_authority=false`, `owner_approval_authority=false`, `nba_authority=false`
- Validator: `npm run buckparts:phase4-demand-capture`

---

## 3. Authority boundary

- Does **not** change `phase4_coverage_scoreboard_v1` or `phase4_decision_capture_v1`
- Does **not** set NBA / dispatch / credit / owner-approval authority
- Recommendations remain evidence-oriented visibility notes only (no page picks)

---

## 4. Out of scope

- CSV / Supabase / retailer_links / evidence / approval / dispatch mutation
- Inventory or safe-buyer-path supply rollups
- Decision BUY / DO-NOT-BUY partition
- Claiming Phase 4 complete, revenue, SEO, or HyperAgent eligibility

---

## 5. Validation

```bash
BUCKPARTS_TEST_FILES='scripts/lib/buckparts-phase4-demand-capture-v1.test.ts' bash scripts/npm-test-v1.sh
npm run buckparts:phase4-demand-capture
npm run buckparts:phase4-decision-capture
npm run buckparts:phase4-p4-entry
```

Prove CC field:

```bash
node --import tsx scripts/report-buckparts-command-center.ts \
  | jq '.command_center_v2.phase4_demand_capture_v1 | {contract,read_only,mutation_authorized,steering_authority,demand_signal_status,gsc_status,ga4_status,search_events_status,click_events_status,demand_questions_observed,freshness_status,evidence_timestamp}'
```
