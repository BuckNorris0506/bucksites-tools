# Fridge Expansion Worker v1 — Founder authority grant (unsigned)

**Status:** `PENDING_OWNER_FILL` — not an approved decision. Implementation of allowlist and canonical candidacy is **stopped** until a live copy exists under `data/owner-decisions/`.

Copy `registry_document_after_founder_signature` from the sibling JSON after replacing `PENDING_OWNER_FILL` dates.

---

## Authority scan (this session)

No live `data/owner-decisions/*.json` row names Fridge Expansion Worker v1, the exact command `node --import tsx scripts/run-buckparts-fridge-expansion-worker-v1.ts`, or canonical-dispatch authority for that worker. Existing fridge OARs authorize other product lanes (safe-link CSV, buyer-path planning, GE PDP, Samsung/GSWF repairs). Do not infer permission from those rows.

---

PROVEN:

- Worker exact command is `node --import tsx scripts/run-buckparts-fridge-expansion-worker-v1.ts`.
- That command is not in `DISPATCH_ALLOWLIST_ENTRIES_V1`.
- No live owner-decision file grants this permission.
- `refrigerator_model_first` (precedence 3) currently emits the mapping-review resolver command and is inactive when mapping-review and unknown counts are both 0 — which is when proven-catalog expansion work typically exists.

INFERRED:

- Existing OAR schema can record this grant (`read_only_agent` + `owner_note` + extra context blob).
- After a live approved row exists, the smallest lawful code change is allowlist membership plus emission from existing source `refrigerator_model_first` when eligible expansion work exists and mapping-review/unknown work is not active on that same source. That does not add a selector or reorder precedence. It does change when precedence 3 can be active; this packet asks founder to authorize that named activation extension.

UNKNOWN:

- Whether Jared will sign, expire, or reject.
- Whether higher-precedence canonical winners will still outrank fridge expansion after wiring.

FOUNDER DECISION REQUIRED:

Copy the sibling JSON inner document to `data/owner-decisions/executive-fridge-expansion-worker-v1-canonical-dispatch-authority-grant-v1.json`. Fill `decided_at` and `expires_at`. Keep `allowed_next_scope=read_only_agent`.

EXACT PERMISSION:

Fridge Expansion Worker v1 may be considered and dispatched only through existing `canonical_final_operating_decision_v1` + the existing dispatch runner. Exact command only. `mutation_allowed=false`. `owner_review_required=true`. After the live row exists, a later code lane may allowlist that command and may let existing `refrigerator_model_first` emit it when eligible worker work exists and mapping-review/unknown work is not active on that source.

EXACT SCOPE:

Named worker `buckparts_fridge_expansion_worker_v1`. Named command only. `read_only_agent`. No mutation. No second selector. No Runtime v3. No scheduling. Constitution / AGENTS / Evolution Gate / OAR / ODQ / dispatch runner remain controlling.

EXACT COMMAND:

`node --import tsx scripts/run-buckparts-fridge-expansion-worker-v1.ts`

REVOCATION / STOP CONDITIONS:

`decision_status=rejected` or `allowed_next_scope=none`; expiry; missing evidence / ineligibility / worker failure; canonical winner is not this command; allowlist miss; `OWNER_REVIEW_REQUIRED`; invoke outside canonical path.

READY FOR FOUNDER RATIFICATION
