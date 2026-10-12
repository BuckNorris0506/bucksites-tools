# BuckParts Site-Integrity Remediation Ledger

**Purpose:** Durable anti-drift closure record for roots **R01–R17** from the **October 10, 2026 BuckParts Production Site Integrity Baseline**.  
**This document is not the baseline.** Do not rewrite or replace the historical baseline artifact.

**Ledger contract:** `buckparts_site_integrity_remediation_ledger_v1`  
**Ledger created:** 2026-10-10  
**Repo worktree:** `/Users/jaredbuckman/bucksites-tools-r01`

---

## Immutable baseline reference

| Field | Value |
|--------|--------|
| Baseline name | October 10, 2026 BuckParts Production Site Integrity Baseline |
| Root ID namespace | `R01` … `R17` (17 roots) |
| Baseline artifact in repo | `data/ops/site-integrity/production-integrity-baseline-2026-10-10/READ_ME_AUDIT_REPORT.md` (SHA256 `45b8ad9587718d30fd3fb8e42b376b1f9d43ff1c5999245178675e1ceffbd188`; provenance `read-me-audit-report-provenance-v1.json`) |
| Rule | Copy titles, priorities, scopes, and audit wording from the immutable baseline when ingesting; **do not paraphrase the baseline into this ledger as if it were the source of truth** |

---

## Release gate policy

**BROAD_DISTRIBUTION_RELEASE = BLOCKED** while any audit-defined **required pre-distribution P0/P1** root remains in a state other than:

- **VERIFIED_CLOSED**, or  
- **DEFERRED_ALLOWED** only where the **original baseline explicitly permits deferral** (not convenience).

**Audit sequencing (unchanged):**

1. R01 — production / static assets  
2. Restore / verify **search** and **measurement** consequences  
3. P1 **truth / claim / data** corrections  
4. **Current commercial-link** reconciliation  
5. **Navigation / origin / indexability / provenance / social-image** fixes  
6. **Rerun** the production integrity baseline  
7. Only then reconsider **broad distribution**

---

## Closure standard

**VERIFIED_CLOSED** never means: worker says done, local code only, local tests only, commit exists, or deploy CLI success alone.

| Defect class | Closure requires |
|--------------|------------------|
| Production / runtime | Independent **production** verification (readback), not local-only proof |
| Truth / claims | Authoritative source or evidence validation + proof that **affected rendered outputs** changed correctly |
| Commercial / affiliate paths | Current destination, classification, and tag evidence **without** contaminating production click analytics |
| Measurement | **Natural** observed instrumentation behavior (no injected / manual fake events) |

If full closure cannot be established: **BLOCKED**, **AWAITING_PRODUCTION_VERIFICATION**, or another truthful state. **UNKNOWN** stays **UNKNOWN**.

---

## Anti-drift rules

1. Never remove an audit root from this ledger because priority changed.  
2. Close only with **durable evidence** recorded under **CLOSURE_EVIDENCE**.  
3. If a repair exposes a **different** root cause, add or split a root explicitly; do not silently expand scope of an existing root.  
4. Do not reopen **VERIFIED_CLOSED** without new **contradictory** evidence.  
5. Every active root must have **NEXT_LAWFUL_ACTION**, **BLOCKER**, **VERIFIED_CLOSED**, or justified **DEFERRED_ALLOWED**. No orphaned **IN_PROGRESS** without owner and next step.  
6. A new conversation, branch, model, or worker must determine state from **this ledger + immutable baseline**, not chat memory.  
7. The **historical audit baseline remains immutable.**

---

## Root records

### R01

| Field | Value |
|--------|--------|
| **ROOT_ID** | R01 |
| **TITLE** | Referenced production assets missing (CSS and Next.js static chunks) |
| **PRIORITY** | P0 |
| **RELEASE_BLOCKER** | YES |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **ROOT_CAUSE (corrected)** | **SUPERVISED_DEPLOYMENT_PATH** — not Netlify UI publish directory alone; plus Netlify ignore hook skipping production when merge commit tree matched deploy-preview cache (fixed PR #39) |
| **CURRENT_OWNER / EXECUTOR** | Release lane closed 2026-10-10 after Git-connected production recovery |
| **ACTIVE_BRANCH / WORKTREE** | `main` @ `f7c43787d615dd061ac6885f66cb53bb0e4e6e32` (merge PR #39 atop canonical PR #38 merge) |
| **EXACT_SCOPE** | Site-wide public HTML references `/_next/static/*` assets that return **404** with **`text/html`**; unstyled rendering and failed hydration; reproduces on custom domain and Netlify alias; **1,343** pages / **40** chunk URLs / **1** stylesheet cited in baseline audit |
| **SMALLEST_REQUIRED_FIX** | Replace broken **API / raw-`.next` directory** production publish with a **Git-connected Netlify build** using repo `netlify.toml` (`buckparts:deploy:preflight` + `npm run build` + `@netlify/plugin-nextjs` full packaging). Add **live-site static asset regression** (referenced `/_next/static/*` + key `public/` probes). **No** temporary `/_next/static` → `/static` rewrite unless post–correct-deploy proof requires it (none expected). |
| **CLOSURE_REQUIREMENTS** | **Source fix:** correct deploy mechanism + merged release candidate on `main`. **Tests:** scoped R01 smoke/static-asset tests pass. **Build:** production build passes on candidate. **Commit:** authorized commit(s) on `main`. **Deploy:** authorized **Git-triggered** Netlify production build (not API `--dir=.next` upload). **Production readback:** HTML 200; referenced JS/CSS **2xx** + correct MIME; `public/` assets **2xx** where probed; styled rendering; hydration; `static_asset_status=OK` on live smoke. |
| **CLOSURE_EVIDENCE** | **PROVEN (2026-10-10 post–PR #39):** Netlify production deploy `6aca7be17df72c00089c2748` — `context=production`, `branch=main`, `commit_ref=f7c43787d615dd061ac6885f66cb53bb0e4e6e32`, `manual_deploy=false`, `published_at=2026-10-10T18:00:54.545Z`; buckparts.com RUM + `meta buckparts-deploy-commit` match. Live smoke: `runtime_status=OK`, `static_asset_status=OK`, `route_http_status=OK`, `content_contract_status=OK`. Sampled `/_next/static/*.js` + `*.css` **2xx** with JS/CSS MIME; `/buckparts-logo-black-transparent.png` **200** `image/png`; `/fo-verify.html` **200**. Canonical homepage: `bp-home`, “Find the filter” / “that fits.”, Find my filter / Find my number, `RealLookupExample`; no “Wrong Buck. Right Parts.” `/filter/4396395`: successor copy, EDR4RXD1 treatment, compatible-model section, `Compare the` visual card band. **Historical defect:** deploy `6ac92ad95ab3e8477f6b92d8` raw `.next` API publish (superseded). |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed); monitor via `npm run buckparts:live-site-smoke:check` on future production deploys |
| **LAST_UPDATED** | 2026-10-10 (R01 VERIFIED_CLOSED — production recovery after PR #39) |

**R01 audit closure expectations (not passed until evidence exists):**

- Production HTML loads  
- Referenced JS/CSS assets return **2xx**  
- Correct MIME types (not HTML for JS/CSS)  
- Styled rendering  
- Hydration succeeds  
- Homepage search behavior restored **or** tracked under **R02**  
- No unrelated critical regression  
- Regression protection catches missing/bad asset responses  

---

### R02

| Field | Value |
|--------|--------|
| **ROOT_ID** | R02 |
| **TITLE** | R02 — P1 — Hydration-dependent GA and interactive search are not operational |
| **PRIORITY** | P1 |
| **RELEASE_BLOCKER** | YES (historical baseline; closed after R01 recovery) |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **ROOT_CAUSE (historical)** | R01 missing `/_next/static` assets broke hydration; SearchForm without hydration fell through to broken `/?q=` behavior; GA `afterInteractive` never initialized (`gtag` / `dataLayer` absent in baseline browser sample) |
| **CURRENT_OWNER / EXECUTOR** | Integrity campaign closure 2026-10-11 (verification-only; no product-code repair) |
| **ACTIVE_BRANCH / WORKTREE** | `docs/r02-verified-closure` |
| **EXACT_SCOPE** | Sitewide dependency on hydration for interactive homepage search and GA4 + fridge funnel events; baseline 1,343 paths / 23-route runtime sample; historical homepage submit to `/?q=` with UTM loss |
| **SMALLEST_REQUIRED_FIX** | Restore R01 (done); verify natural search nav to `/search?q=` (or intentional direct-model redirect); verify natural GA `page_view` and fridge funnel events — **no redesign** |
| **CLOSURE_REQUIREMENTS** | Production browser proof: chunks load, hydration, search cases, natural GA collect (no injected events), attribution contract documented |
| **CLOSURE_EVIDENCE** | Baseline: `r02-baseline-root-v1.json` + `READ_ME_AUDIT_REPORT.md` §R02. Closure: `r02-closure-verification-2026-10-11.json`. Production main `6f9dbac660f63056fb7cc2b08a88e475a73dad13`; deploy meta on buckparts.com matches. Hydration: `gtag` function, `dataLayer`, Next chunks 200. Search: WRX735SDHZ → `/fridge/whirlpool-wrx735sdhz`; EDR4RXD1 → `/search?q=EDR4RXD1`; HE15FKPET → `/search?q=HE15FKPET` disambiguation; no `/?q=` fallback. GA: natural `g/collect` `page_view` (UTMs in `dl` on landing), `fridge_model_view`; no duplicate `page_view` in sampled nav. GA search events **not** in source contract (Supabase search telemetry). **No product-code change.** |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed) |
| **LAST_UPDATED** | 2026-10-11 |

---

### R03

| Field | Value |
|--------|--------|
| **ROOT_ID** | R03 |
| **TITLE** | Catalog refrigerator entry links to absent /brand route |
| **PRIORITY** | P1 |
| **RELEASE_BLOCKER** | YES (historical baseline; closed after production readback) |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **ROOT_CAUSE** | Public catalog hub linked the refrigerator category to `/brand`, and that route was absent (baseline BROKEN_LINK, 1 path) |
| **CURRENT_OWNER / EXECUTOR** | Integrity campaign closure 2026-10-11 after PR #47 production readback |
| **ACTIVE_BRANCH / WORKTREE** | `main` @ `797418fd78674a2ffa12abb5684ccbe57896ebbe` |
| **EXACT_SCOPE** | `/catalog` refrigerator entry → `/brand` (baseline: 1 listed path; status OBSERVED) |
| **SMALLEST_REQUIRED_FIX** | Restore a `/brand` index the catalog refrigerator card can open, with brand browse links; regression on public category hub hrefs |
| **CLOSURE_REQUIREMENTS** | Preview and Git-connected production: GET `/brand` 200 with refrigerator brand browse links; GET `/catalog` 200; refrigerator entry resolves to `/brand` |
| **CLOSURE_EVIDENCE** | `r03-closure-verification-2026-10-11.json`. Preview deploy `6acb127b847b8c000936197f` commit `667689ae3b925a7c9dd7d83e56a232969cd6b88c`. Merge commit `797418fd78674a2ffa12abb5684ccbe57896ebbe` at 2026-10-11T04:51:49Z (merge commit). Production deploy `6acb15e7ad63800008313f8f`: context=production, branch=main, commit_ref=797418fd78674a2ffa12abb5684ccbe57896ebbe, manual_deploy=false, state=ready, published_at=2026-10-11T04:57:09.802Z. Production readback: `/brand` 200 h1 “Refrigerator filter brands” (31 brand links); `/catalog` 200 refrigerator card href `/brand`. |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed) |
| **LAST_UPDATED** | 2026-10-11 |

---

### R04

| Field | Value |
|--------|--------|
| **ROOT_ID** | R04 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R04** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: P1 truth / claim / data corrections |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + truth closure standard |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested; R01 release gate |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R04** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R05

| Field | Value |
|--------|--------|
| **ROOT_ID** | R05 |
| **TITLE** | Static allowlist emits checked-store proof without requiring current evidence |
| **PRIORITY** | P1 |
| **RELEASE_BLOCKER** | YES (historical baseline; closed after production readback) |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **ROOT_CAUSE** | Allowlist membership assigned the checked-store sentence. A date was appended only when a checked-at value already existed, so the page could claim a current store check without current per-part evidence. |
| **CURRENT_OWNER / EXECUTOR** | Integrity campaign R05 repair |
| **ACTIVE_BRANCH / WORKTREE** | `main` @ `e7c215b4725f884c3f86dae7f2ca4a9d89df6e30` |
| **EXACT_SCOPE** | `checkedStoreProofSentenceV1` in `src/lib/fridge/fridge-model-pdp-safe-buyer-path-visible-proof-v1.ts` |
| **SMALLEST_REQUIRED_FIX** | Keep the allowlist as scope. Emit the checked-store sentence only from links that pass the existing `isLiveBuyerPathCtaEligibleV1` freshness rule. |
| **CLOSURE_REQUIREMENTS** | Preview and Git-connected production no longer show the aggregate sentence unless every displayed part has qualifying current evidence. |
| **CLOSURE_EVIDENCE** | `r05-closure-verification-2026-10-11.json`. Preview deploy `6acb94b116099a00081ad63b` commit `7f35f9357f23b656aa0f3e9cb2110e79291641fa`. Merge commit `e7c215b4725f884c3f86dae7f2ca4a9d89df6e30` at 2026-10-11T13:58:27Z. Production deploy `6acb96059dcb9900083a5578`: context=production, branch=main, commit_ref=e7c215b4725f884c3f86dae7f2ca4a9d89df6e30, manual_deploy=false, state=ready. Live `/fridge/ge-gfe28gmkbb` returns 200 and does not show the checked-store sentence or a Last checked date. |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed) |
| **LAST_UPDATED** | 2026-10-11 |

---

### R06

| Field | Value |
|--------|--------|
| **ROOT_ID** | R06 |
| **TITLE** | Mapping counts and constants generate unsupported fit/OEM confidence |
| **PRIORITY** | P1 |
| **RELEASE_BLOCKER** | YES (historical baseline; closed after production readback) |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **ROOT_CAUSE** | `buildPartPageTrust` treated `modelsCount > 0` as `match_confidence: high` and defaulted gated links without browser-truth subtype to `oem` |
| **CURRENT_OWNER / EXECUTOR** | Integrity campaign closure 2026-10-11 after PR #56 production sample readback |
| **ACTIVE_BRANCH / WORKTREE** | `main` @ `561e35cb7517c091f2a891ac9c890cc728ec92f7` |
| **EXACT_SCOPE** | Trust builder (`part-trust.ts`) for part/model PDP trust summaries consumed by vertical + fridge trust panels (baseline: 712-path class; full rescan not claimed) |
| **SMALLEST_REQUIRED_FIX** | Gate fit confidence and original/compatible identity on source-backed gated buy-path subtypes; never promote mapping counts alone to high confidence or OEM |
| **CLOSURE_REQUIREMENTS** | Regression tests; ship guard SAFE; sampled production routes show no count-only high fit / false original labeling on representative AP PDPs |
| **CLOSURE_EVIDENCE** | `r06-closure-verification-2026-10-11.json`. PR #56 merge `561e35cb7517c091f2a891ac9c890cc728ec92f7`. Sample production: shark-hepa-he15fkp compatible + medium fit; alen-b75-mp no false original + medium fit. |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed) |
| **LAST_UPDATED** | 2026-10-11 |

---

### R07

| Field | Value |
|--------|--------|
| **ROOT_ID** | R07 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R07** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: P1 truth / claim / data corrections |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + truth closure standard |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R07** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R08

| Field | Value |
|--------|--------|
| **ROOT_ID** | R08 |
| **TITLE** | GE cartridge media/intervals and housing-size mappings conflated |
| **PRIORITY** | P1 |
| **RELEASE_BLOCKER** | Cleared (bounded tranche closure) |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **CURRENT_OWNER / EXECUTOR** | Integrity campaign |
| **ACTIVE_BRANCH / WORKTREE** | `main` |
| **EXACT_SCOPE** | FXWPC pleated sediment identity + 3 mo; FXHTC 3 mo; remove GXWH20S→FXHTC recommended mapping |
| **SMALLEST_REQUIRED_FIX** | Delivered via CSV + bounded Supabase parity (two tranches) |
| **CLOSURE_REQUIREMENTS** | Sampled production WHW routes match GE-bounded truth |
| **CLOSURE_EVIDENCE** | `data/ops/site-integrity/production-integrity-baseline-2026-10-10/r08-closure-verification-2026-10-12.json` |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — |
| **LAST_UPDATED** | 2026-10-12 |

---

### R09

| Field | Value |
|--------|--------|
| **ROOT_ID** | R09 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R09** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: current commercial-link reconciliation |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + commercial-path closure standard |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R09** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R10

| Field | Value |
|--------|--------|
| **ROOT_ID** | R10 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R10** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: navigation / origin / indexability / provenance / social-image |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + production readback |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R10** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R11

| Field | Value |
|--------|--------|
| **ROOT_ID** | R11 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R11** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: navigation / origin / indexability / provenance / social-image |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + production readback |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R11** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R12

| Field | Value |
|--------|--------|
| **ROOT_ID** | R12 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R12** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN — audit phase: navigation / origin / indexability / provenance / social-image |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline + production readback |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R12** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R13

| Field | Value |
|--------|--------|
| **ROOT_ID** | R13 |
| **TITLE** | Canonical-origin metadata disagrees and Netlify alias remains separately reachable |
| **PRIORITY** | P2 |
| **RELEASE_BLOCKER** | YES (historical baseline; closed after production readback) |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **ROOT_CAUSE** | Homepage lacked self-referencing canonical; default Netlify subdomain served duplicate 200 origin; robots/sitemap already pointed at `.com` |
| **CURRENT_OWNER / EXECUTOR** | Integrity campaign closure 2026-10-11 after PR #53 + PR #54 production readback |
| **ACTIVE_BRANCH / WORKTREE** | `main` @ `088d08fb410c9484cb43b559c3fef809260c2e33` |
| **EXACT_SCOPE** | `/`, `/catalog`, sitewide robots host + alias policy (baseline: 2 alias pages sampled + metadata policy) |
| **SMALLEST_REQUIRED_FIX** | Homepage canonical; 301 `buckparts.netlify.app` → `buckparts.com`; keep robots Host/Sitemap on `.com` |
| **CLOSURE_REQUIREMENTS** | Production: `/` and `/catalog` 200 with `.com` canonicals; alias URLs 301 to `.com`; robots Host/Sitemap `.com` |
| **CLOSURE_EVIDENCE** | `r13-closure-verification-2026-10-11.json`. PR #53 merge `24f7587…` (canonical). PR #54 merge `088d08f…` (alias 301). Production readback: home canonical `https://buckparts.com`; catalog canonical `https://buckparts.com/catalog`; `buckparts.netlify.app/` → 301 `https://buckparts.com/`; robots Host `https://buckparts.com`. |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed) |
| **LAST_UPDATED** | 2026-10-11 |

---

### R14

| Field | Value |
|--------|--------|
| **ROOT_ID** | R14 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R14** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R14** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R15

| Field | Value |
|--------|--------|
| **ROOT_ID** | R15 |
| **TITLE** | UNKNOWN — per immutable October 10, 2026 baseline root **R15** (not ingested to repo) |
| **PRIORITY** | UNKNOWN |
| **RELEASE_BLOCKER** | UNKNOWN |
| **CURRENT_STATE** | NOT_STARTED |
| **CURRENT_OWNER / EXECUTOR** | UNKNOWN |
| **ACTIVE_BRANCH / WORKTREE** | — |
| **EXACT_SCOPE** | UNKNOWN |
| **SMALLEST_REQUIRED_FIX** | UNKNOWN |
| **CLOSURE_REQUIREMENTS** | Per baseline |
| **CLOSURE_EVIDENCE** | — |
| **BLOCKER** | Baseline not ingested |
| **NEXT_LAWFUL_ACTION** | Ingest baseline root **R15** |
| **LAST_UPDATED** | 2026-10-10 |

---

### R16

| Field | Value |
|--------|--------|
| **ROOT_ID** | R16 |
| **TITLE** | R16 — P1 — Exposed buying paths lack auditable current UUID-to-destination proof |
| **PRIORITY** | P1 |
| **RELEASE_BLOCKER** | YES |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **CURRENT_OWNER / EXECUTOR** | R16 commercial-link reconciliation completed 2026-10-11 |
| **ACTIVE_BRANCH / WORKTREE** | docs/r16-verified-closure |
| **EXACT_SCOPE** | Historical baseline commercial root covering 81 CTA occurrences / 6 redirect IDs / 64 pages, reconciled against current production inventory and all currently exposed commercial UUIDs. |
| **SMALLEST_REQUIRED_FIX** | Reconcile current UUID-to-destination truth, inactive Amazon monetization behavior, customer-compatible labeling, and deterministic commercial regression coverage. |
| **CLOSURE_REQUIREMENTS** | Current exposed UUIDs auditable; destination identity known; official/compatible labeling truthful; Amazon monetization eligibility enforced; GE unaffected; unsafe/stale rows fail closed; production SHA and current CTA inventory verified. |
| **CLOSURE_EVIDENCE** | Historical baseline: `data/ops/site-integrity/production-integrity-baseline-2026-10-10/r16-baseline-root-v1.json` (81 CTA / 6 IDs / 64 pages). Current rescan: `r16-production-cta-inventory-2026-10-11.json` (92 CTA / 46 pages / 6 IDs). Closure rerun: `r16-closure-verification-2026-10-11.json`. Production SHA `c583fd19f297b5bb8a8066a50e24c09a5189d9f8`; deploy `6acb0a069dae3700085f8899`. Shark HE15/HE3 production compatible-label proof (PR #44). 4396508 / 4396710 / MWFP / XWFE destination evidence in closure artifact. Amazon Associates REJECTED / tagVerified=false (`data/affiliate/affiliate-application-tracker.json`). Phase A outbound tag stripping. launch-buy-links deterministic clock repair (PR #44). Tests: launch-buy-links, part-trust, go-first-hop smoke, go-redirect-gate, affiliate-application — PASS. `npm run buckparts:ship-guard -- --enforce` SAFE. `NEXT_PUBLIC_SITE_URL=https://buckparts.com npm run build` PASS. |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed; R17 baseline rerun remains separate) |
| **LAST_UPDATED** | 2026-10-11 |

---

### R17

| Field | Value |
|--------|--------|
| **ROOT_ID** | R17 |
| **TITLE** | Explicit social image URL points to nonexistent extensionless endpoint |
| **PRIORITY** | P2 |
| **RELEASE_BLOCKER** | YES (historical baseline; closed after production readback) |
| **CURRENT_STATE** | VERIFIED_CLOSED |
| **ROOT_CAUSE** | Sitewide social metadata published `/opengraph-image`, and that extensionless URL 404s. `/opengraph-image.png` already existed and returned 200. |
| **CURRENT_OWNER / EXECUTOR** | Integrity campaign R17 repair |
| **ACTIVE_BRANCH / WORKTREE** | `main` @ `a8bd239ac020ee5a2da3b48b48bf39bd767fda98` |
| **EXACT_SCOPE** | `SITE_SOCIAL_OG_IMAGE_PATH` in `src/lib/site-social-metadata.ts` |
| **SMALLEST_REQUIRED_FIX** | Point the existing helper at the existing `/opengraph-image.png`. No new image. |
| **CLOSURE_REQUIREMENTS** | Preview and Git-connected production metadata reference `/opengraph-image.png`; GET that URL returns 200. |
| **CLOSURE_EVIDENCE** | `r17-closure-verification-2026-10-11.json`. Preview deploy `6acb8e1ec1a92c000860dc60` commit `c5a0cee0edf58780b86a9ab00c3c2d65e132443d`. Merge commit `a8bd239ac020ee5a2da3b48b48bf39bd767fda98` at 2026-10-11T13:30:04Z. Production deploy `6acb8f5ccfef520008a8ae73`: context=production, branch=main, commit_ref=a8bd239ac020ee5a2da3b48b48bf39bd767fda98, manual_deploy=false, state=ready. Production GET `/opengraph-image.png` 200 and rendered metadata uses that URL. |
| **BLOCKER** | — |
| **NEXT_LAWFUL_ACTION** | — (closed) |
| **LAST_UPDATED** | 2026-10-11 |

## Ledger maintenance

- Update **CURRENT_STATE**, **CLOSURE_EVIDENCE**, **BLOCKER**, and **LAST_UPDATED** when work advances.  
- Recommended read-only baseline ingest path (when authorized): `data/ops/site-integrity/production-integrity-baseline-2026-10-10/` — **not created in this documentation-only change**.  
- Related but **separate** systems: `docs/BuckParts-FAILURE-PATTERN-REGISTRY.md`, `data/truth-integrity/truth-integrity-registry-v1.json` (different ID namespace).
