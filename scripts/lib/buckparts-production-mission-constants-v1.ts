/** Shared constants for production mission v1 — no runner imports. */

export const PRODUCTION_MISSION_RUNNER_MISSION_ID_V1 = "production_mission_v1" as const;

export const PRODUCTION_MISSION_DISPATCH_INPUT_ARTIFACTS_V1 = [
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-batch-v1.json",
  "data/fridge/batch-production/drafts/fridge-safe-link-rescue-first4-apply-review-v1.json",
] as const;

export const PRODUCTION_MISSION_BROWSER_PROOF_RESULT_GLOB_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-{slug}-v1.json" as const;
