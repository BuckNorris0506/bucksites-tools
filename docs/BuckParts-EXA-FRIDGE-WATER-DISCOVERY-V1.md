# BuckParts Exa refrigerator-water discovery v1

**Status:** **PROVEN** read-only operator lane. **NOT PROVEN** production runtime Exa calls.

## Contract

| Field | Value |
|--------|--------|
| Discovery contract | `exa_fridge_water_discovery_v1` |
| Manifest contract | `exa_fridge_water_discovery_manifest_v1` |
| MCP input contract | `exa_mcp_export_fridge_water_v1` |
| `read_only` | `true` |
| `data_mutation` | `false` |
| `mutation_ready` | `false` (all discovery rows) |
| `catalog_import_ready` | `false` (all discovery rows) |

## Why Exa is discovery, not truth

Exa search snippets and titles are **candidate discovery only**. They do not prove model compatibility, alias interchangeability, or wedge (water vs air). Promotion to `data/filters.csv` requires a separate evidence pass (`data/evidence/<slug>-compatibility-evidence-readonly.*.json`) with manufacturer or explicit compat proof — same gates as `docs/BuckParts-FIRST-FRIDGE-EXPANSION-EVIDENCE-TRIAGE.md`.

**No production runtime Exa calls:** Next.js app and `buckparts:large-batch-coverage-factory` do not invoke Exa. Operators run search in Cursor MCP (or a future script with local `EXA_API_KEY` outside this slice) and import JSON via `scripts/report-exa-fridge-water-discovery-v1.ts`.

## Artifact paths

| Path | Purpose |
|------|---------|
| `data/discovery/exa/fridge-water/fixtures/exa-fridge-water-sample.v1.json` | Committed test fixture (no network) |
| `data/discovery/exa/fridge-water/runs/<run-id>/run-meta.json` | Run metadata |
| `data/discovery/exa/fridge-water/runs/<run-id>/candidates.json` | Normalized candidates |
| `data/discovery/exa/fridge-water/manifest.v1.json` | Points factory at latest `candidates.json` (optional; `--write-manifest`) |

## Operator commands

```bash
# Normalize fixture to stdout (no writes)
npx tsx scripts/report-exa-fridge-water-discovery-v1.ts \
  --input data/discovery/exa/fridge-water/fixtures/exa-fridge-water-sample.v1.json

# Write run artifacts
npx tsx scripts/report-exa-fridge-water-discovery-v1.ts \
  --input data/discovery/exa/fridge-water/fixtures/exa-fridge-water-sample.v1.json \
  --out-dir data/discovery/exa/fridge-water/runs/fixture-sample-v1 \
  --run-id fixture-sample-v1

# Enable factory merge (optional)
npx tsx scripts/report-exa-fridge-water-discovery-v1.ts \
  --input <mcp-export.json> \
  --out-dir data/discovery/exa/fridge-water/runs/<run-id> \
  --write-manifest
```

## Query playbook (first batch)

Use natural-language “ideal page” queries; prefer manufacturer hosts:

1. `site:whirlpool.com official EveryDrop refrigerator water filter OEM part number compatibility chart`
2. `site:lg.com refrigerator water filter LT1000P official compatible refrigerator models list`
3. `site:samsung.com DA29 refrigerator water filter official compatible models support page`
4. `site:geappliances.com GE MWF RPWFE refrigerator water filter official part page`
5. `site:frigidaire.com PureSource refrigerator water filter WF3CB official accessory page`

After search, run **web_fetch_exa** on tier A/B URLs only; store `fetch_excerpt` in the export JSON before import.

**Do not use:** Amazon/eBay-first queries, “best refrigerator filter” listicles, or sibling revision guesses without manufacturer naming the exact OEM token.

## Source tiers

| Tier | Examples |
|------|----------|
| `A_manufacturer_official` | whirlpool.com, lg.com, samsung.com, geappliances.com, frigidaire.com |
| `B_manufacturer_support` | (reserved — support subsites) |
| `C_authorized_parts_lookup` | repairclinic.com, partselect.com |
| `D_retailer_pdp` | bestbuy.com, lowes.com |
| `E_marketplace_weak` | amazon.com, ebay.com, walmart.com |
| `F_unknown` | Unclassified |

## OEM token extraction (`OEM_TOKEN_REGEX`)

`src/lib/discovery/exa-fridge-water-discovery-v1.ts` extracts manufacturer fridge-water part tokens from title, snippet, and `fetch_excerpt`. v3 audit gaps (official PDP copy present, `no_oem_token` in committed run JSON) motivated these additions:

| Token | Pattern | Typical classification |
|-------|---------|------------------------|
| `MWFA` | `\bMWFA\b` | `evidence_needed` when not live in `data/filters.csv` |
| `GWF06` | `\bGWF0?\d{1,2}\b` (e.g. GWF06) | `evidence_needed` when not live |
| `FPPWFU01` | `\bFPPWFU01\b` | `live_slug_exists` → blocked, omitted from factory merge |
| `EDR6D1` | `\bEDR[1-6]D1B?\b` (after `EDR6RXD1`) | `evidence_needed` when not live; does not replace active manifest merge for `edr6rxd1` |

Committed `runs/*/candidates.json` snapshots are historical until re-run; factory reads the manifest’s `latest_candidates_path` only.

## Rejection flags

`demoted_registry_match`, `live_slug_exists`, `alias_family_hold`, `wrong_wedge_air_filter`, `marketplace_only`, `search_results_page`, `revision_sibling_unproven`, `snippet_only_no_fetch`, `seo_title_only`, `no_oem_token`

## Factory integration

- Library: `src/lib/discovery/exa-fridge-water-discovery-v1.ts`
- Merge: `src/lib/coverage/exa-discovery-factory-merge-v1.ts`
- Factory: `src/lib/coverage/large-batch-coverage-factory-v1.ts` → `source_summary.exa_fridge_water_discovery`

When manifest is **missing**: factory baseline stays `candidate_count=57`, `new_product_candidate=0`, `bulk_catalog.row_count=57`.

When manifest is **present**: factory may add `evidence_needed` / `blocked_do_not_publish` rows only; **never** `new_product_candidate`; bulk row count unchanged.

## Recorded runs (manifest vs history)

| Run ID | Manifest active? | Factory merge | Notes |
|--------|------------------|---------------|--------|
| `2026-05-21-v2-netnew` | **Yes** (`manifest.v1.json`) | `edr6rxd1` → `evidence_needed` | Net-new Filter 6 token from owner-center; factory `candidate_count=58` |
| `2026-05-21-v3-netnew` | **No** (historical only) | 0 merge-eligible | Avoided Filter 6 rabbit-hole; 9 rows, all blocked (`live_slug_exists` / `no_oem_token`). Artifacts under `operator-input/` and `runs/` remain for audit. |

Do **not** point `manifest.v1.json` at v3 unless intentionally demoting `edr6rxd1` from active factory output.

## Safety rules (failed-batch prevention)

1. Never auto-append discovery slugs to `FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1`.
2. Block all `FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1` slugs/OEM keys.
3. Omit `live_slug_exists` from factory merge (row still in `candidates.json` for audit).
4. Block revision siblings (e.g. `DA29-00003B` vs live `da29-00003g`) without manufacturer proof.
5. Block wrong-wedge air filters (`LT120F` pattern).
6. Require fetch excerpt for strong OEM claims; snippet-only → `snippet_only_no_fetch` / `seo_title_only`.

## Validation commands

```bash
node --import tsx --test scripts/lib/exa-fridge-water-discovery-v1.test.ts
node --import tsx --test scripts/lib/large-batch-coverage-factory-v1.test.ts
npx tsx scripts/report-large-batch-coverage-factory.ts | jq '{candidate_count,state_counts,bulk_catalog:.source_summary.bulk_catalog,live_filters_csv:.source_summary.live_filters_csv,exa:.source_summary.exa_fridge_water_discovery}'
git diff -- data/filters.csv data/compatibility_mappings.csv data/retailer_links.csv
npm run lint
npm run build
```

Implementation: `src/lib/discovery/exa-fridge-water-discovery-v1.ts`, `scripts/report-exa-fridge-water-discovery-v1.ts`.
