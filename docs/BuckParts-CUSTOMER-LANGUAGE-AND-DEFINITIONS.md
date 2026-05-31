# BuckParts customer language and definitions

**Status:** Durable doctrine for all **public** BuckParts copy (pages, help, trust modules, buying-option labels).  
**Does not change:** buy-path gates, affiliate logic, or database state.  
**Related:** `docs/BuckParts-CUSTOMER-UX-DOCTRINE.md` (principles), `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` (page trust questions + banned phrases), `src/lib/copy/public-trust.ts` (runtime copy helpers).

Command Center exposes this path read-only via `command_center_v2.customer_language_and_waterdrop_research_lane_v1`.

---

## FULL truth or UNKNOWN (standing rule)

BuckParts does **not** ship “a lot of truth,” “mostly true,” “probably true,” “good enough,” or partial-confidence claims to homeowners.

**Standard:** **FULL truth or UNKNOWN.**

- **FULL truth:** Say only what BuckParts can support from committed evidence on that page — fit mapping, listing checks, source-backed manual callouts, etc.
- **UNKNOWN:** Say plainly when BuckParts does not know yet. Do not soften UNKNOWN into implied confidence.

**Banned on public pages:** “probably fits,” “likely compatible,” “good enough for most people,” “mostly verified,” “partial confidence,” “needs review” (as a customer-facing status label), “proven / not safe yet” tri-state pills aimed at homeowners.

Internal resolver/QA states (PROVEN, MAPPING_REVIEW_REQUIRED, etc.) stay **operator/backend only** — never homeowner copy.

---

## Homeowner language only (no backend leak)

Public pages are for **homeowners**, not operators. Do not expose backend QA, data pipeline, or gate vocabulary.

**Banned as homeowner-facing lines** (also listed in `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md`):

- “Wrong-family mappings removed”
- “Buy links are separate from fit proof”
- “No buy button until the evidence is clean”
- “Compatible filter confidence: proven / needs review / not safe yet”
- mapping, resolver, confidence state, mutation, CTA, CSV, proof packet, compat row, gates (when used as system jargon)

**Prefer instead:**

- What BuckParts checked (part number, model list, product page title)
- What is still uncertain
- What to compare before buying: **“Before buying, compare the filter code on your old filter or fridge label.”**

---

## Buying options behavior (public)

1. **If a safe buy path exists** (buy-path gates pass), **show the purchase option** — do not hide a vetted link behind operator anxiety.
2. **If a safe buy path does not exist**, explain in plain homeowner language that BuckParts is still working on it and **will not send someone to a questionable part**.
3. **Tone:** Honest and human is fine — e.g. “this turned into a treasure hunt,” “we’re still trying to find where X marks the spot” — but use sparingly; clarity first.
4. Do not imply BuckParts is the seller; checkout stays on the retailer.

---

## Standing rule: no “OEM” cold

Public BuckParts customer-facing copy **must not** use **“OEM”** unless it is **defined before or immediately when used**.

When “OEM” is used:

1. Define it on first use in that surface: **“OEM (original equipment manufacturer)”** — the company that made the appliance or its official parts.
2. Prefer simpler homeowner wording instead of “OEM” whenever accurate (see preferred terms below).

**Banned:** Dropping “OEM” alone in headlines, pills, or CTAs without definition. Using “OEM-style” on public pages (internal CSV notes may differ; sanitize before publish per `fridge-filter-notes-public.ts`).

---

## Preferred homeowner wording

| Situation | Prefer | Avoid |
|-----------|--------|--------|
| Samsung factory cartridge | **Samsung-made filter**, **official Samsung filter**, **original Samsung filter** | “OEM” without definition; “genuine OEM” hype |
| Third-party cartridge for a Samsung part number | **compatible replacement filter**, **non-Samsung replacement filter**, **replacement filter** | “same as Samsung”; “Samsung filter” for a non-Samsung product |
| Waterdrop WDP-F27 for DA29-00020B | **Waterdrop compatible replacement** for **DA29-00020B**; **not made or sold by Samsung** | Implying Samsung manufacture or endorsement |
| Fit | **matches part number**, **fits models listed on this page** | “guaranteed fit”; “100% compatible” unless seller claim is quoted and attributed |
| Purchase options / store links | **purchase options**, **buying options**, **reviewed product page** | **store shortcut** (prefer **purchase options**); “affiliate link”; “CTA”; “verified safe to buy” |

---

## Definitions (when technical terms are needed)

| Term | Customer-facing definition |
|------|---------------------------|
| **Part number** | The code printed on the filter you remove (e.g. DA29-00020B). |
| **Compatible replacement** | A filter made by a company other than the appliance brand, marketed to replace a specific part number. Not the brand’s own factory cartridge. |
| **Official / Samsung-made filter** | A filter sold as Samsung’s own replacement part (e.g. DA29-00020B / HAF-CIN family). |
| **NSF / ANSI standards** | Independent test protocols for **specific** claims (e.g. chlorine taste, certain contaminants). Certification is **claim-by-claim**, not a single “grade.” Do not imply all filters with NSF wording reduce the same contaminants. |
| **NSF/ANSI 372** | Low-lead **materials** requirement for components — **not** the same as “removes lead from water” (that is an NSF/ANSI **53** claim when listed for that product). |

---

## Purchase options wording (homepage and PDP)

- Prefer **purchase options** over **store shortcut** in public copy.
- Preferred explanation when a link is gated: **“Store links appear only after BuckParts checks the listing against the part number.”**
- Do not use defensive explanations like **“avoid sending you to a bad match”** when a calmer listing-check sentence works.

---

## Uncertainty and restraint

- State what BuckParts **checked** (listing title, part number on page, buy buttons visible) separately from what we **did not** test (water quality, long-term performance, warranty impact).
- Do not claim a compatible filter is **better than** the official filter without side-by-side proof BuckParts does not have.
- Affiliate program approval is **not** product-quality proof.
- No live buying option copy may imply a link is shown when gates suppress buy (`TrustAwareBuySection` suppress path).

---

## Waterdrop DA29-00020B (operator context, not public copy)

| Fact | Status |
|------|--------|
| Evidence file | `data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json` |
| Research / trust module draft (not published) | `docs/drafts/waterdrop-da29-00020b-oem-vs-compatible-trust-module-v1.md` |
| Live CTA on `/filter/da29-00020b` | **LIVE** — production row `d4cbad0c-4bab-4854-89bf-59e6d6492c6b`; evidence `data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json`; no broad Waterdrop rollout |
| Browser proof committed | **PROVEN** in evidence (owner-browser 2026-05-20); see HQ handoff commit **a343464** |

---

## Machine checks

- `src/lib/copy/customer-language-doctrine.ts` — version marker, banned-phrase list, live-smoke command paths for tests / Command Center.
- `src/lib/copy/customer-language-doctrine.test.ts` — doctrine doc + public copy guardrails.
- `src/app/filter/filter-pdp-homeowner.test.ts` — bans standalone **OEM** on rendered filter PDP components.
- `src/components/trust/trust-ui.test.ts` — public trust entrypoints avoid forbidden merchant-priority and backend jargon.
- `scripts/lib/waterdrop-da29-00020b-proof-slice-v1.test.ts` — Waterdrop evidence + draft presence.

### Live / deploy smoke (read-only HTTP probes)

There is **no** `npm run buckparts:live` alias in older docs — use:

| Command | Purpose |
|---------|---------|
| `npm run buckparts:live-site-smoke:check` | **Primary validation** — read-only GET probes + trust-page content contracts; prints `LiveSiteMonitorV1` JSON (`route_http_status`, `content_contract_status`, `deploy_sync_status`) |
| `npm run buckparts:live-site-smoke` | Writes `data/reports/buckparts-live-site-smoke.json` (+ optional Supabase durable row when configured) |
| `npm run buckparts:live` | Alias → `buckparts:live-site-smoke:check` — exits nonzero when `runtime_status` is not OK (stale trust HTML fails even if routes return 200) |
| `npm run buckparts:operator-proof` | Local operator stack including live-site check via `live-site-smoke-check.ts` |

Requires `NEXT_PUBLIC_SITE_URL` (production origin, no trailing slash) for live probes.
