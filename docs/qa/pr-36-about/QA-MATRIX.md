# About page QA (BuckParts-About-final package)

**Head:** post-About implementation on `cursor/post-search-production-v1`  
**Source:** `BuckParts-About-final-design-and-copy.zip` → `about-content.json` / `FINAL-PAGE-COPY.md`

## Automated / local checks

- `/about` renders all 10 sections in order (accessibility snapshot).
- Hero anchors: `#how-we-decide`, `#contact`.
- Mailto: `jared@buckparts.com` (founder) and `admin@buckparts.com` (general) — separate roles.
- JSON-LD: Person + Organization (`founder` link); no `image`, `sameAs`, `foundingDate`, address.
- `src/lib/about/about-page-v1.test.ts`: 6/6 pass.
- Light theme: `html:has(.bp-about-shell)` forces white background (no tan/dark hero bleed).

## Preview checklist (Netlify deploy-preview-36 after push)

- Desktop 1366×768 first viewport parity with artboard
- Mobile 390×844 stacked founder block
- Policy rows + internal links
- No horizontal overflow
