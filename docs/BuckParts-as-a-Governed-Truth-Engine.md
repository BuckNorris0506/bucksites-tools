# BuckParts as a Governed Truth Engine

**Status:** Strategic thesis — grounded in repo truth where available; owner briefing incorporated where repo does not prove a claim.  
**Governing:** `docs/BuckParts-CONSTITUTION.md` (Truth Contract, Trust Hierarchy, Automation Doctrine)  
**Sources:** `docs/BuckParts-HQ-HANDOFF.md` (§ Current stopping point — Security / RLS / service-role gating, `2122959`), `docs/ARCHITECTURE.md`, `docs/BuckParts-TO-AUTHORITY-BOUNDARY-THESIS.md`, `docs/README.md`  
**Does not authorize:** mutation, deploy, product expansion, or relaxation of trust gates.

---

BuckParts is a **decision-authority-under-uncertainty engine**. The output is not “what is true”; it is **“is there enough evidence to justify an action, and who is authorized to take it?”** Truth is the input. **Governed permission-to-act** is the product.

This is not a catalog, not a storefront, and not an affiliate blog. The Constitution frames the mission as helping people finish a replacement without buying the wrong part — and the engine’s job is to decide whether enough evidence exists to justify action, including when humans must still act under incomplete certainty.

---

## 1. Public expression

**“Trustworthy by construction, not by editorial review.”**

Current owner thesis/state: this is the public expression BuckParts should earn, not merely assert.

BuckParts must earn trust **structurally**, not by sounding confident. Homeowners should not have to trust an editor’s judgment, a model’s tone, or a merchant’s incentive structure. They should be able to see what was checked, what is uncertain, and what was withheld — because the system refused to publish what it could not verify.

The Constitution’s Truth Contract and Uncertainty Doctrine make this explicit: **FULL truth or UNKNOWN** — no partial-confidence theater on public surfaces. **No-buy is a trust feature.** Silence over speculation. Operator jargon stays internal; homeowner language stays on the page.

Editorial review can correct copy. It cannot substitute for provenance, confidence rating, auditability, and fail-closed gates. Trustworthy-by-construction means the architecture does the work: evidence precedes action authority, automation may discover but only validated gates may publish authority, and monetization never outranks physical fit truth or honest representation.

---

## 2. Honest guarantees and limits

### Guarantees (PROVEN in Constitution and architecture)

BuckParts guarantees **process integrity**, not omniscience:

| Guarantee | Meaning |
|-----------|---------|
| **Provenance** | Public claims trace to committed evidence and checkable sources (Constitution §5 Truth Contract, §7 Evidence Standards). |
| **Confidence-rating** | Fit strength and gaps are visible; UNKNOWN is a valid public state (Constitution §6 Uncertainty Doctrine). |
| **Auditability** | Decisions, halts, approvals, and mutation outcomes are recorded in repo artifacts — census, readiness gates, founder registry, truth-ledger, Command Center lanes. |
| **Fail-closed behavior** | When automation is uncertain, default is withhold or UNKNOWN on public buy guidance (Constitution §11 Automation Doctrine). |

### Limits (PROVEN — must be stated plainly)

BuckParts **does not** guarantee that every upstream source is correct. Manufacturer pages change. Listings drift. Third-party replacements are not official. Point-in-time checks are not permanent truth.

BuckParts **does** guarantee that every published answer is **sourced, confidence-rated, auditable**, and **refused when unverifiable**. The product is honest about what it knows, what it does not know, and what it will not imply.

---

## 3. Security / trust-integrity architecture

**Current owner thesis/state (June 30, 2026):** BuckParts moved from trust-by-convention to **enforceable production trust boundaries**. The repo HEAD at security stopping point `2122959` documents this slice as PROVEN in-repo; live Netlify deploy of `2122959` remains **UNKNOWN** until verified (HQ handoff).

### Buyer-path fail-closed (PROVEN)

- **`/go` buyer-path** fails closed on stale or missing browser truth and hard-deny signals (`d66ce8e` → `26d4b0a` chain; HQ handoff § Security hardening).
- **Decision precedence:** DENY and UNKNOWN outrank ALLOW.
- **`direct_buyable` alone is no longer sufficient for public trust** — current owner thesis/state; repo enforces freshness, trust-currency preflight, and gate precedence beyond classification labels alone.

### Supabase apply lanes gated (PROVEN)

Live mutation paths require **`BUCKPARTS_IO_CAPABILITY=MUTATION`**, hash-bound founder approval with **valid non-expired `expires_at`**, clean trust-currency preflight, and plan/path binding:

| Lane | Gate module |
|------|-------------|
| Air-purifier Supabase parity apply | `scripts/lib/air-purifier-supabase-apply-parity-mutation-gate-v1.ts` |
| RPWFE/GE Supabase parity apply | `scripts/lib/rpwfe-official-ge-supabase-parity-mutation-gate-v1.ts` |
| Live buyer-path flips | Same founder + trust + MUTATION pattern on guarded apply executors |

### Founder approval hardened (PROVEN — `e16b4a1`)

- Valid **`expires_at` required**; permanent or implicit approval eliminated.
- Missing, null, blank, unparseable, or past `expires_at` fails closed (`founder-decision-registry-v1.ts` → `isFounderRegistryRowActiveMutationApproval`).
- High-risk lanes require **active approval plus plan/path binding** (`founderRegistryRowPassesMutationApprovalGateV1`, `verifyFounderDecisionArtifactBindingsV1`).

### Truth-ledger (PROVEN — partial coverage)

- AP, RPWFE, and **promote-staged-refrigerator** mutation outcomes append to **`data/ops/truth-ledger-v1.jsonl`** on apply/write path (`26d4b0a` + promote run module).
- Records **`applied`** and **`blocked`** outcomes; append requires MUTATION capability on write-intent paths.
- **`source_snapshot_v1`** is backward compatible when absent; when present, requires `source_url`, `retrieved_at`, and `evidence_sha256` matching bound evidence hash.
- **Remaining gap:** CSV/manufacturer apply lanes and capability-only service-role guarded scripts (Slices 1–2).

### MCP / Supabase extraction controls (PROVEN)

- `npm run buckparts:deploy:preflight` chains **`buckparts:mcp-supabase-exposure:audit --enforce`** then **`buckparts:repo-runtime-convergence:check -- --enforce`**.
- Static FAIL on MCP supabase-admin imports, public MCP listen surfaces, and service-role writer inventory drift.
- Service-role writer inventory and drift detection: **`scripts/lib/buckparts-supabase-service-role-inventory-v1.ts`**.

### Live RLS emergency fix (PROVEN live — project `anmlqhrlmsnvxgneszbf`)

Migration: `supabase/migrations/20260610120000_security_advisor_rls_reconcile_v1.sql`

- **Security Advisor ERROR count = 0**
- RLS enabled on flagged public catalog/telemetry tables
- **`retailer_links`** public read limited to **`status = 'approved'`**
- **`click_events`** narrowed to **anon INSERT only**
- **`search_events`** narrowed to **anon/authenticated INSERT only** (no SELECT/UPDATE/DELETE/TRUNCATE)

**Known deferred warnings (not ERRORs):**

- `click_events` INSERT policy **`WITH CHECK (true)`** — telemetry shape not constrained in SQL yet
- **`upsert_search_gap`** `SECURITY DEFINER` callable by anon/authenticated — required by `src/lib/search/telemetry.ts` until service-role telemetry refactor

**Accepted INFO:** private tables (`search_gaps`, `staged_*`, `owner_report_artifacts`, `learning_outcomes`, etc.) — RLS on, no anon policies; ops/scripts use service role.

### Service-role writer gating (PROVEN)

| Class | Count | Pattern |
|-------|------:|---------|
| `write_guarded` | **15** | Runtime gate before writes; inventory drift audit in deploy preflight |
| `write_unguarded` | **5** | No runtime gate yet — see remaining work |

**Slice 3 — promote-staged (P0 live promotion):** `scripts/lib/promote-staged-refrigerator-run-v1.ts` (invoked by `scripts/promote-staged-refrigerator.ts`) requires **MUTATION capability + trust preflight + active founder approval + valid expiry + plan-path binding** (`scripts/lib/promote-staged-refrigerator-mutation-gate-v1.ts`).

**Remaining `write_unguarded` lanes (5):** `import-seed.ts`, `vertical-seed.ts`, `learning-outcomes-writer.ts`, `remove-demo-wedge-brands.ts`, `verify-oem-retailer-links-playwright.ts` (HQ handoff).

**Slice 4 resolved:** HQII retailer-link ingest pair — `ingest-hqii-retailer-links.ts` (default dry-run, `--write` gated) + `hqii-candidate-queue-upsert.ts` (`--write` gated); truth-ledger on write-intent.

### Strategic meaning

Public buyer paths fail closed. Live mutation paths are increasingly gated. RLS prevents broad public access. Deployment checks exposure drift. Remaining risks are inventoried, sequenced, and visible — not hidden behind confidence copy.

---

## 4. Business model fit

**Business model (PROVEN — HQ handoff strategic audit):** Ad-supported trusted answer engine. **Not affiliate-first.**

BuckParts is not an affiliate site. The primary near-term model is an **ad-supported trusted search-intent utility / answer engine**. Affiliate and referral links may exist, but only **behind trust gates** — Constitution Trust Hierarchy ranks monetization fifth, after physical fit truth, honest representation, homeowner comprehension, and reversibility.

The governed engine and the model reinforce each other:

- **Ads reward reach on trusted intent**, not conversion on weak evidence. A page that withholds a buy button when proof is missing protects the homeowner and protects the brand.
- **Affiliate revenue cannot outrank correctness** without violating the Constitution’s “what never changes” list. Commercial relationships are not product proof.
- **Pre-revenue is consistent with the model** — HQ handoff documents revenue/commission dollars as **UNKNOWN** in read-only reports; the first ad/revenue truth loop is **not PROVEN** end-to-end. Building enforceable trust boundaries before monetization is the correct sequence.

An affiliate-first site optimizes for clicks. A governed truth engine optimizes for **permission-to-act under evidence**. Those incentives diverge; BuckParts chooses the latter.

---

## 5. Coverage trade-off

**Lower coverage than sloppy competitors is the correct trade.**

BuckParts should win **trust per answer**, not breadth. A competitor that shows a buy button on every slug trains homeowners to treat uncertainty as solved. BuckParts trains them to compare part numbers, read what was verified, and recognize when guidance is withheld.

Constitution §4 Trust Hierarchy places **coverage breadth last** — publishing or indexing thin pages does not justify weak buy paths. Demand is not proof. Traffic does not substitute for fit or listing evidence.

**“No answer” is a product feature** when evidence is insufficient. UNKNOWN on a page is success, not embarrassment. Withholding buying guidance rather than implying a safe purchase without evidence is a customer promise, not a gap to hide.

---

## 6. Second-wedge discipline

Recall status and warranty-claim sufficiency are **coherent with the architecture** — they are literal instances of “do I have enough evidence to justify an action?” — but they are **not authorized yet**.

HQ handoff second-wedge doctrine (PROVEN policy):

- **No second wedge** until BuckParts has stronger first-wedge proof.
- **Do not build** recall, warranty-claim, medical, legal, or insurance runtime wedges yet.
- Second-wedge candidates are **INFERRED / NOT APPROVED FOR BUILD** — strategy only.

| Rank | Candidate | Framing | Status |
|------|-----------|---------|--------|
| 1 | Product recall status | Unit-in-scope: is *my specific unit* affected and am I authorized to keep using it? | NOT APPROVED FOR BUILD |
| 2 | Warranty-claim sufficiency | Do I have enough evidence to file? | NOT APPROVED FOR BUILD |

**Finish fridge and air-purifier wedge first.** Replacement-part fit lookup remains the first wedge and proving ground. Premature expansion into adjacent problem domains would violate Constitution §8 (“one proving ground at a time”) and dilute the evidence standard before it is proven at steady cadence.

---

## 7. Market validation and current state

### Architecture validation

**Current owner thesis/state:** Architecture validated by Festus Jejelowo (ex-Visa, eTranzact) on June 29, 2026 as **“standard discipline.”** This validation is **not proven in repo docs** — treat as founder-reported external signal, not as a committed artifact.

**Market validation remains open.** Repo documents business proof targets (catalog contamination buyer test, GSC/GA4 measurement loop, suppressed-slug rescue) with execution maturity largely **UNKNOWN**. VC readiness is explicitly **not claimed**.

### Current owner-stated state (June 30, 2026)

| Metric | Owner briefing | Repo truth |
|--------|----------------|------------|
| `SAFE_BUYER_PATH_PROVEN` filters | **52** | **DISCREPANCY** — HQ handoff historical census at `56b4167` records **50** site-wide; Foundation v2 production mission artifact records baseline **48 → 49** after one proven guarded apply. Re-run `node --import tsx scripts/report-all-product-safe-buyer-path-census-v1.ts` before citing live count. |
| Air purifier direct-buyable | **34** | **PROVEN** — `data/air-purifier/batch-production/audits/ap-supabase-vs-csv-diff-v1.json`, `data/command-center/evidence-freshness-recovery-v1.json`, and related convergence packets record `csv_safe_direct_buyable_count: 34`. |
| Revenue | **Pre-revenue** | **PROVEN consistent** — HQ handoff § monetization: revenue/commission dollars not computed in evidenced read-only reports. |
| Architecture | **Real architecture** | **PROVEN** — Truth → Command Center → Runner → External AI → Validation → Owner Decision Queue → Approved Mutation; six operating systems locked in `docs/BuckParts-OPERATING-SYSTEM-ARCHITECTURE-LOCK.md`; security hardening slice through `2122959`. |

**Note on the 52 figure:** HQ handoff § monetization records **`direct_buyable_links: 52`** and **`safe_cta_links: 52`** from command-surface CTA coverage metrics — a **different measure** than `SAFE_BUYER_PATH_PROVEN` census classification. Do not conflate retailer-link CTA counts with proven buyer-path page classification without a fresh census run.

---

## 8. Remaining work

Ordered from HQ handoff § Current stopping point and owner briefing:

1. **Verify/publish Slice 3 deploy** — `2122959` promote-staged gate is PROVEN in-repo; Netlify publish status is **UNKNOWN** until confirmed.
2. **Expand truth-ledger beyond AP/RPWFE/promote-staged** — CSV/manufacturer apply lanes and capability-only service-role guarded scripts (Slices 1–2).
3. **Make `source_snapshot_v1` mandatory for buyer-path evidence** — currently backward compatible when absent; broken chain fails closed when present; mandatory binding is not yet enforced.
4. **Gate seed/import lanes:**
   - `scripts/import-seed.ts`
   - `scripts/lib/vertical-seed.ts`
5. **Future:** move `upsert_search_gap` to service-role-only telemetry — clears deferred SECURITY DEFINER WARN.
6. **Future:** tighten `click_events` WITH CHECK — shape-constrain telemetry inserts; clears deferred WARN.

First-wedge execution continues in parallel: owner browser proof freshness → committed evidence → founder approval → guarded apply for refrigerator_water slugs (e.g. `edr3rxd1`, `ultrawf` per HQ handoff Session 1 priority). Directors and readiness gates remain read-only until explicit founder authorization.

---

## Closing

BuckParts is building something rarer than a fast catalog: a system that knows what it does not know, records what it changed and why, and refuses to let monetization or coverage pressure override homeowner safety.

The Constitution’s Truth Contract applies to humans and automated systems equally. The June 30 hardening sequence makes that contract enforceable at production boundaries — not merely documented.

Every answer we publish is sourced, confidence-rated, and auditable, and we refuse to publish what we can't verify.
