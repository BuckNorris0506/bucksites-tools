# BuckParts customer language and definitions

**Status:** Durable doctrine for all **public** BuckParts copy (pages, help, trust modules, buying-option labels).  
**Does not change:** buy-path gates, affiliate logic, or database state.  
**Related:** `docs/BuckParts-CUSTOMER-UX-DOCTRINE.md` (principles), `src/lib/copy/public-trust.ts` (runtime copy helpers).

Command Center exposes this path read-only via `command_center_v2.customer_language_and_waterdrop_research_lane_v1`.

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
| Live CTA on `/filter/da29-00020b` | **NOT_LIVE** — no `retailer_links` waterdrop row; insert plan blocked |
| Browser proof committed | **PROVEN** in evidence (owner-browser 2026-05-20); see HQ handoff commit **a343464** |

---

## Machine checks

- `src/lib/copy/customer-language-doctrine.ts` — version marker and paths for tests / Command Center.
- `src/app/filter/filter-pdp-homeowner.test.ts` — bans standalone **OEM** on rendered filter PDP components.
- `scripts/lib/waterdrop-da29-00020b-proof-slice-v1.test.ts` — Waterdrop evidence + draft presence.
