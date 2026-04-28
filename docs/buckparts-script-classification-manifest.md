# BuckParts Script Classification Manifest

Source: approved Step 11 audit + current repo truth.  
Scope: read-only classification manifest (no runtime/code behavior changes).

## 1) ACTIVE CORE SYSTEMS TO KEEP

### Core runtime + trust/CTA/index stack
- Paths: `src/app/**`, `src/components/**`, `src/lib/trust/part-trust.ts`, `src/lib/retailers/launch-buy-links.ts`, `src/lib/retailers/go-redirect-gate.ts`, `src/lib/sitemap/wedge-indexable-urls.ts`
- Why keep: production request path for search, trust, CTA gating, redirect safety, and sitemap control.

### Search telemetry + search-gap workflow
- Paths: `src/lib/search/telemetry.ts`, `supabase/migrations/20260410170000_search_intelligence.sql`, `scripts/search-gaps-rank.ts`, `scripts/search-gaps-classify.ts`, `scripts/search-gap-candidates-generate.ts`, `scripts/search-gap-candidates-apply.ts`, `scripts/apply-search-gap-status-*.ts`
- Why keep: canonical demand capture + gap-to-action loop.

### Staged compatibility/part-resolution workflow (fridge)
- Paths: `supabase/migrations/20260410190000_candidate_application_staging.sql`, `scripts/review-staged-compat-refrigerator.ts`, `scripts/resolve-staged-compat-refrigerator.ts`, `scripts/reprocess-compat-after-models-refrigerator.ts`, `scripts/review-staged-part-resolution-refrigerator.ts`, `scripts/apply-staged-compat-part-choice-refrigerator.ts`, `scripts/promote-staged-refrigerator.ts`
- Why keep: controlled promotion flow for high-risk mapping decisions.

### Retailer offer candidate queue (new model)
- Paths: `supabase/migrations/20260424133000_retailer_offer_candidates_phase1_state.sql`, `scripts/ingest-hqii-retailer-links.ts`, `scripts/buckparts-schema-preflight.ts`
- Why keep: active candidate lifecycle and schema preflight guard.

### Operational reporting/runbooks
- Paths: `scripts/report-homekeep-*.ts`, `scripts/report-*-mapping-guardrails.ts`, `scripts/runbook-*.ts`, `scripts/audit-homekeep-traffic-monetization-readiness.ts`
- Why keep: decision-grade observability for coverage, trust, and monetization.

### Seed/import entrypoints (package-wired)
- Paths: `scripts/import-*.ts`, `scripts/import-seed.ts`, `scripts/lib/vertical-seed.ts`
- Why keep: primary ingestion path.

### Policy/state contracts in `src/lib`
- Paths: `src/lib/page-state/*`, `src/lib/provenance/*`, `src/lib/risk/*`, `src/lib/replacement/*`, `src/lib/no-buy/*`, `src/lib/retailers/retailer-link-state.ts`
- Why keep: normalized, test-covered policy layer for trust/safety/index reasoning.

## 2) FROZEN / TACTICAL SYSTEMS

- Legacy retailer candidate queue
  - Paths: `supabase/migrations/20260408200000_retailer_link_candidates.sql` (plus legacy references in `supabase/schema.sql`)
  - Why freeze: overlaps newer `retailer_offer_candidates`.

- Fridge non-Amazon tactical operator flow
  - Paths: `scripts/generate-fridge-non-amazon-review-packets.ts`, `scripts/collect-fridge-non-amazon-evidence.ts`, `scripts/run-fridge-non-amazon-operator.ts`, `data/operator-blocked-fridge-non-amazon.json`
  - Why freeze: tactical/manual rescue path, not canonical core pipeline.

- Transitional generation/emit utilities
  - Paths: `scripts/generate-fridge-homekeep-bulk-csv.ts`, `scripts/generate-ap-wh-retailer-links.ts`, `scripts/emit-vertical-search-retailer-links.ts`
  - Why freeze: batch scaffolding, non-core.

- Diagnostic/canary utilities
  - Paths: `scripts/diagnose-amazon-evidence-canaries.ts` (+ related tactical tests)
  - Why freeze: debug-focused utility.

- One-time cleanup utility
  - Path: `scripts/remove-demo-wedge-brands.ts`
  - Why freeze: one-off cleanup semantics.

## 3) CANDIDATES TO CUT LATER

- Repro-only tests
  - Paths: `scripts/import-seed.repro.test.ts`, `scripts/ingest-hqii-retailer-links.repro.test.ts`
  - Why candidate: debug/repro naming indicates non-core lifecycle.

- Unwired monetization planner
  - Path: `scripts/run-amazon-monetization-batch.ts`
  - Why candidate: not package-wired; usage unclear.

- Unwired standalone verifier (if superseded by canonical queue/browser-truth path)
  - Path: `scripts/verify-oem-retailer-links-playwright.ts`
  - Why candidate: operationally heavy; ownership/trigger path unclear.

- Tactical test harnesses tied to frozen flows
  - Paths: `scripts/*non-amazon*.test.ts`, `scripts/run-amazon-monetization-batch.test.ts`, `scripts/diagnose-amazon-evidence-canaries.test.ts`
  - Why candidate: attached to tactical/frozen systems.

## 4) DUPLICATE / OVERLAPPING SYSTEMS

### Dual retailer candidate queue models
- Overlap: `retailer_link_candidates` (older) vs `retailer_offer_candidates` (newer)
- Canonical: `retailer_offer_candidates` (`supabase/migrations/20260424133000_retailer_offer_candidates_phase1_state.sql`)
- Freeze: legacy `retailer_link_candidates` path.

### Retailer safety semantics split across runtime/scripts/operators
- Overlap: `src/lib/retailers/launch-buy-links.ts`, `scripts/verify-oem-retailer-links-playwright.ts`, `scripts/run-fridge-non-amazon-operator.ts`
- Canonical target: `src/lib/retailers/retailer-link-state.ts` for normalized state mapping.
- Freeze: tactical/operator-local reason vocab as adapter-only.

### Search-gap classification split across runtime and scripts
- Overlap: `src/lib/search/telemetry.ts` and `scripts/search-gaps-*.ts` + `scripts/lib/*-gap-classification.ts`
- Canonical target: one classifier contract feeding both runtime and script workflows.
- Freeze: duplicate heuristic branches after canonicalization.

### No-buy explanation overlap
- Overlap: hardcoded copy in `TrustAwareBuySection`/route files vs `src/lib/no-buy/no-buy-reason.ts`
- Canonical target: `src/lib/no-buy/no-buy-reason.ts`
- Freeze: route-local ad hoc reason branching once unified.

## 5) PACKAGE.JSON SCRIPT RISKS

### Mutating scripts (DB/data write risk)
- `seed:import*`
- `seed:ingest:hqii-retailer-links`
- `search:gaps:apply`
- `search:gaps:promote:fridge`
- `search:gaps:resolve-compat:fridge`
- `search:gaps:reprocess-compat:fridge`
- `buckparts:search-gap:status:*`
- `buckparts:staged-filter:apply-brand`
- `search:gaps:apply-part-choice:fridge`
- `buckparts:cleanup:demo-wedges`
- Risk note: write operations on catalog/queue/status data; require explicit operator safeguards.

### Diagnostics/read-only scripts
- `buckparts:guardrails:*`
- `buckparts:runbook:*`
- `buckparts:report:*`
- `buckparts:audit:traffic-monetization`
- `buckparts:ops:cross-wedge`
- `search:gaps:report-model-priority:fridge`
- `buckparts:staged-filter:review-brand`
- `search:gaps:review-part-resolution:fridge`
- `buckparts:preflight:schema`

### Unclear ownership/trigger scripts
- `scripts/hqii-candidate-queue-upsert.ts`
- `scripts/run-amazon-monetization-batch.ts`
- `scripts/verify-oem-retailer-links-playwright.ts`
- repro tests (`*.repro.test.ts`)

## 6) CLEANUP RULES

- Keep systems that are package-wired or clearly referenced by active runtime/queue workflows.
- Freeze overlaps first; do not delete until canonical replacement is stable through at least one release cycle.
- Preserve migration history; never delete applied migration files.
- Require explicit write flag / dry-run-first posture for mutating scripts retained as active.
- Treat `src/lib` normalized state/taxonomy modules as canonical; script-local reason vocabularies become adapters.
- Repro/debug scripts become cut-candidates only after no package/docs/runbook references remain.
- Keep historical blocked-ledger/audit artifacts until a documented replacement exists.

## 7) SMALLEST SAFE NEXT IMPLEMENTATION

- Add a read-only classification manifest pipeline (inventory + classification + write-risk flags) generated from repo truth.
- Add execution-policy guardrails for mutating scripts (policy first, enforcement second) without changing runtime behavior.
- Keep frozen systems in place; perform archive/deletion only after explicit proof of non-use and canonical replacement.
