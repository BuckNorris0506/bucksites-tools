# BuckParts B2B Client Value Audit v1

**Status:** Planning artifact only — not an agent, not a product surface, not a sales playbook that authorizes delivery.  
**Scope:** Repeatable process for evaluating whether BuckParts can help a potential B2B partner reduce wrong-part purchases, improve homeowner outcomes, and structure a fair deal.  
**Authority:** Subordinate to `docs/BuckParts-CONSTITUTION.md`. Does not authorize API builds, coverage claims, or proof-standard changes.

---

## 1. Core principle

BuckParts does **not** sell software first.

BuckParts audits **where wrong-part uncertainty hurts homeowners and the partner**. Deal structure comes **after** proving mutual value.

If the audit cannot show a concrete wrong-part or uncertainty problem the partner owns, stop. Do not invent a package.

---

## 2. BuckParts truth-layer framing

Use these questions as the shared language with any partner. They are the product, not a feature list.

| Question | Partner translation |
|----------|---------------------|
| **What part fits?** | Compatibility claim, if any |
| **What proves it fits?** | Evidence class and freshness |
| **What source said so?** | Manufacturer, authorized distributor, owner proof, or other |
| **What is unknown?** | Explicit gaps — never papered over |
| **Where can the homeowner safely buy it?** | Verified buy path only when proven |
| **If BuckParts cannot prove it, BuckParts does not claim it.** | No invented fit for revenue or conversion |

Any B2B offer must preserve this framing. Revenue that requires claiming unproven fit is out of scope.

---

## 3. Client audit questions

Run these with the partner (or from public evidence when a live conversation is not yet available). Capture answers as PROVEN / INFERRED / UNKNOWN.

1. **Where do wrong product matches happen?** (search, PDP, marketplace listing, support script, installer catalog, etc.)
2. **What does a wrong match cost?** (returns, chargebacks, support minutes, brand trust, installer callbacks)
3. **How often does it happen?** (rate, volume, seasonality — even order-of-magnitude is useful)
4. **What support / return / conversion problems come from uncertainty?** (abandoned carts, “will this fit?” tickets, refunds after install)
5. **What data sources do they trust today?** (OEM catalogs, distributor feeds, internal SKU maps, third-party data vendors)
6. **Where do seller listings conflict with manufacturer truth?** (marketplace titles, interchange claims, “fits model X” tables)
7. **What would a verified answer be worth?** (per lookup, per prevented return, per closed support ticket)

**Exit criteria for “mutual value proven”:** at least one concrete wrong-match surface, a cost or frequency signal, and a partner-trusted source BuckParts can bind to without inventing fit.

---

## 4. Homeowner outcome audit

Before any deal shape, answer for the proposed integration:

| Outcome | Pass condition |
|---------|----------------|
| **Reduce wrong purchases** | Homeowner sees only proven fit (or explicit unknown) |
| **Reduce returns** | Fewer “bought wrong filter / part” outcomes attributable to the partner surface |
| **Improve confidence** | Clear evidence language; no fake certainty |
| **Avoid misleading recommendations** | No claim when proof is missing; no affiliate pressure that overrides truth gates |

If the partner’s desired UX requires overstating confidence, the audit fails — do not structure a deal around that UX.

---

## 5. Possible deal structures

Choose **after** mutual value is proven. Prefer the narrowest structure that delivers the outcome.

| Structure | When it fits |
|-----------|--------------|
| **Paid pilot** | Bounded surface, time-boxed, success metrics agreed |
| **Narrow data license** | Partner needs governed compatibility answers for a defined SKU/model set |
| **API access** | Partner has a real integration path and accepts proof/unknown semantics |
| **Embedded verification widget** | Partner owns a homeowner-facing surface and wants BuckParts truth in-place |
| **Co-branded safe-buy path** | Shared Verified Link / buy path without BuckParts becoming the seller |
| **Usage-based verification** | Volume is measurable; price tracks lookups or verified answers |
| **Referral / affiliate rev share** | Only if it **does not weaken truth gates** (no pay-to-claim-fit) |

Default bias: pilot or narrow license before API or widget.

---

## 6. Creative fair-deal rule

Price should be anchored to **value created and risk reduced**, not generic SaaS pricing.

The best deal helps:

1. **The partner** — fewer wrong matches, lower support/return cost, higher trust  
2. **BuckParts** — reusable truth-layer capability, not one-off manual labor  
3. **The homeowner** — fewer wrong purchases, clearer uncertainty, safer buy paths  

If a proposed price only works by inflating coverage claims or skipping proof, reject it.

---

## 7. Kemal conversation

### Short script (Jared)

> BuckParts started as a consumer filter lookup site, but what I’m really building is a **governed compatibility truth layer** — what part fits, what proves it, what source said so, what’s unknown, and where a homeowner can safely buy it. We don’t invent fit. If we can’t prove it, we don’t claim it.
>
> I’m not leading with software. I want to understand where wrong-part uncertainty is already costing you — then see whether BuckParts can reduce that risk in a way that’s fair for you, for us, and for the homeowner.

### Key question

> **Where does wrong product matching currently cost you money, trust, support time, or failed conversions?**

Listen first. Map answers onto §3. Only then discuss pilot shape or pricing.

---

## 8. Non-goals

- Do **not** build an API before a real partner use case is understood.
- Do **not** weaken proof standards for revenue.
- Do **not** claim coverage BuckParts cannot prove.
- Do **not** create custom manual work that does not become reusable.

---

## Audit workflow (repeatable)

1. **Frame** — share truth-layer questions (§2); no pitch deck of features.  
2. **Discover** — run client audit questions (§3); record PROVEN / INFERRED / UNKNOWN.  
3. **Homeowner check** — run outcome audit (§4); fail closed on misleading UX.  
4. **Value sketch** — wrong-match cost × frequency × what a verified answer is worth.  
5. **Deal options** — pick narrowest structure from §5 that preserves truth gates.  
6. **Fair-deal test** — partner + BuckParts + homeowner all benefit (§6).  
7. **Write-up** — one-page audit note (partner, surfaces, costs, unknowns, proposed pilot, explicit non-claims).

No production mutation, app UI, or API work is authorized by completing this audit.

---

## Later: agent candidacy (not authorized yet)

This doc is a **planning artifact only**. Promoting it to an agent skill or automated audit runner requires:

| Proof needed | Why |
|--------------|-----|
| At least one completed human audit with a real partner (or serious prospect) | Process must work in conversation, not only on paper |
| A filled one-page write-up template used end-to-end | Shows inputs/outputs are stable enough to automate |
| Explicit founder decision that agent output is advisory only | Agents must not invent coverage, deals, or proof |
| Clear separation from manufacturer-rescue / coverage mutation lanes | B2B audit must not authorize CSV, Supabase, or live buyer-path changes |

Until then: use this doc manually in founder conversations.
