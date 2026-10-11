# Production Site Integrity Baseline — 2026-10-10

Read-only baseline artifacts for site-integrity remediation roots (R01–R17).

**Provenance:** Immutable Production Site Integrity Baseline dated **2026-10-10** (operator session). Full baseline text: `READ_ME_AUDIT_REPORT.md` (SHA256 in `read-me-audit-report-provenance-v1.json`). Per-root snapshots (`r02-baseline-root-v1.json`, `r16-baseline-root-v1.json`, …) are **baseline-era definitions**, not current production truth.

**Canonical product source:** `origin/main` at each closure verification (see per-root closure JSON).

**Do not mutate production data from artifacts in this directory.**

## Baseline ingest

| File | Role |
|------|------|
| `READ_ME_AUDIT_REPORT.md` | Full immutable R01–R17 baseline narrative (verbatim ingest). |
| `read-me-audit-report-provenance-v1.json` | SHA256 and ingest metadata. |

## R02 artifacts

| File | Role |
|------|------|
| `r02-baseline-root-v1.json` | Immutable historical R02 definition (hydration / GA / search). |
| `r02-closure-verification-2026-10-11.json` | Production browser verification closure at main `6f9dbac…` (no product-code repair). |

## R16 artifacts

| File | Role |
|------|------|
| `r16-baseline-root-v1.json` | Immutable historical R16 scope (81 CTA / 6 redirect IDs / 64 pages). |
| `r16-production-cta-inventory-2026-10-11.json` | Read-only HTML sitemap rescan of **current** production commercial `/go` exposure (no `/go` GETs). |
| `r16-closure-verification-2026-10-11.json` | Final R16 closure rerun evidence against production after PR #44 merge. |
