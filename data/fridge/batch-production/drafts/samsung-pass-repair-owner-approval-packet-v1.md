# Samsung PASS repair owner approval packet v1

Generated: 2026-06-09T16:58:58.911Z

## Status

- contract: `samsung_pass_repair_owner_approval_packet_v1`
- read_only: **true**
- data_mutation: **false**
- mutation_authorized: **false**
- owner_approval_required: **true**
- apply_authorized: **false**

## Decision needed

Approve, reject, defer, or request more proof for the 5-row Samsung PASS compatibility_mappings.csv correction plan (wrong-family DA29 / phantom da29-10105j removals → da97-17376b HAF-QIN).

## Apply plan source

- apply_plan: `data/fridge/batch-production/drafts/samsung-pass-repair-apply-plan-v1.json`
- owner_review: `data/fridge/batch-production/drafts/refrigerator-truth-repair-owner-review-v1.json`
- founder registry spec: `docs/BuckParts-FOUNDER-DECISION-REGISTRY.md`
- source_decision_packet_id: `samsung_pass_repair_owner_approval_packet_v1`

## Separate apply executor required

PROVEN: Approving this owner approval packet records founder intent only. It does not apply planned compatibility_mappings.csv changes, mutate filters.csv, fridge_models.csv, manual evidence, Supabase, pages, sitemap/robots, retailer links, or HQ handoff. A separate guarded apply executor with explicit owner_mutation_approved registry row and apply authorization is still required before any CSV or Supabase mutation.

## Approval options

### `approve_apply_plan` — Approve apply plan

Owner approves the 5-row Samsung PASS compatibility correction plan (HAF-QIN / da97-17376b). Proceed to a separate guarded apply executor — no automatic CSV/Supabase mutation from this packet.

- registry mapping: `approved` + `owner_mutation_approved`
- evidence_required_before_mutation: **true**

### `reject_apply_plan` — Reject apply plan

Owner rejects the proposed compat corrections; hold all 5 slug rows unchanged.

- registry mapping: `rejected` + `none`
- evidence_required_before_mutation: **false**

### `defer_apply_plan` — Defer apply plan

Owner defers decision; no planning or apply authority granted.

- registry mapping: `deferred` + `none`
- evidence_required_before_mutation: **false**

### `request_more_proof` — Request more proof

Owner needs additional Tier-1 Samsung exact-model evidence before approving compat corrections.

- registry mapping: `needs_more_evidence` + `read_only_agent`
- evidence_required_before_mutation: **false**

## Before / after mapping summary

| fridge_slug | operation | before | after |
| --- | --- | --- | --- |
| `samsung-rf27t5201sr` | `replace_mapping` | `da29-10105j` | `da97-17376b` |
| `samsung-rf27t5501sr` | `split_mapping` | `da29-00012b|da29-00020b` | `da97-17376b` |
| `samsung-rf28r6301sr` | `replace_mapping` | `da29-00019a` | `da97-17376b` |
| `samsung-rf28t5101sr` | `replace_mapping` | `da29-00019a` | `da97-17376b` |
| `samsung-rs22t5201sg` | `replace_mapping` | `da29-10105j` | `da97-17376b` |

## Rollup

- removed filter slugs: `da29-00012b|da29-00019a|da29-00020b|da29-10105j`
- added filter slugs: `da97-17376b`
- compat row removals: 6
- compat row additions: 5

## Expected scoreboard delta (if apply plan executed after separate approval)

| Metric | Baseline | After apply | Reduction |
| --- | ---: | ---: | ---: |
| wrong_part_risk_count | 75 | 70 | 5 |
| multi_mapped_count | 212 | 211 | 1 |
| phantom_model_count | 15 | 13 | 2 |

## Risk notes

- owner_approval_required=true — this artifact is a read-only apply plan only; nothing has been applied.
- mutation_authorized=false on every planned row — separate owner-approved apply executor required for CSV/Supabase writes.
- Only 5 of 15 Samsung bad-mapping batch rows are VALIDATION_PASS — remaining 10 PARTIAL rows are excluded from this plan.
- Planned removals include repo-proven phantom filter slug(s): da29-10105j.
- Live Supabase compatibility_mappings may differ from committed CSV at apply time — re-validate before execution.
- No manual-evidence JSON commits, page updates, retailer-link changes, sitemap/robots edits, or HQ handoff in this plan.
- Target filter da97-17376b is HAF-QIN family — wrong-family DA29 co-maps are the intended removal set.

## Prohibited actions (still apply after approval)

- Do not mutate compatibility_mappings.csv from this approval packet alone.
- Do not mutate filters.csv, fridge_models.csv, or filter_aliases.csv.
- Do not write or overwrite manual-evidence JSON under data/manual-evidence/.
- Do not mutate Supabase compatibility_mappings or other production database state.
- Do not mutate retailer_links.csv, public fridge pages, sitemap, or robots.
- Do not mutate HQ handoff artifacts.
- approve_apply_plan authorizes proceeding toward a guarded apply executor — not automatic CSV/Supabase apply.
- This approval packet is not automation_input for Runner Step, queues, or mutation gates.

## Planned rows (exact from apply plan)

- `samsung-rf27t5201sr` — replace_mapping; `da29-10105j` → `da97-17376b`; remove `da29-10105j`; add `da97-17376b`; mutation_authorized=false
- `samsung-rf27t5501sr` — split_mapping; `da29-00012b|da29-00020b` → `da97-17376b`; remove `da29-00012b|da29-00020b`; add `da97-17376b`; mutation_authorized=false
- `samsung-rf28r6301sr` — replace_mapping; `da29-00019a` → `da97-17376b`; remove `da29-00019a`; add `da97-17376b`; mutation_authorized=false
- `samsung-rf28t5101sr` — replace_mapping; `da29-00019a` → `da97-17376b`; remove `da29-00019a`; add `da97-17376b`; mutation_authorized=false
- `samsung-rs22t5201sg` — replace_mapping; `da29-10105j` → `da97-17376b`; remove `da29-10105j`; add `da97-17376b`; mutation_authorized=false

## Record your decision

Fill `data/fridge/batch-production/drafts/samsung-pass-repair-owner-decision-template-v1.json` and copy the completed row into `data/owner-decisions/*.json` per the founder decision registry spec.

