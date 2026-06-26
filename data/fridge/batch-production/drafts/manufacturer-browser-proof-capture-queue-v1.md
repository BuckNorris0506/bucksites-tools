# Manufacturer browser proof capture queue v1

- generated_at: **2026-06-26T18:56:29.399Z**
- orchestrator_generated_at: **2026-06-26T17:49:52.361Z**
- capture_work_required_count: **25**
- browser_proof_max_age_days: **14**

## Batched capture batches

### capture_batch_frigidaire_owner_browser_proof_session_assist
- manufacturer: **frigidaire**
- strategy: **owner_browser_proof_session_assist**
- slug_count: **10**
- command: `npm run buckparts:fridge-safe-link-owner-browser-proof-session (owner visual inspection required)`
- slugs: eptwfu01, fppwfu01, frig-242017801, frig-242086201, frig-242294502, purepour, ultrawf, wf2cb, wf3cb, wfcb

### capture_batch_ge_appliance_parts_ge_automated_playwright_spec_capture
- manufacturer: **ge_appliance_parts**
- strategy: **ge_automated_playwright_spec_capture**
- slug_count: **8**
- command: `npm run buckparts:ge-refrigerator-rescue-capture -- --all`
- slugs: gswf, gswf2, mswf, opfg3f, pfmwf, smartwater-mwfp, xwf, xwfe

### capture_batch_everydrop_whirlpool_owner_browser_proof_session_assist
- manufacturer: **everydrop_whirlpool**
- strategy: **owner_browser_proof_session_assist**
- slug_count: **7**
- command: `npm run buckparts:fridge-safe-link-owner-browser-proof-session (owner visual inspection required)`
- slugs: 4396395, 4396508, 4396842, edr3rxd1, edr4rxd1, ukf8001, w10413645a

## Per-slug assessments

- **edr4rxd1** (everydrop_whirlpool) — STALE: proof stale checked_at=2026-06-05T22:00:00.000Z
- **edr3rxd1** (everydrop_whirlpool) — STALE: proof stale checked_at=2026-06-06T03:00:00.000Z
- **ultrawf** (frigidaire) — STALE: proof stale checked_at=2026-06-06T02:00:00.000Z
- **eptwfu01** (frigidaire) — STALE: proof stale checked_at=2026-06-05T20:00:00.000Z
- **wf3cb** (frigidaire) — STALE: proof stale checked_at=2026-06-05T12:00:00.000Z
- **wfcb** (frigidaire) — STALE: proof stale checked_at=2026-06-06T00:00:00.000Z
- **gswf** (ge_appliance_parts) — MISSING: owner_browser_proof_artifact_missing
- **xwfe** (ge_appliance_parts) — MISSING: owner_browser_proof_artifact_missing
- **4396508** (everydrop_whirlpool) — MISSING: owner_browser_proof_artifact_missing
- **frig-242086201** (frigidaire) — MISSING: owner_browser_proof_artifact_missing
- **xwf** (ge_appliance_parts) — MISSING: owner_browser_proof_artifact_missing
- **fppwfu01** (frigidaire) — MISSING: owner_browser_proof_artifact_missing
- **gswf2** (ge_appliance_parts) — MISSING: owner_browser_proof_artifact_missing
- **wf2cb** (frigidaire) — MISSING: owner_browser_proof_artifact_missing
- **frig-242017801** (frigidaire) — MISSING: owner_browser_proof_artifact_missing
- **opfg3f** (ge_appliance_parts) — MISSING: owner_browser_proof_artifact_missing
- **frig-242294502** (frigidaire) — MISSING: owner_browser_proof_artifact_missing
- **smartwater-mwfp** (ge_appliance_parts) — MISSING: owner_browser_proof_artifact_missing
- **purepour** (frigidaire) — MISSING: owner_browser_proof_artifact_missing
- **w10413645a** (everydrop_whirlpool) — MISSING: owner_browser_proof_artifact_missing
- **mswf** (ge_appliance_parts) — MISSING: owner_browser_proof_artifact_missing
- **pfmwf** (ge_appliance_parts) — MISSING: owner_browser_proof_artifact_missing
- **4396842** (everydrop_whirlpool) — MISSING: owner_browser_proof_artifact_missing
- **ukf8001** (everydrop_whirlpool) — MISSING: owner_browser_proof_artifact_missing
- **4396395** (everydrop_whirlpool) — MISSING: owner_browser_proof_artifact_missing

## Recommended next action

Execute 3 batched capture batch(es) (25 slug(s)); owner review required before PASS owner-browser-proof artifacts. Then re-run readiness gate and apply-plan factory.

