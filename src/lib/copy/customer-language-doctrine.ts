/**
 * Customer language + trust definitions — version marker and paths for tests / Command Center.
 * Human-readable rules: `docs/BuckParts-CUSTOMER-LANGUAGE-AND-DEFINITIONS.md`.
 * Does not affect buy-path or redirect logic.
 */

/** Bump when doctrine or scan list changes meaningfully. */
export const CUSTOMER_LANGUAGE_DOCTRINE_VERSION = 1;

export const CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH =
  "docs/BuckParts-CUSTOMER-LANGUAGE-AND-DEFINITIONS.md" as const;

export const WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH =
  "docs/drafts/waterdrop-da29-00020b-oem-vs-compatible-trust-module-v1.md" as const;

export const WATERDROP_DA29_00020B_EVIDENCE_REL_PATH =
  "data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json" as const;

export const WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH =
  "docs/waterdrop-da29-00020b-retailer-link-insert-plan.sql" as const;

/** Durable “no OEM cold” rule text for Command Center / HQ handoff (not customer-facing HTML). */
export const NO_OEM_COLD_RULE_V1 =
  "Public BuckParts customer-facing copy must not use OEM unless defined first/immediately as original equipment manufacturer; prefer Samsung-made, official Samsung filter, compatible replacement filter, or non-Samsung replacement filter where accurate." as const;

export type WaterdropLiveCtaStatusV1 = "NOT_LIVE" | "BLOCKED";
