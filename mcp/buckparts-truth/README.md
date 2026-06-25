# BuckParts Truth MCP (local prototype)

Read-only MCP server exposing BuckParts verified fit and safe buyer-path truth from **committed repo CSV and audit JSON only**.

- **Cursor only** — stdio transport, no HTTPS deployment
- **No write tools** — no CSV, Supabase, evidence, or affiliate mutation
- **Truth contract** — repo truth over memory; FULL truth or `UNKNOWN`; no "probably fits"

## Run

From repo root:

```bash
npm run mcp:buckparts-truth
```

## Cursor MCP config

Add to `.cursor/mcp.json` (local example — adjust absolute path to your clone):

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

Alternative using `tsx` directly:

```json
{
  "mcpServers": {
    "buckparts-truth": {
      "command": "npx",
      "args": ["tsx", "mcp/buckparts-truth/server.ts"],
      "cwd": "/Users/jaredbuckman/bucksites-tools"
    }
  }
}
```

Restart Cursor after saving.

## Tool: `check_replacement_fit`

**Input:** `model_or_part` — exact appliance model slug, filter/part slug, or unambiguous OEM/model number (compact match when unique).

**Output (JSON):**

| Field | Meaning |
| --- | --- |
| `matched_slug` | Proven filter slug, or `UNKNOWN` |
| `wedge` | Homekeep wedge, or `UNKNOWN` |
| `replacement_fit_status` | `PROVEN` \| `SUPPRESSED` \| `UNKNOWN` |
| `safe_buyer_path_status` | `SAFE_BUYER_PATH_PROVEN` \| `SUPPRESSED` \| `UNKNOWN` |
| `disposition` | Coverage-factory disposition from repo truth, or `UNKNOWN` |
| `evidence_paths` | Committed evidence / audit artifact paths |
| `truth_note` | Human-readable guardrail summary |

### Example queries

- `samsung-rf28r7351sr` — fridge model with `PROVEN_CORRECT` audit → fit `PROVEN`, matched `da97-17376b`
- `edr1rxd1` — filter slug → identity proven; fit `UNKNOWN`; safe path from census
- `RF28R7351SR` — unambiguous model number compact match
- `levoit-core-300` — AP model in CSV; fit `UNKNOWN` (no wedge fit audit)
- `not-a-real-slug` — all `UNKNOWN`

## Tests

```bash
node --import tsx --test scripts/lib/buckparts-mcp-check-replacement-fit-v1.test.ts
```

Or full suite: `npm test`

## Scope limits (intentional)

- No broad/fuzzy catalog search
- No Supabase runtime reads (repo CSV + committed audit JSON only)
- No ChatGPT / remote MCP
- Refrigerator fit proof requires committed `model-filter-correctness-audit-v1.json`
- CSV compat alone never promotes to `PROVEN` fit
