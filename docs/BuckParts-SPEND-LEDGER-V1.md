# BuckParts AI + Deploy Spend Ledger v1

**Contract:** `buckparts_spend_ledger_v1`  
**Storage:** `data/ops/spend-ledger-v1.json`  
**Append CLI:** `npm run buckparts:spend-ledger:append` (stdin JSON entry)

## Purpose

Track spend-bearing and spend-adjacent activity for BuckParts without guessing:

- **Codex / OpenAI** — plan messages, API tokens, or exported USD
- **Cursor** — team spend (when provable) or manual IDE notes
- **Netlify** — credits (especially production deploys on credit plans)
- **GitHub Actions** — runner minutes (optional v1 rows)
- **Local** — validation/build runs (`buckparts:runner-step`, local `build`) as **activity**, not vendor invoices

This ledger is **manual-first v1**: dashboard/export-fed rows only. No vendor API sync, no Command Center neuron, no Supabase table.

## Local ops file vs production mutation

| Label | Meaning |
|-------|---------|
| **PROVEN** | `data/ops/spend-ledger-v1.json` sets `data_mutation: true` because the **append CLI mutates this local ops file**. |
| **PROVEN** | This is **not** production data mutation: it does not change Supabase, `retailer_links`, evidence, affiliate URLs, Netlify deploy config, or customer-facing routes. |
| **PROVEN** | Command Center remains read-only for operating truth; spend is **not** wired into CC v1. |

## PROVEN / INFERRED / UNKNOWN rules

| Situation | Label |
|-----------|--------|
| Row appended with `exact_cost_proven: true` and non-empty `proven_facts` + specific `source_surface` | **PROVEN** (operator or vendor export attested in `proven_facts`) |
| Netlify production deploy **15 credits** when dashboard or operator confirms production deploy on credit plan | **PROVEN** for credit amount rule; **INFERRED** for deploy→commit link unless git SHA recorded |
| Git push without dashboard proof | **INFERRED** deploy risk only — do not set `exact_cost_proven: true` |
| Codex/OpenAI usage from ChatGPT plan limits (messages / 5h windows) | **INFERRED** or **UNKNOWN** for per-repo token attribution |
| OpenAI API token USD from Usage export or Costs API | **PROVEN** only when export line is copied into `proven_facts` |
| Cursor individual IDE session | **UNKNOWN** cost unless dashboard copy in `proven_facts` |
| Runner Step / local `build` | **PROVEN** as `local` activity; **not** vendor cost |
| Clicks, impressions, GA4 counts, `revenue-ledger-v1` | **Never** spend proof |

## Netlify credit conservation

Official credit plan rule ([How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)): **production deploy = 15 credits**; preview/branch deploys = 0; failed deploys/rollbacks do not consume deploy credits.

**Ledger rule:**

- Use `unit_type: netlify_credits`, `amount: 15`, `amount_unit: credits` only when **production deploy is proven** from Netlify dashboard or an operator-confirmed deploy event in `proven_facts`.
- Otherwise use `exact_cost_proven: false` and document gaps in `unknown_facts` (e.g. credit mix unknown, deploy type unverified).

Through credit suspension windows, prefer **zero production deploy rows** and local Semi-Cruise (Command Center → Runner Step → Founder Digest) without git push.

## Codex / OpenAI

- **API mode:** token/cost provable from [platform usage export](https://platform.openai.com/) or org Usage/Cost API — not called by this repo in v1.
- **ChatGPT / Codex plan:** limits are often message- or window-based ([Codex pricing](https://developers.openai.com/codex/pricing)); per-commit token attribution is **UNKNOWN**.
- Repo scripts (`buckparts:codex-readonly-smoke`, `buckparts:codex-next-execution-packet`) do **not** persist vendor usage; log session metadata manually if needed.

## Cursor

- Team Admin API can prove `cursor_spend_cents` when an export/API row is recorded in `proven_facts` with a specific `source_surface` (e.g. `cursor:admin-api:2026-05-18`).
- Individual IDE use: manual dashboard snapshot or **UNKNOWN** until copied.

## Runner / local build

Record as:

- `provider: local`
- `unit_type: local_validation_run` or `local_build`
- `exact_cost_proven: false`
- `source_surface: buckparts:runner-step` (or similar)

No USD unless a vendor export proves it.

## Append-only behavior

- The CLI **never** deletes or replaces prior `entries`.
- Each append updates top-level `updated_at` only.
- Invalid rows are rejected; the file is not partially corrupted.

## Command Center

**No CC neuron** until at least **two weeks** of consistent ledger entries and a stable manual ritual.

## Entry shape (recommended)

See `scripts/lib/buckparts-spend-ledger-contract-v1.ts` for allowed enums.

Example (inferred Netlify row):

```json
{
  "provider": "netlify",
  "unit_type": "netlify_credits",
  "amount": 15,
  "amount_unit": "credits",
  "exact_cost_proven": false,
  "estimated_cost_usd": null,
  "source_surface": "manual:netlify-dashboard",
  "task_id": null,
  "session_id": null,
  "related_commit": null,
  "related_branch": null,
  "purpose": "production_deploy",
  "outcome": "success",
  "useful_output": true,
  "deploy_triggered": true,
  "mutation_triggered": false,
  "proven_facts": [],
  "unknown_facts": ["Netlify dashboard breakdown not attached to this row."],
  "notes": null
}
```

## Append CLI usage

From repo root, pipe one JSON object (not an array):

```bash
printf '%s\n' '{
  "provider": "local",
  "unit_type": "local_validation_run",
  "amount": 1,
  "amount_unit": "count",
  "exact_cost_proven": false,
  "estimated_cost_usd": null,
  "source_surface": "buckparts:runner-step",
  "task_id": null,
  "session_id": null,
  "related_commit": null,
  "related_branch": null,
  "purpose": "semi_cruise",
  "outcome": "success",
  "useful_output": true,
  "deploy_triggered": false,
  "mutation_triggered": false,
  "proven_facts": [],
  "unknown_facts": ["Local CPU only; no vendor meter."],
  "notes": null
}' | npm run buckparts:spend-ledger:append
```

Stdout is a single JSON summary (`buckparts_spend_ledger_append_v1`). Errors go to stderr.

## Validation

```bash
node --import tsx --test scripts/append-buckparts-spend-ledger-entry.test.ts
node --import tsx --test scripts/buckparts-spend-ledger-v1.test.ts
jq -e '.contract == "buckparts_spend_ledger_v1"' data/ops/spend-ledger-v1.json
```

## References

- Netlify credits: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- Codex pricing: https://developers.openai.com/codex/pricing
- Cursor Admin API: https://cursor.com/docs/account/teams/admin-api
- Revenue ledger (separate): `data/ops/revenue-ledger-v1.json`
