# Waterdrop proof-slice operator input (read-only)

Rakuten / Waterdrop **LinkSynergy** product links are **not** stored as a full catalog in this repo. Only the closed **DA29-00020B** proof slice is committed (`data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json`).

## Smallest durable input format

Use `data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json` (copy from `waterdrop-rakuten-links.v1.sample.json`):

| Field | Required | Purpose |
|-------|----------|---------|
| `contract` | yes | Must be `waterdrop_rakuten_operator_input_v1` |
| `entries[].id` | yes | Stable row id for the report |
| `entries[].affiliate_url` | yes | Full `https://click.linksynergy.com/link?...&murl=...` click URL |
| `entries[].visible_title` | no | Rakuten product title (improves token match) |
| `entries[].image_url` | no | Product image URL if shown in export |
| `entries[].raw_html` | no | Optional HTML snippet; parsed when `affiliate_url` omitted |

Alternatively paste HTML into `entries[].raw_html` or a `.html` file and pass `--html path` to the report script.

**Do not commit** live Rakuten exports with account secrets. Keep exports local; commit only redacted samples if needed.

## Report

```bash
npm run buckparts:waterdrop-proof-slice-candidates
```

Optional production enrichment (read-only Supabase):

```bash
npx tsx scripts/report-waterdrop-proof-slice-candidates.ts --with-production
```
