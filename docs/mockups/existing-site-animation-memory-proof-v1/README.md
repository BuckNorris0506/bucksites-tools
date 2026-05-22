# Existing site + animation/memory — localhost proof v1

Screenshots of **committed BuckParts production UI** with only:

- Scroll reveal (`RevealOnScroll`)
- Card hover/focus polish (`bp-card-interactive`)
- Recent searches localStorage (`buckparts.recentSearches.v1`)

No hybrid, Hallmark, or mockup layouts.

## Capture

```bash
npm run dev
node docs/mockups/existing-site-animation-memory-proof-v1/capture.mjs
```

Pre-seeds recent searches: DA29-00020B, GE MWF, LFXS26973S.

## Screenshots

| File | Route |
|------|-------|
| `01-homepage-default.png` | `/` |
| `02-homepage-recent-searches.png` | `/` (seeded) |
| `03-homepage-scroll-reveal.png` | `/` scrolled |
| `04-search-results.png` | `/search?q=DA29-00020B` |
| `05-search-results-hover.png` | same + hover |
| `06-catalog.png` | `/catalog` |
| `07-mobile-homepage-recent-searches.png` | `/` mobile (seeded) |
