# BuckParts Truth MCP v2

Canonical **read-only** MCP server exposing BuckParts verified fit and safe buyer-path truth from **committed repo CSV and audit JSON**.

- **Truth contract** — repo truth over memory; FULL truth or `UNKNOWN`; no "probably fits"
- **No write tools** — no CSV, Supabase, evidence, retailer link, or production mutation
- **Exact-token search only** — no fuzzy catalog search
- **Local stdio** — Cursor, Codex CLI, and ChatGPT Desktop via MCP config (no HTTPS deploy in-repo)

## Run

From repo root:

```bash
npm run mcp:buckparts-truth
```

## Connection examples

### Cursor

Add to `.cursor/mcp.json` (adjust `cwd` to your clone):

```json
{
  "mcpServers": {
    "buckparts-truth": {
      "command": "npm",
      "args": ["run", "mcp:buckparts-truth"],
      "cwd": "/Users/jaredbuckman/bucksites-tools"
    }
  }
}
```

Restart Cursor after saving.

### Codex CLI

In `~/.codex/config.toml` (or project `.codex/config.toml`):

```toml
[mcp_servers.buckparts-truth]
command = "npm"
args = ["run", "mcp:buckparts-truth"]
cwd = "/Users/jaredbuckman/bucksites-tools"
```

Or with `tsx` directly:

```toml
[mcp_servers.buckparts-truth]
command = "npx"
args = ["tsx", "mcp/buckparts-truth/server.ts"]
cwd = "/Users/jaredbuckman/bucksites-tools"
```

### ChatGPT Desktop

Add to `~/Library/Application Support/com.openai.chatgpt/mcp.json` (macOS):

```json
{
  "mcpServers": {
    "buckparts-truth": {
      "command": "npm",
      "args": ["run", "mcp:buckparts-truth"],
      "cwd": "/Users/jaredbuckman/bucksites-tools"
    }
  }
}
```

Adjust paths for your OS and clone location. Restart the client after editing.

## Tools

| Tool | Input | Purpose |
| --- | --- | --- |
| `check_replacement_fit` | `model_or_part` | Legacy snake_case name (backwards compatible) |
| `checkReplacementFit` | `model_or_part` | Same handler as above |
| `getFilter` | `filter_slug` | Filter identity, OEM, aliases, safe path, evidence |
| `getModel` | `model_slug` | Compatible filters, fit confidence, evidence |
| `searchParts` | `query` | Exact-token ranked search (no fuzzy) |
| `getSafeBuyerPath` | `filter_slug` | Primary retailer, browser truth, suppression |
| `getCoverageMetrics` | _(none)_ | Wedge/census/convergence aggregates |
| `getTruthPolicy` | _(none)_ | Truth Contract + UNKNOWN behavior |
| `manufacturer_rescue_status` | `slug` | GE / EveryDrop / Frigidaire rescue lane per slug |
| `manufacturer_rescue_cohort` | `manufacturer` | Full rescue cohort for one manufacturer |
| `manufacturer_browser_proof_status` | `slug` | Owner browser proof draft artifact status |

All tools return JSON with `read_only: true`, `data_mutation: false`, `mutation_authorized: false`.

## Tool schemas (summary)

### checkReplacementFit / check_replacement_fit

```json
{ "model_or_part": "samsung-rf28r7351sr" }
```

Returns: `matched_slug`, `wedge`, `replacement_fit_status`, `safe_buyer_path_status`, `disposition`, `evidence_paths`, `fit_audit_classification`, `truth_note`.

### getFilter

```json
{ "filter_slug": "edr1rxd1" }
```

Returns: `identity`, `aliases`, `replacement_interval_months`, `compatible_model_count`, `safe_buyer_path_status`, `evidence_paths`, `truth_status`.

### getModel

```json
{ "model_slug": "samsung-rf28r7351sr" }
```

Returns: `compatible_filters[]` (with `is_recommended`, `fit_status`), `fit_confidence`, `evidence_paths`. Fit `UNKNOWN` when not audit-proven.

### searchParts

```json
{ "query": "EDR1RXD1" }
```

Returns: `matches[]` with `rank`, `match_kind`, `entity`, `slug`, `wedge`. Empty array when no exact token matches.

### getSafeBuyerPath

```json
{ "filter_slug": "edr1rxd1" }
```

Returns: `primary_retailer`, `direct_buyable`, `suppression_reason`, `safe_gated_row_count`, `owner_approval_required`, `evidence_paths`.

### getCoverageMetrics

No input. Returns wedge counts, classification counts, census summary, AP convergence snapshot from committed artifacts.

### getTruthPolicy

No input. Returns governing document paths, core principles, UNKNOWN behavior, MCP guardrails.

### manufacturer_rescue_status

Input: `slug` (exact filter slug). Returns GE, EveryDrop/Whirlpool, or Frigidaire rescue lane truth from committed adapter reports. `repo_proven_official_pdp_url` is never inferred — GE rescue slugs expose `adapter_discovery_url` separately. `direct_buyable_proven` only when CSV gate passes or browser capture proves buyability.

### manufacturer_rescue_cohort

Input: `manufacturer` (`ge_appliance_parts`, `everydrop_whirlpool`, or `frigidaire`). Returns cohort rows, summary, proven/unknown facts. No PDP pattern guessing (`pdp_pattern_guessed_slug_count: 0`).

### manufacturer_browser_proof_status

Input: `slug`. Reads draft owner browser proof JSON when on disk. `direct_buyable_proven` only for official-path PASS URLs with purchase signal in observations.

## Architecture

```
mcp/buckparts-truth/server.ts          MCP stdio entry (tool registration)
scripts/lib/buckparts-mcp-truth-context-v1.ts   Shared repo CSV + audit context
scripts/lib/buckparts-mcp-check-replacement-fit-v1.ts   checkReplacementFit logic
scripts/lib/buckparts-mcp-tools-v2.ts  All v2 tool functions
scripts/lib/buckparts-mcp-manufacturer-rescue-v1.ts   Manufacturer rescue MCP tools
scripts/lib/all-product-safe-buyer-path-census-v1.ts   Census (reused)
scripts/lib/model-filter-correctness-audit-v1.ts       Fridge fit audit (reused)
src/lib/retailers/launch-buy-links.ts                  Buy-path gates (reused)
```

Context loads committed CSVs per wedge, census, fridge model-filter audit JSON, and filter aliases. No Supabase calls. No file writes.

## Tests

```bash
node --import tsx --test scripts/lib/buckparts-mcp-check-replacement-fit-v1.test.ts scripts/lib/buckparts-mcp-tools-v2.test.ts scripts/lib/buckparts-mcp-manufacturer-rescue-v1.test.ts
```

Or: `npm test`

## Scope limits (intentional)

- Refrigerator fit `PROVEN` requires `model-filter-correctness-audit-v1.json` `PROVEN_CORRECT`
- CSV compat alone never promotes to `PROVEN` fit
- Live Supabase/runtime parity is `UNKNOWN` in MCP unless committed convergence artifacts exist
- No remote HTTPS MCP deployment in this repo
