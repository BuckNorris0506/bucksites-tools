/**
 * BuckParts Runner Safety Contract v1 — canonical allowlist + default prohibition lines
 * used by tests and Runner Step. Does not spawn processes.
 *
 * PROVEN: `RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1` must stay in lockstep with
 * `scripts/buckparts-runner-step.ts` (only these `npm run` targets).
 *
 * PROVEN: `RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1` must match
 * `defaultProhibitedActions()` in `src/lib/owner-dashboard/founder-execution-packet-v1.ts`
 * (tests assert equality so drift fails CI).
 */

export const BUCKPARTS_RUNNER_SAFETY_CONTRACT_V1 = "buckparts_runner_safety_contract_v1" as const;

/** Only these `npm run <script>` names may be executed by Runner Step v1 validation. */
export const RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1 = ["lint", "build", "buckparts:operator-proof"] as const;

export type RunnerExecutionNpmScriptAllowlistV1 = (typeof RUNNER_EXECUTION_NPM_SCRIPT_ALLOWLIST_V1)[number];

/**
 * Exact default `prohibited_actions` lines from Founder Execution Packet v1.
 * Update only when `founder-execution-packet-v1.ts` `defaultProhibitedActions()` changes,
 * then run tests.
 */
export const RUNNER_EXPECTED_DEFAULT_PROHIBITED_ACTION_LINES_V1 = [
  "Do not write to Supabase or run SQL that mutates database state.",
  "Do not mutate retailer_links or other retailer catalog/link artifacts except pure read-only inspection.",
  "Do not create, delete, or overwrite evidence JSON under data/evidence (or parallel evidence paths) unless the founder explicitly expands scope outside this packet.",
  "Do not change affiliate program URLs, tracking parameters, or affiliate application state in-repo.",
  "Do not run mutating npm scripts (e.g. inserts, apply, mutate flags) unless the founder explicitly instructs otherwise.",
] as const;
