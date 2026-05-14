# BuckParts customer UX doctrine (public)

BuckParts is a **calm, evidence-first replacement decision utility** for homeowners—not a browse-first catalog or affiliate blog.

## Principles

1. **Evidence before store links** — Explain what we found and why a part might fit before pushing a retailer hop.
2. **Confidence and uncertainty before the main action** — Make fit strength and gaps legible; do not bury caveats.
3. **No-buy is a trust feature** — Hiding or refusing a store shortcut when listing evidence is weak is intentional clarity, not failure.
4. **Store links are earned** — Shortcuts appear only after listing checks and buy-path rules allow them.
5. **Restraint over hype** — Prefer borders, spacing, and plain language over superlatives, checkmark theater, or “magic” claims.

## Language

- Prefer: **checked against this part number**, **reviewed listing**, **listing evidence**, **on file for this part number**, **compare before buying**, **not enough evidence to show a store link**, **store shortcut unavailable**, **do not buy yet**.
- Avoid broad standalone **“verified”** product claims; avoid **guaranteed**, **best** (ranking/superlative), **AI-powered**, **database match**, **safe to buy**, and internal terms (**call-to-action** as acronym, **browser_truth**, **repo**, **gating**, **entity**, **slug**, **monetized path**) in customer-visible copy.

## Machine checks

`src/lib/copy/customer-ux-doctrine.ts` exports a small version marker and paths scanned in slice-1 tests. Extend there when new public surfaces adopt the same rules.
