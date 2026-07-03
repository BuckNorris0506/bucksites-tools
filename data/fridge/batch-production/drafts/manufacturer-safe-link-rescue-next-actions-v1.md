# Manufacturer safe-link rescue — next actions (read-only director)

Generated: 2026-07-03T21:55:52.146Z
Orchestrator: data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json @ 2026-07-03T21:55:52.145Z

## Best execution plan

Maximize safe buyer-path coverage by completing 5 owner review(s) first (frigidaire leads manufacturer priority), then 3 guarded apply candidate(s) via separate executor, while scheduling 8 browser capture(s) (~6h estimate) for remaining READY lanes.

## Estimates (planning only)

- Safe buyer paths unlockable (estimate): **3**
- Browser hours (estimate): **6**
- Owner reviews required: **5**
- Trust risk: **HIGH**
- Expected coverage gain (estimate): **12%**

Estimate only — assumes separate owner-approved apply executor succeeds for all guarded_apply candidates. Director does not authorize CSV apply.

## Why this order

- Stage 1 prioritizes owner-review-ready lanes — browser PASS already on disk for guarded apply candidates; founder review is the binding constraint before any CSV mutation.
- Manufacturers ranked by expected_coverage_unlock_score — top: frigidaire (3 owner-review-ready slug(s) — highest near-term coverage unlock potential after founder review.).
- Browser capture work ordered after owner-review/apply stages because PASS proof must exist before guarded apply; new captures feed future owner-review lanes only.
- Blocked/not-ready slugs parked last — no PDP inference, no weakening of wrong-family or supersession gates.
- All estimates are planning projections — coverage_unlocked remains false until separate authorized apply executor mutates repo CSV.

## Top manufacturer priority

1. **frigidaire** — score=1687.5 — 3 owner-review-ready slug(s) — highest near-term coverage unlock potential after founder review.
2. **ge_appliance_parts** — score=1097.5 — 8 browser-ready slug(s) need capture before apply planning.
3. **everydrop_whirlpool** — score=1067.5 — 2 owner-review-ready slug(s) — highest near-term coverage unlock potential after founder review.

## Immediate next actions

### 1. Owner reviews

- **edr4rxd1** (everydrop_whirlpool, trust=LOW) — Complete owner-browser checklist or rerun capture for edr4rxd1; do not draft apply plan until whirlpool_official_pdp_proof_result=PROVEN.
- **edr3rxd1** (everydrop_whirlpool, trust=LOW) — Complete owner-browser checklist or rerun capture for edr3rxd1; do not draft apply plan until whirlpool_official_pdp_proof_result=PROVEN.
- **eptwfu01** (frigidaire, trust=MEDIUM) — Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.
- **wf3cb** (frigidaire, trust=MEDIUM) — Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.
- **wfcb** (frigidaire, trust=MEDIUM) — Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required.

### 2. Guarded apply candidates (after owner approval)

- **eptwfu01** (frigidaire, score=1300)
- **wf3cb** (frigidaire, score=1227)
- **wfcb** (frigidaire, score=1117)

### 3. Browser capture work

- **gswf** (ge_appliance_parts) — Run read-only GE browser capture for gswf; owner approval before any CSV apply.
- **xwfe** (ge_appliance_parts) — Run read-only GE browser capture for xwfe; owner approval before any CSV apply.
- **xwf** (ge_appliance_parts) — Run read-only GE browser capture for xwf; owner approval before any CSV apply.
- **gswf2** (ge_appliance_parts) — Run read-only GE browser capture for gswf2; owner approval before any CSV apply.
- **opfg3f** (ge_appliance_parts) — Run read-only GE browser capture for opfg3f; owner approval before any CSV apply.

## Roadmap stages

### 1. Owner reviews (highest leverage)
- Slugs: 5
- Est. safe paths after stage: 0
- Becomes available: Guarded apply planning packets for browser-PASS search-placeholder primaries.; Founder decision on supersession/confusion lanes before any CSV mutation.

### 2. Guarded apply candidates (post-owner approval)
- Slugs: 3
- Est. safe paths after stage: 3
- Becomes available: Up to one safe buyer path per slug in repo CSV (separate apply executor).; Production /go validation still UNKNOWN until post-apply parity check.

### 3. Browser capture / owner checklist work
- Slugs: 8
- Est. safe paths after stage: 0
- Becomes available: New owner-review-ready lanes after PASS browser proof artifacts land on disk.; Additional guarded apply candidates only when gates pass — not inferred.

### 4. Blocked or not-ready park
- Slugs: 12
- Est. safe paths after stage: 0
- Becomes available: UNKNOWN until repo-proven official PDP exists or known_broken blockers clear.

## Blocked (actionable blockers only)

- **browser_evidence_artifact_missing** (9 slug(s)) — e.g. gswf, gswf2, mswf, mwf, opfg3f
- **confusion_family_review_required** (7 slug(s)) — e.g. eptwfu01, fppwfu01, frig-242086201, purepour, wf2cb
- **repo_proven_official_pdp_url_missing** (7 slug(s)) — e.g. fppwfu01, frig-242017801, frig-242086201, frig-242294502, purepour
- **exact_token_not_proven** (5 slug(s)) — e.g. 4396395, 4396508, 4396842, ukf8001, w10413645a
- **live_browser_capture_unavailable_or_failed** (5 slug(s)) — e.g. 4396395, 4396508, 4396842, ukf8001, w10413645a
- **repo_proven_official_target_url_missing** (5 slug(s)) — e.g. 4396395, 4396508, 4396842, ukf8001, w10413645a
- **supersession_review_required** (3 slug(s)) — e.g. w10413645a, xwf, xwfe
- **known_broken_destination** (1 slug(s)) — e.g. mwf

## Authorization

- mutation_authorized: **false**
- csv_apply_authorized: **false**
- browser_automation_authorized: **false**
