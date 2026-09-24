# PR #36 manual QA matrix (commit `fdd9632` + SVG render fix)

**Environment:** Local production server (`npm run build && PORT=3012 npm run start`) at head `fdd9632` — same artifact Netlify deploy-preview-36 serves after rebuild. Netlify preview was still on pre-asset commit during first check; re-verify preview after latest push.

## Viewports

| Viewport | Result |
|----------|--------|
| Desktop 1366×768 | Pass — no horizontal overflow on `/`, `/search`, `/fridge/whirlpool-wrx735sdhz` |
| Mobile 390×844 | Pass — `scrollWidth === clientWidth` on homepage; find-my-number dialog usable |

## Journeys

| # | Flow | Result |
|---|------|--------|
| 1 | Homepage load | Pass — production logo path `/brand/buckparts-horizontal-lockup-v1.svg` |
| 2 | Search `WRX735SDHZ` | Pass — redirects to `/fridge/whirlpool-wrx735sdhz` (no resolution step) |
| 3 | Exact model URL | Pass — full model visible in H1 |
| 4 | Search `EDR4RXD1` | **Resolution** (not direct) — repo returns exact EDR4RXD1 **and** UKF8001 alias hit for same token; routing contract requires ambiguity → Search Resolution |
| 5 | Direct part URL | Pass — `/filter/edr4rxd1?fromSearch=1` shows “Will it fit your appliance?” |
| 6 | Fit prompt copy | Pass — does not imply compatibility from part alone |
| 7 | `WRX735SD` | Pass — Search Resolution with multiple models |
| 8 | `ZZZZNOTREAL` | Pass — recovery; “not a fit denial” copy |
| 9 | Find my number | Pass — homepage “I don’t know my number” opens number-help panel |
| 10 | Model → filter | Pass — WRX735SDHZ page links to EDR4RXD1 filter detail |
| 11 | Change search | Pass — `/search` form retains query; resolution cards link to PDPs |
| 12 | Reverse compatibility | Pass — filter page lists compatible models with links |
| 13 | No verified buy | Spot-checked EDR4RXD1 page shows verified link when gated; suppress_buy pages unchanged (not in this lane) |
| 14 | Keyboard / submit | Pass — searchbox + button present; Enter submits via form (existing SearchForm) |
| 15 | Mobile overflow | Pass |
| 16 | Broken images | **Fixed** — SVG illustration required `unoptimized` on `next/image` (follow-up commit) |
| 17 | Console | No release-attributable errors observed in automation session |
| 18 | Dead CTAs | Pass on exercised paths |

## Screenshots

- `screenshots/desktop-fridge-wrx735sdhz.png`
- `screenshots/mobile-home-find-number.png`

## Routing notes (truth-preserving)

- **WRX735SDHZ:** single exact fridge identity in live search → direct model page.
- **EDR4RXD1:** live search is **not** a unique identity (alias collision on UKF8001) → resolution is correct; direct part route still applies when search returns exactly one fridge-filter hit (unit tests).
