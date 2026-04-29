# Frigidaire OEM PDP Evidence Plan (Manual, Read-Only)

## Purpose

This plan defines the minimum browser-verified evidence required before replacing current
Frigidaire OEM search/catalog rows with direct PDP links for the following target tokens:

- `242017801`
- `242086201`
- `242294502`
- `EPTWFU01`
- `FPPWFU01`

This is a **manual evidence packet plan only**. No DB writes or link mutation occur in this step.

## Non-Negotiable Rule

Search/catalog pages cannot become CTAs.

Any URL that is still a search/catalog result page remains blocked and must not be promoted.

## Current Search URLs (From Discovery Report)

- `242017801` -> `https://www.frigidaire.com/en/catalogsearch/result/?q=242017801`
- `242086201` -> `https://www.frigidaire.com/en/catalogsearch/result/?q=242086201`
- `242294502` -> `https://www.frigidaire.com/en/catalogsearch/result/?q=242294502`
- `EPTWFU01` -> `https://www.frigidaire.com/en/catalogsearch/result/?q=EPTWFU01`
- `FPPWFU01` -> `https://www.frigidaire.com/en/catalogsearch/result/?q=FPPWFU01`

## Required Evidence Schema (Per Target)

For each target token, capture the following before any replacement decision:

1. **Direct PDP URL**
   - Final URL after navigation (must not be search/catalog format).
2. **Exact token visible on page**
   - Target token shown exactly in page content.
3. **Product title**
   - Human-readable product name from page.
4. **Buyability / add-to-cart signal (if present)**
   - Evidence such as "Add to Cart", "In Stock", purchasable quantity controls.
5. **browser_truth_classification candidate**
   - Proposed candidate based on observed evidence:
     - `direct_buyable` when direct PDP + exact token + buyability signal.
     - `likely_valid` when direct PDP + exact token but no clear buyability signal.
     - `likely_search_results` when still search/catalog or listing-only.
6. **Decision**
   - `PASS`: eligible for future replacement consideration.
   - `FAIL`: not eligible.
   - `UNKNOWN`: insufficient evidence.

## Decision Rules (Per Target)

### Target: `242017801`
- **PASS**: direct PDP URL found, token `242017801` visible exactly, buyability signal present.
- **FAIL**: URL remains search/catalog OR token mismatch/substitution ambiguity.
- **UNKNOWN**: no direct PDP found or evidence incomplete.

### Target: `242086201`
- **PASS**: direct PDP URL found, token `242086201` visible exactly, buyability signal present.
- **FAIL**: URL remains search/catalog OR token mismatch/substitution ambiguity.
- **UNKNOWN**: no direct PDP found or evidence incomplete.

### Target: `242294502`
- **PASS**: direct PDP URL found, token `242294502` visible exactly, buyability signal present.
- **FAIL**: URL remains search/catalog OR token mismatch/substitution ambiguity.
- **UNKNOWN**: no direct PDP found or evidence incomplete.

### Target: `EPTWFU01`
- **PASS**: direct PDP URL found, token `EPTWFU01` visible exactly, buyability signal present.
- **FAIL**: URL remains search/catalog OR token mismatch/substitution ambiguity.
- **UNKNOWN**: no direct PDP found or evidence incomplete.

### Target: `FPPWFU01`
- **PASS**: direct PDP URL found, token `FPPWFU01` visible exactly, buyability signal present.
- **FAIL**: URL remains search/catalog OR token mismatch/substitution ambiguity.
- **UNKNOWN**: no direct PDP found or evidence incomplete.

## Exact Next Operator Action

Manually open each current Frigidaire search URL and capture direct PDP evidence, or mark
`UNKNOWN` if no direct PDP exists.

