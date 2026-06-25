# GE Refrigerator Rescue — Owner Approval Packet v1

Generated: 2026-06-25T23:48:59.614Z

**Decision needed:** Owner review guarded GE refrigerator rescue apply proposals for 9 search-placeholder slugs (0 PROPOSED_OWNER_REVIEW_READY).

## Cohort summary

- Search-placeholder slugs: 9
- In fridge rescue queue: 8
- Owner-review-ready lanes: 0
- Not ready (missing/fail evidence): 9

## Lanes

### gswf
- Plan status: **NOT_READY**
- Browser: NOT_CAPTURED
- Proposed URL: https://www.geapplianceparts.com/store/parts/spec/GSWF
- Blockers: owner_apply_approval_missing, csv_apply_not_authorized, supabase_mutation_not_authorized, browser_evidence_artifact_missing

### gswf2
- Plan status: **NOT_READY**
- Browser: NOT_CAPTURED
- Proposed URL: https://www.geapplianceparts.com/store/parts/spec/GSWF2
- Blockers: owner_apply_approval_missing, csv_apply_not_authorized, supabase_mutation_not_authorized, browser_evidence_artifact_missing

### mswf
- Plan status: **NOT_READY**
- Browser: NOT_CAPTURED
- Proposed URL: https://www.geapplianceparts.com/store/parts/spec/MSWF
- Blockers: owner_apply_approval_missing, csv_apply_not_authorized, supabase_mutation_not_authorized, browser_evidence_artifact_missing

### mwf
- Plan status: **NOT_READY**
- Browser: NOT_CAPTURED
- Proposed URL: https://www.geapplianceparts.com/store/parts/spec/MWF
- Blockers: owner_apply_approval_missing, csv_apply_not_authorized, supabase_mutation_not_authorized, browser_evidence_artifact_missing

### opfg3f
- Plan status: **NOT_READY**
- Browser: NOT_CAPTURED
- Proposed URL: https://www.geapplianceparts.com/store/parts/spec/OPFG3F
- Blockers: owner_apply_approval_missing, csv_apply_not_authorized, supabase_mutation_not_authorized, browser_evidence_artifact_missing

### pfmwf
- Plan status: **NOT_READY**
- Browser: NOT_CAPTURED
- Proposed URL: https://www.geapplianceparts.com/store/parts/spec/PFMWF
- Blockers: owner_apply_approval_missing, csv_apply_not_authorized, supabase_mutation_not_authorized, browser_evidence_artifact_missing

### smartwater-mwfp
- Plan status: **NOT_READY**
- Browser: NOT_CAPTURED
- Proposed URL: https://www.geapplianceparts.com/store/parts/spec/MWFP
- Blockers: owner_apply_approval_missing, csv_apply_not_authorized, supabase_mutation_not_authorized, browser_evidence_artifact_missing

### xwf
- Plan status: **NOT_READY**
- Browser: NOT_CAPTURED
- Proposed URL: https://www.geapplianceparts.com/store/parts/spec/XWF
- Blockers: owner_apply_approval_missing, csv_apply_not_authorized, supabase_mutation_not_authorized, browser_evidence_artifact_missing

### xwfe
- Plan status: **NOT_READY**
- Browser: NOT_CAPTURED
- Proposed URL: https://www.geapplianceparts.com/store/parts/spec/XWFE
- Blockers: owner_apply_approval_missing, csv_apply_not_authorized, supabase_mutation_not_authorized, browser_evidence_artifact_missing


## Prohibited actions

- Do not mutate retailer_links.csv from this approval packet alone.
- Do not mutate Supabase retailer_links or production database state.
- Do not mutate public fridge pages, sitemap, or robots.
- Do not authorize BuckParts Verified Links without separate apply executor.
- Do not deploy or call Netlify API from this packet.
- approve_apply_plan authorizes proceeding toward guarded per-slug apply — not automatic CSV apply.
- This approval packet is not automation_input for Runner Step, queues, or mutation gates.

PROVEN: Approving this owner approval packet records founder intent only. It does not apply data/retailer_links.csv changes, mutate Supabase, authorize BuckParts Verified Links, or deploy. A separate guarded apply executor with explicit owner_mutation_approved registry row and per-slug browser evidence PASS is still required before any CSV or Supabase mutation.
