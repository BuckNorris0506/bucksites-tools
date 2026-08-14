# Executive → Fridge Expansion Worker v1 — Founder authority grant (unsigned)

**Status:** `PENDING_OWNER_FILL` — not an approved decision.  
**Schema:** existing `founder_decision_registry_v1` (`read_only_agent` + `owner_note` + `prohibited_actions_still_apply` + extra context blob).  
**Do not:** implement Runtime v3, edit the dispatch allowlist, add a selector, grant mutation, or copy this wrapper into `data/owner-decisions/`.

Copy `registry_document_after_founder_signature` from the sibling JSON after replacing `PENDING_OWNER_FILL` dates.

---

PROVEN:

- Fridge Expansion Worker v1 exact command is `node --import tsx scripts/run-buckparts-fridge-expansion-worker-v1.ts` (`FRIDGE_EXPANSION_WORKER_SOURCE_COMMAND_V1`).
- That command is not in `DISPATCH_ALLOWLIST_ENTRIES_V1`. Missing allowlist membership binds as `REFUSE_NO_EXECUTABLE` with no lane substitution.
- Dispatch runner refuses non-allowlisted `exact_command`, `dispatch_status !== READY`, `command_executable=false`, and `owner_review_required=true` subprocesses.
- Canonical bind with `owner_review_required=true` yields `dispatch_status=OWNER_REVIEW_REQUIRED` and `command_executable=false`.
- `refrigerator_model_first` (precedence 3) currently emits `npx tsx scripts/report-refrigerator-model-first-batch-resolver-v1.ts --manifest data/fridge/batch-production/model-first-input-v1/fridge-models-batch-v1.json`, which is also not allowlisted. That candidate is inactive when mapping-review and unknown counts are both 0.
- Founder Decision Registry first-class fields include `allowed_next_scope=read_only_agent`, `owner_note`, `prohibited_actions_still_apply`, `evidence_required_before_mutation`, optional `expires_at`. Extra on-disk context blobs are a proven pattern (`ap_demand_selected_read_only_evidence_collection_approval_context_v1`); the validator does not reject unknown row keys and does not copy them into the typed row.
- `read_only_agent` never satisfies mutation gates (`founderRegistryRowGrantsMutatingRepoAuthority`).
- Registry rows are not closed-loop autonomy; digest/CC/Runner do not consume extra blobs as dispatch authority.

INFERRED:

- Founder intent for this named command can be recorded with the existing OAR envelope plus the extra context blob; no new first-class field is required to *express* the permission.
- Ratification still does not make the worker executable. Allowlist membership and an existing candidate emitting this `exact_command` remain later code lanes.
- Changing `refrigerator_model_first` activation so it fires when mapping review is already clear would newly prioritize fridge expansion over lower-precedence sources. This grant does not authorize that.

UNKNOWN:

- Whether Jared will sign, expire, or reject this grant.
- Which existing candidate, if any, founder will later authorize to emit this `exact_command` without adding a source or changing precedence ranks.
- Whether Evolution Gate will remain PARK/REJECT for Executive Runtime v3 after ratification (default stands until a separate gate decision).

FOUNDER DECISION REQUIRED:

Record an approved `founder_decision_registry_v1` row for this exact grant (copy the sibling JSON inner document; fill `decided_at` and `expires_at`). Until that live row exists under `data/owner-decisions/`, The Executive has no founder-ratified permission to treat Fridge Expansion Worker v1 as a lawful canonical dispatch command.

EXACT PERMISSION:

The Executive may bind **Fridge Expansion Worker v1** through the **existing** `canonical_final_operating_decision_v1` selection + dispatch path only, using the named exact command, with `mutation_allowed=false` and `owner_review_required=true`. Fail closed on missing evidence, ineligibility, or worker failure. Founder may revoke at any time.

EXACT SCOPE:

- Named worker only: Fridge Expansion Worker v1 (`buckparts_fridge_expansion_worker_v1`)
- Named command only (JSON stdout contract; not the npm alias)
- `allowed_next_scope=read_only_agent` (never `owner_mutation_approved`)
- Draft owner-review packet writes under `data/fridge/batch-production/drafts/` remain the worker's existing write surface
- Existing Constitution, AGENTS.md, Evolution Gate, OAR, ODQ, canonical selector, allowlist, and dispatch runner remain controlling

EXACT COMMAND:

`node --import tsx scripts/run-buckparts-fridge-expansion-worker-v1.ts`

REVOCATION / STOP CONDITIONS:

- Founder sets `decision_status=rejected` or `allowed_next_scope=none`
- `expires_at` or `review_after` has passed
- Missing evidence, ineligibility, or worker failure (fail closed)
- Canonical winner is not this command (do not substitute)
- Command not allowlisted (`REFUSE_NO_EXECUTABLE`)
- `owner_review_required=true` / `dispatch_status=OWNER_REVIEW_REQUIRED` / `command_executable=false` (no autonomous subprocess)
- Any attempt to invoke outside `canonical_final_operating_decision_v1`

EXISTING OAR SCHEMA SUFFICIENT?:

YES. First-class fields express scope (`read_only_agent`), prohibitions, evidence gate, and optional expiry. Named command / worker / fail-closed flags are expressed in `owner_note` + extra context blob `executive_fridge_expansion_worker_v1_canonical_dispatch_authority_grant_context_v1`, matching the proven AP read-only evidence-collection OAR pattern. No schema redesign. Smallest field that is not first-class is `exact_command`; it is not missing as an expressible permission because `owner_note` + extra blob already carry it, and the validator ignores unknown keys.

CANONICAL-CANDIDATE INTEGRATION NEEDED:

After ratification, still required before the worker can be *considered* (not invoked as an exception):

1. Add this exact command to `DISPATCH_ALLOWLIST_ENTRIES_V1` with `command_kind=owner_review`, `owner_review_required=true`, `mutation_allowed=false` (recommended `selected_subsystem=owner_review:fridge_expansion_worker_v1`, `artifact_write_behavior=required`, `no_artifact_allowed=false`).
2. An **existing** canonical candidate must emit this `exact_command` as the command it already owns when it lawfully wins. Do not add a steering source. Do not reorder `CANONICAL_STEERING_PRECEDENCE_V1`. Do not substitute another winner's command.
3. `refrigerator_model_first` is the only fridge-named candidate at precedence 3, but it currently emits the mapping-review resolver command and is inactive when that work is clear. This grant does **not** authorize replacing that command while mapping review remains, and does **not** authorize activating precedence 3 when it is currently null.

Until (1) and a later founder-confirmed (2), canonical bind cannot name this worker even if this OAR is approved.

FILES THAT WOULD CHANGE AFTER RATIFICATION:

- `data/owner-decisions/executive-fridge-expansion-worker-v1-canonical-dispatch-authority-grant-v1.json` (founder-signed copy)
- Later allowlist lane only: `scripts/lib/buckparts-command-center-dispatch-allowlist-v1.ts` plus its tests
- Later candidate-emission lane only, if founder separately confirms: `scripts/lib/refrigerator-model-first-batch-resolver-v1.ts` and/or `scripts/report-buckparts-command-center.ts` (emit this `exact_command` from an existing source — no new source)
- Worker Registry projection follows allowlist 1:1 if/when that registry is merged; do not invent a parallel invoke path

WHAT THIS DOES NOT AUTHORIZE:

- Production apply, guarded apply, CSV/Supabase/buy/public mutation
- Editing the dispatch allowlist by this row alone
- Executive Runtime v3
- Invoking the worker outside `canonical_final_operating_decision_v1`
- A second selector or exception to canonical selection
- Outcome Join steering
- New objective or prioritization authority
- `dispatch_status=READY` autonomous subprocess while `owner_review_required=true`
- The npm alias `npm run buckparts:fridge-expansion-worker` as `exact_command`
- Claiming the worker discovers net-new catalog models

READY FOR FOUNDER RATIFICATION
