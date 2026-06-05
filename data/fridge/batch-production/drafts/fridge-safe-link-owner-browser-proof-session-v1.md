# Fridge safe-link owner browser proof session v1 (read-only)

Generated: 2026-06-05T04:45:15.284Z

## Stop condition

This session worksheet is for **manual browser proof only**. It does **not** authorize:

- apply planning or Verified Link authorization
- Command Center closure or truth closure
- `data/retailer_links.csv` mutation
- Supabase mutation
- `data/evidence/**` writes
- production `/go` clicks

Record results here first. Repo intake of proof evidence requires a separate approved step.

## Session summary

- bundle_id: `6d1c66c0-acd6-4083-9169-99f2a21ec8e8`
- manifest_id: `e2425548-6548-4d91-a01b-04e1cdee3818`
- validation_status: **VALIDATION_PARTIAL**
- slug_count: **7**
- edr3_b087_excluded_from_candidates: **true**

### One-page summary table

| # | Slug | Risk | OEM | Live page | Candidates | Avoid | Owner result |
|---:|---|---|---|---:|---:|---:|---|
| 1 | `wf3cb` | LOW | `WF3CB` | [open](https://buckparts.com/filter/wf3cb) | 4 | 0 | _pick below_ |
| 2 | `eptwfu01` | LOW | `EPTWFU01` | [open](https://buckparts.com/filter/eptwfu01) | 4 | 0 | _pick below_ |
| 3 | `edr4rxd1` | LOW-MEDIUM | `EDR4RXD1` | [open](https://buckparts.com/filter/edr4rxd1) | 4 | 0 | _pick below_ |
| 4 | `wfcb` | MEDIUM | `WFCB` | [open](https://buckparts.com/filter/wfcb) | 4 | 1 | _pick below_ |
| 5 | `ultrawf` | MEDIUM | `ULTRAWF` | [open](https://buckparts.com/filter/ultrawf) | 4 | 0 | _pick below_ |
| 6 | `edr3rxd1` | HIGH | `EDR3RXD1` | [open](https://buckparts.com/filter/edr3rxd1) | 3 | 2 | _pick below_ |
| 7 | `fppwfu01` | HIGH | `FPPWFU01` | [open](https://buckparts.com/filter/fppwfu01) | 3 | 1 | _pick below_ |

### Start order (easiest → hardest)

1. `wf3cb` (LOW) — Cleanest slug, frigidaire.com PDP live at $36
2. `eptwfu01` (LOW) — Strongest Frigidaire slug, all retailers available
3. `edr4rxd1` (LOW-MEDIUM) — Straightforward EveryDrop check
4. `wfcb` (MEDIUM) — HD and iFixit clean but Amazon unverified, older line
5. `ultrawf` (MEDIUM) — CAPTCHA and 504 concerns, HD strong
6. `edr3rxd1` (HIGH) — B087PDLZL9 aftermarket trap — do when alert
7. `fppwfu01` (HIGH) — FPPWFU02 non-interchangeable confusion risk

### Owner result options (pick one per slug)

- `PASS_BROWSER_PROOF`
- `FAIL_BROWSER_PROOF`
- `NEEDS_RECONCILIATION`
- `NO_SAFE_LINK_FOUND`

## DO_NOT_USE table

| Slug | URL | Retailer | Action | Reason | Evidence |
|---|---|---|---|---|---|
| `edr3rxd1` | https://www.amazon.com/dp/B087PDLZL9 | Amazon | `HARD_DO_NOT_USE` | Waterdrop aftermarket filter — NOT genuine EveryDrop Filter 3 | PROVEN |
---

## Session 1: wf3cb

- **slug:** `wf3cb`
- **OEM token:** `WF3CB`
- **brand:** `frigidaire`
- **product line:** PureSource 3
- **risk:** LOW — Cleanest slug, frigidaire.com PDP live at $36
- **live BuckParts page:** https://buckparts.com/filter/wf3cb

### Candidate URLs to open

1. **Frigidaire.com** — https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WF3CB
   - notes: GOLD STANDARD: Only frigidaire.com page that fully renders. Best OEM reference URL.
2. **Lowes** — https://www.lowes.com/pd/Frigidaire-PureSource-174-3-Replacement-Water-Filter/1003164400
   - notes: Status IMPROVED from prior data — now confirmed active with sales volume
3. **Home Depot** — https://www.homedepot.com/p/Frigidaire-Refrigerator-Filter-for-Frigidaire-WF3CB-PureSource-3-HDWF3CB/313853978
   - notes: Most-reviewed Frigidaire filter listing on HD
4. **Amazon** — https://www.amazon.com/dp/B0045LLC7K
   - notes: CAPTCHA may block. Mark INCONCLUSIVE if so.

### URLs to avoid

_None listed for this slug._

### Exact visual checks

- [ ] Page title or heading contains WF3CB
- [ ] Brand field shows Frigidaire or Electrolux
- [ ] Product references PureSource 3
- [ ] Genuine/OEM/Frigidaire branding visible
- [ ] Image shows standard PureSource 3 form factor
- [ ] Price in $30-$55 range
- [ ] No compatible-with / replacement-for language in title
- [ ] If page shows 242086201, that is ACCEPTABLE (same part)
- [ ] If Amazon: verify CAPTCHA not blocking content
- [ ] If HD: model is HDWF3CB
- [ ] Single filter, not aftermarket multi-pack

### Pass criteria

All checklist items confirmed. Page shows genuine Frigidaire PureSource 3 (WF3CB).

### Fail criteria

- Brand is not Frigidaire or Electrolux
- Part number WF3CB or 242086201 not visible
- Price below $25 (aftermarket signal)
- Compatible/replacement/fits language in title
- Non-Frigidaire branding in image
- Amazon CAPTCHA blocks content = INCONCLUSIVE

### Wrong-part risk notes

LOW RISK: Cleanest Frigidaire slug. frigidaire.com PDP is the gold standard — fully rendered at $36 with anti-counterfeit messaging. Multiple retailers confirm OEM identity. Alt part 242086201 is PROVEN equivalent.

### Screenshot filename checklist

- [ ] `wf3cb-frigidaire-pdp-price-2026-06-04.png`
- [ ] `wf3cb-lowes-pdp-price-2026-06-04.png`
- [ ] `wf3cb-homedepot-pdp-model-2026-06-04.png`

### Notes

_Fill in during browser session:_

```

```

### Final owner result (pick one)

- [ ] `PASS_BROWSER_PROOF`
- [ ] `FAIL_BROWSER_PROOF`
- [ ] `NEEDS_RECONCILIATION`
- [ ] `NO_SAFE_LINK_FOUND`

---

## Session 2: eptwfu01

- **slug:** `eptwfu01`
- **OEM token:** `EPTWFU01`
- **brand:** `frigidaire`
- **product line:** PureSource Ultra II
- **risk:** LOW — Strongest Frigidaire slug, all retailers available
- **live BuckParts page:** https://buckparts.com/filter/eptwfu01

### Candidate URLs to open

1. **frigidaireapplianceparts.com** — https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/EPTWFU01/3516084
   - notes: NEW candidate — authorized Frigidaire parts distributor (RepairClinic)
2. **Home Depot** — https://www.homedepot.com/p/Frigidaire-Refrigerator-Filter-for-Frigidaire-EPTWFU01-PureSource-Ultra-II-EPTWFU01/304492642
   - notes: Click Add to Cart to reveal actual price
3. **Frigidaire.com** — https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/EPTWFU01
   - notes: JS-rendered page; verify in browser
4. **Amazon** — https://www.amazon.com/Frigidaire-EPTWFU01-PureSource-Refrigerator-Replacement/dp/B0CXKH95V1
   - notes: Verify US price and sold-by in browser

### URLs to avoid

_None listed for this slug._

### Exact visual checks

- [ ] Page title or heading contains EPTWFU01
- [ ] Brand field shows Frigidaire or Electrolux
- [ ] Product references PureSource Ultra II (note the II)
- [ ] Genuine/OEM/Frigidaire branding visible
- [ ] Image shows standard PureSource Ultra II form factor
- [ ] Price in $55-$75 range
- [ ] No compatible-with / replacement-for language in title
- [ ] Product is Ultra II — NOT Ultra (that is ULTRAWF, different slug)
- [ ] If Amazon: Brand field says Frigidaire or Electrolux
- [ ] Single filter, not aftermarket multi-pack

### Pass criteria

All 10 checklist items confirmed. Page shows genuine Frigidaire PureSource Ultra II (EPTWFU01).

### Fail criteria

- Brand is not Frigidaire or Electrolux
- Part number EPTWFU01 not visible
- Page shows ULTRAWF instead of EPTWFU01 (wrong filter)
- Price below $40 (aftermarket signal)
- Compatible/replacement/fits language in title

### Wrong-part risk notes

LOW RISK: Strongest Frigidaire slug. Main confusion risk is between EPTWFU01 (Ultra II) and ULTRAWF (Ultra) — different filters for different models. Confirm page says Ultra II or EPTWFU01.

### Screenshot filename checklist

- [ ] `eptwfu01-frigidaireparts-pdp-brand-2026-06-04.png`
- [ ] `eptwfu01-homedepot-pdp-brand-2026-06-04.png`
- [ ] `eptwfu01-frigidaire-pdp-status-2026-06-04.png`

### Notes

_Fill in during browser session:_

```

```

### Final owner result (pick one)

- [ ] `PASS_BROWSER_PROOF`
- [ ] `FAIL_BROWSER_PROOF`
- [ ] `NEEDS_RECONCILIATION`
- [ ] `NO_SAFE_LINK_FOUND`

---

## Session 3: edr4rxd1

- **slug:** `edr4rxd1`
- **OEM token:** `EDR4RXD1`
- **brand:** `whirlpool`
- **product line:** EveryDrop Filter 4
- **risk:** LOW-MEDIUM — Straightforward EveryDrop check
- **live BuckParts page:** https://buckparts.com/filter/edr4rxd1

### Candidate URLs to open

1. **Amazon** — https://www.amazon.com/EveryDrop-Whirlpool-Refrigerator-Filter-Packaging/dp/B00UB38V2A
   - notes: Verify sold-by field in browser — should be Amazon.com or EveryDrop by Whirlpool
2. **Home Depot** — https://www.homedepot.com/p/EveryDrop-Ice-and-Refrigerator-Water-Filter-4-EDR4RXD1/205738810
   - notes: Confirm price and stock in browser
3. **Whirlpool.com** — https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html
   - notes: OOS as of last crawl. Owner should check restock status.
4. **Lowes** — https://www.lowes.com/pd/50352232
   - notes: Not re-crawled; prior data only

### URLs to avoid

_None listed for this slug._

### Exact visual checks

- [ ] Page title or heading contains EDR4RXD1
- [ ] Brand field shows EveryDrop or Whirlpool — NOT third-party
- [ ] Product references Filter 4 or EveryDrop Filter 4
- [ ] Genuine or OEM text visible in title/description/brand area
- [ ] Image shows white cylindrical filter with EveryDrop/purple branding
- [ ] Price in $45-$70 range
- [ ] No compatible-with / replacement-for / fits language in title
- [ ] If Amazon: Brand table field says EveryDrop or Whirlpool
- [ ] If HD/Lowes: manufacturer listed as Whirlpool or EveryDrop
- [ ] Single filter, not aftermarket multi-pack

### Pass criteria

All 10 checklist items confirmed. Page unambiguously shows genuine EveryDrop Filter 4 (EDR4RXD1).

### Fail criteria

- Brand is not EveryDrop or Whirlpool
- Part number EDR4RXD1 not visible
- Price below $35 (aftermarket signal)
- Compatible/replacement/fits language in title
- Non-EveryDrop branding on filter image
- OOS with no product details visible = INCONCLUSIVE

### Wrong-part risk notes

EveryDrop filters are heavily counterfeited on Amazon. Confirm sold-by field. No known aftermarket ASINs flagged for this slug yet.

### Screenshot filename checklist

- [ ] `edr4rxd1-amazon-pdp-brand-2026-06-04.png`
- [ ] `edr4rxd1-homedepot-pdp-brand-2026-06-04.png`
- [ ] `edr4rxd1-whirlpool-pdp-oos-2026-06-04.png`

### Notes

_Fill in during browser session:_

```

```

### Final owner result (pick one)

- [ ] `PASS_BROWSER_PROOF`
- [ ] `FAIL_BROWSER_PROOF`
- [ ] `NEEDS_RECONCILIATION`
- [ ] `NO_SAFE_LINK_FOUND`

---

## Session 4: wfcb

- **slug:** `wfcb`
- **OEM token:** `WFCB`
- **brand:** `frigidaire`
- **product line:** PureSource Plus
- **risk:** MEDIUM — HD and iFixit clean but Amazon unverified, older line
- **live BuckParts page:** https://buckparts.com/filter/wfcb

### Candidate URLs to open

1. **Home Depot** — https://www.homedepot.com/p/Frigidaire-PureSource-Plus-Water-Filter-WFCB/308000660
   - notes: Lowest OEM price found. Best verified US candidate.
2. **Warners' Stellian (authorized dealer)** — https://www.warnersstellian.com/product/10012/frigidaire-wfcb
   - notes: NEW candidate — authorized Frigidaire retailer. Carries full Frigidaire filter line.
3. **Frigidaire.com** — https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/WFCB
   - notes: 504 confirmed in both prior and current crawls. May work in browser, may not.
4. **Amazon** — https://www.amazon.com/dp/B0CC2TCJ57
   - notes: CAUTION: This ASIN is UNVERIFIED. Must prove itself in browser. Also try B000PSC0QE (older ASIN).

### URLs to avoid

- https://www.frigidaire.ca/...
  - action: `AVOID_FOR_US_SAFE_LINK`
  - reason: Canadian domain — incorrect for US customers

### Exact visual checks

- [ ] Page title or heading contains WFCB
- [ ] Brand field shows Frigidaire or Electrolux
- [ ] Product references PureSource Plus
- [ ] Genuine/OEM/Frigidaire branding visible
- [ ] Image shows standard PureSource Plus form factor
- [ ] Price in $20-$55 range
- [ ] No compatible-with / replacement-for language in title
- [ ] If Amazon B0CC2TCJ57: be EXTRA cautious — verify Brand field says Frigidaire
- [ ] If HD /308000660: price ~$24.94
- [ ] If frigidaire.ca: note price in CAD (expected)
- [ ] If iFixit: verify it says Genuine Electrolux
- [ ] Single filter, not aftermarket multi-pack
- [ ] Check for discontinued/superseded/replaced language

### Pass criteria

All applicable checklist items confirmed. Page shows genuine Frigidaire PureSource Plus (WFCB) with OEM branding.

### Fail criteria

- Brand is not Frigidaire or Electrolux
- Part number WFCB not visible
- Price below $15 (aftermarket signal)
- Compatible/replacement/fits language in title
- Non-Frigidaire branding in image
- Amazon B0CC2TCJ57 brand NOT Frigidaire = FAIL
- frigidaire.com returns 504 = INCONCLUSIVE

### Wrong-part risk notes

MEDIUM RISK: Amazon B0CC2TCJ57 is UNVERIFIED. WFCB is an older product line with potential supersession risk. allfilters.com confirms WFCB superseded WF1CB, but no evidence WFCB itself has been superseded (INFERRED low immediate risk). Wide price range ($24.94-$53.99) across OEM sources is unusual — document the price you see.

### Screenshot filename checklist

- [ ] `wfcb-homedepot-pdp-price-2026-06-04.png`
- [ ] `wfcb-warnersstellian-pdp-genuine-2026-06-04.png`
- [ ] `wfcb-frigidaire-pdp-status-2026-06-04.png`
- [ ] `wfcb-amazon-pdp-brand-unverified-2026-06-04.png`

### Notes

_Fill in during browser session:_

```

```

### Final owner result (pick one)

- [ ] `PASS_BROWSER_PROOF`
- [ ] `FAIL_BROWSER_PROOF`
- [ ] `NEEDS_RECONCILIATION`
- [ ] `NO_SAFE_LINK_FOUND`

---

## Session 5: ultrawf

- **slug:** `ultrawf`
- **OEM token:** `ULTRAWF`
- **brand:** `frigidaire`
- **product line:** PureSource Ultra
- **risk:** MEDIUM — CAPTCHA and 504 concerns, HD strong
- **live BuckParts page:** https://buckparts.com/filter/ultrawf

### Candidate URLs to open

1. **frigidaireapplianceparts.com** — https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/ULTRAWF/1534529
   - notes: NEW candidate — authorized Frigidaire parts distributor (RepairClinic)
2. **Home Depot** — https://www.homedepot.com/p/Frigidaire-Refrigerator-Filter-for-Frigidaire-ULTRAWF-PureSource-Ultra-ULTRAWF/203618461
   - notes: Confirm price and stock in browser
3. **Frigidaire.com** — https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/ULTRAWF
   - notes: Prior crawl returned 504, current crawl returns near-empty. Page is JS/SPA-rendered.
4. **Amazon** — https://www.amazon.com/dp/B002JAKRAM
   - notes: CAPTCHA may block. Mark INCONCLUSIVE if so.

### URLs to avoid

_None listed for this slug._

### Exact visual checks

- [ ] Page title or heading contains ULTRAWF
- [ ] Brand field shows Frigidaire or Electrolux
- [ ] Product references PureSource Ultra
- [ ] Genuine/OEM/Frigidaire branding visible
- [ ] Image shows standard PureSource Ultra filter form factor (blue/white)
- [ ] Price in $40-$65 range
- [ ] No compatible-with / replacement-for language in title
- [ ] If page shows 242017801, that is ACCEPTABLE (same part)
- [ ] If Amazon: verify CAPTCHA not blocking content
- [ ] If frigidaire.com: verify page actually loads
- [ ] Single filter, not aftermarket multi-pack

### Pass criteria

All checklist items confirmed. Page shows genuine Frigidaire PureSource Ultra (ULTRAWF) with clear OEM branding.

### Fail criteria

- Brand is not Frigidaire or Electrolux
- Part number ULTRAWF or 242017801 not visible
- Price below $30 (aftermarket signal)
- Compatible/replacement/fits language in title
- Non-Frigidaire branding in image
- CAPTCHA blocks Amazon content = INCONCLUSIVE
- frigidaire.com returns 504 = INCONCLUSIVE

### Wrong-part risk notes

MEDIUM RISK: frigidaire.com and Amazon both have crawler access issues. ULTRAWF is a popular filter with many aftermarket clones. Be vigilant for brands like Glacier Fresh, Pureline, FilterLogic.

### Screenshot filename checklist

- [ ] `ultrawf-frigidaireparts-pdp-brand-2026-06-04.png`
- [ ] `ultrawf-homedepot-pdp-brand-2026-06-04.png`
- [ ] `ultrawf-frigidaire-pdp-status-2026-06-04.png`

### Notes

_Fill in during browser session:_

```

```

### Final owner result (pick one)

- [ ] `PASS_BROWSER_PROOF`
- [ ] `FAIL_BROWSER_PROOF`
- [ ] `NEEDS_RECONCILIATION`
- [ ] `NO_SAFE_LINK_FOUND`

---

## Session 6: edr3rxd1

- **slug:** `edr3rxd1`
- **OEM token:** `EDR3RXD1`
- **brand:** `whirlpool`
- **product line:** EveryDrop Filter 3
- **risk:** HIGH — B087PDLZL9 aftermarket trap — do when alert
- **live BuckParts page:** https://buckparts.com/filter/edr3rxd1

### Candidate URLs to open

1. **Home Depot** — https://www.homedepot.com/p/Whirlpool-EveryDrop-Ice-and-Water-Refrigeration-Filter-EDR3RXD1/302727620
   - notes: Strongest verified candidate for this slug
2. **Amazon** — https://www.amazon.com/Whirlpool-EDR3RXD1-Everydrop-Refrigerator-Filter/dp/B00UB441HS
   - notes: CRITICAL: Confirm ASIN is B00UB441HS, NOT B087PDLZL9
3. **Whirlpool.com** — https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html
   - notes: Check in browser for OOS status

### URLs to avoid

- https://www.amazon.com/dp/B087PDLZL9
  - action: `HARD_DO_NOT_USE`
  - reason: Waterdrop aftermarket filter — NOT genuine EveryDrop Filter 3
- https://www.homedepot.com/p/EveryDrop-Ice-and-Refrigerator-Water-Filter-3-EDR3RXD1/205738809
  - action: `INSPECT_PRICE_ANOMALY`
  - reason: Price anomaly — $34.24 vs $59.99 market price. Inspect before use.

### Exact visual checks

- [ ] Page title or heading contains EDR3RXD1
- [ ] Brand field shows EveryDrop or Whirlpool — NOT Waterdrop
- [ ] Product references Filter 3 or EveryDrop Filter 3
- [ ] Genuine or OEM text visible
- [ ] Image shows standard EveryDrop Filter 3 form factor
- [ ] Price in $45-$65 range
- [ ] No compatible-with / replacement-for / fits language in title
- [ ] If Amazon: Brand field says EveryDrop or Whirlpool (NOT Waterdrop)
- [ ] If Amazon: ASIN is B00UB441HS — NOT B087PDLZL9
- [ ] If HD: manufacturer is Whirlpool or EveryDrop
- [ ] Single filter, not aftermarket multi-pack
- [ ] CRITICAL: ASIN in URL is NOT B087PDLZL9

### Pass criteria

All 12 checklist items confirmed. Page unambiguously shows genuine EveryDrop Filter 3 (EDR3RXD1).

### Fail criteria

- HARD FAIL: URL contains or resolves to Amazon ASIN B087PDLZL9
- Brand says Waterdrop anywhere on the page
- Brand is not EveryDrop or Whirlpool
- Part number EDR3RXD1 not visible
- Price below $35 (aftermarket signal)
- Compatible/replacement/fits language in title
- Waterdrop branding or non-EveryDrop packaging in image

### Wrong-part risk notes

HIGH RISK: Amazon B087PDLZL9 is PROVEN Waterdrop aftermarket. The Waterdrop product uses EDR3RXD1 as a compatibility keyword, appearing in search results for the genuine part. Owner MUST verify ASIN before accepting any Amazon link. Additional aftermarket ASINs may exist (UNKNOWN).

### Screenshot filename checklist

- [ ] `edr3rxd1-amazon-pdp-brand-asin-2026-06-04.png`
- [ ] `edr3rxd1-homedepot-pdp-brand-2026-06-04.png`
- [ ] `edr3rxd1-whirlpool-pdp-oos-2026-06-04.png`

### Notes

_Fill in during browser session:_

```

```

### Final owner result (pick one)

- [ ] `PASS_BROWSER_PROOF`
- [ ] `FAIL_BROWSER_PROOF`
- [ ] `NEEDS_RECONCILIATION`
- [ ] `NO_SAFE_LINK_FOUND`

---

## Session 7: fppwfu01

- **slug:** `fppwfu01`
- **OEM token:** `FPPWFU01`
- **brand:** `frigidaire`
- **product line:** PurePour PWF-1
- **risk:** HIGH — FPPWFU02 non-interchangeable confusion risk
- **live BuckParts page:** https://buckparts.com/filter/fppwfu01

### Candidate URLs to open

1. **Amazon** — https://www.amazon.com/Frigidaire-FPPWFU01-PurePour-PWF-1-Filter/dp/B08V6JB9R7
   - notes: Sold by Amazon.com (not third-party). No FPPWFU02 cross-contamination.
2. **Home Depot** — https://www.homedepot.com/p/Frigidaire-Water-and-Ice-Refrigerator-Filter-PWF-1-HDFPPWFU01/319137659
   - notes: Explicit FPPWFU01 cross-reference text on page = very clean candidate
3. **Frigidaire.com** — https://www.frigidaire.com/en/p/accessories/refrigerator-accessories/refrigerator-accessories-and-consumables/water-filters/FPPWFU01
   - notes: URL resolves in Exa index but content JS-rendered

### URLs to avoid

- https://www.lowes.com/pd/Frigidaire-6-Month-Push-In-Refrigerator-Water-Filter-Frigidaire-PurePour/5013265821
  - action: `HOLD`
  - reason: Currently unavailable (PROVEN). Do not use until restocked.

### Exact visual checks

- [ ] Page title or heading contains FPPWFU01
- [ ] Brand field shows Frigidaire or Electrolux
- [ ] Product references PurePour and specifically PWF-1 (NOT PWF-2 or PWF-2 Connect)
- [ ] Genuine/OEM/Frigidaire branding visible
- [ ] Image shows standard PurePour PWF-1 form factor
- [ ] Price in $40-$60 range
- [ ] No compatible-with / replacement-for language in title
- [ ] CRITICAL: Page does NOT show FPPWFU02 anywhere — check title, description, specs, breadcrumbs
- [ ] CRITICAL: Page does NOT say PWF-2 or PWF-2 Connect anywhere
- [ ] CRITICAL: If HD, model number is HDFPPWFU01 — NOT HDFPPWFU02
- [ ] If Amazon (B08V6JB9R7): Brand field says Frigidaire
- [ ] Single filter, not aftermarket multi-pack

### Pass criteria

All 12 checklist items confirmed, with special emphasis on items 8-10. Page unambiguously shows FPPWFU01 / PurePour PWF-1.

### Fail criteria

- HARD FAIL: Page shows FPPWFU02, PWF-2, or PWF-2 Connect anywhere
- Brand is not Frigidaire or Electrolux
- Part number FPPWFU01 not visible
- Price below $30 (aftermarket signal)
- Compatible/replacement/fits language in title
- HD model shows HDFPPWFU02 instead of HDFPPWFU01

### Wrong-part risk notes

HIGH RISK: FPPWFU01 (PWF-1) and FPPWFU02 (PWF-2 Connect) are PROVEN NOT interchangeable. These are physically different filters. Retailers may list them adjacently. Owner must confirm the EXACT part number. Discovery confirmed NO FPPWFU02 cross-contamination in current candidate URLs.

### Screenshot filename checklist

- [ ] `fppwfu01-amazon-pdp-brand-partnumber-2026-06-04.png`
- [ ] `fppwfu01-homedepot-pdp-model-2026-06-04.png`
- [ ] `fppwfu01-frigidaire-pdp-status-2026-06-04.png`

### Notes

_Fill in during browser session:_

```

```

### Final owner result (pick one)

- [ ] `PASS_BROWSER_PROOF`
- [ ] `FAIL_BROWSER_PROOF`
- [ ] `NEEDS_RECONCILIATION`
- [ ] `NO_SAFE_LINK_FOUND`

