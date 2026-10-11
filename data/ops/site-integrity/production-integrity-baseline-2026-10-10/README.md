# Production Site Integrity Baseline — 2026-10-10

Read-only baseline artifacts for site-integrity remediation roots (R01–R17).

**Provenance:** Immutable Production Site Integrity Baseline dated **2026-10-10** (operator session). The full multi-root baseline packet was not present as a single checked-in file at ingest time; **R16** is persisted here from that baseline without reinterpretation. Historical counts in `r16-baseline-root-v1.json` are **baseline-era snapshots**, not current production truth.

**Canonical product source:** `origin/main` at closure verification time (`c583fd19f297b5bb8a8066a50e24c09a5189d9f8`).

**Do not mutate production data from artifacts in this directory.**

## R16 artifacts

| File | Role |
|------|------|
| `r16-baseline-root-v1.json` | Immutable historical R16 scope (81 CTA / 6 redirect IDs / 64 pages). |
| `r16-production-cta-inventory-2026-10-11.json` | Read-only HTML sitemap rescan of **current** production commercial `/go` exposure (no `/go` GETs). |
| `r16-closure-verification-2026-10-11.json` | Final R16 closure rerun evidence against production after PR #44 merge. |
