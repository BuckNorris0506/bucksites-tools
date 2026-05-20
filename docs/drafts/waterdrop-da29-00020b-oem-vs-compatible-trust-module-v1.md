# Draft (not published): OEM vs compatible trust module — DA29-00020B / Waterdrop WDP-F27

**Status:** DESIGN ONLY — not customer-facing, not wired to routes, no live CTA implied.  
**Slug:** `da29-00020b` | **Token:** `DA29-00020B` | **Evidence:** `data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json`  
**Public copy rules:** `docs/BuckParts-CUSTOMER-LANGUAGE-AND-DEFINITIONS.md` (no “OEM” cold; prefer Samsung-made / compatible replacement language)

## Purpose

Help homeowners decide between **Samsung original filter** (DA29-00020B / HAF-CIN family) and **aftermarket compatible** options (e.g. Waterdrop WDP-F27) without hype, without claiming Waterdrop is “better,” and without hiding that compatible filters are not Samsung OEM.

## BuckParts can prove today (repo + owner-browser evidence)

- Part number `DA29-00020B` is the published lookup for slug `da29-00020b` (`data/filters.csv`, aliases HAF-CIN / HAF-CIN/EXP).
- Multiple Samsung fridge models map to this part in `data/compatibility_mappings.csv`.
- Waterdrop WDP-F27 listing title includes `DA29-00020B`; owner-browser saw Add to Cart / Buy Now at $41.99 on variant PDP (2026-05-20 evidence).
- LinkSynergy affiliate URL lands on the same PDP (tracker `tagVerified`; not commission proof).
- Product is **aftermarket compatible**, not Samsung OEM (evidence `product_attribution`).

## BuckParts cannot prove today

- Side-by-side contaminant reduction vs Samsung OEM on the same water supply.
- That Waterdrop is “as good as” or better than OEM.
- Current Samsung OEM list price, stock, or PDP for this token on a specific retailer.
- NSF listing cross-check committed in-repo (external NSF directory should be cited if we publish NSF claims).
- Live buying option on `/filter/da29-00020b` (CTA suppressed; no `retailer_links` waterdrop row).

## Recommended surfaces (later, ranked)

1. **Embedded collapsible module** on `/filter/da29-00020b` — highest leverage when a compatible buying option exists; keep below hero, above model list.
2. **Reusable component** `OemVsCompatibleTrustPanel` fed by token-level config — reuse for other fridge tokens after proof slice pattern.
3. **Standalone help article** `/help/oem-vs-compatible-refrigerator-filters` — stable reference, linked from module; good for SEO only after legal/copy review.

## Module title (customer-facing)

**Original Samsung filter vs compatible replacement (DA29-00020B)**

## Section structure + copy draft

### 1. What this page is about

> BuckParts lists refrigerator water filter part number **DA29-00020B** (also printed as **HAF-CIN** or **HAF-CIN/EXP** on some cartridges). That number is the Samsung **original-style** part families use. Some sellers offer **compatible replacements** made by other brands. They are not the same product as a Samsung-packaged OEM filter.

### 2. Compare before you buy (fit first)

> 1. Read the part number on the cartridge you are removing.  
> 2. Match it to **DA29-00020B** or an alias on this page.  
> 3. Check your refrigerator model against the compatible models listed here.  
> 4. When in doubt, use your owner’s manual or Samsung support before ordering.

*(Reuse `COMPARE_BEFORE_BUY_CHECKLIST_LINES` from `public-trust.ts` where possible.)*

### 3. Original (Samsung) vs compatible — plain language

| | **Original Samsung filter** | **Compatible replacement (example: Waterdrop WDP-F27)** |
|---|---------------------------|--------------------------------------------------------|
| **Who makes it** | Samsung (OEM / genuine packaging) | Third party (Waterdrop); marketed as replacement for DA29-00020B |
| **Part numbers** | DA29-00020B, HAF-CIN, HAF-CIN/EXP | Seller SKU WDP-F27; lists Samsung numbers for fit reference |
| **What BuckParts calls it** | “Original part” (when we list OEM) | “Compatible replacement” — **not Samsung** |
| **Typical reason to choose** | You want the manufacturer’s own cartridge and warranty path | Lower price or availability; acceptable if you understand it is not OEM |
| **Risk tradeoff** | Usually higher cost; fit/support through Samsung channel | Fit/leak/installation depends on cartridge quality; warranty for fridge may differ if non-OEM causes a claim — **check your manual** |

**Required label (any compatible CTA):**  
> **Not made or sold by Samsung.** This is a compatible replacement filter. BuckParts does not represent that it is a Samsung OEM product.

### 4. What NSF numbers mean (no scoreboard)

> Third-party filters often cite **NSF/ANSI** standards. These are test protocols for specific claims — not a single “grade” and not proof that every contaminant is reduced.  
> - **NSF/ANSI 42:** Taste, odor, and aesthetic effects (e.g. chlorine reduction claims).  
> - **NSF/ANSI 53:** Health-related contaminants — **only for contaminants listed on that product’s certification**.  
> - **NSF/ANSI 401:** Some “emerging” compounds (e.g. certain pharmaceuticals) — again, claim-by-claim.  
> - **NSF/ANSI 372:** Lead **in materials** (low-lead components) — **not the same** as “removes lead from water,” which is an NSF/ANSI 53 claim when listed.  
> A seller saying “NSF certified” does not mean it matches every claim on another filter. Check the **performance data sheet** for that model.

**If we cite Waterdrop WDP-F27:** Waterdrop’s PDP states certification against 42, 53, 401, and 372 for NSF model **EFF-6027S** (trade name WDP-F27). BuckParts has **not** independently verified the NSF certificate in-repo; homeowners can confirm on NSF’s certified product listings.

### 5. What we looked at for Waterdrop (evidence-bound)

> On **2026-05-20**, BuckParts checked a Waterdrop product page for a filter titled **Waterdrop WDP-F27 Replacement for Samsung DA29-00020B Fridge Water Filter**. We confirmed the page showed part number **DA29-00020B** in the title, a **$41.99** one-time purchase price, and **Add to Cart** / **Buy Now** buttons. We also click-tested the Rakuten LinkSynergy link and it opened the same product page.  
> That check is **listing and buy-path evidence**, not a water-quality test and not proof that this filter is better than Samsung OEM.

### 6. When to buy Samsung OEM instead

> - You want the filter sold as **Samsung genuine / OEM** for warranty or support reasons.  
> - Your owner’s manual requires OEM parts for coverage (verify — BuckParts does not interpret your warranty).  
> - You are uneasy about third-party cartridges, leaks, or fit.  
> - A compatible listing does not show the part number clearly or fails our listing review.

### 7. When a compatible option may be reasonable

> - You have confirmed **DA29-00020B** (or HAF-CIN / EXP) on your old cartridge **and** your model is listed as compatible.  
> - You accept that the filter is **not Samsung OEM** and you have reviewed the seller’s fit, return, and certification claims yourself.  
> - BuckParts has a **reviewed buying option** that matches this part number (we only show those when our checks pass).

### 8. What BuckParts does not claim

> - We do not claim Waterdrop (or any compatible brand) is safer, better, or longer-lasting than Samsung OEM.  
> - We do not test water in your home.  
> - Affiliate approval or a working tracking link is **not** product-quality proof.  
> - Prices change; always confirm price and shipping on the seller’s page before ordering.

### 9. Buying options on this page

> *(Dynamic — tie to `TrustAwareBuySection` state.)*  
> - If suppressed: “We are not showing buying options yet for this part number.”  
> - If compatible link shown: footnote “Compatible replacement — not Samsung OEM” + last-checked date from `browser_truth_checked_at`.

## Implementation notes (for engineers, not public)

- Fridge filter PDP does **not** render `PartTruthPanel` today; `buildPartPageTrust` hardcodes `oem_or_compatible: "oem"`. Module should set compatible attribution from `retailer_links` + evidence when waterdrop row exists.
- Ban word **OEM** on public HTML per `filter-pdp-homeowner.test.ts`; use “Original Samsung filter” / “Samsung genuine filter” instead.
- Do not publish until: insert plan executed OR module is useful in suppress state (education-only collapsible).

## External references (for maintainers)

- NSF/ANSI 42, 53, 401: https://www.nsf.org/knowledge-library/nsf-ansi-42-53-and-401-filtration-systems-standards  
- NSF consumer standards overview: https://www.nsf.org/consumer-resources/articles/standards-water-treatment-systems  
- Waterdrop WDP-F27 PDP: https://www.waterdropfilter.com/products/waterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter  
- NSF certified listings (EFF-6027S / WDP-F27): https://info.nsf.org/Certified/DWTU/Listings.asp?TradeName=waterdrop  
